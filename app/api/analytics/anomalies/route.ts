import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";
import { requireUserId } from "@/lib/auth-helpers";

interface SessionMetrics {
  sessionId: string;
  slug: string;
  date: string;
  location?: string;
  avgScore: number;
  missRate: number;
  bullRate: number;
  totalShots: number;
  meanRadius?: number;
  avgDistance: number;
  sheetCount: number;
  uniqueFirearms: number;
  uniqueOptics: number;
  firstFirearmUse: boolean;
  firstOpticUse: boolean;
}

interface GlobalAverages {
  avgScore: number;
  missRate: number;
  bullRate: number;
  meanRadius: number;
  avgDistance: number;
  totalShots: number;
  sessionCount: number;
}

interface Deviation {
  metric: string;
  value: number;
  average: number;
  percentDeviation: number;
  isAnomaly: boolean;
}

interface Cause {
  type: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

interface AnomalyResult {
  sessionId: string;
  slug: string;
  date: string;
  location?: string;
  isAnomaly: boolean;
  severity: "high" | "medium" | "low";
  deviations: Deviation[];
  causes: Cause[];
  metrics: SessionMetrics;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const threshold = parseFloat(searchParams.get("threshold") || "20");
    const minSessions = parseInt(searchParams.get("minSessions") || "5");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const statistical = searchParams.get("statistical") === "true"; // Use z-scores
    
    await connectToDatabase();
    const userId = await requireUserId(request);
    
    // Ensure models are registered
    void Firearm;
    void Optic;
    void Caliber;
    
    // Build session query
    const sessionQuery: any = {};
    if (startDate || endDate) {
      sessionQuery.date = {};
      if (startDate) sessionQuery.date.$gte = new Date(startDate);
      if (endDate) sessionQuery.date.$lte = new Date(endDate);
    }
    
    // Fetch all sessions
    const sessions = await RangeSession.find(sessionQuery).sort({ date: -1 });
    
    if (sessions.length < minSessions) {
      return NextResponse.json({
        anomalies: [],
        globalAverages: null,
        insights: [`Need at least ${minSessions} sessions for anomaly detection. Currently have ${sessions.length}.`],
      });
    }
    
    // Calculate metrics for each session
    const sessionMetrics: SessionMetrics[] = [];
    const allFirearmHistory: Map<string, Date[]> = new Map(); // Track first uses
    const allOpticHistory: Map<string, Date[]> = new Map();
    
    for (const session of sessions) {
      const sheets = await TargetSheet.find({ rangeSessionId: session._id });
      const sheetIds = sheets.map(s => s._id);
      const bulls = await BullRecord.find({ targetSheetId: { $in: sheetIds } });
      
      if (bulls.length === 0) continue; // Skip sessions with no data
      
      // Calculate session metrics
      let totalShots = 0;
      let totalScore = 0;
      let bullCount = 0;
      let missCount = 0;
      
      bulls.forEach(bull => {
        const shots = 
          (bull.score5Count || 0) +
          (bull.score4Count || 0) +
          (bull.score3Count || 0) +
          (bull.score2Count || 0) +
          (bull.score1Count || 0) +
          (bull.score0Count || 0);
        
        const score =
          ((bull.score5Count || 0) * 5) +
          ((bull.score4Count || 0) * 4) +
          ((bull.score3Count || 0) * 3) +
          ((bull.score2Count || 0) * 2) +
          ((bull.score1Count || 0) * 1);
        
        totalShots += shots;
        totalScore += score;
        bullCount += bull.score5Count || 0;
        missCount += bull.score0Count || 0;
      });
      
      const avgScore = totalShots > 0 ? totalScore / totalShots : 0;
      const missRate = totalShots > 0 ? missCount / totalShots : 0;
      const bullRate = totalShots > 0 ? bullCount / totalShots : 0;
      
      // Calculate average distance
      const avgDistance = sheets.length > 0 
        ? sheets.reduce((sum, s) => sum + (s.distanceYards || 0), 0) / sheets.length 
        : 0;
      
      // Track unique firearms and optics
      const uniqueFirearms = new Set(sheets.map(s => s.firearmId.toString())).size;
      const uniqueOptics = new Set(sheets.map(s => s.opticId.toString())).size;
      
      // Track if this is first use of any firearm/optic
      let firstFirearmUse = false;
      let firstOpticUse = false;
      
      sheets.forEach(sheet => {
        const firearmId = sheet.firearmId.toString();
        const opticId = sheet.opticId.toString();
        
        if (!allFirearmHistory.has(firearmId)) {
          allFirearmHistory.set(firearmId, []);
          firstFirearmUse = true;
        }
        allFirearmHistory.get(firearmId)!.push(session.date);
        
        if (!allOpticHistory.has(opticId)) {
          allOpticHistory.set(opticId, []);
          firstOpticUse = true;
        }
        allOpticHistory.get(opticId)!.push(session.date);
      });
      
      sessionMetrics.push({
        sessionId: session._id.toString(),
        slug: session.slug,
        date: session.date.toISOString(),
        location: session.location,
        avgScore,
        missRate,
        bullRate,
        totalShots,
        avgDistance,
        sheetCount: sheets.length,
        uniqueFirearms,
        uniqueOptics,
        firstFirearmUse,
        firstOpticUse,
      });
    }
    
    if (sessionMetrics.length < minSessions) {
      return NextResponse.json({
        anomalies: [],
        globalAverages: null,
        insights: [`Need at least ${minSessions} sessions with data. Currently have ${sessionMetrics.length}.`],
      });
    }
    
    // Calculate global averages
    const globalAverages: GlobalAverages = {
      avgScore: sessionMetrics.reduce((sum, s) => sum + s.avgScore, 0) / sessionMetrics.length,
      missRate: sessionMetrics.reduce((sum, s) => sum + s.missRate, 0) / sessionMetrics.length,
      bullRate: sessionMetrics.reduce((sum, s) => sum + s.bullRate, 0) / sessionMetrics.length,
      meanRadius: 0, // TODO: Calculate if shot positions available
      avgDistance: sessionMetrics.reduce((sum, s) => sum + s.avgDistance, 0) / sessionMetrics.length,
      totalShots: sessionMetrics.reduce((sum, s) => sum + s.totalShots, 0) / sessionMetrics.length,
      sessionCount: sessionMetrics.length,
    };
    
    // Calculate standard deviations (for statistical mode)
    let stdDev: any = {};
    if (statistical) {
      const calculateStdDev = (values: number[]) => {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
      };
      
      stdDev = {
        avgScore: calculateStdDev(sessionMetrics.map(s => s.avgScore)),
        missRate: calculateStdDev(sessionMetrics.map(s => s.missRate)),
        bullRate: calculateStdDev(sessionMetrics.map(s => s.bullRate)),
        avgDistance: calculateStdDev(sessionMetrics.map(s => s.avgDistance)),
      };
    }
    
    // Detect anomalies
    const anomalies: AnomalyResult[] = [];
    
    for (const metrics of sessionMetrics) {
      const deviations: Deviation[] = [];
      
      // Check avg score deviation
      const scoreDeviation = calculateDeviation(
        metrics.avgScore,
        globalAverages.avgScore,
        statistical ? stdDev.avgScore : null
      );
      if (Math.abs(scoreDeviation.percentDeviation) > threshold) {
        deviations.push({
          metric: "Average Score",
          value: metrics.avgScore,
          average: globalAverages.avgScore,
          percentDeviation: scoreDeviation.percentDeviation,
          isAnomaly: true,
        });
      }
      
      // Check miss rate deviation
      const missDeviation = calculateDeviation(
        metrics.missRate,
        globalAverages.missRate,
        statistical ? stdDev.missRate : null
      );
      if (Math.abs(missDeviation.percentDeviation) > threshold) {
        deviations.push({
          metric: "Miss Rate",
          value: metrics.missRate,
          average: globalAverages.missRate,
          percentDeviation: missDeviation.percentDeviation,
          isAnomaly: true,
        });
      }
      
      // Check bull rate deviation
      const bullDeviation = calculateDeviation(
        metrics.bullRate,
        globalAverages.bullRate,
        statistical ? stdDev.bullRate : null
      );
      if (Math.abs(bullDeviation.percentDeviation) > threshold) {
        deviations.push({
          metric: "Bull Rate",
          value: metrics.bullRate,
          average: globalAverages.bullRate,
          percentDeviation: bullDeviation.percentDeviation,
          isAnomaly: true,
        });
      }
      
      // Check distance deviation (informational, not necessarily anomalous)
      const distanceDeviation = calculateDeviation(
        metrics.avgDistance,
        globalAverages.avgDistance,
        statistical ? stdDev.avgDistance : null
      );
      if (Math.abs(distanceDeviation.percentDeviation) > 30) {
        deviations.push({
          metric: "Distance",
          value: metrics.avgDistance,
          average: globalAverages.avgDistance,
          percentDeviation: distanceDeviation.percentDeviation,
          isAnomaly: false, // Just informational
        });
      }
      
      if (deviations.length === 0) continue; // Not an anomaly
      
      // Determine severity
      const maxDeviation = Math.max(...deviations.map(d => Math.abs(d.percentDeviation)));
      const severity: "high" | "medium" | "low" = 
        maxDeviation > 50 ? "high" : 
        maxDeviation > 30 ? "medium" : "low";
      
      // Attribute causes
      const causes = attributeCauses(metrics, globalAverages, deviations);
      
      anomalies.push({
        sessionId: metrics.sessionId,
        slug: metrics.slug,
        date: metrics.date,
        location: metrics.location,
        isAnomaly: true,
        severity,
        deviations,
        causes,
        metrics,
      });
    }
    
    // Generate insights
    const insights = generateInsights(anomalies, globalAverages, sessionMetrics.length);
    
    return NextResponse.json({
      anomalies,
      globalAverages,
      insights,
      sessionCount: sessionMetrics.length,
      threshold,
    });
  } catch (error: any) {
    console.error("Error detecting anomalies:", error);
    return NextResponse.json(
      { error: "Failed to detect anomalies", details: error?.message },
      { status: 500 }
    );
  }
}

function calculateDeviation(
  value: number,
  average: number,
  stdDev: number | null
): { percentDeviation: number; zScore?: number } {
  if (average === 0) {
    return { percentDeviation: 0 };
  }
  
  const percentDeviation = ((value - average) / average) * 100;
  
  if (stdDev !== null && stdDev > 0) {
    const zScore = (value - average) / stdDev;
    return { percentDeviation, zScore };
  }
  
  return { percentDeviation };
}

function attributeCauses(
  metrics: SessionMetrics,
  globalAverages: GlobalAverages,
  deviations: Deviation[]
): Cause[] {
  const causes: Cause[] = [];
  
  // Rule 1: Extended or shortened distance
  if (metrics.avgDistance > globalAverages.avgDistance * 1.5) {
    causes.push({
      type: "distance",
      description: `Extended range: ${metrics.avgDistance.toFixed(0)}yd vs. typical ${globalAverages.avgDistance.toFixed(0)}yd`,
      confidence: "high",
    });
  } else if (metrics.avgDistance < globalAverages.avgDistance * 0.7) {
    causes.push({
      type: "distance",
      description: `Shorter range: ${metrics.avgDistance.toFixed(0)}yd vs. typical ${globalAverages.avgDistance.toFixed(0)}yd`,
      confidence: "high",
    });
  }
  
  // Rule 2: New equipment
  if (metrics.firstFirearmUse) {
    causes.push({
      type: "equipment",
      description: "First use of a new firearm in this dataset",
      confidence: "high",
    });
  }
  
  if (metrics.firstOpticUse) {
    causes.push({
      type: "equipment",
      description: "First use of a new optic in this dataset",
      confidence: "high",
    });
  }
  
  // Rule 3: High volume (fatigue)
  if (metrics.totalShots > globalAverages.totalShots * 1.5) {
    const hasNegativePerformance = deviations.some(
      d => d.metric === "Average Score" && d.percentDeviation < 0
    );
    if (hasNegativePerformance) {
      causes.push({
        type: "fatigue",
        description: `High shot volume: ${metrics.totalShots} shots vs. typical ${globalAverages.totalShots.toFixed(0)}`,
        confidence: "medium",
      });
    }
  }
  
  // Rule 4: Multiple equipment changes
  if (metrics.uniqueFirearms > 2 || metrics.uniqueOptics > 2) {
    causes.push({
      type: "variety",
      description: `Multiple equipment changes in session (${metrics.uniqueFirearms} firearms, ${metrics.uniqueOptics} optics)`,
      confidence: "medium",
    });
  }
  
  // Rule 5: Very low shots (too little data)
  if (metrics.totalShots < globalAverages.totalShots * 0.5) {
    causes.push({
      type: "sample_size",
      description: `Limited data: Only ${metrics.totalShots} shots vs. typical ${globalAverages.totalShots.toFixed(0)}`,
      confidence: "low",
    });
  }
  
  // Rule 6: High miss rate correlation
  const missRateDeviation = deviations.find(d => d.metric === "Miss Rate");
  if (missRateDeviation && missRateDeviation.percentDeviation > 0) {
    causes.push({
      type: "accuracy",
      description: `Miss rate ${(metrics.missRate * 100).toFixed(1)}% vs. typical ${(globalAverages.missRate * 100).toFixed(1)}%`,
      confidence: "high",
    });
  }
  
  // Limit to top 3 causes
  return causes.slice(0, 3);
}

function generateInsights(
  anomalies: AnomalyResult[],
  globalAverages: GlobalAverages,
  totalSessions: number
): string[] {
  const insights: string[] = [];
  
  if (anomalies.length === 0) {
    insights.push("No anomalies detected. All sessions are within normal performance ranges.");
    return insights;
  }
  
  // Count anomalies by severity
  const severityCounts = {
    high: anomalies.filter(a => a.severity === "high").length,
    medium: anomalies.filter(a => a.severity === "medium").length,
    low: anomalies.filter(a => a.severity === "low").length,
  };
  
  insights.push(
    `Detected ${anomalies.length} anomalies out of ${totalSessions} sessions ` +
    `(${((anomalies.length / totalSessions) * 100).toFixed(0)}%)`
  );
  
  if (severityCounts.high > 0) {
    insights.push(`${severityCounts.high} high-severity anomalies require attention`);
  }
  
  // Most common causes
  const causeTypes = new Map<string, number>();
  anomalies.forEach(a => {
    a.causes.forEach(c => {
      causeTypes.set(c.type, (causeTypes.get(c.type) || 0) + 1);
    });
  });
  
  const topCause = Array.from(causeTypes.entries())
    .sort((a, b) => b[1] - a[1])[0];
  
  if (topCause) {
    const causeLabels: Record<string, string> = {
      distance: "distance variations",
      equipment: "new equipment",
      fatigue: "high shot volume/fatigue",
      variety: "equipment changes mid-session",
      sample_size: "limited sample size",
      accuracy: "accuracy issues",
    };
    insights.push(
      `Most common anomaly cause: ${causeLabels[topCause[0]] || topCause[0]} ` +
      `(${topCause[1]} sessions)`
    );
  }
  
  // Performance trend in anomalies
  const negativeAnomalies = anomalies.filter(a => 
    a.deviations.some(d => d.metric === "Average Score" && d.percentDeviation < 0)
  );
  
  if (negativeAnomalies.length > anomalies.length * 0.6) {
    insights.push(
      `${negativeAnomalies.length} anomalies show below-average performance—consider reviewing training approach`
    );
  }
  
  return insights;
}
