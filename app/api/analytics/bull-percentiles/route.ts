import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";
import { TargetSheet } from "@/lib/models/TargetSheet";

interface BullPercentileRequest {
  bullId: string;
  averageScore: number;
  firearmId: string;
}

interface BullPercentileResponse {
  bullId: string;
  overallPercentile: number;
  firearmPercentile: number;
  overallRank: number;
  firearmRank: number;
  totalBulls: number;
  firearmBulls: number;
}

function calculateBullAverage(bull: any): number {
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

  return totalShots > 0 ? totalScore / totalShots : 0;
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
    const body: BullPercentileRequest[] = await request.json();
    
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch all bulls with their sheet data to get firearm IDs
    const allBulls = await BullRecord.find({}).lean();
    const sheetIds = [...new Set(allBulls.map(b => b.targetSheetId.toString()))];
    const sheets = await TargetSheet.find({ _id: { $in: sheetIds } }).lean();
    
    const sheetMap = new Map(sheets.map(s => [s._id.toString(), s]));
    
    // Calculate averages for all bulls and group by firearm
    const allAverages: number[] = [];
    const firearmAverages: Map<string, number[]> = new Map();
    
    for (const bull of allBulls) {
      const avg = calculateBullAverage(bull);
      if (avg === 0) continue; // Skip bulls with no shots
      
      allAverages.push(avg);
      
      const sheet = sheetMap.get(bull.targetSheetId.toString());
      if (sheet) {
        const firearmId = sheet.firearmId.toString();
        if (!firearmAverages.has(firearmId)) {
          firearmAverages.set(firearmId, []);
        }
        firearmAverages.get(firearmId)!.push(avg);
      }
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
    
    // Calculate percentiles for each requested bull
    const results: BullPercentileResponse[] = body.map(req => {
      const firearmAvgsAsc = sortedFirearmAscending.get(req.firearmId) || [];
      const firearmAvgsDesc = sortedFirearmDescending.get(req.firearmId) || [];
      
      return {
        bullId: req.bullId,
        overallPercentile: calculatePercentile(req.averageScore, sortedAllAscending),
        firearmPercentile: calculatePercentile(req.averageScore, firearmAvgsAsc),
        overallRank: calculateRank(req.averageScore, sortedAllDescending),
        firearmRank: calculateRank(req.averageScore, firearmAvgsDesc),
        totalBulls: allAverages.length,
        firearmBulls: firearmAvgsAsc.length,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error calculating bull percentiles:", error);
    return NextResponse.json({ error: "Failed to calculate percentiles" }, { status: 500 });
  }
}
