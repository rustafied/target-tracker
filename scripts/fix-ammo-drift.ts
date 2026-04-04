/**
 * Fix ammo inventory drift.
 *
 * 1. Delete orphaned transactions (for deleted sheets)
 * 2. Recalculate onHand for every caliber from the sum of all transactions
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { Caliber } from "../lib/models/Caliber";
import { AmmoInventory } from "../lib/models/AmmoInventory";
import { AmmoTransaction } from "../lib/models/AmmoTransaction";
import { TargetSheet } from "../lib/models/TargetSheet";
import { RangeSession } from "../lib/models/RangeSession";
import { Firearm } from "../lib/models/Firearm";

void RangeSession;
void Firearm;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Connected to MongoDB\n");

  // Step 1: Clean up orphaned session_deduct transactions
  console.log("=== STEP 1: CLEANING ORPHANED TRANSACTIONS ===\n");
  const deductTxns = await AmmoTransaction.find({ reason: "session_deduct" }).lean();
  let orphanedCount = 0;

  for (const tx of deductTxns) {
    if (!tx.sheetId) continue;
    const sheet = await TargetSheet.findById(tx.sheetId).lean();
    if (!sheet) {
      console.log(`  Deleting orphaned tx ${tx._id}: sheetId=${tx.sheetId}, delta=${tx.delta}`);
      await AmmoTransaction.deleteOne({ _id: tx._id });
      orphanedCount++;
    }
  }
  console.log(`  Cleaned ${orphanedCount} orphaned transactions\n`);

  // Step 2: Recalculate onHand for every caliber
  console.log("=== STEP 2: RECALCULATING ALL INVENTORY ===\n");

  // Get all unique userId + caliberId combinations from transactions
  const allInventory = await AmmoInventory.find({}).lean();
  const calibers = await Caliber.find({}).lean();
  const caliberMap = new Map(calibers.map(c => [c._id!.toString(), c.name]));

  for (const inv of allInventory) {
    const userId = inv.userId;
    const caliberId = inv.caliberId.toString();
    const caliberName = caliberMap.get(caliberId) || caliberId;
    const oldOnHand = inv.onHand;

    // Sum all transactions for this user + caliber
    const result = await AmmoTransaction.aggregate([
      { $match: { userId, caliberId: new mongoose.Types.ObjectId(caliberId) } },
      { $group: { _id: null, total: { $sum: "$delta" } } },
    ]);

    const newOnHand = result.length > 0 ? result[0].total : 0;
    const drift = oldOnHand - newOnHand;

    if (drift !== 0) {
      await AmmoInventory.updateOne(
        { _id: inv._id },
        { $set: { onHand: newOnHand } }
      );
      console.log(`  ${caliberName}: ${oldOnHand} -> ${newOnHand} (drift was ${drift > 0 ? "+" : ""}${drift})`);
    } else {
      console.log(`  ${caliberName}: ${oldOnHand} (no drift)`);
    }
  }

  // Step 3: Verify
  console.log("\n=== STEP 3: VERIFICATION ===\n");

  const updatedInventory = await AmmoInventory.find({}).lean();
  let allGood = true;

  for (const inv of updatedInventory) {
    const userId = inv.userId;
    const caliberId = inv.caliberId.toString();
    const caliberName = caliberMap.get(caliberId) || caliberId;

    const result = await AmmoTransaction.aggregate([
      { $match: { userId, caliberId: new mongoose.Types.ObjectId(caliberId) } },
      { $group: { _id: null, total: { $sum: "$delta" } } },
    ]);

    const expected = result.length > 0 ? result[0].total : 0;

    if (inv.onHand !== expected) {
      console.log(`  STILL MISMATCHED: ${caliberName} onHand=${inv.onHand} expected=${expected}`);
      allGood = false;
    } else {
      console.log(`  OK: ${caliberName} onHand=${inv.onHand}`);
    }
  }

  console.log(`\n${allGood ? "ALL INVENTORY CORRECTED SUCCESSFULLY" : "ERRORS REMAIN — investigate manually"}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
