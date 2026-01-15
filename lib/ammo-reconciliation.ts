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
  
  // Sum up shots from score counts (same logic as session API)
  // The totalShots field on bull records is not always updated, so we calculate from score counts
  const totalShots = bulls.reduce((sum, bull) => {
    const bullShots =
      (bull.score5Count || 0) +
      (bull.score4Count || 0) +
      (bull.score3Count || 0) +
      (bull.score2Count || 0) +
      (bull.score1Count || 0) +
      (bull.score0Count || 0);
    return sum + bullShots;
  }, 0);
  
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

  // Find existing transaction for this sheet (query by sheetId only to avoid duplicates)
  const existingTx = await AmmoTransaction.findOne({
    sheetId: sheetId.toString(),
    reason: "session_deduct",
  });
  
  console.log('[Ammo Reconciliation] Existing transaction:', existingTx ? `Found (${existingTx._id})` : 'Not found');

  if (existingTx) {
    // Update existing transaction
    const oldShots = Math.abs(existingTx.delta);
    const oldCaliberId = existingTx.caliberId.toString();
    const newCaliberId = caliberId.toString();
    
    console.log('[Ammo Reconciliation] Updating transaction:', { 
      oldShots, 
      newShots: shotsUsed, 
      oldCaliberId,
      newCaliberId
    });

    // If caliber changed, reverse the old inventory and apply to new
    if (oldCaliberId !== newCaliberId) {
      // Reverse old caliber inventory
      await AmmoInventory.updateOne(
        { userId: userId.toString(), caliberId: oldCaliberId },
        { $inc: { onHand: oldShots } },
        { upsert: true }
      );
      
      // Apply to new caliber inventory
      await AmmoInventory.updateOne(
        { userId: userId.toString(), caliberId: newCaliberId },
        { $inc: { onHand: -shotsUsed } },
        { upsert: true }
      );
      
      console.log('[Ammo Reconciliation] Caliber changed, moved inventory from', oldCaliberId, 'to', newCaliberId);
    } else {
      // Same caliber, just adjust the difference
      const deltaChange = -(shotsUsed - oldShots);
      await AmmoInventory.updateOne(
        { userId: userId.toString(), caliberId: newCaliberId },
        { $inc: { onHand: deltaChange } },
        { upsert: true }
      );
    }

    // Update transaction with new values (keep as ObjectId)
    existingTx.delta = -shotsUsed;
    existingTx.caliberId = caliberId;
    if (sessionId) {
      existingTx.sessionId = sessionId;
    }
    await existingTx.save();
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

  // Store IDs as ObjectId for Mongoose compatibility
  await AmmoTransaction.create({
    userId: userId.toString(),
    caliberId: caliberId,  // Keep as ObjectId
    sheetId: sheetId,      // Keep as ObjectId
    sessionId: sessionId,  // Keep as ObjectId
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
 * Clean up duplicate transactions for a sheet (keep only one)
 */
export async function cleanupDuplicateTransactions(sheetId: mongoose.Types.ObjectId): Promise<void> {
  const transactions = await AmmoTransaction.find({
    sheetId: sheetId.toString(),
    reason: "session_deduct",
  }).sort({ createdAt: 1 }); // Oldest first

  if (transactions.length > 1) {
    console.log(`[Ammo Reconciliation] Found ${transactions.length} duplicate transactions for sheet ${sheetId}, keeping oldest`);
    
    // Keep the first (oldest) transaction, delete the rest
    for (let i = 1; i < transactions.length; i++) {
      const tx = transactions[i];
      
      // Reverse the inventory for duplicates
      await AmmoInventory.updateOne(
        { caliberId: tx.caliberId.toString() },
        { $inc: { onHand: -tx.delta } }
      );
      
      await AmmoTransaction.deleteOne({ _id: tx._id });
      console.log(`[Ammo Reconciliation] Deleted duplicate transaction ${tx._id}`);
    }
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
  // Find the existing deduction transaction (convert to strings for query)
  const existingTx = await AmmoTransaction.findOne({
    sheetId: sheetId.toString(),
    caliberId: caliberId.toString(),
    reason: "session_deduct",
  });

  if (existingTx) {
    const shotsToReverse = Math.abs(existingTx.delta);

    // Create reversal transaction (use ObjectId)
    await AmmoTransaction.create({
      userId: userId.toString(),
      caliberId: caliberId,  // Keep as ObjectId
      sheetId: sheetId,      // Keep as ObjectId
      delta: shotsToReverse,
      reason: "session_reversal",
      note: "Sheet deleted",
    });

    // Update inventory
    await AmmoInventory.updateOne(
      { userId: userId.toString(), caliberId: caliberId.toString() },
      { $inc: { onHand: shotsToReverse } }
    );

    // Delete the original deduction transaction
    await AmmoTransaction.deleteOne({ _id: existingTx._id });
  }
}
