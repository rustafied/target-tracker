import { IBullRecord } from "./models/BullRecord";

// Type for bull records that may have been migrated or not
type BullRecordLike = {
  score5Count?: number;
  score4Count?: number;
  score3Count?: number;
  score2Count?: number;
  score1Count?: number;
  score0Count?: number;
  [key: string]: any;
};

export interface BullMetrics {
  totalShots: number;
  totalScore: number;
  averagePerShot: number;
  bullHitRate: number;
}

export function calculateBullMetrics(bull: BullRecordLike): BullMetrics {
  const totalShots =
    (bull.score5Count || 0) +
    (bull.score4Count || 0) +
    (bull.score3Count || 0) +
    (bull.score2Count || 0) +
    (bull.score1Count || 0) +
    (bull.score0Count || 0);

  const totalScore =
    (bull.score5Count || 0) * 5 +
    (bull.score4Count || 0) * 4 +
    (bull.score3Count || 0) * 3 +
    (bull.score2Count || 0) * 2 +
    (bull.score1Count || 0) * 1 +
    (bull.score0Count || 0) * 0;

  const averagePerShot = totalShots > 0 ? totalScore / totalShots : 0;
  const bullHitRate = totalShots > 0 ? (bull.score5Count || 0) / totalShots : 0;

  return {
    totalShots,
    totalScore,
    averagePerShot,
    bullHitRate,
  };
}

export interface SheetMetrics {
  totalShots: number;
  totalScore: number;
  averagePerShot: number;
}

export function calculateSheetMetrics(bulls: BullRecordLike[]): SheetMetrics {
  let totalShots = 0;
  let totalScore = 0;

  bulls.forEach((bull) => {
    const metrics = calculateBullMetrics(bull);
    totalShots += metrics.totalShots;
    totalScore += metrics.totalScore;
  });

  const averagePerShot = totalShots > 0 ? totalScore / totalShots : 0;

  return {
    totalShots,
    totalScore,
    averagePerShot,
  };
}

