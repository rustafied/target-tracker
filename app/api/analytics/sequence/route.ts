import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/AimPointRecord";
import { RangeSession } from "@/lib/models/RangeSession";

interface SequenceBucket {
  bucket: number;
  label: string;
  avgScore: number;
  bullRate: number;
  missRate: number;
  meanRadius: number | null;
  biasX: number | null;
  biasY: number | null;
  shotCount: number;
  sessions: number;
}

interface TrendAnalysis {
  slope: number;
  direction: "improving" | "stable" | "declining";
  confidence: number;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const metric = searchParams.get("metric") || "avgScore";
    const bucketType = searchParams.get("bucketType") || "fixed";
    const bucketSize = parseInt(searchParams.get("bucketSize") || "10");
    const sessionIds = searchParams.get("sessionIds")?.split(",").filter(Boolean) || [];
    const firearmIds = searchParams.get("firearmIds")?.split(",").filter(Boolean) || [];
    const caliberIds = searchParams.get("caliberIds")?.split(",").filter(Boolean) || [];
    const opticIds = searchParams.get("opticIds")?.split(",").filter(Boolean) || [];
    const distanceMin = searchParams.get("distanceMin");
    const distanceMax = searchParams.get("distanceMax");
    const minShots = parseInt(searchParams.get("minShots") || "20");
    const positionOnly = searchParams.get("positionOnly") === "true";
    
    // Build sheet filter
    const sheetFilter: any = {};
    if (firearmIds.length > 0) sheetFilter.firearmId = { $in: firearmIds };
    if (caliberIds.length > 0) sheetFilter.caliberId = { $in: caliberIds };
    if (opticIds.length > 0) sheetFilter.opticId = { $in: opticIds };
    if (distanceMin) sheetFilter.distanceYards = { $gte: parseFloat(distanceMin) };
    if (distanceMax) {
      sheetFilter.distanceYards = sheetFilter.distanceYards || {};
      sheetFilter.distanceYards.$lte = parseFloat(distanceMax);
    }
    
    // Build session filter
    const sessionFilter: any = {};
    if (sessionIds.length > 0) {
      sessionFilter._id = { $in: sessionIds };
    }
    
    // Get matching sessions
    const sessions = await RangeSession.find(sessionFilter).sort({ date: -1 }).limit(50).lean();
    const sessionIdsFiltered = sessions.map(s => s._id);
    
    // Get sheets for these sessions
    sheetFilter.rangeSessionId = { $in: sessionIdsFiltered };
    const sheets = await TargetSheet.find(sheetFilter).lean();
    const sheetIdsFiltered = sheets.map(s => s._id);
    
    if (sheetIdsFiltered.length === 0) {
      return NextResponse.json({
        buckets: [],
        overall: { avgScore: 0, bullRate: 0, missRate: 0, totalShots: 0 },
        trend: null,
        insights: []
      });
    }
    
    // Get all bull records for these sheets
    const bullFilter: any = { targetSheetId: { $in: sheetIdsFiltered } };
    const bulls = await BullRecord.find(bullFilter).lean();
    
    // Extract all shots with sequence information
    interface ShotWithMeta {
      sessionId: string;
      sheetId: string;
      shotIndex: number;
      score: number;
      x?: number;
      y?: number;
      hasPosition: boolean;
    }
    
    const allShots: ShotWithMeta[] = [];
    
    for (const bull of bulls) {
      const sheet = sheets.find(s => s._id.toString() === bull.targetSheetId.toString());
      if (!sheet) continue;
      
      // If we have shotPositions, use them (they maintain sequence)
      if (bull.shotPositions && bull.shotPositions.length > 0) {
        bull.shotPositions.forEach((shot, idx) => {
          if (!positionOnly || (shot.x !== undefined && shot.y !== undefined)) {
            allShots.push({
              sessionId: sheet.rangeSessionId.toString(),
              sheetId: sheet._id.toString(),
              shotIndex: idx,
              score: shot.score,
              x: shot.x,
              y: shot.y,
              hasPosition: shot.x !== undefined && shot.y !== undefined
            });
          }
        });
      } else if (!positionOnly) {
        // No position data, but we can still analyze scores
        // Expand count fields into individual shots (sequence is approximate)
        let shotIndex = 0;
        for (let score = 5; score >= 0; score--) {
          const count = (bull as any)[`score${score}Count`] || 0;
          for (let i = 0; i < count; i++) {
            allShots.push({
              sessionId: sheet.rangeSessionId.toString(),
              sheetId: sheet._id.toString(),
              shotIndex: shotIndex++,
              score,
              hasPosition: false
            });
          }
        }
      }
    }
    
    if (allShots.length < minShots) {
      return NextResponse.json({
        buckets: [],
        overall: { avgScore: 0, bullRate: 0, missRate: 0, totalShots: 0 },
        trend: null,
        insights: ["Not enough shots for analysis. Minimum: " + minShots]
      });
    }
    
    // Group shots by session to determine session lengths
    const shotsBySession = allShots.reduce((acc, shot) => {
      if (!acc[shot.sessionId]) acc[shot.sessionId] = [];
      acc[shot.sessionId].push(shot);
      return acc;
    }, {} as Record<string, ShotWithMeta[]>);
    
    // Filter out sessions with too few shots
    Object.keys(shotsBySession).forEach(sessionId => {
      if (shotsBySession[sessionId].length < minShots) {
        delete shotsBySession[sessionId];
      } else {
        // Sort by shotIndex to maintain sequence
        shotsBySession[sessionId].sort((a, b) => a.shotIndex - b.shotIndex);
      }
    });
    
    // Assign buckets to each shot
    interface ShotWithBucket extends ShotWithMeta {
      bucket: number;
    }
    
    const shotsWithBuckets: ShotWithBucket[] = [];
    
    Object.entries(shotsBySession).forEach(([sessionId, shots]) => {
      const sessionLength = shots.length;
      
      shots.forEach((shot, globalIndex) => {
        let bucket = 0;
        
        if (bucketType === "percentile") {
          // Divide into thirds or quarters
          const percentile = globalIndex / sessionLength;
          bucket = Math.floor(percentile * 3); // 0, 1, 2 for thirds
        } else {
          // Fixed bucket size
          bucket = Math.floor(globalIndex / bucketSize);
        }
        
        shotsWithBuckets.push({ ...shot, bucket });
      });
    });
    
    // Calculate metrics per bucket
    const bucketStats = shotsWithBuckets.reduce((acc, shot) => {
      if (!acc[shot.bucket]) {
        acc[shot.bucket] = {
          scores: [],
          bulls: 0,
          misses: 0,
          xValues: [],
          yValues: [],
          sessions: new Set<string>()
        };
      }
      
      acc[shot.bucket].scores.push(shot.score);
      if (shot.score === 5) acc[shot.bucket].bulls++;
      if (shot.score === 0) acc[shot.bucket].misses++;
      if (shot.x !== undefined) acc[shot.bucket].xValues.push(shot.x);
      if (shot.y !== undefined) acc[shot.bucket].yValues.push(shot.y);
      acc[shot.bucket].sessions.add(shot.sessionId);
      
      return acc;
    }, {} as Record<number, any>);
    
    // Build bucket results
    const buckets: SequenceBucket[] = Object.entries(bucketStats)
      .map(([bucketNum, stats]) => {
        const bucket = parseInt(bucketNum);
        const shotCount = stats.scores.length;
        const avgScore = stats.scores.reduce((a: number, b: number) => a + b, 0) / shotCount;
        const bullRate = stats.bulls / shotCount;
        const missRate = stats.misses / shotCount;
        
        let meanRadius: number | null = null;
        let biasX: number | null = null;
        let biasY: number | null = null;
        
        if (stats.xValues.length > 0 && stats.yValues.length > 0) {
          // Calculate mean radius from center (100, 100 in SVG space)
          const centerX = 100;
          const centerY = 100;
          const radii = stats.xValues.map((x: number, i: number) => {
            const y = stats.yValues[i];
            return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          });
          meanRadius = radii.reduce((a: number, b: number) => a + b, 0) / radii.length;
          
          // Calculate bias (average deviation from center)
          biasX = stats.xValues.reduce((a: number, b: number) => a + b, 0) / stats.xValues.length - centerX;
          biasY = stats.yValues.reduce((a: number, b: number) => a + b, 0) / stats.yValues.length - centerY;
        }
        
        let label = "";
        if (bucketType === "percentile") {
          const labels = ["Early (1st third)", "Middle (2nd third)", "Late (3rd third)"];
          label = labels[bucket] || `Bucket ${bucket + 1}`;
        } else {
          const start = bucket * bucketSize + 1;
          const end = start + bucketSize - 1;
          label = `Shots ${start}-${end}`;
        }
        
        return {
          bucket,
          label,
          avgScore,
          bullRate,
          missRate,
          meanRadius,
          biasX,
          biasY,
          shotCount,
          sessions: stats.sessions.size
        };
      })
      .sort((a, b) => a.bucket - b.bucket);
    
    // Calculate overall stats
    const totalShots = allShots.length;
    const overall = {
      avgScore: allShots.reduce((sum, s) => sum + s.score, 0) / totalShots,
      bullRate: allShots.filter(s => s.score === 5).length / totalShots,
      missRate: allShots.filter(s => s.score === 0).length / totalShots,
      totalShots
    };
    
    // Calculate trend (simple linear regression on selected metric)
    let trend: TrendAnalysis | null = null;
    if (buckets.length >= 3) {
      const metricValues = buckets.map(b => {
        switch (metric) {
          case "bullRate": return b.bullRate;
          case "missRate": return b.missRate;
          case "meanRadius": return b.meanRadius || 0;
          case "biasX": return b.biasX || 0;
          case "biasY": return b.biasY || 0;
          default: return b.avgScore;
        }
      });
      
      const xValues = buckets.map((_, i) => i);
      const n = buckets.length;
      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = metricValues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * metricValues[i], 0);
      const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      
      // Calculate R² for confidence
      const meanY = sumY / n;
      const ssTotal = metricValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
      const ssResidual = metricValues.reduce((sum, y, i) => {
        const predicted = (sumY / n) + slope * (i - sumX / n);
        return sum + Math.pow(y - predicted, 2);
      }, 0);
      const rSquared = 1 - (ssResidual / ssTotal);
      
      let direction: "improving" | "stable" | "declining" = "stable";
      const threshold = 0.01;
      
      // For missRate and meanRadius, negative slope is improving
      const isInverseMetric = metric === "missRate" || metric === "meanRadius";
      
      if (Math.abs(slope) > threshold) {
        if (isInverseMetric) {
          direction = slope < 0 ? "improving" : "declining";
        } else {
          direction = slope > 0 ? "improving" : "declining";
        }
      }
      
      trend = {
        slope,
        direction,
        confidence: rSquared
      };
    }
    
    // Generate insights
    const insights: string[] = [];
    
    if (buckets.length >= 2) {
      const firstBucket = buckets[0];
      const lastBucket = buckets[buckets.length - 1];
      
      // Average score change
      const scoreDelta = lastBucket.avgScore - firstBucket.avgScore;
      const scorePercent = (scoreDelta / firstBucket.avgScore) * 100;
      if (Math.abs(scorePercent) > 5) {
        insights.push(
          `Average score ${scoreDelta > 0 ? "improves" : "declines"} from ${firstBucket.avgScore.toFixed(2)} to ${lastBucket.avgScore.toFixed(2)} (${Math.abs(scorePercent).toFixed(1)}% ${scoreDelta > 0 ? "increase" : "drop"})`
        );
      }
      
      // Miss rate change
      const missDelta = lastBucket.missRate - firstBucket.missRate;
      const missPercent = (missDelta / Math.max(firstBucket.missRate, 0.01)) * 100;
      if (Math.abs(missPercent) > 20 && Math.abs(missDelta) > 0.05) {
        if (missDelta > 0) {
          insights.push(
            `Miss rate increases in later shots (${(firstBucket.missRate * 100).toFixed(1)}% → ${(lastBucket.missRate * 100).toFixed(1)}%)—suggests fatigue`
          );
        } else {
          insights.push(
            `Miss rate decreases in later shots (${(firstBucket.missRate * 100).toFixed(1)}% → ${(lastBucket.missRate * 100).toFixed(1)}%)—good warm-up effect`
          );
        }
      }
      
      // Bias shift
      if (firstBucket.biasX !== null && lastBucket.biasX !== null) {
        const biasXDelta = lastBucket.biasX - firstBucket.biasX;
        if (Math.abs(biasXDelta) > 5) {
          insights.push(
            `Horizontal bias shifts ${biasXDelta > 0 ? "right" : "left"} by ${Math.abs(biasXDelta).toFixed(1)} units—check form consistency`
          );
        }
      }
      
      // Consistent performance
      if (Math.abs(scorePercent) < 3 && insights.length === 0) {
        insights.push("Performance remains consistent across all shot buckets—excellent stamina");
      }
      
      // Trend-based insights
      if (trend && trend.confidence > 0.5) {
        if (trend.direction === "declining") {
          insights.push(
            `Clear downward trend detected (confidence: ${(trend.confidence * 100).toFixed(0)}%)—consider endurance training`
          );
        } else if (trend.direction === "improving") {
          insights.push(
            `Performance improves throughout session (confidence: ${(trend.confidence * 100).toFixed(0)}%)—effective warm-up`
          );
        }
      }
    }
    
    return NextResponse.json({
      buckets,
      overall,
      trend,
      insights
    });
    
  } catch (error) {
    console.error("Error in sequence analysis:", error);
    return NextResponse.json(
      { error: "Failed to analyze sequence data" },
      { status: 500 }
    );
  }
}
