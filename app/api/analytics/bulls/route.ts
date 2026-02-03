import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { RangeSession } from "@/lib/models/RangeSession";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";

interface BullWithScore {
  bullId: string;
  score: number;
  totalShots: number;
  avgScorePerShot: number;
  bullIndex?: number;
  aimPointId?: string;
  targetSheetId: string;
  sessionId: string;
  sessionSlug: string;
  sessionDate: Date;
  sessionLocation?: string;
  firearmId: string;
  firearmName: string;
  firearmColor?: string;
  caliberId: string;
  caliberName: string;
  opticId: string;
  opticName: string;
  distanceYards: number;
  sheetLabel?: string;
  // For visualization
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
  shotPositions?: Array<{ x: number; y: number; score: number }>;
}

function calculateBullScore(bull: any): { score: number; totalShots: number } {
  let totalScore = 0;
  let totalShots = 0;

  // Try new countsByScore format first
  if (bull.countsByScore && typeof bull.countsByScore === "object") {
    const counts = bull.countsByScore instanceof Map 
      ? Object.fromEntries(bull.countsByScore)
      : bull.countsByScore;
    
    for (const [scoreStr, count] of Object.entries(counts)) {
      const score = parseInt(scoreStr);
      const cnt = Number(count);
      if (!isNaN(score) && !isNaN(cnt)) {
        totalScore += score * cnt;
        totalShots += cnt;
      }
    }
  }
  
  // Fall back to legacy fields
  if (totalShots === 0) {
    const s5 = bull.score5Count || 0;
    const s4 = bull.score4Count || 0;
    const s3 = bull.score3Count || 0;
    const s2 = bull.score2Count || 0;
    const s1 = bull.score1Count || 0;
    const s0 = bull.score0Count || 0;
    
    totalScore = s5 * 5 + s4 * 4 + s3 * 3 + s2 * 2 + s1 * 1;
    totalShots = s5 + s4 + s3 + s2 + s1 + s0;
  }

  return { score: totalScore, totalShots };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    await connectToDatabase();

    // Ensure models are registered
    void Firearm;
    void Caliber;
    void Optic;
    void RangeSession;
    void TargetSheet;

    // Fetch all bulls
    const bulls = await BullRecord.find({}).lean();

    // Get all target sheet IDs
    const sheetIds = [...new Set(bulls.map(b => b.targetSheetId.toString()))];

    // Fetch sheets with populated references
    const sheets = await TargetSheet.find({ _id: { $in: sheetIds } })
      .populate("rangeSessionId")
      .populate("firearmId")
      .populate("caliberId")
      .populate("opticId")
      .lean();

    // Create a map of sheet ID to sheet data
    const sheetMap = new Map(sheets.map(s => [s._id.toString(), s]));

    // Calculate scores and enrich data
    const enrichedBulls: BullWithScore[] = [];

    for (const bull of bulls) {
      const sheet = sheetMap.get(bull.targetSheetId.toString());
      if (!sheet) continue;

      const session = sheet.rangeSessionId as any;
      const firearm = sheet.firearmId as any;
      const caliber = sheet.caliberId as any;
      const optic = sheet.opticId as any;

      if (!session || !firearm || !caliber || !optic) continue;

      const { score, totalShots } = calculateBullScore(bull);
      
      // Skip bulls with no shots
      if (totalShots === 0) continue;

      // Get score counts - try countsByScore first, fallback to legacy
      let s5 = 0, s4 = 0, s3 = 0, s2 = 0, s1 = 0, s0 = 0;
      if (bull.countsByScore && typeof bull.countsByScore === "object") {
        const counts = bull.countsByScore instanceof Map 
          ? Object.fromEntries(bull.countsByScore)
          : bull.countsByScore;
        s5 = Number(counts["5"]) || 0;
        s4 = Number(counts["4"]) || 0;
        s3 = Number(counts["3"]) || 0;
        s2 = Number(counts["2"]) || 0;
        s1 = Number(counts["1"]) || 0;
        s0 = Number(counts["0"]) || 0;
      } else {
        s5 = bull.score5Count || 0;
        s4 = bull.score4Count || 0;
        s3 = bull.score3Count || 0;
        s2 = bull.score2Count || 0;
        s1 = bull.score1Count || 0;
        s0 = bull.score0Count || 0;
      }

      enrichedBulls.push({
        bullId: bull._id.toString(),
        score,
        totalShots,
        avgScorePerShot: totalShots > 0 ? score / totalShots : 0,
        bullIndex: bull.bullIndex,
        aimPointId: bull.aimPointId,
        targetSheetId: sheet._id.toString(),
        sessionId: session._id.toString(),
        sessionSlug: session.slug,
        sessionDate: session.date,
        sessionLocation: session.location,
        firearmId: firearm._id.toString(),
        firearmName: firearm.name,
        firearmColor: firearm.color,
        caliberId: caliber._id.toString(),
        caliberName: caliber.name,
        opticId: optic._id.toString(),
        opticName: optic.name,
        distanceYards: sheet.distanceYards,
        sheetLabel: sheet.sheetLabel,
        score5Count: s5,
        score4Count: s4,
        score3Count: s3,
        score2Count: s2,
        score1Count: s1,
        score0Count: s0,
        shotPositions: bull.shotPositions,
      });
    }

    // Sort by score (descending), then by avgScorePerShot (descending) for ties
    enrichedBulls.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.avgScorePerShot - a.avgScorePerShot;
    });

    // Take top N
    const topBulls = enrichedBulls.slice(0, limit);

    return NextResponse.json({
      bulls: topBulls,
      totalBulls: enrichedBulls.length,
    });
  } catch (error) {
    console.error("Error fetching top bulls:", error);
    return NextResponse.json({ error: "Failed to fetch top bulls" }, { status: 500 });
  }
}
