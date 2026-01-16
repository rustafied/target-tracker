import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { Caliber } from "@/lib/models/Caliber";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caliberId: string }> }
) {
  try {
    const { caliberId } = await params;
    await connectToDatabase();

    // Try to find by slug first, then fall back to ID
    let caliber = await Caliber.findOne({ slug: caliberId });
    
    if (!caliber) {
      try {
        caliber = await Caliber.findById(caliberId);
      } catch (e) {
        // Invalid ObjectId format
      }
    }
    
    if (!caliber) {
      return NextResponse.json({ error: "Caliber not found" }, { status: 404 });
    }

    // Calculate effective cost per round
    let costPerRound: number | undefined;
    if (caliber.costPerRound !== undefined && caliber.costPerRound > 0) {
      costPerRound = caliber.costPerRound;
    } else if (
      caliber.bulkCost !== undefined &&
      caliber.bulkQuantity !== undefined &&
      caliber.bulkCost > 0 &&
      caliber.bulkQuantity > 0
    ) {
      costPerRound = caliber.bulkCost / caliber.bulkQuantity;
    }

    // Get all sessions
    const sessions = await RangeSession.find({}).sort({ date: 1 });

    // Calculate efficiency per session
    const sessionEfficiency = [];

    for (const session of sessions) {
      // Get sheets for this caliber in this session
      const sheets = await TargetSheet.find({
        rangeSessionId: session._id,
        caliberId: caliberId,
      });

      if (sheets.length === 0) continue;

      const sheetIds = sheets.map((s) => s._id);
      const bulls = await BullRecord.find({ targetSheetId: { $in: sheetIds } });

      if (bulls.length === 0) continue;

      // Calculate metrics
      let totalShots = 0;
      let totalScore = 0;
      let bullCount = 0;

      bulls.forEach((bull) => {
        const shots =
          (bull.score5Count || 0) +
          (bull.score4Count || 0) +
          (bull.score3Count || 0) +
          (bull.score2Count || 0) +
          (bull.score1Count || 0) +
          (bull.score0Count || 0);

        const score =
          (bull.score5Count || 0) * 5 +
          (bull.score4Count || 0) * 4 +
          (bull.score3Count || 0) * 3 +
          (bull.score2Count || 0) * 2 +
          (bull.score1Count || 0) * 1;

        totalShots += shots;
        totalScore += score;
        bullCount += bull.score5Count || 0;
      });

      if (totalShots === 0) continue;

      const avgScore = totalScore / totalShots;
      const bullRate = bullCount / totalShots;
      const scorePerRound = avgScore;
      const bullsPer100 = bullRate * 100;

      // Cost metrics (if available)
      let totalCost: number | undefined;
      let costPerPoint: number | undefined;
      let costPerBull: number | undefined;

      if (costPerRound !== undefined) {
        totalCost = costPerRound * totalShots;
        costPerPoint = totalScore > 0 ? totalCost / totalScore : undefined;
        costPerBull = bullCount > 0 ? totalCost / bullCount : undefined;
      }

      // Value score
      const costFactor = costPerRound !== undefined ? costPerRound : 0;
      const valueScore = (avgScore * bullRate * 100) / (1 + costFactor);

      sessionEfficiency.push({
        sessionId: session._id.toString(),
        sessionSlug: session.slug,
        date: session.date,
        location: session.location,
        totalShots,
        totalScore,
        bullCount,
        avgScore,
        bullRate,
        scorePerRound,
        bullsPer100,
        costPerRound,
        totalCost,
        costPerPoint,
        costPerBull,
        valueScore,
      });
    }

    return NextResponse.json({
      caliber: {
        _id: caliber._id,
        name: caliber.name,
        costPerRound,
      },
      sessions: sessionEfficiency,
    });
  } catch (error) {
    console.error("Error fetching caliber efficiency:", error);
    return NextResponse.json(
      { error: "Failed to fetch efficiency data" },
      { status: 500 }
    );
  }
}
