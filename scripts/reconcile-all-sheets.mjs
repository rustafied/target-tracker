#!/usr/bin/env node

/**
 * Manually reconcile ammo for all sheets
 * This will ensure all historical sessions have ammo transactions
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env.local") });

// Define schemas
const TargetSheetSchema = new mongoose.Schema({}, { strict: false });
const BullRecordSchema = new mongoose.Schema({}, { strict: false });
const AmmoTransactionSchema = new mongoose.Schema({}, { strict: false });
const AmmoInventorySchema = new mongoose.Schema({}, { strict: false });

const TargetSheet = mongoose.model("TargetSheet", TargetSheetSchema);
const BullRecord = mongoose.model("BullRecord", BullRecordSchema);
const AmmoTransaction = mongoose.model("AmmoTransaction", AmmoTransactionSchema);
const AmmoInventory = mongoose.model("AmmoInventory", AmmoInventorySchema);

async function reconcileAllSheets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all sheets with a caliber
    const sheets = await TargetSheet.find({ caliberId: { $exists: true, $ne: null } });
    console.log(`Found ${sheets.length} sheets with calibers`);

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const sheet of sheets) {
      const sheetId = sheet._id;
      const userId = sheet.userId.toString();
      const caliberId = sheet.caliberId;
      const sessionId = sheet.rangeSessionId;

      // Calculate total shots from bulls
      const bulls = await BullRecord.find({ targetSheetId: sheet._id });
      const totalShots = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);

      // Find existing transaction
      const existingTx = await AmmoTransaction.findOne({
        sheetId,
        caliberId,
        reason: "session_deduct",
      });

      if (totalShots === 0) {
        skipped++;
        continue;
      }

      if (existingTx) {
        // Update if different
        const oldShots = Math.abs(existingTx.delta);
        if (oldShots !== totalShots) {
          const deltaChange = -(totalShots - oldShots);
          existingTx.delta = -totalShots;
          await existingTx.save();

          await AmmoInventory.updateOne(
            { userId, caliberId },
            { $inc: { onHand: deltaChange } },
            { upsert: true }
          );
          updated++;
          console.log(`Updated sheet ${sheetId}: ${oldShots} -> ${totalShots} shots`);
        } else {
          skipped++;
        }
      } else {
        // Create new transaction
        await AmmoTransaction.create({
          userId,
          caliberId,
          sheetId,
          sessionId,
          delta: -totalShots,
          reason: "session_deduct",
        });

        await AmmoInventory.updateOne(
          { userId, caliberId },
          { $inc: { onHand: -totalShots } },
          { upsert: true }
        );
        created++;
        console.log(`Created transaction for sheet ${sheetId}: ${totalShots} shots`);
      }

      processed++;
    }

    console.log("\n=== Summary ===");
    console.log(`Total sheets processed: ${processed}`);
    console.log(`Transactions created: ${created}`);
    console.log(`Transactions updated: ${updated}`);
    console.log(`Sheets skipped: ${skipped}`);

    await mongoose.disconnect();
    console.log("\nDone!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

reconcileAllSheets();
