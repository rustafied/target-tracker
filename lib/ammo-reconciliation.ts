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
  // Get all bull records for this sheet (using targetSheetId, not sheetId)
  const bulls = await BullRecord.find({ targetSheetId: sheetId }).lean();
  
  // Sum up totalShots from all bulls
  const totalShots = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);
  
  console.log('[Ammo Reconciliation] calculateSheetShots:', { 
    sheetId: sheetId.toString(), 
    bullsFound: bulls.length, 
    totalShots 
  });
  
  return totalShots;
}

/**
 * Reconcile ammo inventory for a sheet
 * Handles create, update (shot count change), and delete
 */
export async function reconcileSheetAmmo(params: ReconcileAmmoParams): Promise<void> {
  const { userId, sheetId, sessionId, caliberId } = params;

  console.log('[Ammo Reconciliation] Starting reconciliation:', {
    userId: userId.toString(),
    sheetId: sheetId.toString(),
    sessionId: sessionId?.toString(),
    caliberId: caliberId.toString(),
  });

  // Calculate current shots used
  const shotsUsed = await calculateSheetShots(sheetId);

  // Find existing transaction for this sheet (convert ObjectIds to strings for query)
  const existingTx = await AmmoTransaction.findOne({
    sheetId: sheetId.toString(),
    caliberId: caliberId.toString(),
    reason: "session_deduct",
  });
  
  console.log('[Ammo Reconciliation] Existing transaction:', existingTx ? `Found (${existingTx._id})` : 'Not found');

  if (existingTx) {
    // Update existing transaction
    const oldShots = Math.abs(existingTx.delta);
    const deltaChange = -(shotsUsed - oldShots);

    console.log('[Ammo Reconciliation] Updating transaction:', { oldShots, newShots: shotsUsed, deltaChange });

    existingTx.delta = -shotsUsed;
    await existingTx.save();

    // Update inventory (convert caliberId to string)
    await AmmoInventory.updateOne(
      { userId: userId.toString(), caliberId: caliberId.toString() },
      { $inc: { onHand: deltaChange } },
      { upsert: true }
    );
  } else {
    // Create new transaction
    console.log('[Ammo Reconciliation] Creating new transaction for', shotsUsed, 'shots');
    await createSheetAmmoTransaction(userId, sheetId, sessionId, caliberId, shotsUsed);
  }
  
  console.log('[Ammo Reconciliation] Completed successfully');
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
  if (shotsUsed === 0) {
    console.log('[Ammo Reconciliation] No shots to record, skipping transaction creation');
    return;
  }

  // Convert ObjectIds to strings for storage
  await AmmoTransaction.create({
    userId: userId.toString(),
    caliberId: caliberId.toString(),
    sheetId: sheetId.toString(),
    sessionId: sessionId?.toString(),
    delta: -shotsUsed,
    reason: "session_deduct",
  });

  await AmmoInventory.updateOne(
    { userId: userId.toString(), caliberId: caliberId.toString() },
    { $inc: { onHand: -shotsUsed } },
    { upsert: true }
  );
  
  console.log('[Ammo Reconciliation] Created transaction and updated inventory:', { shotsUsed, caliberId: caliberId.toString() });
}

/**
 * Reverse ammo deduction for a sheet (e.g., when sheet is deleted)
 */
export async function reverseSheetAmmo(
  userId: mongoose.Types.ObjectId,
  sheetId: mongoose.Types.ObjectId,
  caliberId: mongoose.Types.ObjectId
): Promise<void> {
  // Find the existing deduction transaction (convert to strings for query)
  const existingTx = await AmmoTransaction.findOne({
    sheetId: sheetId.toString(),
    caliberId: caliberId.toString(),
    reason: "session_deduct",
  });

  if (existingTx) {
    const shotsToReverse = Math.abs(existingTx.delta);

    // Create reversal transaction (convert to strings)
    await AmmoTransaction.create({
      userId: userId.toString(),
      caliberId: caliberId.toString(),
      sheetId: sheetId.toString(),
      delta: shotsToReverse,
      reason: "session_reversal",
      note: "Sheet deleted",
    });

    // Update inventory (convert to string)
    await AmmoInventory.updateOne(
      { userId: userId.toString(), caliberId: caliberId.toString() },
      { $inc: { onHand: shotsToReverse } }
    );

    // Delete the original deduction transaction
    await AmmoTransaction.deleteOne({ _id: existingTx._id });
  }
}
