import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { Caliber } from "@/lib/models/Caliber";
import { aggregateBullMetrics } from "@/lib/analytics-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const firearmIds = searchParams.get("firearmIds")?.split(",").filter(Boolean);
    const opticIds = searchParams.get("opticIds")?.split(",").filter(Boolean);
    const distanceMin = searchParams.get("distanceMin");
    const distanceMax = searchParams.get("distanceMax");
    const minShots = parseInt(searchParams.get("minShots") || "10");
    const positionOnly = searchParams.get("positionOnly") === "true";

    await connectToDatabase();

    // Fetch all calibers
    const calibers = await Caliber.find({}).sort({ sortOrder: 1, name: 1 });

    // Fetch all sessions
    const sessions = await RangeSession.find({}).sort({ date: 1 });

    // Build sheet query (without caliberId filter - we'll group by it)
    const sheetQuery: any = { rangeSessionId: { $in: sessions.map((s) => s._id) } };
    if (firearmIds && firearmIds.length > 0) {
      sheetQuery.firearmId = { $in: firearmIds };
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

    // Calculate metrics per caliber
    const leaderboard = calibers
      .map((caliber) => {
        const caliberSheets = sheets.filter(
          (s: any) => s.caliberId.toString() === caliber._id.toString()
        );

        const caliberBulls = filteredBulls.filter((b) =>
          caliberSheets.some((s) => s._id.toString() === b.targetSheetId.toString())
        );

        if (caliberBulls.length === 0) return null;

        const metrics = aggregateBullMetrics(caliberBulls);

        // Apply min shots filter
        if (metrics.totalShots < minShots) return null;

        return {
          caliberId: caliber._id.toString(),
          caliberName: caliber.name,
          ...metrics,
        };
      })
      .filter((m) => m !== null)
      .sort((a, b) => b.avgScorePerShot - a.avgScorePerShot);

    // Calculate session-over-session trends per caliber
    const trends: Record<string, any[]> = {};
    calibers.forEach((caliber) => {
      const sessionTrends = sessions
        .map((session, index) => {
          const sessionSheets = sheets.filter(
            (s: any) =>
              s.rangeSessionId.toString() === session._id.toString() &&
              s.caliberId.toString() === caliber._id.toString()
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
        trends[caliber._id.toString()] = sessionTrends;
      }
    });

    // Distance curves per caliber
    const distanceCurves: Record<string, any[]> = {};
    calibers.forEach((caliber) => {
      const distanceGroups: Record<number, any[]> = {};

      sheets
        .filter((s: any) => s.caliberId.toString() === caliber._id.toString())
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
        distanceCurves[caliber._id.toString()] = curve;
      }
    });

    return NextResponse.json({
      leaderboard,
      trends,
      distanceCurves,
    });
  } catch (error) {
    console.error("Error fetching caliber analytics:", error);
    return NextResponse.json({ error: "Failed to fetch caliber analytics" }, { status: 500 });
  }
}

