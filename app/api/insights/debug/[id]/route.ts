import { NextRequest, NextResponse } from "next/server";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { connectToDatabase } from "@/lib/db";
import { calculateBullScore, calculateBullTotalShots } from "@/lib/insights-engine";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const userId = await requireUserId(request);
    const { id } = await params;
    const sessionIdOrSlug = id;

    // Try to find by slug first, fallback to _id
    let rangeSession = await RangeSession.findOne({ slug: sessionIdOrSlug });
    if (!rangeSession) {
      rangeSession = await RangeSession.findById(sessionIdOrSlug);
    }
    
    if (!rangeSession) {
      return NextResponse.json({
        error: "Session not found",
        sessionIdOrSlug,
      }, { status: 404 });
    }

    const sessionId = rangeSession._id;

    // Fetch sheets
    const sheets = await TargetSheet.find({ rangeSessionId: sessionId });
    
    // Fetch bulls/aim points
    const bulls = await BullRecord.find({
      targetSheetId: { $in: sheets.map(s => s._id) },
    });

    // Get user's historical data
    const userSessions = await RangeSession.find({ userId });
    const userSheets = await TargetSheet.find({
      rangeSessionId: { $in: userSessions.map(s => s._id) },
    });
    const userBulls = await BullRecord.find({
      targetSheetId: { $in: userSheets.map(s => s._id) },
    });

    // Calculate basic stats using helper functions
    const totalScore = bulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
    const totalShots = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
    const avgScore = totalShots > 0 ? totalScore / totalShots : 0;

    const userTotalScore = userBulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
    const userTotalShots = userBulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
    const historicalAvg = userTotalShots > 0 ? userTotalScore / userTotalShots : 0;

    return NextResponse.json({
      debug: {
        sessionFound: !!rangeSession,
        sessionId: rangeSession._id,
        sessionUserId: rangeSession.userId,
        requestUserId: userId,
        userIdMatch: rangeSession.userId?.toString() === userId.toString(),
        sheetCount: sheets.length,
        bullCount: bulls.length,
        avgScore,
        historicalSessions: userSessions.length,
        historicalBulls: userBulls.length,
        historicalAvg,
        sampleBull: bulls[0] || null,
        sampleSheet: sheets[0] || null,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { 
        error: "Debug failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
