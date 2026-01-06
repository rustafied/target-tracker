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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const caliberIds = searchParams.get("caliberIds")?.split(",").filter(Boolean);
    const opticIds = searchParams.get("opticIds")?.split(",").filter(Boolean);
    const distanceMin = searchParams.get("distanceMin");
    const distanceMax = searchParams.get("distanceMax");
    const minShots = parseInt(searchParams.get("minShots") || "10");
    const positionOnly = searchParams.get("positionOnly") === "true";

    await connectToDatabase();
    
    // Ensure models are registered
    void Caliber;
    void Optic;
    void TargetTemplate;

    // Fetch all firearms
    const firearms = await Firearm.find({}).sort({ sortOrder: 1, name: 1 });

    // Fetch all sessions
    const sessions = await RangeSession.find({}).sort({ date: 1 });

    // Build sheet query (without firearmId filter - we'll group by it)
    const sheetQuery: any = { rangeSessionId: { $in: sessions.map((s) => s._id) } };
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

    // Calculate metrics per firearm
    const leaderboard = firearms
      .map((firearm) => {
        const firearmSheets = sheets.filter(
          (s: any) => s.firearmId.toString() === firearm._id.toString()
        );

        const firearmBulls = filteredBulls.filter((b) =>
          firearmSheets.some((s) => s._id.toString() === b.targetSheetId.toString())
        );

        if (firearmBulls.length === 0) return null;

        const metrics = aggregateBullMetrics(firearmBulls);

        // Apply min shots filter
        if (metrics.totalShots < minShots) return null;

        return {
          firearmId: firearm._id.toString(),
          firearmName: firearm.name,
          ...metrics,
        };
      })
      .filter((m) => m !== null)
      .sort((a, b) => b.avgScorePerShot - a.avgScorePerShot); // Sort by avg score desc

    // Calculate session-over-session trends per firearm (for detail view)
    const trends: Record<string, any[]> = {};
    firearms.forEach((firearm) => {
      const sessionTrends = sessions
        .map((session, index) => {
          const sessionSheets = sheets.filter(
            (s: any) =>
              s.rangeSessionId.toString() === session._id.toString() &&
              s.firearmId.toString() === firearm._id.toString()
          );

          const sessionBulls = filteredBulls.filter((b) =>
            sessionSheets.some((s) => s._id.toString() === b.targetSheetId.toString())
          );

          if (sessionBulls.length === 0) return null;

          const metrics = aggregateBullMetrics(sessionBulls);

          return {
            sessionIndex: index,
            sessionId: session._id.toString(),
            date: session.date,
            ...metrics,
          };
        })
        .filter((m) => m !== null);

      if (sessionTrends.length > 0) {
        trends[firearm._id.toString()] = sessionTrends;
      }
    });

    // Distance curves per firearm
    const distanceCurves: Record<string, any[]> = {};
    firearms.forEach((firearm) => {
      const distanceGroups: Record<number, any[]> = {};

      sheets
        .filter((s: any) => s.firearmId.toString() === firearm._id.toString())
        .forEach((sheet: any) => {
          const distance = sheet.distanceYards;
          if (!distanceGroups[distance]) {
            distanceGroups[distance] = [];
          }

          const sheetBulls = filteredBulls.filter(
            (b) => b.targetSheetId.toString() === sheet._id.toString()
          );
          distanceGroups[distance].push(...sheetBulls);
        });

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
        distanceCurves[firearm._id.toString()] = curve;
      }
    });

    return NextResponse.json({
      leaderboard,
      trends,
      distanceCurves,
    });
  } catch (error) {
    console.error("Error fetching firearm analytics:", error);
    return NextResponse.json({ error: "Failed to fetch firearm analytics" }, { status: 500 });
  }
}

