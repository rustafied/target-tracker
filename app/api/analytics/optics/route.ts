import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { Optic } from "@/lib/models/Optic";
import { aggregateBullMetrics } from "@/lib/analytics-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const firearmIds = searchParams.get("firearmIds")?.split(",").filter(Boolean);
    const caliberIds = searchParams.get("caliberIds")?.split(",").filter(Boolean);
    const distanceMin = searchParams.get("distanceMin");
    const distanceMax = searchParams.get("distanceMax");
    const minShots = parseInt(searchParams.get("minShots") || "10");
    const positionOnly = searchParams.get("positionOnly") === "true";

    await connectToDatabase();

    // Fetch all optics
    const optics = await Optic.find({}).sort({ sortOrder: 1, name: 1 });

    // Fetch all sessions
    const sessions = await RangeSession.find({}).sort({ date: 1 });

    // Build sheet query (without opticId filter - we'll group by it)
    const sheetQuery: any = { rangeSessionId: { $in: sessions.map((s) => s._id) } };
    if (firearmIds && firearmIds.length > 0) {
      sheetQuery.firearmId = { $in: firearmIds };
    }
    if (caliberIds && caliberIds.length > 0) {
      sheetQuery.caliberId = { $in: caliberIds };
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

    // Calculate metrics per optic
    const leaderboard = optics
      .map((optic) => {
        const opticSheets = sheets.filter(
          (s: any) => s.opticId.toString() === optic._id.toString()
        );

        const opticBulls = filteredBulls.filter((b) =>
          opticSheets.some((s) => s._id.toString() === b.targetSheetId.toString())
        );

        if (opticBulls.length === 0) return null;

        const metrics = aggregateBullMetrics(opticBulls);

        // Apply min shots filter
        if (metrics.totalShots < minShots) return null;

        return {
          opticId: optic._id.toString(),
          opticName: optic.name,
          ...metrics,
        };
      })
      .filter((m) => m !== null)
      .sort((a, b) => b.avgScorePerShot - a.avgScorePerShot);

    // Calculate session-over-session trends per optic
    const trends: Record<string, any[]> = {};
    optics.forEach((optic) => {
      const sessionTrends = sessions
        .map((session, index) => {
          const sessionSheets = sheets.filter(
            (s: any) =>
              s.rangeSessionId.toString() === session._id.toString() &&
              s.opticId.toString() === optic._id.toString()
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
        trends[optic._id.toString()] = sessionTrends;
      }
    });

    // Distance curves per optic
    const distanceCurves: Record<string, any[]> = {};
    optics.forEach((optic) => {
      const distanceGroups: Record<number, any[]> = {};

      sheets
        .filter((s: any) => s.opticId.toString() === optic._id.toString())
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
        distanceCurves[optic._id.toString()] = curve;
      }
    });

    return NextResponse.json({
      leaderboard,
      trends,
      distanceCurves,
    });
  } catch (error) {
    console.error("Error fetching optic analytics:", error);
    return NextResponse.json({ error: "Failed to fetch optic analytics" }, { status: 500 });
  }
}

