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
 * Calculate total shots fired for a sheet from bull records
 */
export async function calculateSheetShots(sheetId: mongoose.Types.ObjectId): Promise<number> {
  // Get all bull records for this sheet
  const bulls = await BullRecord.find({ sheetId }).lean();
  
  let totalShots = 0;
  
  for (const bull of bulls) {
    // Sum totalShots from aim point records for this bull
    const aimPoints = await AimPointRecord.find({ bullId: bull._id }).lean();
    for (const ap of aimPoints) {
      totalShots += ap.totalShots || 0;
    }
  }
  
  return totalShots;
}

/**
 * Reconcile ammo inventory for a sheet
 * Handles create, update (shot count change), and delete
 */
export async function reconcileSheetAmmo(params: ReconcileAmmoParams): Promise<void> {
  const { userId, sheetId, sessionId, caliberId } = params;

  // Calculate current shots used
  const shotsUsed = await calculateSheetShots(sheetId);

  // Find existing transaction for this sheet
  const existingTx = await AmmoTransaction.findOne({
    sheetId,
    caliberId,
    reason: "session_deduct",
  });

  if (existingTx) {
    // Update existing transaction
    const oldShots = Math.abs(existingTx.delta);
    const deltaChange = -(shotsUsed - oldShots);

    existingTx.delta = -shotsUsed;
    await existingTx.save();

    // Update inventory
    await AmmoInventory.updateOne(
      { userId: userId.toString(), caliberId },
      { $inc: { onHand: deltaChange } },
      { upsert: true }
    );
  } else {
    // Create new transaction
    await createSheetAmmoTransaction(userId, sheetId, sessionId, caliberId, shotsUsed);
  }
}

/**
 * Create a new ammo transaction for a sheet
 */
async function createSheetAmmoTransaction(
  userId: mongoose.Types.ObjectId,
  sheetId: mongoose.Types.ObjectId,
  sessionId: mongoose.Types.ObjectId | undefined,
  caliberId: mongoose.Types.ObjectId,
  shotsUsed: number
): Promise<void> {
  if (shotsUsed === 0) return;

  await AmmoTransaction.create({
    userId: userId.toString(),
    caliberId,
    sheetId,
    sessionId,
    delta: -shotsUsed,
    reason: "session_deduct",
  });

  await AmmoInventory.updateOne(
    { userId: userId.toString(), caliberId },
    { $inc: { onHand: -shotsUsed } },
    { upsert: true }
  );
}

/**
 * Reverse ammo deduction for a sheet (e.g., when sheet is deleted)
 */
export async function reverseSheetAmmo(
  userId: mongoose.Types.ObjectId,
  sheetId: mongoose.Types.ObjectId,
  caliberId: mongoose.Types.ObjectId
): Promise<void> {
  // Find the existing deduction transaction
  const existingTx = await AmmoTransaction.findOne({
    sheetId,
    caliberId,
    reason: "session_deduct",
  });

  if (existingTx) {
    const shotsToReverse = Math.abs(existingTx.delta);

    // Create reversal transaction
    await AmmoTransaction.create({
      userId: userId.toString(),
      caliberId,
      sheetId,
      delta: shotsToReverse,
      reason: "session_reversal",
      note: "Sheet deleted",
    });

    // Update inventory
    await AmmoInventory.updateOne(
      { userId: userId.toString(), caliberId },
      { $inc: { onHand: shotsToReverse } }
    );

    // Delete the original deduction transaction
    await AmmoTransaction.deleteOne({ _id: existingTx._id });
  }
}
