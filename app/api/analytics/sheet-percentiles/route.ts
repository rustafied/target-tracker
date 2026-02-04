import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";

interface SheetPercentileRequest {
  sheetId: string;
  averageScore: number;
  firearmId: string;
}

interface SheetPercentileResponse {
  sheetId: string;
  overallPercentile: number;
  firearmPercentile: number;
  overallRank: number;
  firearmRank: number;
  totalSheets: number;
  firearmSheets: number;
}

function calculateBullAverage(bull: any): { totalScore: number; totalShots: number } {
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

  return { totalScore, totalShots };
}

// Calculate percentile rank (percentage of values below the given value)
function calculatePercentile(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  
  // Count how many values are below this value
  let below = 0;
  for (const v of sortedValues) {
    if (v < value) below++;
    else break; // Since array is sorted, we can stop early
  }
  
  return Math.round((below / sortedValues.length) * 100);
}

// Calculate rank (1 = best)
function calculateRank(value: number, sortedDescValues: number[]): number {
  // Find position in descending sorted array (higher is better)
  for (let i = 0; i < sortedDescValues.length; i++) {
    if (value >= sortedDescValues[i]) {
      return i + 1;
    }
  }
  return sortedDescValues.length;
}

export async function POST(request: Request) {
  try {
    const body: SheetPercentileRequest[] = await request.json();
    
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch all sheets with their firearm IDs
    const allSheets = await TargetSheet.find({}).lean();
    const sheetIds = allSheets.map(s => s._id);
    
    // Fetch all bulls for these sheets
    const allBulls = await BullRecord.find({ targetSheetId: { $in: sheetIds } }).lean();
    
    // Group bulls by sheet
    const bullsBySheet = new Map<string, any[]>();
    for (const bull of allBulls) {
      const sheetId = bull.targetSheetId.toString();
      if (!bullsBySheet.has(sheetId)) {
        bullsBySheet.set(sheetId, []);
      }
      bullsBySheet.get(sheetId)!.push(bull);
    }
    
    // Calculate average scores for all sheets and group by firearm
    const allAverages: number[] = [];
    const firearmAverages: Map<string, number[]> = new Map();
    
    for (const sheet of allSheets) {
      const sheetBulls = bullsBySheet.get(sheet._id.toString()) || [];
      
      let sheetTotalScore = 0;
      let sheetTotalShots = 0;
      
      for (const bull of sheetBulls) {
        const { totalScore, totalShots } = calculateBullAverage(bull);
        sheetTotalScore += totalScore;
        sheetTotalShots += totalShots;
      }
      
      if (sheetTotalShots === 0) continue; // Skip sheets with no shots
      
      const avg = sheetTotalScore / sheetTotalShots;
      allAverages.push(avg);
      
      const firearmId = sheet.firearmId.toString();
      if (!firearmAverages.has(firearmId)) {
        firearmAverages.set(firearmId, []);
      }
      firearmAverages.get(firearmId)!.push(avg);
    }
    
    // Sort arrays for percentile calculation (ascending for percentile, descending for rank)
    const sortedAllAscending = [...allAverages].sort((a, b) => a - b);
    const sortedAllDescending = [...allAverages].sort((a, b) => b - a);
    
    const sortedFirearmAscending: Map<string, number[]> = new Map();
    const sortedFirearmDescending: Map<string, number[]> = new Map();
    
    for (const [firearmId, averages] of firearmAverages) {
      sortedFirearmAscending.set(firearmId, [...averages].sort((a, b) => a - b));
      sortedFirearmDescending.set(firearmId, [...averages].sort((a, b) => b - a));
    }
    
    // Calculate percentiles for each requested sheet
    const results: SheetPercentileResponse[] = body.map(req => {
      const firearmAvgsAsc = sortedFirearmAscending.get(req.firearmId) || [];
      const firearmAvgsDesc = sortedFirearmDescending.get(req.firearmId) || [];
      
      return {
        sheetId: req.sheetId,
        overallPercentile: calculatePercentile(req.averageScore, sortedAllAscending),
        firearmPercentile: calculatePercentile(req.averageScore, firearmAvgsAsc),
        overallRank: calculateRank(req.averageScore, sortedAllDescending),
        firearmRank: calculateRank(req.averageScore, firearmAvgsDesc),
        totalSheets: allAverages.length,
        firearmSheets: firearmAvgsAsc.length,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error calculating sheet percentiles:", error);
    return NextResponse.json({ error: "Failed to calculate percentiles" }, { status: 500 });
  }
}
