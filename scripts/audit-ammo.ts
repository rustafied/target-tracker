/**
 * Ammo Audit Script
 *
 * Compares:
 *   1. All ammo ADDED (manual_add, inventory_set, session_reversal transactions)
 *   2. All shots ACTUALLY FIRED (calculated from bull records on every sheet)
 *   3. Current inventory onHand value
 *
 * Expected: added - fired = onHand
 * If not, shows the discrepancy.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { Caliber } from "../lib/models/Caliber";
import { AmmoInventory } from "../lib/models/AmmoInventory";
import { AmmoTransaction } from "../lib/models/AmmoTransaction";
import { TargetSheet } from "../lib/models/TargetSheet";
import { BullRecord } from "../lib/models/BullRecord";
import { RangeSession } from "../lib/models/RangeSession";
import { Firearm } from "../lib/models/Firearm";

// Ensure models are registered
void RangeSession;
void Firearm;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB\n");

  // Get all calibers
  const calibers = await Caliber.find({}).sort({ sortOrder: 1, name: 1 }).lean();

  console.log("=".repeat(100));
  console.log("AMMO AUDIT REPORT");
  console.log("=".repeat(100));

  let hasDiscrepancy = false;

  for (const caliber of calibers) {
    const calId = caliber._id!.toString();

    // 1. Get all transactions for this caliber
    const transactions = await AmmoTransaction.find({ caliberId: caliber._id }).lean();

    // Sum up additions and deductions from transactions
    let txAdded = 0;   // positive deltas (manual_add, inventory_set, session_reversal)
    let txDeducted = 0; // negative deltas (session_deduct, manual_subtract)
    const txByReason: Record<string, { count: number; total: number }> = {};

    for (const tx of transactions) {
      const reason = tx.reason;
      if (!txByReason[reason]) txByReason[reason] = { count: 0, total: 0 };
      txByReason[reason].count++;
      txByReason[reason].total += tx.delta;

      if (tx.delta > 0) {
        txAdded += tx.delta;
      } else {
        txDeducted += Math.abs(tx.delta);
      }
    }

    // 2. Get current inventory
    const inventory = await AmmoInventory.findOne({ caliberId: caliber._id }).lean();
    const onHand = inventory?.onHand ?? 0;

    // 3. Calculate ACTUAL shots fired from all sheets with this caliber
    const sheets = await TargetSheet.find({ caliberId: caliber._id }).lean();

    let actualShotsFired = 0;
    const sheetDetails: { sheetId: string; slug: string; shots: number; hasTx: boolean }[] = [];

    for (const sheet of sheets) {
      const bulls = await BullRecord.find({ targetSheetId: sheet._id }).lean();

      let sheetShots = 0;
      for (const bull of bulls) {
        let bullShots = 0;

        // Try countsByScore if non-empty, fallback to legacy fields
        if (bull.countsByScore && typeof bull.countsByScore === "object") {
          const counts = bull.countsByScore instanceof Map
            ? Object.fromEntries(bull.countsByScore)
            : bull.countsByScore;
          const entries = Object.values(counts);
          if (entries.length > 0) {
            for (const count of entries) {
              bullShots += Number(count) || 0;
            }
          }
        }

        if (bullShots === 0) {
          // Legacy fields
          bullShots =
            (bull.score5Count || 0) +
            (bull.score4Count || 0) +
            (bull.score3Count || 0) +
            (bull.score2Count || 0) +
            (bull.score1Count || 0) +
            (bull.score0Count || 0);
        }

        sheetShots += bullShots;
      }

      // Check if this sheet has a corresponding ammo transaction
      const sheetTx = await AmmoTransaction.findOne({
        sheetId: sheet._id,
        reason: "session_deduct",
      }).lean();

      actualShotsFired += sheetShots;

      if (sheetShots > 0 || !sheetTx) {
        sheetDetails.push({
          sheetId: sheet._id!.toString(),
          slug: sheet.slug,
          shots: sheetShots,
          hasTx: !!sheetTx,
        });
      }
    }

    // 4. Compare: expected onHand = txAdded - txDeducted (what transactions say)
    //    Also compare session_deduct totals vs actual shots from bulls
    const expectedFromTx = txAdded - txDeducted;
    const sessionDeductTotal = Math.abs(txByReason["session_deduct"]?.total || 0);
    const sessionDeductVsBulls = sessionDeductTotal - actualShotsFired;
    const inventoryVsExpected = onHand - expectedFromTx;

    const isOk = inventoryVsExpected === 0 && sessionDeductVsBulls === 0;
    if (!isOk) hasDiscrepancy = true;

    // Find sheets with no transaction (missed deductions)
    const missedSheets = sheetDetails.filter(s => !s.hasTx && s.shots > 0);
    // Find sheets with transaction but 0 shots (phantom deductions)
    const phantomSheets = sheetDetails.filter(s => s.hasTx && s.shots === 0);

    console.log(`\n${"─".repeat(100)}`);
    console.log(`CALIBER: ${caliber.name} (${caliber.slug}) ${isOk ? "OK" : "MISMATCH"}`);
    console.log(`${"─".repeat(100)}`);
    console.log(`  Sheets:              ${sheets.length} total`);
    console.log(`  Actual shots fired:  ${actualShotsFired} (from bull records across all sheets)`);
    console.log(`  `);
    console.log(`  Transaction summary:`);
    for (const [reason, data] of Object.entries(txByReason).sort()) {
      console.log(`    ${reason.padEnd(20)} ${data.count.toString().padStart(4)} txns  |  delta: ${data.total >= 0 ? "+" : ""}${data.total}`);
    }
    console.log(`  `);
    console.log(`  Total added (tx):    +${txAdded}`);
    console.log(`  Total deducted (tx): -${txDeducted}`);
    console.log(`  Expected onHand:     ${expectedFromTx} (added - deducted from transactions)`);
    console.log(`  Actual onHand:       ${onHand} (from AmmoInventory)`);

    if (inventoryVsExpected !== 0) {
      console.log(`  >>> INVENTORY DRIFT:  ${inventoryVsExpected > 0 ? "+" : ""}${inventoryVsExpected} (onHand is ${inventoryVsExpected > 0 ? "higher" : "lower"} than transaction math)`);
    }

    if (sessionDeductVsBulls !== 0) {
      console.log(`  >>> SESSION TX vs BULLS DIFF: ${sessionDeductVsBulls > 0 ? "+" : ""}${sessionDeductVsBulls} (session_deduct txns deducted ${sessionDeductVsBulls > 0 ? "more" : "fewer"} than bull record shots)`);
    }

    if (missedSheets.length > 0) {
      console.log(`\n  SHEETS WITH SHOTS BUT NO AMMO TRANSACTION (${missedSheets.length}):`);
      for (const s of missedSheets) {
        console.log(`    - ${s.slug} | ${s.shots} shots | NO deduction recorded`);
      }
    }

    if (phantomSheets.length > 0) {
      console.log(`\n  SHEETS WITH TRANSACTION BUT 0 SHOTS (${phantomSheets.length}):`);
      for (const s of phantomSheets) {
        console.log(`    - ${s.slug} | 0 shots but has deduction tx`);
      }
    }
  }

  console.log(`\n${"=".repeat(100)}`);
  if (hasDiscrepancy) {
    console.log("RESULT: DISCREPANCIES FOUND - see details above");
  } else {
    console.log("RESULT: ALL CALIBERS OK - transactions match bull records and inventory is in sync");
  }
  console.log("=".repeat(100));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
