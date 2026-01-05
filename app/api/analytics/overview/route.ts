import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import {
  aggregateBullMetrics,
  calculateRingDistributionForSession,
  calculateDelta,
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

    await connectToDatabase();

    // Fetch all sessions ordered by date
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

    // Filter by position data if required
    const filteredBulls = positionOnly
      ? bulls.filter((b) => b.shotPositions && b.shotPositions.length > 0)
      : bulls;

    // Calculate metrics per session
    const sessionMetrics = sessions
      .map((session, index) => {
        const sessionSheets = sheets.filter(
          (s: any) => s.rangeSessionId.toString() === session._id.toString()
        );

        const sessionBulls = filteredBulls.filter((b) =>
          sessionSheets.some((s) => s._id.toString() === b.targetSheetId.toString())
        );

        if (sessionBulls.length === 0) return null;

        const metrics = aggregateBullMetrics(sessionBulls);

        // Apply min shots filter
        if (metrics.totalShots < minShots) return null;

        return {
          sessionIndex: index,
          sessionId: session._id.toString(),
          slug: session.slug,
          date: session.date,
          location: session.location,
          ...metrics,
        };
      })
      .filter((m) => m !== null);

    // Overall KPIs
    const allBulls = filteredBulls.filter((b) => {
      const sheetId = b.targetSheetId.toString();
      return sheets.some((s) => s._id.toString() === sheetId);
    });

    const overallMetrics = aggregateBullMetrics(allBulls);

    // Calculate deltas
    let lastVsPrev = null;
    let last3VsPrev3 = null;

    if (sessionMetrics.length >= 2) {
      const last = sessionMetrics[sessionMetrics.length - 1];
      const prev = sessionMetrics[sessionMetrics.length - 2];

      lastVsPrev = {
        avgScore: calculateDelta(last.avgScorePerShot, prev.avgScorePerShot, true),
        bullRate: calculateDelta(last.bullRate, prev.bullRate, true),
        missRate: calculateDelta(last.missRate, prev.missRate, false),
        meanRadius: last.meanRadius && prev.meanRadius
          ? calculateDelta(last.meanRadius, prev.meanRadius, false)
          : null,
        centroidDistance: last.centroidDistance && prev.centroidDistance
          ? calculateDelta(last.centroidDistance, prev.centroidDistance, false)
          : null,
        tightnessScore: calculateDelta(last.tightnessScore, prev.tightnessScore, true),
      };
    }

    if (sessionMetrics.length >= 6) {
      const last3 = sessionMetrics.slice(-3);
      const prev3 = sessionMetrics.slice(-6, -3);

      const avgLast3 = {
        avgScore: last3.reduce((sum, s) => sum + s.avgScorePerShot, 0) / 3,
        bullRate: last3.reduce((sum, s) => sum + s.bullRate, 0) / 3,
        missRate: last3.reduce((sum, s) => sum + s.missRate, 0) / 3,
        tightness: last3.reduce((sum, s) => sum + s.tightnessScore, 0) / 3,
      };

      const avgPrev3 = {
        avgScore: prev3.reduce((sum, s) => sum + s.avgScorePerShot, 0) / 3,
        bullRate: prev3.reduce((sum, s) => sum + s.bullRate, 0) / 3,
        missRate: prev3.reduce((sum, s) => sum + s.missRate, 0) / 3,
        tightness: prev3.reduce((sum, s) => sum + s.tightnessScore, 0) / 3,
      };

      last3VsPrev3 = {
        avgScore: calculateDelta(avgLast3.avgScore, avgPrev3.avgScore, true),
        bullRate: calculateDelta(avgLast3.bullRate, avgPrev3.bullRate, true),
        missRate: calculateDelta(avgLast3.missRate, avgPrev3.missRate, false),
        tightnessScore: calculateDelta(avgLast3.tightness, avgPrev3.tightness, true),
      };
    }

    // Ring distributions
    const ringDistributions = sessionMetrics.map((sm) => {
      const sessionBulls = filteredBulls.filter((b) => {
        const sheet = sheets.find((s) => s._id.toString() === b.targetSheetId.toString());
        return sheet && sheet.rangeSessionId.toString() === sm.sessionId;
      });
      return calculateRingDistributionForSession(sessionBulls, sm.sessionId, sm.sessionIndex);
    });

    // Shots per session
    const shotsPerSession = sessionMetrics.map((sm) => ({
      sessionIndex: sm.sessionIndex,
      sessionId: sm.sessionId,
      shots: sm.totalShots,
    }));

    return NextResponse.json({
      kpis: {
        avgScore: overallMetrics.avgScorePerShot,
        bullRate: overallMetrics.bullRate,
        missRate: overallMetrics.missRate,
        meanRadius: overallMetrics.meanRadius || null,
        centroidDistance: overallMetrics.centroidDistance || null,
        tightnessScore: overallMetrics.tightnessScore,
        totalShots: overallMetrics.totalShots,
        sessionsCount: sessionMetrics.length,
        shotCoverage: overallMetrics.shotCoverage,
        goodHitRate: overallMetrics.goodHitRate,
      },
      deltas: {
        lastVsPrev,
        last3VsPrev3,
      },
      sessions: sessionMetrics,
      ringDistributions,
      shotsPerSession,
    });
  } catch (error) {
    console.error("Error fetching analytics overview:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

