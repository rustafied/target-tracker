import mongoose from "mongoose";
import { AmmoTransaction } from "./models/AmmoTransaction";
import { AmmoInventory } from "./models/AmmoInventory";
import { BullRecord } from "./models/BullRecord";
import { AimPointRecord } from "./models/AimPointRecord";

export interface ReconcileAmmoParams {
  userId: mongoose.Types.ObjectId;
  sheetId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  caliberId: mongoose.Types.ObjectId;
}

/**
 * Recalculate onHand from the sum of all transactions for a caliber.
 * This is the single source of truth — eliminates drift from $inc operations.
 */
export async function recalculateOnHand(userId: string, caliberId: string): Promise<number> {
  const result = await AmmoTransaction.aggregate([
    { $match: { userId, caliberId: new mongoose.Types.ObjectId(caliberId) } },
    { $group: { _id: null, total: { $sum: "$delta" } } },
  ]);

  const onHand = result.length > 0 ? result[0].total : 0;

  await AmmoInventory.updateOne(
    { userId, caliberId },
    { $set: { onHand } },
    { upsert: true }
  );

  return onHand;
}

/**
 * Calculate total shots fired for a sheet from bull records
 */
export async function calculateSheetShots(sheetId: mongoose.Types.ObjectId): Promise<number> {
  const bulls = await BullRecord.find({ targetSheetId: sheetId }).lean();

  const totalShots = bulls.reduce((sum, bull) => {
    // Try new countsByScore format first (must be non-empty), fallback to legacy fields
    if (bull.countsByScore && typeof bull.countsByScore === "object") {
      const counts = bull.countsByScore instanceof Map
        ? Object.fromEntries(bull.countsByScore)
        : bull.countsByScore;
      const entries = Object.values(counts);
      if (entries.length > 0) {
        let shots = 0;
        for (const count of entries) {
          shots += Number(count) || 0;
        }
        return sum + shots;
      }
    }
    const bullShots =
      (bull.score5Count || 0) +
      (bull.score4Count || 0) +
      (bull.score3Count || 0) +
      (bull.score2Count || 0) +
      (bull.score1Count || 0) +
      (bull.score0Count || 0);
    return sum + bullShots;
  }, 0);

  return totalShots;
}

/**
 * Reconcile ammo inventory for a sheet.
 * Creates or updates the session_deduct transaction, then recalculates onHand from all transactions.
 */
export async function reconcileSheetAmmo(params: ReconcileAmmoParams): Promise<void> {
  const { userId, sheetId, sessionId, caliberId } = params;
  const userIdString = userId.toString();

  const shotsUsed = await calculateSheetShots(sheetId);

  // Find existing transaction for this sheet
  const existingTx = await AmmoTransaction.findOne({
    sheetId,
    reason: "session_deduct",
  });

  // Track which caliber IDs need recalculation
  const caliberIdsToRecalc = new Set<string>();
  caliberIdsToRecalc.add(caliberId.toString());

  if (existingTx) {
    const oldCaliberId = existingTx.caliberId.toString();
    const newCaliberId = caliberId.toString();

    // If caliber changed, we need to recalculate both
    if (oldCaliberId !== newCaliberId) {
      caliberIdsToRecalc.add(oldCaliberId);
    }

    // Update transaction
    existingTx.delta = -shotsUsed;
    existingTx.caliberId = caliberId;
    if (sessionId) {
      existingTx.sessionId = sessionId;
    }
    await existingTx.save();
  } else if (shotsUsed > 0) {
    // Create new transaction
    await AmmoTransaction.create({
      userId: userIdString,
      caliberId,
      sheetId,
      sessionId,
      delta: -shotsUsed,
      reason: "session_deduct",
    });
  }

  // Recalculate onHand from all transactions (eliminates drift)
  for (const calId of caliberIdsToRecalc) {
    await recalculateOnHand(userIdString, calId);
  }
}

/**
 * Clean up duplicate transactions for a sheet (keep only one)
 */
export async function cleanupDuplicateTransactions(sheetId: mongoose.Types.ObjectId): Promise<void> {
  const transactions = await AmmoTransaction.find({
    sheetId,
    reason: "session_deduct",
  }).sort({ createdAt: 1 });

  if (transactions.length > 1) {
    // Keep the first (oldest) transaction, delete the rest
    for (let i = 1; i < transactions.length; i++) {
      await AmmoTransaction.deleteOne({ _id: transactions[i]._id });
    }

    // Recalculate — no need to manually reverse, just recompute from transactions
    const keepTx = transactions[0];
    await recalculateOnHand(keepTx.userId, keepTx.caliberId.toString());
  }
}

/**
 * Reverse ammo deduction for a sheet (e.g., when sheet is deleted)
 */
export async function reverseSheetAmmo(
  userId: mongoose.Types.ObjectId,
  sheetId: mongoose.Types.ObjectId,
  caliberId: mongoose.Types.ObjectId
): Promise<void> {
  const userIdString = userId.toString();

  // Find and delete the existing deduction transaction
  const existingTx = await AmmoTransaction.findOne({
    sheetId,
    reason: "session_deduct",
  });

  if (existingTx) {
    const shotsToReverse = Math.abs(existingTx.delta);

    // Create reversal transaction
    await AmmoTransaction.create({
      userId: userIdString,
      caliberId,
      sheetId,
      delta: shotsToReverse,
      reason: "session_reversal",
      note: "Sheet deleted",
    });

    // Delete the original deduction transaction
    await AmmoTransaction.deleteOne({ _id: existingTx._id });
  }

  // Recalculate onHand from all transactions
  await recalculateOnHand(userIdString, caliberId.toString());
}
