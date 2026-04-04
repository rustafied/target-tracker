import { IBullRecord } from "./models/BullRecord";
import { extractScoreCounts } from "./analytics-utils";

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
  const { s5, s4, s3, s2, s1, s0 } = extractScoreCounts(bull);

  const totalShots = s5 + s4 + s3 + s2 + s1 + s0;
  const totalScore = s5 * 5 + s4 * 4 + s3 * 3 + s2 * 2 + s1 * 1;

  const averagePerShot = totalShots > 0 ? totalScore / totalShots : 0;
  const bullHitRate = totalShots > 0 ? s5 / totalShots : 0;

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

