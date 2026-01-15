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
      console.log(`Processing sheet ${sheet._id}...`);
      
      // First, clean up any duplicate transactions
      const transactions = await db.collection('ammotransactions').find({
        sheetId: sheet._id.toString(),
        reason: "session_deduct",
      }).sort({ createdAt: 1 }).toArray();

      if (transactions.length > 1) {
        console.log(`  Found ${transactions.length} duplicate transactions, keeping oldest`);
        for (let i = 1; i < transactions.length; i++) {
          const tx = transactions[i];
          // Reverse inventory
          await db.collection('ammoinventories').updateOne(
            { caliberId: tx.caliberId.toString() },
            { $inc: { onHand: -tx.delta } }
          );
          await db.collection('ammotransactions').deleteOne({ _id: tx._id });
          console.log(`  Deleted duplicate transaction ${tx._id}`);
        }
      }
      
      // Calculate actual shots from bulls using score counts (same logic as session API)
      const bulls = await db.collection('bullrecords').find({ 
        targetSheetId: sheet._id 
      }).toArray();
      const actualShots = bulls.reduce((sum, bull) => {
        const bullShots =
          (bull.score5Count || 0) +
          (bull.score4Count || 0) +
          (bull.score3Count || 0) +
          (bull.score2Count || 0) +
          (bull.score1Count || 0) +
          (bull.score0Count || 0);
        return sum + bullShots;
      }, 0);
      
      console.log(`  Actual shots: ${actualShots}`);
      
      if (actualShots === 0) {
        console.log(`  No shots, skipping`);
        continue;
      }
      
      // Get/update transaction
      const existingTx = await db.collection('ammotransactions').findOne({
        sheetId: sheet._id.toString(),
        reason: "session_deduct",
      });
      
      if (existingTx) {
        const oldShots = Math.abs(existingTx.delta);
        if (oldShots !== actualShots) {
          console.log(`  Updating transaction from ${oldShots} to ${actualShots}`);
          
          // Update transaction
          await db.collection('ammotransactions').updateOne(
            { _id: existingTx._id },
            { 
              $set: { 
                delta: -actualShots,
                caliberId: sheet.caliberId.toString(),
                sessionId: sheet.rangeSessionId?.toString()
              } 
            }
          );
          
          // Adjust inventory
          const deltaChange = -(actualShots - oldShots);
          await db.collection('ammoinventories').updateOne(
            { caliberId: sheet.caliberId.toString() },
            { $inc: { onHand: deltaChange } },
            { upsert: true }
          );
          console.log(`  ✅ Updated and adjusted inventory by ${deltaChange}`);
        } else {
          console.log(`  ✅ Already correct`);
        }
      } else {
        console.log(`  Creating new transaction`);
        await db.collection('ammotransactions').insertOne({
          userId: sheet.userId?.toString(),
          caliberId: sheet.caliberId.toString(),
          sheetId: sheet._id.toString(),
          sessionId: sheet.rangeSessionId?.toString(),
          delta: -actualShots,
          reason: "session_deduct",
          createdAt: new Date(),
        });
        
        await db.collection('ammoinventories').updateOne(
          { caliberId: sheet.caliberId.toString() },
          { $inc: { onHand: -actualShots } },
          { upsert: true }
        );
        console.log(`  ✅ Created transaction`);
      }
    }

    console.log("\n✅ All sheets reconciled!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
