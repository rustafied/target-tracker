/**
 * Detailed bull record inspection - understand WHY shot counts don't match transactions
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { Caliber } from "../lib/models/Caliber";
import { AmmoTransaction } from "../lib/models/AmmoTransaction";
import { TargetSheet } from "../lib/models/TargetSheet";
import { BullRecord } from "../lib/models/BullRecord";
import { RangeSession } from "../lib/models/RangeSession";
import { Firearm } from "../lib/models/Firearm";

void RangeSession;
void Firearm;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Connected\n");

  // Focus on 9mm
  const caliber = await Caliber.findOne({ slug: "9mm" }).lean();
  if (!caliber) { console.log("9mm not found"); return; }

  console.log("=== 9mm DETAILED AUDIT ===\n");

  // Get all 9mm sheets
  const sheets = await TargetSheet.find({ caliberId: caliber._id })
    .populate("rangeSessionId")
    .populate("firearmId")
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Total 9mm sheets: ${sheets.length}\n`);

  // For each sheet, show bulls and transaction
  for (const sheet of sheets) {
    const bulls = await BullRecord.find({ targetSheetId: sheet._id }).lean();
    const tx = await AmmoTransaction.findOne({
      sheetId: sheet._id,
      reason: "session_deduct",
    }).lean();

    // Calculate shots from score fields
    let scoreFieldShots = 0;
    let countsByScoreShots = 0;
    let totalShotsField = 0;
    let shotPositionsCount = 0;

    for (const bull of bulls) {
      scoreFieldShots +=
        (bull.score5Count || 0) +
        (bull.score4Count || 0) +
        (bull.score3Count || 0) +
        (bull.score2Count || 0) +
        (bull.score1Count || 0) +
        (bull.score0Count || 0);

      totalShotsField += bull.totalShots || 0;
      shotPositionsCount += (bull.shotPositions || []).length;

      if (bull.countsByScore && typeof bull.countsByScore === "object") {
        const counts = bull.countsByScore instanceof Map
          ? Object.fromEntries(bull.countsByScore)
          : bull.countsByScore;
        for (const count of Object.values(counts)) {
          countsByScoreShots += Number(count) || 0;
        }
      }
    }

    const txDelta = tx ? Math.abs(tx.delta) : 0;
    const anyMismatch = txDelta !== scoreFieldShots || txDelta !== totalShotsField;
    const session = sheet.rangeSessionId as any;
    const firearm = sheet.firearmId as any;

    // Only show sheets with interesting data
    if (anyMismatch || txDelta > 0 || scoreFieldShots > 0) {
      console.log(`Sheet: ${sheet.slug}`);
      console.log(`  Session: ${session?.date?.toISOString?.()?.split("T")[0] || "?"} | Firearm: ${firearm?.name || "?"}`);
      console.log(`  Bulls: ${bulls.length} records`);
      console.log(`  scoreXCount sum:     ${scoreFieldShots}`);
      console.log(`  countsByScore sum:   ${countsByScoreShots}`);
      console.log(`  totalShots field:    ${totalShotsField}`);
      console.log(`  shotPositions count: ${shotPositionsCount}`);
      console.log(`  TX deducted:         ${txDelta}`);
      if (anyMismatch) {
        console.log(`  >>> MISMATCH`);
      }
      console.log();
    }
  }

  // Also check: are there any 9mm transactions for sheets that DON'T exist?
  const allTx = await AmmoTransaction.find({
    caliberId: caliber._id,
    reason: "session_deduct",
  }).lean();

  console.log(`\n=== ORPHANED TRANSACTIONS (tx for non-existent sheets) ===`);
  let orphanCount = 0;
  for (const tx of allTx) {
    if (tx.sheetId) {
      const sheet = await TargetSheet.findById(tx.sheetId).lean();
      if (!sheet) {
        orphanCount++;
        console.log(`  TX ${tx._id}: sheetId=${tx.sheetId} delta=${tx.delta} (sheet NOT FOUND)`);
      }
    }
  }
  if (orphanCount === 0) console.log("  None found");

  // Sample a raw bull record to see all fields
  console.log("\n=== SAMPLE RAW BULL RECORD (first 9mm bull) ===");
  const sampleSheet = sheets[0];
  if (sampleSheet) {
    const rawBull = await mongoose.connection.db!
      .collection("bullrecords")
      .findOne({ targetSheetId: sampleSheet._id });
    console.log(JSON.stringify(rawBull, null, 2));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
