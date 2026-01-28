/**
 * Expanded Insights Engine
 * Generates actionable insights from session and aggregate data
 */

import { RangeSession } from './models/RangeSession';
import { TargetSheet } from './models/TargetSheet';
import { BullRecord } from './models/BullRecord';
import { Firearm } from './models/Firearm';
import { Optic } from './models/Optic';
import { Caliber } from './models/Caliber';
import { Types } from 'mongoose';

export interface Insight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  text: string;
  confidence: number; // 0-1
  severity: 'info' | 'warning' | 'success' | 'error';
  metadata?: Record<string, any>;
  relatedLinks?: Array<{ label: string; href: string }>;
}

export type InsightCategory = 'session' | 'overview' | 'comparison';

export type InsightType =
  // Per-Session
  | 'vs-average'
  | 'setup-milestone'
  | 'distance-diagnostic'
  | 'efficiency-snapshot'
  | 'bias-pattern'
  // Overview
  | 'trend-summary'
  | 'top-performers'
  | 'usage-recommendation'
  | 'inventory-alert'
  | 'composite-flag'
  // Comparison
  | 'pairwise-winner'
  | 'group-ranking'
  | 'contextual-difference'
  | 'crossover-point'
  | 'composite-recommendation';

export interface InsightConfig {
  minConfidence: number;
  maxInsights: number;
  verbosity: 'short' | 'long';
  enabledTypes: InsightType[];
}

const DEFAULT_CONFIG: InsightConfig = {
  minConfidence: 0.7,
  maxInsights: 5,
  verbosity: 'short',
  enabledTypes: [
    'vs-average',
    'setup-milestone',
    'distance-diagnostic',
    'efficiency-snapshot',
    'bias-pattern',
    'trend-summary',
    'top-performers',
    'usage-recommendation',
    'inventory-alert',
    'composite-flag',
    'pairwise-winner',
    'group-ranking',
    'contextual-difference',
    'crossover-point',
    'composite-recommendation',
  ],
};

/**
 * Data structure helpers
 */
export function calculateBullScore(bull: any): number {
  return (
    (bull.score5Count || 0) * 5 +
    (bull.score4Count || 0) * 4 +
    (bull.score3Count || 0) * 3 +
    (bull.score2Count || 0) * 2 +
    (bull.score1Count || 0) * 1 +
    (bull.score0Count || 0) * 0
  );
}

export function calculateBullTotalShots(bull: any): number {
  return bull.totalShots || (
    (bull.score5Count || 0) +
    (bull.score4Count || 0) +
    (bull.score3Count || 0) +
    (bull.score2Count || 0) +
    (bull.score1Count || 0) +
    (bull.score0Count || 0)
  );
}

export function getBullPositions(bull: any): Array<{ x: number; y: number }> {
  return bull.shotPositions || [];
}

/**
 * Statistical helpers
 */
export function calculateConfidence(
  sampleSize: number,
  deviation: number,
  threshold: number = 0.15
): number {
  // Simple confidence based on sample size and deviation magnitude
  const sizeFactor = Math.min(sampleSize / 20, 1); // Full confidence at 20+ samples
  const deviationFactor = Math.abs(deviation) > threshold ? 1 : Math.abs(deviation) / threshold;
  return Math.min(sizeFactor * deviationFactor, 1);
}

export function calculatePercentChange(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

export function detectTrend(values: number[]): 'improving' | 'declining' | 'stable' {
  if (values.length < 3) return 'stable';
  
  // Simple linear regression slope
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  const slope = numerator / denominator;
  
  // Adjusted threshold: 0.02 is more reasonable (about 2% change per session)
  if (Math.abs(slope) < 0.02) return 'stable';
  return slope > 0 ? 'improving' : 'declining';
}

export function calculateQuadrantBias(positions: Array<{ x: number; y: number }>) {
  const quadrants = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
  
  // Center coordinates: positions are in SVG space (0-200) with center at (100, 100)
  // SVG y-axis increases downward, so y > 100 is "low" (below center)
  positions.forEach(pos => {
    const cx = pos.x - 100; // Negative = left, positive = right
    const cy = pos.y - 100; // Negative = high (above center), positive = low (below center)
    
    if (cx < 0 && cy < 0) quadrants.topLeft++;       // high-left
    else if (cx >= 0 && cy < 0) quadrants.topRight++; // high-right
    else if (cx < 0 && cy >= 0) quadrants.bottomLeft++; // low-left
    else quadrants.bottomRight++;                      // low-right
  });
  
  const total = positions.length;
  const dominant = Object.entries(quadrants).reduce((max, [key, val]) => 
    val > max.value ? { key, value: val } : max,
    { key: '', value: 0 }
  );
  
  const concentration = dominant.value / total;
  
  return {
    quadrant: dominant.key,
    concentration,
    counts: quadrants,
  };
}

/**
 * Format helpers
 */
export function formatPercentage(value: number, precision: number = 1): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(precision)}%`;
}

export function formatMetric(value: number, precision: number = 2): string {
  return value.toFixed(precision);
}

export function getSeverityForDeviation(deviation: number): Insight['severity'] {
  if (Math.abs(deviation) < 5) return 'info';
  if (deviation > 10) return 'success';
  if (deviation < -10) return 'warning';
  if (deviation < -20) return 'error';
  return 'info';
}

/**
 * Main insight generation functions
 */
export async function generateSessionInsights(
  sessionId: string,
  userId: string,
  config: Partial<InsightConfig> = {}
): Promise<Insight[]> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const insights: Insight[] = [];
  
  const session = await RangeSession.findById(sessionId);
  if (!session) {
    return [];
  }
  
  // Get all sheets and bulls for this session
  const sheets = await TargetSheet.find({ rangeSessionId: new Types.ObjectId(sessionId) });
  const bulls = await BullRecord.find({ 
    targetSheetId: { $in: sheets.map(s => s._id) } 
  });
  
  if (bulls.length === 0) {
    return [];
  }
  
  // Calculate session metrics from aggregate counts
  const totalScore = bulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
  const shotsFired = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
  const avgScore = shotsFired > 0 ? totalScore / shotsFired : 0;
  
  // Get user's historical average (all sessions)
  const userSessions = await RangeSession.find({ userId: new Types.ObjectId(userId) });
  const userSessionIds = userSessions.map(s => s._id);
  const userSheets = await TargetSheet.find({ rangeSessionId: { $in: userSessionIds } });
  const userBulls = await BullRecord.find({ targetSheetId: { $in: userSheets.map(s => s._id) } });
  
  const userTotalScore = userBulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
  const userTotalShots = userBulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
  const historicalAvg = userTotalShots > 0 ? userTotalScore / userTotalShots : avgScore;
  
  // Generate insights based on enabled types
  const generators = getSessionInsightGenerators();
  
  for (const generator of generators) {
    if (fullConfig.enabledTypes.includes(generator.type)) {
      try {
        const insight = await generator.generate({
          session,
          sheets,
          bulls,
          avgScore,
          shotsFired,
          historicalAvg,
          userBulls,
          userId,
          config: fullConfig,
        });
        
        if (insight && insight.confidence >= fullConfig.minConfidence) {
          insights.push(insight);
        }
      } catch (err) {
        console.error(`Error in ${generator.type} generator:`, err);
      }
    }
  }
  
  // Sort by confidence * severity weight
  const severityWeight = { error: 4, warning: 3, success: 2, info: 1 };
  insights.sort((a, b) => 
    (b.confidence * severityWeight[b.severity]) - (a.confidence * severityWeight[a.severity])
  );
  
  return insights.slice(0, fullConfig.maxInsights);
}

export async function generateOverviewInsights(
  userId: string,
  config: Partial<InsightConfig> = {}
): Promise<Insight[]> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const insights: Insight[] = [];
  
  const generators = getOverviewInsightGenerators();
  
  // Run all generators in parallel for better performance
  const generatorPromises = generators.map(async (generator) => {
    if (!fullConfig.enabledTypes.includes(generator.type)) {
      return null;
    }
    
    try {
      const insight = await generator.generate({ userId, config: fullConfig });
      
      if (insight && insight.confidence >= fullConfig.minConfidence) {
        return insight;
      }
      return null;
    } catch (error) {
      console.error('[generateOverviewInsights] Error in generator', generator.type, ':', error);
      return null;
    }
  });
  
  const results = await Promise.all(generatorPromises);
  const validInsights = results.filter((i): i is Insight => i !== null);
  
  validInsights.sort((a, b) => b.confidence - a.confidence);
  return validInsights.slice(0, fullConfig.maxInsights);
}

export async function generateComparisonInsights(
  itemIds: string[],
  itemType: 'firearms' | 'optics' | 'calibers',
  userId: string,
  config: Partial<InsightConfig> = {}
): Promise<Insight[]> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const insights: Insight[] = [];
  
  const generators = getComparisonInsightGenerators();
  
  for (const generator of generators) {
    if (fullConfig.enabledTypes.includes(generator.type)) {
      const insight = await generator.generate({ 
        itemIds, 
        itemType, 
        userId, 
        config: fullConfig 
      });
      
      if (insight && insight.confidence >= fullConfig.minConfidence) {
        insights.push(insight);
      }
    }
  }
  
  insights.sort((a, b) => b.confidence - a.confidence);
  return insights.slice(0, fullConfig.maxInsights);
}

/**
 * Generator registry
 */
interface InsightGenerator<T = any> {
  type: InsightType;
  category: InsightCategory;
  generate: (context: T) => Promise<Insight | null>;
}

// Import will be added after file is created
export function getSessionInsightGenerators(): InsightGenerator[] {
  const {
    sessionInsightGenerators,
  } = require('./insights-rules');
  return sessionInsightGenerators;
}

export function getOverviewInsightGenerators(): InsightGenerator[] {
  const {
    overviewInsightGenerators,
  } = require('./insights-rules');
  return overviewInsightGenerators;
}

export function getComparisonInsightGenerators(): InsightGenerator[] {
  const {
    comparisonInsightGenerators,
  } = require('./insights-rules');
  return comparisonInsightGenerators;
}
