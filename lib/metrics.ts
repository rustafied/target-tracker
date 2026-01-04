import { IBullRecord } from "./models/BullRecord";

export interface BullMetrics {
  totalShots: number;
  totalScore: number;
  averagePerShot: number;
  bullHitRate: number;
}

export function calculateBullMetrics(bull: IBullRecord): BullMetrics {
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
    bull.score1Count * 1 +
    bull.score0Count * 0;

  const averagePerShot = totalShots > 0 ? totalScore / totalShots : 0;
  const bullHitRate = totalShots > 0 ? bull.score5Count / totalShots : 0;

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

export function calculateSheetMetrics(bulls: IBullRecord[]): SheetMetrics {
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

