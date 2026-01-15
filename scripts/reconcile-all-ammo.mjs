#!/usr/bin/env node

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/target-tracker";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log("✅ Connected\n");

    // Get all sheets
    const sheets = await db.collection('targetsheets').find({}).toArray();
    console.log(`Found ${sheets.length} sheets\n`);

    for (const sheet of sheets) {
      // Get bulls for this sheet
      const bulls = await db.collection('bullrecords').find({ targetSheetId: sheet._id }).toArray();
      const totalShots = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);

      if (totalShots === 0) {
        console.log(`Sheet ${sheet._id}: 0 shots, skipping`);
        continue;
      }

      // Check if transaction already exists
      const existing = await db.collection('ammotransactions').findOne({
        sheetId: sheet._id.toString(),
        reason: "session_deduct"
      });

      if (existing) {
        // Update if different
        if (existing.delta !== -totalShots) {
          console.log(`Sheet ${sheet._id}: Updating transaction from ${existing.delta} to ${-totalShots}`);
          await db.collection('ammotransactions').updateOne(
            { _id: existing._id },
            { $set: { delta: -totalShots } }
          );
          
          // Update inventory
          const deltaChange = -(totalShots - Math.abs(existing.delta));
          await db.collection('ammoinventories').updateOne(
            { userId: sheet.userId?.toString(), caliberId: sheet.caliberId.toString() },
            { $inc: { onHand: deltaChange } },
            { upsert: true }
          );
        } else {
          console.log(`Sheet ${sheet._id}: Already reconciled (${totalShots} shots)`);
        }
      } else {
        // Create new transaction
        console.log(`Sheet ${sheet._id}: Creating transaction for ${totalShots} shots`);
        await db.collection('ammotransactions').insertOne({
          userId: sheet.userId?.toString(),
          caliberId: sheet.caliberId.toString(),
          sheetId: sheet._id.toString(),
          sessionId: sheet.rangeSessionId?.toString(),
          delta: -totalShots,
          reason: "session_deduct",
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Update inventory
        await db.collection('ammoinventories').updateOne(
          { userId: sheet.userId?.toString(), caliberId: sheet.caliberId.toString() },
          { $inc: { onHand: -totalShots } },
          { upsert: true }
        );
      }
    }

    console.log("\n✅ Reconciliation complete!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
