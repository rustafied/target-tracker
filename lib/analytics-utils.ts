import { IBullRecord, IShotPosition } from "./models/BullRecord";

// ============================================================================
// COUNT-BASED METRICS (Always Available)
// ============================================================================

export interface CountBasedMetrics {
  totalShots: number;
  totalScore: number;
  avgScorePerShot: number;
  bullRate: number; // % of shots scoring 5
  missRate: number; // % of shots scoring 0
  goodHitRate: number; // % of shots scoring 4 or 5
  ringDistribution: {
    p5: number;
    p4: number;
    p3: number;
    p2: number;
    p1: number;
    p0: number;
  };
}

export function calculateCountMetrics(bull: IBullRecord): CountBasedMetrics {
  const totalShots =
    bull.score5Count +
    bull.score4Count +
    bull.score3Count +
    bull.score2Count +
    bull.score1Count +
    bull.score0Count;

  const totalScore =
    bull.score5Count * 5 +
    bull.score4Count * 4 +
    bull.score3Count * 3 +
    bull.score2Count * 2 +
    bull.score1Count * 1;

  const avgScorePerShot = totalShots > 0 ? totalScore / totalShots : 0;
  const bullRate = totalShots > 0 ? bull.score5Count / totalShots : 0;
  const missRate = totalShots > 0 ? bull.score0Count / totalShots : 0;
  const goodHitRate = totalShots > 0 ? (bull.score5Count + bull.score4Count) / totalShots : 0;

  return {
    totalShots,
    totalScore,
    avgScorePerShot,
    bullRate,
    missRate,
    goodHitRate,
    ringDistribution: {
      p5: totalShots > 0 ? bull.score5Count / totalShots : 0,
      p4: totalShots > 0 ? bull.score4Count / totalShots : 0,
      p3: totalShots > 0 ? bull.score3Count / totalShots : 0,
      p2: totalShots > 0 ? bull.score2Count / totalShots : 0,
      p1: totalShots > 0 ? bull.score1Count / totalShots : 0,
      p0: totalShots > 0 ? bull.score0Count / totalShots : 0,
    },
  };
}

// ============================================================================
// POSITION-BASED METRICS (When shotPositions exists)
// ============================================================================

export interface ShotPositionAnalysis {
  x: number;
  y: number;
  score: number;
  dx: number; // x - 100 (offset from center)
  dy: number; // y - 100 (offset from center)
  r: number; // radius from center
  angle: number; // radians
}

export function analyzeShotPosition(shot: IShotPosition): ShotPositionAnalysis {
  const dx = shot.x - 100;
  const dy = shot.y - 100;
  const r = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return {
    x: shot.x,
    y: shot.y,
    score: shot.score,
    dx,
    dy,
    r,
    angle,
  };
}

export interface PositionBasedMetrics {
  shotsN: number;
  meanRadius: number;
  medianRadius: number;
  radialStdDev: number;
  extremeSpread: number; // max pairwise distance
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    diagonal: number;
  };
  centroid: {
    meanX: number;
    meanY: number;
    offsetX: number; // meanX - 100
    offsetY: number; // meanY - 100
    centroidDistance: number; // distance from center
  };
  quadrantDistribution: {
    q1: number; // +x, +y (right, down)
    q2: number; // -x, +y (left, down)
    q3: number; // -x, -y (left, up)
    q4: number; // +x, -y (right, up)
  };
}

export function calculatePositionMetrics(
  shotPositions: IShotPosition[]
): PositionBasedMetrics | null {
  if (!shotPositions || shotPositions.length === 0) return null;

  const analyzed = shotPositions.map(analyzeShotPosition);
  const shotsN = analyzed.length;

  // Mean radius
  const meanRadius = analyzed.reduce((sum, s) => sum + s.r, 0) / shotsN;

  // Median radius
  const sortedRadii = analyzed.map((s) => s.r).sort((a, b) => a - b);
  const medianRadius =
    shotsN % 2 === 0
      ? (sortedRadii[shotsN / 2 - 1] + sortedRadii[shotsN / 2]) / 2
      : sortedRadii[Math.floor(shotsN / 2)];

  // Radial standard deviation
  const radialVariance =
    analyzed.reduce((sum, s) => sum + Math.pow(s.r - meanRadius, 2), 0) / shotsN;
  const radialStdDev = Math.sqrt(radialVariance);

  // Extreme spread (max pairwise distance) - approximate with bounding box diagonal for performance
  const xs = analyzed.map((s) => s.x);
  const ys = analyzed.map((s) => s.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.sqrt(width * width + height * height);

  // For small groups, compute actual max pairwise distance
  let extremeSpread = diagonal;
  if (shotsN <= 20) {
    let maxDist = 0;
    for (let i = 0; i < analyzed.length; i++) {
      for (let j = i + 1; j < analyzed.length; j++) {
        const dx = analyzed[i].x - analyzed[j].x;
        const dy = analyzed[i].y - analyzed[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) maxDist = dist;
      }
    }
    extremeSpread = maxDist;
  }

  // Centroid
  const meanX = analyzed.reduce((sum, s) => sum + s.x, 0) / shotsN;
  const meanY = analyzed.reduce((sum, s) => sum + s.y, 0) / shotsN;
  const offsetX = meanX - 100;
  const offsetY = meanY - 100;
  const centroidDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

  // Quadrant distribution
  const quadrants = { q1: 0, q2: 0, q3: 0, q4: 0 };
  analyzed.forEach((s) => {
    if (s.dx >= 0 && s.dy >= 0) quadrants.q1++;
    else if (s.dx < 0 && s.dy >= 0) quadrants.q2++;
    else if (s.dx < 0 && s.dy < 0) quadrants.q3++;
    else quadrants.q4++;
  });

  return {
    shotsN,
    meanRadius,
    medianRadius,
    radialStdDev,
    extremeSpread,
    boundingBox: {
      minX,
      maxX,
      minY,
      maxY,
      width,
      height,
      diagonal,
    },
    centroid: {
      meanX,
      meanY,
      offsetX,
      offsetY,
      centroidDistance,
    },
    quadrantDistribution: quadrants,
  };
}

// ============================================================================
// TIGHTNESS SCORE (0-100 heuristic)
// ============================================================================

export function calculateTightnessScore(
  positionMetrics: PositionBasedMetrics | null,
  countMetrics: CountBasedMetrics
): number {
  if (!positionMetrics) {
    // Fallback: use only count-based metrics
    // Higher score = tighter = fewer misses, higher bull rate
    const scoreFactor = countMetrics.avgScorePerShot / 5; // 0-1
    const bullFactor = countMetrics.bullRate; // 0-1
    const misspenalty = countMetrics.missRate; // 0-1
    return Math.round((scoreFactor * 0.5 + bullFactor * 0.4 - misspenalty * 0.1) * 100);
  }

  // With position data: combine precision + accuracy
  // Lower meanRadius = better, lower centroidDistance = better, fewer misses = better
  // Normalize meanRadius: assume 0-85 range (0=perfect, 85=edge)
  const radiusFactor = Math.max(0, 1 - positionMetrics.meanRadius / 85);
  const centroidFactor = Math.max(0, 1 - positionMetrics.centroid.centroidDistance / 85);
  const misspenalty = countMetrics.missRate;

  return Math.round((radiusFactor * 0.5 + centroidFactor * 0.3 - misspenalty * 0.2) * 100);
}

// ============================================================================
// AGGREGATION UTILITIES
// ============================================================================

export interface WeightedMetrics {
  totalShots: number;
  totalScore: number;
  avgScorePerShot: number;
  bullRate: number;
  missRate: number;
  goodHitRate: number;
  meanRadius?: number;
  centroidDistance?: number;
  tightnessScore: number;
  shotCoverage: number; // % of shots with position data
}

export function aggregateBullMetrics(bulls: IBullRecord[]): WeightedMetrics {
  let totalShots = 0;
  let totalScore = 0;
  let totalBulls = 0;
  let totalMisses = 0;
  let totalGoodHits = 0;

  let positionShotsCount = 0;
  let weightedMeanRadius = 0;
  let weightedCentroidDistance = 0;
  let tightnessSum = 0;

  bulls.forEach((bull) => {
    const countMetrics = calculateCountMetrics(bull);
    totalShots += countMetrics.totalShots;
    totalScore += countMetrics.totalScore;
    totalBulls += countMetrics.totalShots * countMetrics.bullRate;
    totalMisses += countMetrics.totalShots * countMetrics.missRate;
    totalGoodHits += countMetrics.totalShots * countMetrics.goodHitRate;

    const positionMetrics = calculatePositionMetrics(bull.shotPositions || []);
    const tightness = calculateTightnessScore(positionMetrics, countMetrics);
    tightnessSum += tightness * countMetrics.totalShots;

    if (positionMetrics && countMetrics.totalShots > 0) {
      positionShotsCount += countMetrics.totalShots;
      weightedMeanRadius += positionMetrics.meanRadius * countMetrics.totalShots;
      weightedCentroidDistance += positionMetrics.centroid.centroidDistance * countMetrics.totalShots;
    }
  });

  const avgScorePerShot = totalShots > 0 ? totalScore / totalShots : 0;
  const bullRate = totalShots > 0 ? totalBulls / totalShots : 0;
  const missRate = totalShots > 0 ? totalMisses / totalShots : 0;
  const goodHitRate = totalShots > 0 ? totalGoodHits / totalShots : 0;
  const tightnessScore = totalShots > 0 ? Math.round(tightnessSum / totalShots) : 0;
  const shotCoverage = totalShots > 0 ? positionShotsCount / totalShots : 0;

  const result: WeightedMetrics = {
    totalShots,
    totalScore,
    avgScorePerShot,
    bullRate,
    missRate,
    goodHitRate,
    tightnessScore,
    shotCoverage,
  };

  if (positionShotsCount > 0) {
    result.meanRadius = weightedMeanRadius / positionShotsCount;
    result.centroidDistance = weightedCentroidDistance / positionShotsCount;
  }

  return result;
}

// ============================================================================
// HEATMAP BINNING
// ============================================================================

export interface HeatmapBin {
  x: number; // bin index
  y: number; // bin index
  value: number; // shot count
}

export function binShotsToHeatmap(
  shotPositions: IShotPosition[],
  gridSize: number = 40
): HeatmapBin[] {
  const bins: number[][] = Array(gridSize)
    .fill(0)
    .map(() => Array(gridSize).fill(0));

  shotPositions.forEach((shot) => {
    const binX = Math.floor((shot.x / 200) * gridSize);
    const binY = Math.floor((shot.y / 200) * gridSize);
    const clampedX = Math.max(0, Math.min(gridSize - 1, binX));
    const clampedY = Math.max(0, Math.min(gridSize - 1, binY));
    bins[clampedY][clampedX]++;
  });

  const result: HeatmapBin[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (bins[y][x] > 0) {
        result.push({ x, y, value: bins[y][x] });
      }
    }
  }

  return result;
}

// ============================================================================
// SYNTHETIC SHOT GENERATION (Visualization Only)
// ============================================================================

export function generateSyntheticShots(bull: IBullRecord): IShotPosition[] {
  const synthetic: IShotPosition[] = [];

  const addShotsInRing = (count: number, score: number, rMin: number, rMax: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const r = rMin + Math.random() * (rMax - rMin);
      const x = 100 + r * Math.cos(angle);
      const y = 100 + r * Math.sin(angle);
      synthetic.push({ x, y, score });
    }
  };

  addShotsInRing(bull.score5Count, 5, 0, 15);
  addShotsInRing(bull.score4Count, 4, 15, 30);
  addShotsInRing(bull.score3Count, 3, 30, 50);
  addShotsInRing(bull.score2Count, 2, 50, 70);
  addShotsInRing(bull.score1Count, 1, 70, 85);
  addShotsInRing(bull.score0Count, 0, 85, 100);

  return synthetic;
}

// ============================================================================
// DELTA CALCULATION
// ============================================================================

export interface DeltaMetric {
  current: number;
  previous: number | null;
  delta: number | null; // percentage change
  isImprovement: boolean; // for metrics where higher is better
}

export function calculateDelta(
  current: number,
  previous: number | null,
  higherIsBetter: boolean = true
): DeltaMetric {
  if (previous === null || previous === 0) {
    return { current, previous, delta: null, isImprovement: false };
  }

  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const isImprovement = higherIsBetter ? delta > 0 : delta < 0;

  return { current, previous, delta, isImprovement };
}

// ============================================================================
// RING DISTRIBUTION AGGREGATION
// ============================================================================

export interface RingDistribution {
  sessionIndex: number;
  sessionId: string;
  p5: number;
  p4: number;
  p3: number;
  p2: number;
  p1: number;
  p0: number;
}

export function calculateRingDistributionForSession(
  bulls: IBullRecord[],
  sessionId: string,
  sessionIndex: number
): RingDistribution {
  const aggregated = aggregateBullMetrics(bulls);
  const totalShots = aggregated.totalShots;

  if (totalShots === 0) {
    return {
      sessionIndex,
      sessionId,
      p5: 0,
      p4: 0,
      p3: 0,
      p2: 0,
      p1: 0,
      p0: 0,
    };
  }

  const c5 = bulls.reduce((sum, b) => sum + b.score5Count, 0);
  const c4 = bulls.reduce((sum, b) => sum + b.score4Count, 0);
  const c3 = bulls.reduce((sum, b) => sum + b.score3Count, 0);
  const c2 = bulls.reduce((sum, b) => sum + b.score2Count, 0);
  const c1 = bulls.reduce((sum, b) => sum + b.score1Count, 0);
  const c0 = bulls.reduce((sum, b) => sum + b.score0Count, 0);

  return {
    sessionIndex,
    sessionId,
    p5: c5 / totalShots,
    p4: c4 / totalShots,
    p3: c3 / totalShots,
    p2: c2 / totalShots,
    p1: c1 / totalShots,
    p0: c0 / totalShots,
  };
}

