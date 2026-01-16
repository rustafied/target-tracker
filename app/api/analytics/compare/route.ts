import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { TargetTemplate } from "@/lib/models/TargetTemplate";
import { BullRecord } from "@/lib/models/BullRecord";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";
import { aggregateBullMetrics } from "@/lib/analytics-utils";

type ItemType = "firearm" | "optic" | "caliber" | "session";
type MetricKey = "avgScorePerShot" | "bullRate" | "missRate" | "meanRadius" | "goodHitRate";
type GroupBy = "date" | "distance" | "sequence";

interface ComparisonItem {
  id: string;
  name: string;
  color?: string;
  metrics: {
    avgScorePerShot: number;
    bullRate: number;
    missRate: number;
    goodHitRate: number;
    meanRadius?: number;
    totalShots: number;
    totalSessions: number;
  };
  trend?: Array<{
    x: string | number;
    value: number;
    label?: string;
  }>;
}

interface Delta {
  metric: MetricKey;
  items: {
    id: string;
    value: number;
  }[];
  best: {
    id: string;
    value: number;
  };
  worst: {
    id: string;
    value: number;
  };
  range: number;
  percentDiff: number; // best vs worst
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Required params
    const type = searchParams.get("type") as ItemType;
    const idsParam = searchParams.get("ids");

    if (!type || !idsParam) {
      return NextResponse.json(
        { error: "Missing required parameters: type and ids" },
        { status: 400 }
      );
    }

    const ids = idsParam.split(",").filter(Boolean);

    if (ids.length < 2 || ids.length > 3) {
      return NextResponse.json(
        { error: "Please select 2-3 items to compare" },
        { status: 400 }
      );
    }

    // Optional params
    const groupBy = (searchParams.get("groupBy") as GroupBy) || null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const distanceMin = searchParams.get("distanceMin");
    const distanceMax = searchParams.get("distanceMax");
    const minShots = parseInt(searchParams.get("minShots") || "10");
    const positionOnly = searchParams.get("positionOnly") === "true";

    await connectToDatabase();

    // Ensure models are registered
    void Firearm;
    void Caliber;
    void Optic;
    void TargetTemplate;

    // Build base session query
    const sessionQuery: any = {};
    if (startDate || endDate) {
      sessionQuery.date = {};
      if (startDate) sessionQuery.date.$gte = new Date(startDate);
      if (endDate) sessionQuery.date.$lte = new Date(endDate);
    }

    const sessions = await RangeSession.find(sessionQuery).sort({ date: 1 });
    const sessionIds = sessions.map((s) => s._id);

    // Get item models and names
    let itemModels: Map<string, any> = new Map();
    if (type === "firearm") {
      const firearms = await Firearm.find({ _id: { $in: ids } });
      firearms.forEach((f) => itemModels.set(f._id.toString(), f));
    } else if (type === "optic") {
      const optics = await Optic.find({ _id: { $in: ids } });
      optics.forEach((o) => itemModels.set(o._id.toString(), o));
    } else if (type === "caliber") {
      const calibers = await Caliber.find({ _id: { $in: ids } });
      calibers.forEach((c) => itemModels.set(c._id.toString(), c));
    } else if (type === "session") {
      // For sessions, we'll use the session slug/date as the name
      sessions.forEach((s) => {
        if (ids.includes(s._id.toString()) || ids.includes(s.slug)) {
          itemModels.set(s._id.toString(), s);
        }
      });
    }

    // Parallel aggregation for each item
    const comparisonItems = await Promise.all(
      ids.map(async (id): Promise<ComparisonItem | null> => {
        // Build sheet query for this specific item
        const sheetQuery: any = { rangeSessionId: { $in: sessionIds } };

        if (type === "firearm") {
          sheetQuery.firearmId = id;
        } else if (type === "optic") {
          sheetQuery.opticId = id;
        } else if (type === "caliber") {
          sheetQuery.caliberId = id;
        } else if (type === "session") {
          // Find session by id or slug
          const targetSession = sessions.find(
            (s) => s._id.toString() === id || s.slug === id
          );
          if (targetSession) {
            sheetQuery.rangeSessionId = targetSession._id;
          } else {
            return null;
          }
        }

        // Apply distance filters
        if (distanceMin || distanceMax) {
          sheetQuery.distanceYards = {};
          if (distanceMin) sheetQuery.distanceYards.$gte = parseInt(distanceMin);
          if (distanceMax) sheetQuery.distanceYards.$lte = parseInt(distanceMax);
        }

        const sheets = await TargetSheet.find(sheetQuery);
        if (sheets.length === 0) return null;

        const sheetIds = sheets.map((s) => s._id);
        const bulls = await BullRecord.find({ targetSheetId: { $in: sheetIds } });

        const filteredBulls = positionOnly
          ? bulls.filter((b) => b.shotPositions && b.shotPositions.length > 0)
          : bulls;

        if (filteredBulls.length === 0) return null;

        const metrics = aggregateBullMetrics(filteredBulls);

        if (metrics.totalShots < minShots) return null;

        const item = itemModels.get(id);
        const name =
          type === "session"
            ? `${item?.date?.toLocaleDateString()} - ${item?.location || "Session"}`
            : item?.name || "Unknown";

        const compItem: ComparisonItem = {
          id,
          name,
          color: item?.color,
          metrics: {
            avgScorePerShot: metrics.avgScorePerShot,
            bullRate: metrics.bullRate,
            missRate: metrics.missRate,
            goodHitRate: metrics.goodHitRate,
            meanRadius: metrics.meanRadius,
            totalShots: metrics.totalShots,
            totalSessions: new Set(
              sheets.map((s: any) => s.rangeSessionId.toString())
            ).size,
          },
        };

        // Generate trend data if groupBy is specified
        if (groupBy) {
          compItem.trend = await generateTrendData(
            groupBy,
            sheets,
            filteredBulls,
            sessions,
            minShots
          );
        }

        return compItem;
      })
    );

    // Filter out null items
    const validItems = comparisonItems.filter((item): item is ComparisonItem => item !== null);

    if (validItems.length < 2) {
      return NextResponse.json(
        { error: "Not enough data for selected items" },
        { status: 400 }
      );
    }

    // Calculate deltas
    const deltas = calculateDeltas(validItems);

    // Generate insights
    const insights = generateInsights(validItems, deltas, type);

    return NextResponse.json({
      items: validItems,
      deltas,
      insights,
      meta: {
        type,
        groupBy,
        filters: {
          dateRange: startDate && endDate ? { startDate, endDate } : null,
          distance: distanceMin || distanceMax ? { min: distanceMin, max: distanceMax } : null,
          minShots,
        },
      },
    });
  } catch (error) {
    console.error("Error in comparison analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}

async function generateTrendData(
  groupBy: GroupBy,
  sheets: any[],
  bulls: any[],
  sessions: any[],
  minShots: number
): Promise<Array<{ x: string | number; value: number; label?: string }>> {
  if (groupBy === "date") {
    // Group by session date
    const sessionGroups: Map<string, any[]> = new Map();

    sheets.forEach((sheet: any) => {
      const session = sessions.find(
        (s) => s._id.toString() === sheet.rangeSessionId.toString()
      );
      if (session) {
        const dateKey = session.date.toISOString().split("T")[0];
        const sheetBulls = bulls.filter(
          (b) => b.targetSheetId.toString() === sheet._id.toString()
        );
        if (!sessionGroups.has(dateKey)) {
          sessionGroups.set(dateKey, []);
        }
        sessionGroups.get(dateKey)!.push(...sheetBulls);
      }
    });

    return Array.from(sessionGroups.entries())
      .map(([date, groupBulls]) => {
        const metrics = aggregateBullMetrics(groupBulls);
        if (metrics.totalShots < minShots) return null;
        return {
          x: date,
          value: metrics.avgScorePerShot,
          label: date,
        };
      })
      .filter((item): item is { x: string; value: number; label: string } => item !== null)
      .sort((a, b) => a.x.localeCompare(b.x));
  } else if (groupBy === "distance") {
    // Group by distance yards
    const distanceGroups: Map<number, any[]> = new Map();

    sheets.forEach((sheet: any) => {
      const distance = sheet.distanceYards;
      const sheetBulls = bulls.filter(
        (b) => b.targetSheetId.toString() === sheet._id.toString()
      );
      if (!distanceGroups.has(distance)) {
        distanceGroups.set(distance, []);
      }
      distanceGroups.get(distance)!.push(...sheetBulls);
    });

    return Array.from(distanceGroups.entries())
      .map(([distance, groupBulls]) => {
        const metrics = aggregateBullMetrics(groupBulls);
        if (metrics.totalShots < minShots) return null;
        return {
          x: distance,
          value: metrics.avgScorePerShot,
          label: `${distance}yd`,
        };
      })
      .filter((item): item is { x: number; value: number; label: string } => item !== null)
      .sort((a, b) => a.x - b.x);
  } else if (groupBy === "sequence") {
    // Group by shot sequence (e.g., first 10, next 10, etc.)
    const bucketSize = 10;
    const buckets: Map<number, any[]> = new Map();

    bulls.forEach((bull) => {
      if (bull.shotPositions && bull.shotPositions.length > 0) {
        bull.shotPositions.forEach((shot: any, index: number) => {
          const bucketIndex = Math.floor(index / bucketSize);
          if (!buckets.has(bucketIndex)) {
            buckets.set(bucketIndex, []);
          }
          buckets.get(bucketIndex)!.push(shot);
        });
      }
    });

    return Array.from(buckets.entries())
      .map(([bucketIndex, shots]) => {
        if (shots.length < minShots) return null;
        const avgScore =
          shots.reduce((sum: number, s: any) => sum + s.score, 0) / shots.length;
        return {
          x: bucketIndex + 1,
          value: avgScore,
          label: `Shots ${bucketIndex * bucketSize + 1}-${(bucketIndex + 1) * bucketSize}`,
        };
      })
      .filter((item): item is { x: number; value: number; label: string } => item !== null)
      .sort((a, b) => a.x - b.x);
  }

  return [];
}

function calculateDeltas(items: ComparisonItem[]): Delta[] {
  const metrics: MetricKey[] = [
    "avgScorePerShot",
    "bullRate",
    "missRate",
    "goodHitRate",
  ];

  // Add meanRadius if all items have it
  if (items.every((item) => item.metrics.meanRadius !== undefined)) {
    metrics.push("meanRadius" as MetricKey);
  }

  return metrics.map((metric) => {
    const values = items.map((item) => ({
      id: item.id,
      value: item.metrics[metric] as number,
    }));

    // Determine best/worst based on metric (lower is better for miss rate and mean radius)
    const lowerIsBetter = metric === "missRate" || metric === "meanRadius";

    const sorted = [...values].sort((a, b) =>
      lowerIsBetter ? a.value - b.value : b.value - a.value
    );

    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const range = Math.abs(best.value - worst.value);
    const percentDiff = worst.value !== 0 ? (range / worst.value) * 100 : 0;

    return {
      metric,
      items: values,
      best,
      worst,
      range,
      percentDiff,
    };
  });
}

function generateInsights(
  items: ComparisonItem[],
  deltas: Delta[],
  type: ItemType
): string[] {
  const insights: string[] = [];

  // Find the overall best performer
  const avgScoreDelta = deltas.find((d) => d.metric === "avgScorePerShot");
  if (avgScoreDelta && avgScoreDelta.percentDiff > 5) {
    const bestItem = items.find((i) => i.id === avgScoreDelta.best.id);
    const worstItem = items.find((i) => i.id === avgScoreDelta.worst.id);
    if (bestItem && worstItem) {
      insights.push(
        `${bestItem.name} leads with ${avgScoreDelta.best.value.toFixed(2)} avg score, outperforming ${worstItem.name} by ${avgScoreDelta.percentDiff.toFixed(1)}%`
      );
    }
  }

  // Bull rate comparison
  const bullRateDelta = deltas.find((d) => d.metric === "bullRate");
  if (bullRateDelta && bullRateDelta.percentDiff > 10) {
    const bestItem = items.find((i) => i.id === bullRateDelta.best.id);
    if (bestItem) {
      insights.push(
        `${bestItem.name} achieves the highest bullseye rate at ${(bullRateDelta.best.value * 100).toFixed(1)}%`
      );
    }
  }

  // Consistency (miss rate)
  const missRateDelta = deltas.find((d) => d.metric === "missRate");
  if (missRateDelta) {
    const bestItem = items.find((i) => i.id === missRateDelta.best.id);
    const worstItem = items.find((i) => i.id === missRateDelta.worst.id);
    if (bestItem && worstItem && missRateDelta.percentDiff > 20) {
      insights.push(
        `${bestItem.name} shows better consistency with ${(missRateDelta.best.value * 100).toFixed(1)}% miss rate vs. ${worstItem.name} at ${(missRateDelta.worst.value * 100).toFixed(1)}%`
      );
    }
  }

  // Data volume note
  const minSessions = Math.min(...items.map((i) => i.metrics.totalSessions));
  const maxSessions = Math.max(...items.map((i) => i.metrics.totalSessions));
  if (minSessions < 5) {
    const limitedItem = items.find((i) => i.metrics.totalSessions === minSessions);
    if (limitedItem) {
      insights.push(
        `Note: ${limitedItem.name} has limited data (${minSessions} sessions) - results may vary with more usage`
      );
    }
  }

  // Trend insight if data available
  if (items[0].trend && items[0].trend.length >= 3) {
    const firstItemTrend = items[0].trend;
    const firstValue = firstItemTrend[0].value;
    const lastValue = firstItemTrend[firstItemTrend.length - 1].value;
    const trendChange = ((lastValue - firstValue) / firstValue) * 100;

    if (Math.abs(trendChange) > 10) {
      const direction = trendChange > 0 ? "improving" : "declining";
      insights.push(
        `${items[0].name} shows ${direction} trend with ${Math.abs(trendChange).toFixed(1)}% change over time`
      );
    }
  }

  return insights;
}
