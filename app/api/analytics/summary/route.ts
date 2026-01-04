import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { calculateBullMetrics } from "@/lib/metrics";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStart = searchParams.get("dateStart");
    const dateEnd = searchParams.get("dateEnd");
    const firearmIds = searchParams.get("firearmIds")?.split(",").filter(Boolean);
    const caliberIds = searchParams.get("caliberIds")?.split(",").filter(Boolean);
    const distanceMin = searchParams.get("distanceMin");
    const distanceMax = searchParams.get("distanceMax");

    await connectToDatabase();

    // Build session query
    const sessionQuery: any = {};
    if (dateStart || dateEnd) {
      sessionQuery.date = {};
      if (dateStart) sessionQuery.date.$gte = new Date(dateStart);
      if (dateEnd) sessionQuery.date.$lte = new Date(dateEnd);
    }

    const sessions = await RangeSession.find(sessionQuery).sort({ date: 1 });
    const sessionIds = sessions.map((s) => s._id);

    // Build sheet query
    const sheetQuery: any = { rangeSessionId: { $in: sessionIds } };
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

    const sheets = await TargetSheet.find(sheetQuery)
      .populate("firearmId")
      .populate("caliberId")
      .populate("rangeSessionId");

    // Get bulls for these sheets
    const sheetIds = sheets.map((s) => s._id);
    const bulls = await BullRecord.find({ targetSheetId: { $in: sheetIds } });

    // Calculate metrics per session
    const sessionMetrics = sessions
      .map((session) => {
        const sessionSheets = sheets.filter(
          (s: any) => s.rangeSessionId._id.toString() === session._id.toString()
        );

        const sessionBulls = bulls.filter((b) =>
          sessionSheets.some((s) => s._id.toString() === b.targetSheetId.toString())
        );

        let totalShots = 0;
        let totalScore = 0;

        sessionBulls.forEach((bull) => {
          const metrics = calculateBullMetrics(bull);
          totalShots += metrics.totalShots;
          totalScore += metrics.totalScore;
        });

        return {
          sessionId: session._id,
          date: session.date,
          location: session.location,
          totalShots,
          totalScore,
          averageScore: totalShots > 0 ? totalScore / totalShots : 0,
          sheetCount: sessionSheets.length,
        };
      })
      .filter((metric) => metric.sheetCount > 0); // Only include sessions with matching sheets

    // Overall stats
    const totalShots = sessionMetrics.reduce((sum, m) => sum + m.totalShots, 0);
    const totalScore = sessionMetrics.reduce((sum, m) => sum + m.totalScore, 0);

    return NextResponse.json({
      sessions: sessionMetrics,
      summary: {
        totalSessions: sessionMetrics.length, // Count only sessions with data
        totalShots,
        totalScore,
        averageScore: totalShots > 0 ? totalScore / totalShots : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

