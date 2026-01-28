/**
 * Individual insight rule generators
 */

import { RangeSession } from './models/RangeSession';
import { TargetSheet } from './models/TargetSheet';
import { BullRecord } from './models/BullRecord';
import { Firearm } from './models/Firearm';
import { Optic } from './models/Optic';
import { Caliber } from './models/Caliber';
import { AmmoInventory } from './models/AmmoInventory';
import { Types } from 'mongoose';
import {
  Insight,
  InsightType,
  InsightConfig,
  calculateConfidence,
  calculatePercentChange,
  detectTrend,
  calculateQuadrantBias,
  formatPercentage,
  formatMetric,
  getSeverityForDeviation,
  calculateBullScore,
  calculateBullTotalShots,
  getBullPositions,
} from './insights-engine';

interface SessionContext {
  session: any;
  sheets: any[];
  bulls: any[];
  avgScore: number;
  shotsFired: number;
  historicalAvg: number;
  userBulls: any[];
  userId: string;
  config: InsightConfig;
}

interface OverviewContext {
  userId: string;
  config: InsightConfig;
}

interface ComparisonContext {
  itemIds: string[];
  itemType: 'firearms' | 'optics' | 'calibers';
  userId: string;
  config: InsightConfig;
}

/**
 * PER-SESSION INSIGHT GENERATORS
 */

export async function generateVsAverageInsight(ctx: SessionContext): Promise<Insight | null> {
  const deviation = calculatePercentChange(ctx.avgScore, ctx.historicalAvg);
  const confidence = calculateConfidence(ctx.shotsFired, deviation / 100);
  
  if (Math.abs(deviation) < 3) return null; // Too small to mention
  
  const direction = deviation > 0 ? 'above' : 'below';
  const advice = deviation < -10 ? '—review fundamentals' : '';
  
  return {
    id: `vs-avg-${ctx.session._id}`,
    type: 'vs-average',
    category: 'session',
    text: `Avg score ${formatMetric(ctx.avgScore)}—${formatPercentage(deviation)} ${direction} your ${formatMetric(ctx.historicalAvg)} overall average${advice}.`,
    confidence,
    severity: getSeverityForDeviation(deviation),
    metadata: {
      sessionAvg: ctx.avgScore,
      historicalAvg: ctx.historicalAvg,
      deviation,
    },
  };
}

export async function generateSetupMilestoneInsight(ctx: SessionContext): Promise<Insight | null> {
  const { session, sheets } = ctx;
  
  if (sheets.length === 0) return null;
  
  // Get the most common setup from this session's sheets
  const setupCounts = new Map<string, number>();
  sheets.forEach(sheet => {
    if (sheet.firearmId && sheet.caliberId && sheet.opticId) {
      const key = `${sheet.firearmId}-${sheet.caliberId}-${sheet.opticId}`;
      setupCounts.set(key, (setupCounts.get(key) || 0) + 1);
    }
  });
  
  if (setupCounts.size === 0) return null;
  
  // Get the most used setup
  const [mostUsedSetup] = Array.from(setupCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const [firearmId, caliberId, opticId] = mostUsedSetup.split('-');
  
  // Find prior sheets that used this setup
  const priorSheetsForSetup = await TargetSheet.find({
    userId: session.userId,
    firearmId: new Types.ObjectId(firearmId),
    caliberId: new Types.ObjectId(caliberId),
    opticId: new Types.ObjectId(opticId),
    rangeSessionId: { $ne: session._id },
  }).lean().select('_id rangeSessionId');
  
  if (priorSheetsForSetup.length === 0) {
    return {
      id: `milestone-${session._id}`,
      type: 'setup-milestone',
      category: 'session',
      text: 'First session with this setup—baseline established!',
      confidence: 1.0,
      severity: 'info',
      metadata: { isFirst: true },
    };
  }
  
  // Calculate mean radius for this session
  const allPositions = ctx.bulls.flatMap(b => getBullPositions(b));
  if (allPositions.length < 3) return null;
  
  // Center coordinates before calculating radius (positions are in SVG space 0-200 with center at 100,100)
  const meanRadius = allPositions.reduce((sum, pos) => {
    const dx = pos.x - 100;
    const dy = pos.y - 100;
    return sum + Math.sqrt(dx ** 2 + dy ** 2);
  }, 0) / allPositions.length;
  
  // Get historical mean radius for this setup
  const priorBulls = await BullRecord.find({ 
    targetSheetId: { $in: priorSheetsForSetup.map(s => s._id) },
  }).lean().select('shotPositions');
  
  const priorPositions = priorBulls.flatMap(b => getBullPositions(b));
  if (priorPositions.length < 3) return null;
  
  const priorMeanRadius = priorPositions.reduce((sum, pos) => {
    const dx = pos.x - 100;
    const dy = pos.y - 100;
    return sum + Math.sqrt(dx ** 2 + dy ** 2);
  }, 0) / priorPositions.length;
  
  const improvement = calculatePercentChange(priorMeanRadius, meanRadius); // Lower is better
  
  if (improvement < 10) return null; // Not significant enough
  
  const firearm = await Firearm.findById(firearmId).lean().select('name');
  const optic = await Optic.findById(opticId).lean().select('name');
  
  const setupName = optic 
    ? `${firearm?.name} + ${optic.name}`
    : firearm?.name || 'this setup';
  
  return {
    id: `milestone-${session._id}`,
    type: 'setup-milestone',
    category: 'session',
    text: `Best mean radius yet with ${setupName} (${formatMetric(meanRadius)} units—improved ${formatPercentage(improvement)} from prior).`,
    confidence: calculateConfidence(allPositions.length, improvement / 100),
    severity: 'success',
    metadata: {
      meanRadius,
      priorMeanRadius,
      improvement,
      setupName,
    },
    relatedLinks: [
      { label: 'View Setup', href: `/setup/firearms` },
    ],
  };
}

export async function generateDistanceDiagnosticInsight(ctx: SessionContext): Promise<Insight | null> {
  const { session, bulls, sheets } = ctx;
  
  // Get distance from sheets (first sheet's distance)
  const sessionDistance = sheets[0]?.distanceYards;
  if (!sessionDistance) return null;
  
  // Calculate bull rate (score 4 or 5)
  const bullHits = bulls.reduce((sum, b) => sum + (b.score5Count || 0) + (b.score4Count || 0), 0);
  const totalShots = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
  if (totalShots === 0) return null;
  
  const bullRate = bullHits / totalShots;
  
  // Get user's bull rate at different distances (from sheets)
  const closeSheets = await TargetSheet.find({ 
    userId: session.userId,
    distanceYards: { $lt: 30, $exists: true },
  });
  
  if (closeSheets.length === 0) return null;
  const closeBulls = await BullRecord.find({ 
    targetSheetId: { $in: closeSheets.map(s => s._id) } 
  });
  
  const closeBullHits = closeBulls.reduce((sum, b) => sum + (b.score5Count || 0) + (b.score4Count || 0), 0);
  const closeTotalShots = closeBulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
  if (closeTotalShots === 0) return null;
  
  const closeBullRate = closeBullHits / closeTotalShots;
  
  const deviation = (bullRate - closeBullRate) * 100;
  
  if (sessionDistance >= 30 && deviation < -15) {
    return {
      id: `distance-${session._id}`,
      type: 'distance-diagnostic',
      category: 'session',
      text: `At ${sessionDistance}yd, bull rate ${formatPercentage(bullRate * 100, 0)} vs. your ${formatPercentage(closeBullRate * 100, 0)} avg at <30yd—consider windage adjustments.`,
      confidence: calculateConfidence(bulls.length, Math.abs(deviation) / 100),
      severity: 'warning',
      metadata: {
        distance: sessionDistance,
        bullRate,
        closeBullRate,
        deviation,
      },
      relatedLinks: [
        { label: 'Distance Analysis', href: '/analytics' },
      ],
    };
  }
  
  return null;
}

export async function generateEfficiencySnapshotInsight(ctx: SessionContext): Promise<Insight | null> {
  const { session, avgScore, shotsFired, sheets } = ctx;
  
  // Get caliber from sheets (first sheet's caliber)
  const caliberId = sheets[0]?.caliberId;
  if (!caliberId || shotsFired === 0) return null;
  
  const efficiency = avgScore / shotsFired;
  
  // Get all sessions with ammo data
  const allSessions = await RangeSession.find({ userId: session.userId });
  const sessionMetrics = await Promise.all(
    allSessions.map(async (s) => {
      const sheets = await TargetSheet.find({ rangeSessionId: s._id });
      const bulls = await BullRecord.find({ targetSheetId: { $in: sheets.map(sh => sh._id) } });
      if (bulls.length === 0) return null;
      
      const totalScore = bulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
      const totalShots = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
      if (totalShots === 0) return null;
      
      const avg = totalScore / totalShots;
      return { rangeSessionId: s._id, efficiency: avg / totalShots };
    })
  );
  
  const validMetrics = sessionMetrics.filter(m => m !== null) as { rangeSessionId: Types.ObjectId; efficiency: number }[];
  if (validMetrics.length < 3) return null;
  
  validMetrics.sort((a, b) => b.efficiency - a.efficiency);
  const percentile = (validMetrics.findIndex(m => m.rangeSessionId.equals(session._id)) / validMetrics.length) * 100;
  
  if (percentile <= 20) {
    const caliber = await Caliber.findById(caliberId);
    
    return {
      id: `efficiency-${session._id}`,
      type: 'efficiency-snapshot',
      category: 'session',
      text: `High efficiency: ${formatMetric(avgScore)} score per round with ${caliber?.name || 'current caliber'}—top ${formatMetric(percentile, 0)}% of sessions.`,
      confidence: calculateConfidence(shotsFired, 0.2),
      severity: 'success',
      metadata: {
        efficiency,
        percentile,
        caliberName: caliber?.name,
      },
    };
  }
  
  return null;
}

export async function generateBiasPatternInsight(ctx: SessionContext): Promise<Insight | null> {
  const { bulls, shotsFired } = ctx;
  
  const positions = bulls.flatMap(b => getBullPositions(b));
  
  
  // Need at least 20 positions AND at least 30% of total shots to be confident
  if (positions.length < 20) {
    return null;
  }
  
  const positionCoverage = positions.length / shotsFired;
  if (positionCoverage < 0.3) {
    return null;
  }
  
  const bias = calculateQuadrantBias(positions);
    quadrant: bias.quadrant,
    concentration: bias.concentration,
    counts: bias.counts,
    totalPositions: positions.length
  });
  
  if (bias.concentration > 0.6) { // 60%+ in one quadrant
    const quadrantNames: Record<string, string> = {
      topLeft: 'high-left',      // x < 100, y < 100 (left and above center)
      topRight: 'high-right',    // x >= 100, y < 100 (right and above center)
      bottomLeft: 'low-left',    // x < 100, y >= 100 (left and below center)
      bottomRight: 'low-right',  // x >= 100, y >= 100 (right and below center)
    };
    
    const quadrantAdvice: Record<string, string> = {
      topLeft: 'possible sight misalignment',
      topRight: 'possible breathing or stance',
      bottomLeft: 'possible grip issue or trigger pull',
      bottomRight: 'possible anticipation or flinch',
    };
    
    const percentageText = `${(bias.concentration * 100).toFixed(0)}%`;
    
    return {
      id: `bias-${ctx.session._id}`,
      type: 'bias-pattern',
      category: 'session',
      text: `Shots clustered ${quadrantNames[bias.quadrant]} (${percentageText} of ${positions.length} tracked rounds)—${quadrantAdvice[bias.quadrant]}.`,
      confidence: calculateConfidence(positions.length, bias.concentration) * positionCoverage, // Lower confidence if we don't have all position data
      severity: bias.concentration > 0.7 ? 'warning' : 'info',
      metadata: {
        quadrant: bias.quadrant,
        concentration: bias.concentration,
        counts: bias.counts,
        positionCoverage,
        totalShots: shotsFired,
        trackedShots: positions.length,
      },
    };
  }
  
  return null;
}

/**
 * OVERVIEW INSIGHT GENERATORS
 */

export async function generateTrendSummaryInsight(ctx: OverviewContext): Promise<Insight | null> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  // Convert userId string to ObjectId for query
  const userObjectId = new Types.ObjectId(ctx.userId);
  
  
  const sessions = await RangeSession.find({
    userId: userObjectId,
    date: { $gte: threeMonthsAgo },
  }).select('_id date').sort({ date: 1 }).lean();
  
  if (sessions.length > 0) {
  }
  if (sessions.length < 5) {
    return null;
  }
  
  // Batch fetch all sheets and bulls for these sessions
  const allSheets = await TargetSheet.find({ 
    rangeSessionId: { $in: sessions.map(s => s._id) } 
  }).select('_id rangeSessionId').lean();
  
  const allBulls = await BullRecord.find({ 
    targetSheetId: { $in: allSheets.map(sh => sh._id) } 
  }).select('targetSheetId score5Count score4Count score3Count score2Count score1Count score0Count totalShots').lean();
  
  // Calculate monthly averages from batched data
  const monthlyAvgs = sessions.map((s) => {
    const sessionSheets = allSheets.filter(sh => sh.rangeSessionId.toString() === s._id.toString());
    const sessionBulls = allBulls.filter(b => 
      sessionSheets.some(sh => sh._id.toString() === b.targetSheetId.toString())
    );
    const totalScore = sessionBulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
    const totalShots = sessionBulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
    return totalShots > 0 ? totalScore / totalShots : 0;
  });
  
  const trend = detectTrend(monthlyAvgs);
  
  if (trend === 'stable') {
    return null;
  }
  
  const firstAvg = monthlyAvgs[0];
  const lastAvg = monthlyAvgs[monthlyAvgs.length - 1];
  const change = calculatePercentChange(lastAvg, firstAvg);
  
  const trendText = trend === 'improving' 
    ? `Monthly improvement: Avg score up ${formatPercentage(change)} in last 3 months—consistent practice paying off.`
    : `Score declining ${formatPercentage(Math.abs(change))} over 3 months—review fundamentals or check equipment.`;
  
  return {
    id: `trend-${ctx.userId}`,
    type: 'trend-summary',
    category: 'overview',
    text: trendText,
    confidence: calculateConfidence(sessions.length, Math.abs(change) / 100),
    severity: trend === 'improving' ? 'success' : 'warning',
    metadata: {
      trend,
      change,
      sessionCount: sessions.length,
      monthlyAvgs,
    },
    relatedLinks: [
      { label: 'View Analytics', href: '/analytics' },
    ],
  };
}

export async function generateTopPerformersInsight(ctx: OverviewContext): Promise<Insight | null> {
  // Convert userId string to ObjectId for query
  const userObjectId = new Types.ObjectId(ctx.userId);
  
  // Get all calibers for this user
  const calibers = await Caliber.find({ userId: userObjectId }).select('_id name').lean();
  if (calibers.length < 2) return null;
  
  // Batch fetch all sheets and bulls for this user
  const allSheets = await TargetSheet.find({ userId: userObjectId }).select('_id caliberId').lean();
  const allBulls = await BullRecord.find({ 
    targetSheetId: { $in: allSheets.map(s => s._id) } 
  }).select('targetSheetId score5Count score4Count score3Count score2Count score1Count score0Count totalShots').lean();
  
  // Calculate stats from batched data
  const caliberStats = calibers.map((cal) => {
    const caliberSheets = allSheets.filter(s => s.caliberId?.toString() === cal._id.toString());
    if (caliberSheets.length === 0) return null;
    
    const bulls = allBulls.filter(b => 
      caliberSheets.some(s => s._id.toString() === b.targetSheetId.toString())
    );
    
    if (bulls.length === 0) return null;
    
    const totalScore = bulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
    const shotCount = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
    if (shotCount === 0) return null;
    
    const avgScore = totalScore / shotCount;
    return { caliber: cal, avgScore, shotCount };
  });
  
  const validStats = caliberStats.filter(s => s !== null && s.shotCount >= 10) as Array<{ caliber: any; avgScore: number; shotCount: number }>;
  if (validStats.length < 2) return null;
  
  validStats.sort((a, b) => b.avgScore - a.avgScore);
  
  const top = validStats[0];
  const bottom = validStats[validStats.length - 1];
  
  return {
    id: `top-performers-${ctx.userId}`,
    type: 'top-performers',
    category: 'overview',
    text: `Top caliber: ${top.caliber.name} (${formatMetric(top.avgScore)} avg score); Lowest: ${bottom.caliber.name} (${formatMetric(bottom.avgScore)} avg score).`,
    confidence: calculateConfidence(validStats.length * 10, 0.3),
    severity: 'info',
    metadata: {
      topCaliber: top.caliber.name,
      topScore: top.avgScore,
      bottomCaliber: bottom.caliber.name,
      bottomScore: bottom.avgScore,
      rankings: validStats.map(s => ({ name: s.caliber.name, score: s.avgScore })),
    },
    relatedLinks: [
      { label: 'Caliber Analytics', href: '/analytics/calibers' },
    ],
  };
}

export async function generateUsageRecommendationInsight(ctx: OverviewContext): Promise<Insight | null> {
  // Convert userId string to ObjectId for query
  const userObjectId = new Types.ObjectId(ctx.userId);
  
  const firearms = await Firearm.find({ userId: userObjectId }).select('_id name').lean();
  if (firearms.length < 2) return null;
  
  // Batch fetch all sheets and bulls for this user
  const allSheets = await TargetSheet.find({ userId: userObjectId }).select('_id firearmId').lean();
  const allBulls = await BullRecord.find({ 
    targetSheetId: { $in: allSheets.map(s => s._id) } 
  }).select('targetSheetId score5Count score4Count score3Count score2Count score1Count score0Count totalShots').lean();
  
  // Calculate stats from batched data
  const firearmStats = firearms.map((firearm) => {
    const firearmSheets = allSheets.filter(s => s.firearmId?.toString() === firearm._id.toString());
    if (firearmSheets.length === 0) return null;
    
    const bulls = allBulls.filter(b => 
      firearmSheets.some(s => s._id.toString() === b.targetSheetId.toString())
    );
    
    if (bulls.length === 0) return null;
    
    const totalScore = bulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
    const shotCount = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
    if (shotCount === 0) return null;
    
    const avgScore = totalScore / shotCount;
    return { firearm, avgScore, shotCount };
  });
  
  const validStats = firearmStats.filter(s => s !== null) as Array<{ firearm: any; avgScore: number; shotCount: number }>;
  if (validStats.length < 2) return null;
  
  const totalShots = validStats.reduce((sum, s) => sum + s.shotCount, 0);
  
  // Find high performers with low usage
  const withUsage = validStats.map(s => ({
    ...s,
    usagePercent: (s.shotCount / totalShots) * 100,
  }));
  
  withUsage.forEach(s => {
  });
  
  // Lowered threshold from 3.5 to 3.2 (more realistic for most shooters)
  const underused = withUsage
    .filter(s => s.avgScore >= 3.2 && s.usagePercent < 15)
    .sort((a, b) => b.avgScore - a.avgScore);
  
  if (underused.length === 0) return null;
  
  const gem = underused[0];
  
  return {
    id: `usage-rec-${ctx.userId}`,
    type: 'usage-recommendation',
    category: 'overview',
    text: `Underused gem: ${gem.firearm.name} (high ${formatMetric(gem.avgScore)} avg, only ${formatPercentage(gem.usagePercent, 0)} of shots)—rotate in more.`,
    confidence: calculateConfidence(gem.shotCount, 0.2),
    severity: 'info',
    metadata: {
      firearmName: gem.firearm.name,
      avgScore: gem.avgScore,
      usagePercent: gem.usagePercent,
    },
    relatedLinks: [
      { label: 'Firearm Analytics', href: '/analytics/firearms' },
    ],
  };
}

export async function generateInventoryAlertInsight(ctx: OverviewContext): Promise<Insight | null> {
  const userObjectId = new Types.ObjectId(ctx.userId);
  
  // Get all recent sessions to calculate average usage per session
  const allRecentSessions = await RangeSession.find({
    userId: userObjectId,
  }).sort({ date: -1 }).limit(10).select('_id date');
  
  if (allRecentSessions.length === 0) {
    return null;
  }
  
  // Batch fetch all sheets for these sessions
  const allSheets = await TargetSheet.find({ 
    rangeSessionId: { $in: allRecentSessions.map(s => s._id) } 
  });
  
  // Batch fetch all bulls for these sheets
  const allBulls = await BullRecord.find({ 
    targetSheetId: { $in: allSheets.map(s => s._id) } 
  });
  
  
  // Calculate average usage per session for each caliber
  const caliberUsageBySession = new Map<string, { totalShots: number; sessionCount: number; sessions: Set<string> }>();
  
  allSheets.forEach(sheet => {
    if (sheet.caliberId) {
      const caliberIdStr = sheet.caliberId.toString();
      const sheetBulls = allBulls.filter(b => b.targetSheetId.toString() === sheet._id.toString());
      const sheetShots = sheetBulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
      
      if (!caliberUsageBySession.has(caliberIdStr)) {
        caliberUsageBySession.set(caliberIdStr, { totalShots: 0, sessionCount: 0, sessions: new Set() });
      }
      
      const current = caliberUsageBySession.get(caliberIdStr)!;
      
      // Only count sessions where this caliber was actually used
      if (sheetShots > 0) {
        current.totalShots += sheetShots;
        
        // Count this session only once per caliber (even if multiple sheets)
        const sessionId = sheet.rangeSessionId.toString();
        if (!current.sessions.has(sessionId)) {
          current.sessions.add(sessionId);
          current.sessionCount += 1;
        }
      }
    }
  });
  
    Array.from(caliberUsageBySession.entries()).map(([id, data]) => 
      `${id}: ${data.totalShots} shots across ${data.sessionCount} sessions`
    )
  );
  
  // Find calibers with low stock (AmmoInventory.userId is Discord ID string)
  const ammoRecords = await AmmoInventory.find({ userId: ctx.userId });
  
  for (const [caliberIdStr, usageData] of caliberUsageBySession.entries()) {
    const caliberId = new Types.ObjectId(caliberIdStr);
    const ammo = ammoRecords.find(a => a.caliberId?.equals(caliberId));
    const caliber = await Caliber.findById(caliberId);
    
      hasAmmo: !!ammo,
      hasCaliber: !!caliber,
      stock: ammo?.onHand || 0,
      totalShots: usageData.totalShots,
      sessionCount: usageData.sessionCount
    });
    
    if (!ammo || !caliber || usageData.sessionCount === 0) continue;
    
    const stock = ammo.onHand || 0;
    const avgShotsPerSession = usageData.totalShots / usageData.sessionCount;
    const sessionsRemaining = avgShotsPerSession > 0 ? stock / avgShotsPerSession : Infinity;
    
    
    // Alert when 5 sessions or fewer remaining
    if (sessionsRemaining <= 5) {
      const severity = sessionsRemaining < 2 ? 'warning' : 'info';
      const sessionsText = Math.floor(sessionsRemaining) === 1 ? 'session' : 'sessions';
      
      return {
        id: `inventory-${ctx.userId}-${caliberIdStr}`,
        type: 'inventory-alert',
        category: 'overview',
        text: `${caliber.name} running low—only ${Math.floor(sessionsRemaining)} ${sessionsText} remaining (${stock.toLocaleString()} rounds at ${Math.round(avgShotsPerSession)} rounds/session avg).`,
        confidence: 0.9,
        severity,
        metadata: {
          caliberName: caliber.name,
          stock,
          avgShotsPerSession: Math.round(avgShotsPerSession),
          sessionsRemaining: Math.floor(sessionsRemaining),
          totalShots: usageData.totalShots,
          sessionCount: usageData.sessionCount,
        },
        relatedLinks: [
          { label: 'Manage Ammo', href: '/ammo' },
        ],
      };
    }
  }
  
  return null;
}

export async function generateCompositeFlagInsight(ctx: OverviewContext): Promise<Insight | null> {
  // Convert userId string to ObjectId for query
  const userObjectId = new Types.ObjectId(ctx.userId);
  
  // Get last 10 sessions
  const recentSessions = await RangeSession.find({ userId: userObjectId })
    .sort({ date: -1 })
    .limit(10)
    .select('_id date')
    .lean();
  
  
  if (recentSessions.length < 10) {
    return null;
  }
  
  // Batch fetch all sheets and bulls for these sessions
  const allSheets = await TargetSheet.find({ 
    rangeSessionId: { $in: recentSessions.map(s => s._id) } 
  }).select('_id rangeSessionId').lean();
  
  const allBulls = await BullRecord.find({ 
    targetSheetId: { $in: allSheets.map(s => s._id) } 
  }).select('targetSheetId score5Count score4Count score3Count score2Count score1Count score0Count totalShots').lean();
  
  // Calculate metrics from batched data
  const sessionMetrics = recentSessions.map((s) => {
    const sessionSheets = allSheets.filter(sh => sh.rangeSessionId.toString() === s._id.toString());
    const bulls = allBulls.filter(b => 
      sessionSheets.some(sh => sh._id.toString() === b.targetSheetId.toString())
    );
    
    const bullHits = bulls.reduce((sum, b) => sum + (b.score5Count || 0) + (b.score4Count || 0), 0);
    const misses = bulls.reduce((sum, b) => sum + (b.score0Count || 0), 0);
    const totalShots = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
    
    const bullRate = totalShots > 0 ? bullHits / totalShots : 0;
    const missRate = totalShots > 0 ? misses / totalShots : 0;
    
    return { bullRate, missRate };
  });
  
  const avgBullRate = sessionMetrics.reduce((sum, m) => sum + m.bullRate, 0) / sessionMetrics.length;
  const avgMissRate = sessionMetrics.reduce((sum, m) => sum + m.missRate, 0) / sessionMetrics.length;
  
  // Check for improving bull rate but static miss rate
  const firstHalf = sessionMetrics.slice(0, 5);
  const secondHalf = sessionMetrics.slice(5);
  
  const firstBullRate = firstHalf.reduce((sum, m) => sum + m.bullRate, 0) / 5;
  const secondBullRate = secondHalf.reduce((sum, m) => sum + m.bullRate, 0) / 5;
  const bullRateChange = calculatePercentChange(secondBullRate, firstBullRate);
  
  const firstMissRate = firstHalf.reduce((sum, m) => sum + m.missRate, 0) / 5;
  const secondMissRate = secondHalf.reduce((sum, m) => sum + m.missRate, 0) / 5;
  const missRateChange = calculatePercentChange(secondMissRate, firstMissRate);
  
  
  if (bullRateChange > 10 && Math.abs(missRateChange) < 5) {
    return {
      id: `composite-${ctx.userId}`,
      type: 'composite-flag',
      category: 'overview',
      text: `Opportunity: Bull rate improving ${formatPercentage(bullRateChange)}, but miss rate static—focus on consistency drills.`,
      confidence: 0.8,
      severity: 'info',
      metadata: {
        bullRateChange,
        missRateChange,
        avgBullRate,
        avgMissRate,
      },
    };
  }
  
  return null;
}

/**
 * COMPARISON INSIGHT GENERATORS
 */

export async function generatePairwiseWinnerInsight(ctx: ComparisonContext): Promise<Insight | null> {
  if (ctx.itemIds.length !== 2) return null;
  
  const [id1, id2] = ctx.itemIds.map(id => new Types.ObjectId(id));
  const userObjectId = new Types.ObjectId(ctx.userId);
  
  const Model = ctx.itemType === 'firearms' ? Firearm : ctx.itemType === 'optics' ? Optic : Caliber;
  let item1: any, item2: any;
  
  if (ctx.itemType === 'firearms') {
    [item1, item2] = await Promise.all([
      Firearm.findById(id1),
      Firearm.findById(id2),
    ]);
  } else if (ctx.itemType === 'optics') {
    [item1, item2] = await Promise.all([
      Optic.findById(id1),
      Optic.findById(id2),
    ]);
  } else {
    [item1, item2] = await Promise.all([
      Caliber.findById(id1),
      Caliber.findById(id2),
    ]);
  }
  
  if (!item1 || !item2) return null;
  
  const fieldName = `${ctx.itemType.slice(0, -1)}Id` as 'firearmId' | 'opticId' | 'caliberId';
  
  // Find sheets with these items (not sessions, since items are per-sheet)
  const [sheets1, sheets2] = await Promise.all([
    TargetSheet.find({ userId: userObjectId, [fieldName]: id1 }),
    TargetSheet.find({ userId: userObjectId, [fieldName]: id2 }),
  ]);
  
  const avg1 = await calculateItemAvgScoreFromSheets(sheets1);
  const avg2 = await calculateItemAvgScoreFromSheets(sheets2);
  
  if (avg1 === null || avg2 === null) return null;
  
  const diff = Math.abs(avg1 - avg2);
  if (diff < 0.2) return null; // Too close
  
  const winner = avg1 > avg2 ? item1.name : item2.name;
  const loser = avg1 > avg2 ? item2.name : item1.name;
  const winnerAvg = Math.max(avg1, avg2);
  
  return {
    id: `pairwise-${id1}-${id2}`,
    type: 'pairwise-winner',
    category: 'comparison',
    text: `${winner} beats ${loser} by ${formatMetric(diff)} avg score.`,
    confidence: calculateConfidence(sheets1.length + sheets2.length, diff / 5),
    severity: 'info',
    metadata: {
      winner,
      loser,
      diff,
      avg1,
      avg2,
    },
  };
}

export async function generateGroupRankingInsight(ctx: ComparisonContext): Promise<Insight | null> {
  if (ctx.itemIds.length < 2) return null;
  
  const userId = new Types.ObjectId(ctx.userId);
  const Model = ctx.itemType === 'firearms' ? Firearm : ctx.itemType === 'optics' ? Optic : Caliber;
  const fieldName = `${ctx.itemType.slice(0, -1)}Id` as 'firearmId' | 'opticId' | 'caliberId';
  
  const rankings = await Promise.all(
    ctx.itemIds.map(async (id) => {
      let item: any;
      if (ctx.itemType === 'firearms') {
        item = await Firearm.findById(id);
      } else if (ctx.itemType === 'optics') {
        item = await Optic.findById(id);
      } else {
        item = await Caliber.findById(id);
      }
      
      if (!item) return null;
      
      const sheets = await TargetSheet.find({ userId, [fieldName]: new Types.ObjectId(id) });
      const avg = await calculateItemAvgScoreFromSheets(sheets);
      
      return { name: item.name, avg, id };
    })
  );
  
  const validRankings = rankings.filter(r => r !== null && r.avg !== null) as Array<{ name: string; avg: number; id: string }>;
  if (validRankings.length < 2) return null;
  
  validRankings.sort((a, b) => b.avg - a.avg);
  
  const itemType = ctx.itemType.slice(0, -1);
  const rankText = validRankings
    .map((r, i) => `${r.name} #${i + 1}`)
    .join(', ');
  
  return {
    id: `ranking-${ctx.itemIds.join('-')}`,
    type: 'group-ranking',
    category: 'comparison',
    text: `In ${validRankings.length}-${itemType} comparison: ${rankText}.`,
    confidence: 0.85,
    severity: 'info',
    metadata: {
      rankings: validRankings,
    },
  };
}

export async function generateContextualDifferenceInsight(ctx: ComparisonContext): Promise<Insight | null> {
  // This would analyze distance-specific performance differences
  // For brevity, returning null - can be expanded
  return null;
}

export async function generateCrossoverPointInsight(ctx: ComparisonContext): Promise<Insight | null> {
  // This would find distance/condition crossover points
  // For brevity, returning null - can be expanded
  return null;
}

export async function generateCompositeRecommendationInsight(ctx: ComparisonContext): Promise<Insight | null> {
  if (ctx.itemIds.length < 2) return null;
  
  const userId = new Types.ObjectId(ctx.userId);
  const Model = ctx.itemType === 'firearms' ? Firearm : ctx.itemType === 'optics' ? Optic : Caliber;
  const fieldName = `${ctx.itemType.slice(0, -1)}Id` as 'firearmId' | 'opticId' | 'caliberId';
  
  const itemStats = await Promise.all(
    ctx.itemIds.map(async (id) => {
      let item: any;
      if (ctx.itemType === 'firearms') {
        item = await Firearm.findById(id);
      } else if (ctx.itemType === 'optics') {
        item = await Optic.findById(id);
      } else {
        item = await Caliber.findById(id);
      }
      
      if (!item) return null;
      
      const sheets = await TargetSheet.find({ userId, [fieldName]: new Types.ObjectId(id) });
      const bulls = await BullRecord.find({ targetSheetId: { $in: sheets.map(s => s._id) } });
      
      if (bulls.length === 0) return null;
      
      const positions = bulls.flatMap(b => getBullPositions(b));
      // Center coordinates before calculating radius (positions are in SVG space 0-200 with center at 100,100)
      const meanRadius = positions.length > 0
        ? positions.reduce((sum, pos) => {
            const dx = pos.x - 100;
            const dy = pos.y - 100;
            return sum + Math.sqrt(dx ** 2 + dy ** 2);
          }, 0) / positions.length
        : 0;
      
      const totalScore = bulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
      const shotCount = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
      const avgScore = shotCount > 0 ? totalScore / shotCount : 0;
      const efficiency = shotCount > 0 ? avgScore : 0;
      
      return { name: item.name, meanRadius, avgScore, efficiency, shotCount };
    })
  );
  
  const validStats = itemStats.filter(s => s !== null && s.shotCount >= 10) as Array<{
    name: string;
    meanRadius: number;
    avgScore: number;
    efficiency: number;
    shotCount: number;
  }>;
  
  if (validStats.length < 2) return null;
  
  const bestPrecision = validStats.reduce((best, curr) => 
    curr.meanRadius < best.meanRadius ? curr : best
  );
  
  const bestEfficiency = validStats.reduce((best, curr) => 
    curr.efficiency > best.efficiency ? curr : best
  );
  
  if (bestPrecision.name === bestEfficiency.name) {
    return {
      id: `composite-rec-${ctx.itemIds.join('-')}`,
      type: 'composite-recommendation',
      category: 'comparison',
      text: `Overall winner: ${bestPrecision.name} (best precision AND efficiency).`,
      confidence: 0.9,
      severity: 'success',
      metadata: {
        winner: bestPrecision.name,
      },
    };
  }
  
  return {
    id: `composite-rec-${ctx.itemIds.join('-')}`,
    type: 'composite-recommendation',
    category: 'comparison',
    text: `For precision: Choose ${bestPrecision.name}; for efficiency: ${bestEfficiency.name}.`,
    confidence: 0.85,
    severity: 'info',
    metadata: {
      bestPrecision: bestPrecision.name,
      bestEfficiency: bestEfficiency.name,
    },
  };
}

/**
 * Helper functions
 */

async function calculateItemAvgScoreFromSheets(sheets: any[]): Promise<number | null> {
  if (sheets.length === 0) return null;
  
  const bulls = await BullRecord.find({ 
    targetSheetId: { $in: sheets.map(s => s._id) } 
  });
  
  if (bulls.length === 0) return null;
  
  const totalScore = bulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
  const totalShots = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
  
  return totalShots > 0 ? totalScore / totalShots : null;
}

/**
 * Export all generators
 */
export const sessionInsightGenerators = [
  { type: 'vs-average' as InsightType, category: 'session' as const, generate: generateVsAverageInsight },
  { type: 'setup-milestone' as InsightType, category: 'session' as const, generate: generateSetupMilestoneInsight },
  { type: 'distance-diagnostic' as InsightType, category: 'session' as const, generate: generateDistanceDiagnosticInsight },
  { type: 'efficiency-snapshot' as InsightType, category: 'session' as const, generate: generateEfficiencySnapshotInsight },
  { type: 'bias-pattern' as InsightType, category: 'session' as const, generate: generateBiasPatternInsight },
];

export const overviewInsightGenerators = [
  { type: 'trend-summary' as InsightType, category: 'overview' as const, generate: generateTrendSummaryInsight },
  { type: 'top-performers' as InsightType, category: 'overview' as const, generate: generateTopPerformersInsight },
  { type: 'usage-recommendation' as InsightType, category: 'overview' as const, generate: generateUsageRecommendationInsight },
  { type: 'inventory-alert' as InsightType, category: 'overview' as const, generate: generateInventoryAlertInsight },
  { type: 'composite-flag' as InsightType, category: 'overview' as const, generate: generateCompositeFlagInsight },
];

export const comparisonInsightGenerators = [
  { type: 'pairwise-winner' as InsightType, category: 'comparison' as const, generate: generatePairwiseWinnerInsight },
  { type: 'group-ranking' as InsightType, category: 'comparison' as const, generate: generateGroupRankingInsight },
  { type: 'contextual-difference' as InsightType, category: 'comparison' as const, generate: generateContextualDifferenceInsight },
  { type: 'crossover-point' as InsightType, category: 'comparison' as const, generate: generateCrossoverPointInsight },
  { type: 'composite-recommendation' as InsightType, category: 'comparison' as const, generate: generateCompositeRecommendationInsight },
];
