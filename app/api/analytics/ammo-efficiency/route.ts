import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { Caliber } from "@/lib/models/Caliber";
import { Firearm } from "@/lib/models/Firearm";
import { Optic } from "@/lib/models/Optic";

interface EfficiencyMetrics {
  caliberId: string;
  caliberName: string;
  totalShots: number;
  totalScore: number;
  bullCount: number;
  avgScore: number;
  bullRate: number;
  
  // Efficiency metrics
  scorePerRound: number;
  bullsPer100: number;
  
  // Cost metrics (if available)
  costPerRound?: number;
  totalCost?: number;
  costPerPoint?: number;
  costPerBull?: number;
  
  // Composite
  valueScore: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters
    const caliberIds = searchParams.get("caliberIds")?.split(",").filter(Boolean);
    const firearmIds = searchParams.get("firearmIds")?.split(",").filter(Boolean);
    const opticIds = searchParams.get("opticIds")?.split(",").filter(Boolean);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const minShots = parseInt(searchParams.get("minShots") || "50");
    const includeCosts = searchParams.get("includeCosts") !== "false";

    await connectToDatabase();
    
    // Ensure models are registered
    void Firearm;
    void Optic;

    // Build session query
    const sessionQuery: any = {};
    if (startDate || endDate) {
      sessionQuery.date = {};
      if (startDate) sessionQuery.date.$gte = new Date(startDate);
      if (endDate) sessionQuery.date.$lte = new Date(endDate);
    }

    const sessions = await RangeSession.find(sessionQuery);
    const sessionIds = sessions.map((s) => s._id);

    // Build sheet query
    const sheetQuery: any = { rangeSessionId: { $in: sessionIds } };
    if (caliberIds && caliberIds.length > 0) {
      sheetQuery.caliberId = { $in: caliberIds };
    }
    if (firearmIds && firearmIds.length > 0) {
      sheetQuery.firearmId = { $in: firearmIds };
    }
    if (opticIds && opticIds.length > 0) {
      sheetQuery.opticId = { $in: opticIds };
    }

    const sheets = await TargetSheet.find(sheetQuery);
    const sheetIds = sheets.map((s) => s._id);

    // Fetch bulls
    const bulls = await BullRecord.find({ targetSheetId: { $in: sheetIds } });

    // Fetch calibers
    const caliberQuery: any = {};
    if (caliberIds && caliberIds.length > 0) {
      caliberQuery._id = { $in: caliberIds };
    }
    const calibers = await Caliber.find(caliberQuery);

    // Calculate metrics per caliber
    const efficiencyData: EfficiencyMetrics[] = [];

    for (const caliber of calibers) {
      const caliberSheets = sheets.filter(
        (s: any) => s.caliberId.toString() === caliber._id.toString()
      );

      const caliberBulls = bulls.filter((b) =>
        caliberSheets.some((s) => s._id.toString() === b.targetSheetId.toString())
      );

      if (caliberBulls.length === 0) continue;

      // Calculate basic metrics
      let totalShots = 0;
      let totalScore = 0;
      let bullCount = 0;

      caliberBulls.forEach((bull) => {
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

      // Apply min shots filter
      if (totalShots < minShots) continue;

      const avgScore = totalShots > 0 ? totalScore / totalShots : 0;
      const bullRate = totalShots > 0 ? bullCount / totalShots : 0;

      // Calculate efficiency metrics
      const scorePerRound = avgScore;
      const bullsPer100 = bullRate * 100;

      // Calculate cost metrics if available
      let costPerRound: number | undefined;
      let totalCost: number | undefined;
      let costPerPoint: number | undefined;
      let costPerBull: number | undefined;

      if (includeCosts) {
        // Determine effective cost per round
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

        if (costPerRound !== undefined) {
          totalCost = costPerRound * totalShots;
          costPerPoint = totalScore > 0 ? totalCost / totalScore : undefined;
          costPerBull = bullCount > 0 ? totalCost / bullCount : undefined;
        }
      }

      // Calculate value score (composite metric)
      // Formula: (avgScore * bullRate) / (1 + costFactor)
      // Higher performance and lower cost = higher value
      const costFactor = costPerRound !== undefined ? costPerRound : 0;
      const valueScore = (avgScore * bullRate * 100) / (1 + costFactor);

      efficiencyData.push({
        caliberId: caliber._id.toString(),
        caliberName: caliber.name,
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

    // Sort by value score descending
    efficiencyData.sort((a, b) => b.valueScore - a.valueScore);

    // Generate insights
    const insights: string[] = [];

    if (efficiencyData.length > 0) {
      // Top efficient caliber
      const topCaliber = efficiencyData[0];
      insights.push(
        `${topCaliber.caliberName} is your most efficient caliber with a value score of ${topCaliber.valueScore.toFixed(1)} (${topCaliber.scorePerRound.toFixed(2)} score/round, ${topCaliber.bullsPer100.toFixed(1)} bulls per 100 rounds)`
      );

      // Best cost efficiency (if costs available)
      const calibersWithCost = efficiencyData.filter((c) => c.costPerPoint !== undefined);
      if (calibersWithCost.length > 1) {
        const bestCostEfficiency = [...calibersWithCost].sort(
          (a, b) => (a.costPerPoint || Infinity) - (b.costPerPoint || Infinity)
        )[0];
        insights.push(
          `${bestCostEfficiency.caliberName} delivers the best cost efficiency at $${bestCostEfficiency.costPerPoint?.toFixed(3)}/point scored`
        );

        // Compare top vs bottom cost efficiency
        const worstCostEfficiency = [...calibersWithCost].sort(
          (a, b) => (b.costPerPoint || 0) - (a.costPerPoint || 0)
        )[0];
        if (bestCostEfficiency.caliberId !== worstCostEfficiency.caliberId) {
          const ratio = (worstCostEfficiency.costPerPoint || 0) / (bestCostEfficiency.costPerPoint || 1);
          insights.push(
            `${bestCostEfficiency.caliberName} is ${ratio.toFixed(1)}x more cost-efficient than ${worstCostEfficiency.caliberName} for scoring points`
          );
        }
      }

      // Best bulls per 100
      const bestBullRate = [...efficiencyData].sort((a, b) => b.bullsPer100 - a.bullsPer100)[0];
      if (bestBullRate.caliberId !== topCaliber.caliberId) {
        insights.push(
          `For maximum precision, ${bestBullRate.caliberName} delivers ${bestBullRate.bullsPer100.toFixed(1)} bulls per 100 rounds`
        );
      }

      // Identify high-cost low-performance calibers
      const expensiveCalibers = efficiencyData.filter(
        (c) => c.costPerRound !== undefined && c.costPerRound > 0.3 && c.avgScore < 3.5
      );
      if (expensiveCalibers.length > 0) {
        const expensive = expensiveCalibers[0];
        insights.push(
          `Consider alternatives to ${expensive.caliberName} for practice - high cost ($${expensive.costPerRound?.toFixed(2)}/round) with ${expensive.avgScore.toFixed(2)} avg score`
        );
      }

      // Recommend practice caliber (low cost, decent performance)
      const practiceCalibers = calibersWithCost.filter(
        (c) => (c.costPerRound || 0) < 0.15 && c.avgScore > 3.0
      );
      if (practiceCalibers.length > 0) {
        const practice = practiceCalibers[0];
        insights.push(
          `${practice.caliberName} is ideal for practice - affordable at $${practice.costPerRound?.toFixed(2)}/round with solid ${practice.avgScore.toFixed(2)} avg score`
        );
      }
    } else {
      insights.push("No calibers meet the minimum shot threshold. Record more sessions to see efficiency metrics.");
    }

    return NextResponse.json({
      calibers: efficiencyData,
      insights,
    });
  } catch (error) {
    console.error("Error fetching ammo efficiency:", error);
    return NextResponse.json({ error: "Failed to fetch ammo efficiency metrics" }, { status: 500 });
  }
}
