import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord, IShotPosition } from "@/lib/models/BullRecord";
import {
  calculatePositionMetrics,
  calculateCountMetrics,
  calculateTightnessScore,
  binShotsToHeatmap,
  generateSyntheticShots,
} from "@/lib/analytics-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const firearmIds = searchParams.get("firearmIds")?.split(",").filter(Boolean);
    const caliberIds = searchParams.get("caliberIds")?.split(",").filter(Boolean);
    const opticIds = searchParams.get("opticIds")?.split(",").filter(Boolean);
    const distanceMin = searchParams.get("distanceMin");
    const distanceMax = searchParams.get("distanceMax");
    const minShots = parseInt(searchParams.get("minShots") || "10");
    const positionOnly = searchParams.get("positionOnly") === "true";
    const allowSynthetic = searchParams.get("allowSynthetic") === "true";

    await connectToDatabase();

    // Fetch all sessions
    const sessions = await RangeSession.find({}).sort({ date: 1 });

    // Build sheet query
    const sheetQuery: any = { rangeSessionId: { $in: sessions.map((s) => s._id) } };
    if (firearmIds && firearmIds.length > 0) {
      sheetQuery.firearmId = { $in: firearmIds };
    }
    if (caliberIds && caliberIds.length > 0) {
      sheetQuery.caliberId = { $in: caliberIds };
    }
    if (opticIds && opticIds.length > 0) {
      sheetQuery.opticId = { $in: opticIds };
    }
    if (distanceMin || distanceMax) {
      sheetQuery.distanceYards = {};
      if (distanceMin) sheetQuery.distanceYards.$gte = parseInt(distanceMin);
      if (distanceMax) sheetQuery.distanceYards.$lte = parseInt(distanceMax);
    }

    const sheets = await TargetSheet.find(sheetQuery);
    const sheetIds = sheets.map((s) => s._id);

    // Fetch bulls
    const bulls = await BullRecord.find({ targetSheetId: { $in: sheetIds } });

    // Collect all shots
    let allShots: IShotPosition[] = [];
    let usesSynthetic = false;
    let totalBulls = 0;
    let bullsWithPositions = 0;
    let totalShotsCount = 0;
    let shotsWithPositions = 0;

    bulls.forEach((bull) => {
      totalBulls++;
      const countMetrics = calculateCountMetrics(bull);
      totalShotsCount += countMetrics.totalShots;

      // Don't skip bulls based on minShots - that's for session-level filtering
      if (bull.shotPositions && bull.shotPositions.length > 0) {
        bullsWithPositions++;
        shotsWithPositions += bull.shotPositions.length;
        allShots = allShots.concat(bull.shotPositions);
      } else if (allowSynthetic && !positionOnly) {
        usesSynthetic = true;
        const synthetic = generateSyntheticShots(bull);
        allShots = allShots.concat(synthetic);
      }
    });

    if (allShots.length === 0) {
      return NextResponse.json({
        meta: {
          shotsIncluded: 0,
          sessionsIncluded: 0,
          shotCoverage: 0,
          usesSynthetic: false,
        },
        centroid: null,
        group: null,
        heatmap: { bins: [] },
        scatter: { points: [] },
        quadrant: { q1: 0, q2: 0, q3: 0, q4: 0 },
        bullAnalysis: [],
      });
    }

    // Calculate overall position metrics
    const positionMetrics = calculatePositionMetrics(allShots);

    // Calculate group metrics
    const overallCountMetrics = {
      totalShots: allShots.length,
      totalScore: allShots.reduce((sum, s) => sum + s.score, 0),
      avgScorePerShot: allShots.reduce((sum, s) => sum + s.score, 0) / allShots.length,
      bullRate: allShots.filter((s) => s.score === 5).length / allShots.length,
      missRate: allShots.filter((s) => s.score === 0).length / allShots.length,
      goodHitRate: allShots.filter((s) => s.score >= 4).length / allShots.length,
      ringDistribution: {
        p5: allShots.filter((s) => s.score === 5).length / allShots.length,
        p4: allShots.filter((s) => s.score === 4).length / allShots.length,
        p3: allShots.filter((s) => s.score === 3).length / allShots.length,
        p2: allShots.filter((s) => s.score === 2).length / allShots.length,
        p1: allShots.filter((s) => s.score === 1).length / allShots.length,
        p0: allShots.filter((s) => s.score === 0).length / allShots.length,
      },
    };

    const tightnessScore = positionMetrics
      ? calculateTightnessScore(positionMetrics, overallCountMetrics)
      : 0;

    // Heatmap binning
    const heatmapBins = binShotsToHeatmap(allShots, 40);

    // Scatter points (downsample if too many)
    const MAX_SCATTER_POINTS = 2000;
    let scatterPoints = allShots;
    if (allShots.length > MAX_SCATTER_POINTS) {
      const step = Math.ceil(allShots.length / MAX_SCATTER_POINTS);
      scatterPoints = allShots.filter((_, i) => i % step === 0);
    }

    // Bull-by-bull analysis (for fatigue detection)
    const bullAnalysis = [];
    for (let bullIndex = 1; bullIndex <= 6; bullIndex++) {
      const bullsAtIndex = bulls.filter((b) => b.bullIndex === bullIndex);
      if (bullsAtIndex.length === 0) continue;

      let bullShots: IShotPosition[] = [];
      bullsAtIndex.forEach((bull) => {
        if (bull.shotPositions && bull.shotPositions.length > 0) {
          bullShots = bullShots.concat(bull.shotPositions);
        }
      });

      if (bullShots.length === 0) continue;

      const bullPositionMetrics = calculatePositionMetrics(bullShots);
      const avgScore = bullShots.reduce((sum, s) => sum + s.score, 0) / bullShots.length;

      bullAnalysis.push({
        bullIndex,
        shotsCount: bullShots.length,
        avgScore,
        meanRadius: bullPositionMetrics?.meanRadius || null,
        centroidDistance: bullPositionMetrics?.centroid.centroidDistance || null,
      });
    }

    return NextResponse.json({
      meta: {
        shotsIncluded: allShots.length,
        sessionsIncluded: sessions.length,
        shotCoverage: totalShotsCount > 0 ? shotsWithPositions / totalShotsCount : 0,
        usesSynthetic,
      },
      centroid: positionMetrics
        ? {
            x: positionMetrics.centroid.meanX,
            y: positionMetrics.centroid.meanY,
            offsetX: positionMetrics.centroid.offsetX,
            offsetY: positionMetrics.centroid.offsetY,
            centroidDistance: positionMetrics.centroid.centroidDistance,
          }
        : null,
      group: positionMetrics
        ? {
            meanRadius: positionMetrics.meanRadius,
            medianRadius: positionMetrics.medianRadius,
            extremeSpread: positionMetrics.extremeSpread,
            bbox: {
              w: positionMetrics.boundingBox.width,
              h: positionMetrics.boundingBox.height,
              diag: positionMetrics.boundingBox.diagonal,
            },
            tightnessScore,
          }
        : null,
      heatmap: {
        bins: heatmapBins,
      },
      scatter: {
        points: scatterPoints.map((s) => ({
          x: s.x,
          y: s.y,
          score: s.score,
        })),
      },
      quadrant: positionMetrics?.quadrantDistribution || { q1: 0, q2: 0, q3: 0, q4: 0 },
      bullAnalysis,
    });
  } catch (error) {
    console.error("Error fetching shot analytics:", error);
    return NextResponse.json({ error: "Failed to fetch shot analytics" }, { status: 500 });
  }
}

