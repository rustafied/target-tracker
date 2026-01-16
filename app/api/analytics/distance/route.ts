import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { TargetTemplate } from "@/lib/models/TargetTemplate";
import { BullRecord } from "@/lib/models/BullRecord";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";
import { aggregateBullMetrics } from "@/lib/analytics-utils";

/**
 * Generic distance analysis endpoint
 * Returns performance metrics grouped by distance for various entities
 * 
 * Query params:
 * - groupBy: 'firearm' | 'caliber' | 'optic' - entity type to analyze
 * - firearmIds: comma-separated IDs (optional filter)
 * - caliberIds: comma-separated IDs (optional filter)
 * - opticIds: comma-separated IDs (optional filter)
 * - distanceMin/distanceMax: distance range filters
 * - minShots: minimum shots per distance bucket (default 10)
 * - positionOnly: only include shots with position data
 * - bucketSize: group distances into buckets (e.g., 10 = 0-10yd, 10-20yd). 0 = exact distances
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const groupBy = searchParams.get("groupBy") || "optic"; // firearm, caliber, or optic
    const firearmIds = searchParams.get("firearmIds")?.split(",").filter(Boolean);
    const caliberIds = searchParams.get("caliberIds")?.split(",").filter(Boolean);
    const opticIds = searchParams.get("opticIds")?.split(",").filter(Boolean);
    const distanceMin = searchParams.get("distanceMin");
    const distanceMax = searchParams.get("distanceMax");
    const minShots = parseInt(searchParams.get("minShots") || "10");
    const positionOnly = searchParams.get("positionOnly") === "true";
    const bucketSize = parseInt(searchParams.get("bucketSize") || "0");

    await connectToDatabase();
    
    // Ensure models are registered
    void Firearm;
    void Caliber;
    void Optic;
    void TargetTemplate;

    // Fetch all sessions
    const sessions = await RangeSession.find({}).sort({ date: 1 });

    // Build sheet query based on filters
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

    // Get the reference entities based on groupBy
    let entities: any[] = [];
    let entityIdField: string;
    let entityNameField: string;

    switch (groupBy) {
      case "firearm":
        entities = await Firearm.find({}).sort({ sortOrder: 1, name: 1 });
        entityIdField = "firearmId";
        entityNameField = "firearmName";
        break;
      case "caliber":
        entities = await Caliber.find({}).sort({ sortOrder: 1, name: 1 });
        entityIdField = "caliberId";
        entityNameField = "caliberName";
        break;
      case "optic":
      default:
        entities = await Optic.find({}).sort({ sortOrder: 1, name: 1 });
        entityIdField = "opticId";
        entityNameField = "opticName";
        break;
    }

    // Calculate distance curves per entity
    const distanceCurves: Record<string, any[]> = {};
    const leaderboard: any[] = [];

    entities.forEach((entity) => {
      const distanceGroups: Record<number, any[]> = {};

      // Filter sheets for this entity
      const entitySheets = sheets.filter(
        (s: any) => s[entityIdField].toString() === entity._id.toString()
      );

      entitySheets.forEach((sheet: any) => {
        let distanceKey = sheet.distanceYards;
        
        // Apply bucketing if specified
        if (bucketSize > 0) {
          distanceKey = Math.floor(sheet.distanceYards / bucketSize) * bucketSize;
        }

        if (!distanceGroups[distanceKey]) {
          distanceGroups[distanceKey] = [];
        }

        const sheetBulls = filteredBulls.filter(
          (b) => b.targetSheetId.toString() === sheet._id.toString()
        );
        distanceGroups[distanceKey].push(...sheetBulls);
      });

      // Calculate metrics per distance
      const curve = Object.entries(distanceGroups)
        .map(([distance, bulls]) => {
          const metrics = aggregateBullMetrics(bulls);
          if (metrics.totalShots < minShots) return null;

          return {
            distance: parseInt(distance),
            ...metrics,
          };
        })
        .filter((m) => m !== null)
        .sort((a, b) => a.distance - b.distance);

      if (curve.length > 0) {
        distanceCurves[entity._id.toString()] = curve;

        // Calculate overall metrics for leaderboard
        const allEntityBulls = filteredBulls.filter((b) =>
          entitySheets.some((s) => s._id.toString() === b.targetSheetId.toString())
        );

        if (allEntityBulls.length > 0) {
          const overallMetrics = aggregateBullMetrics(allEntityBulls);
          if (overallMetrics.totalShots >= minShots) {
            leaderboard.push({
              [entityIdField]: entity._id.toString(),
              [entityNameField]: entity.name,
              ...overallMetrics,
            });
          }
        }
      }
    });

    // Sort leaderboard by average score
    leaderboard.sort((a, b) => b.avgScorePerShot - a.avgScorePerShot);

    // Generate insights
    const insights = generateDistanceInsights(distanceCurves, entities, entityNameField);

    return NextResponse.json({
      groupBy,
      leaderboard,
      distanceCurves,
      insights,
    });
  } catch (error) {
    console.error("Error fetching distance analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch distance analytics" },
      { status: 500 }
    );
  }
}

/**
 * Generate automatic insights from distance curves
 */
function generateDistanceInsights(
  distanceCurves: Record<string, any[]>,
  entities: any[],
  entityNameField: string
): string[] {
  const insights: string[] = [];

  Object.entries(distanceCurves).forEach(([entityId, curve]) => {
    if (curve.length < 2) return;

    const entity = entities.find((e) => e._id.toString() === entityId);
    if (!entity) return;

    const entityName = entity.name;

    // Find largest drop in bull rate
    let maxBullRateDrop = 0;
    let dropDistance = 0;
    for (let i = 1; i < curve.length; i++) {
      const drop = curve[i - 1].bullRate - curve[i].bullRate;
      if (drop > maxBullRateDrop) {
        maxBullRateDrop = drop;
        dropDistance = curve[i].distance;
      }
    }

    if (maxBullRateDrop > 0.15) {
      // Significant drop (>15%)
      insights.push(
        `${entityName}: Bull rate drops ${(maxBullRateDrop * 100).toFixed(0)}% at ${dropDistance}yd`
      );
    }

    // Find largest increase in miss rate
    let maxMissRateIncrease = 0;
    let missIncreaseDistance = 0;
    for (let i = 1; i < curve.length; i++) {
      const increase = curve[i].missRate - curve[i - 1].missRate;
      if (increase > maxMissRateIncrease) {
        maxMissRateIncrease = increase;
        missIncreaseDistance = curve[i].distance;
      }
    }

    if (maxMissRateIncrease > 0.10) {
      // Significant increase (>10%)
      insights.push(
        `${entityName}: Miss rate increases ${(maxMissRateIncrease * 100).toFixed(0)}% at ${missIncreaseDistance}yd`
      );
    }

    // Find best performing distance
    const bestDistance = curve.reduce((best, curr) => 
      curr.avgScorePerShot > best.avgScorePerShot ? curr : best
    );
    
    if (bestDistance && bestDistance.avgScorePerShot > 4.0) {
      insights.push(
        `${entityName}: Best performance at ${bestDistance.distance}yd (${bestDistance.avgScorePerShot.toFixed(2)} avg)`
      );
    }

    // Check for position-based precision degradation
    if (curve[0].meanRadius !== undefined && curve[curve.length - 1].meanRadius !== undefined) {
      const precisionDegradation = curve[curve.length - 1].meanRadius - curve[0].meanRadius;
      const percentIncrease = (precisionDegradation / curve[0].meanRadius) * 100;
      
      if (percentIncrease > 50) {
        insights.push(
          `${entityName}: Group size increases ${percentIncrease.toFixed(0)}% from ${curve[0].distance}yd to ${curve[curve.length - 1].distance}yd`
        );
      }
    }
  });

  return insights.slice(0, 5); // Limit to top 5 insights
}
