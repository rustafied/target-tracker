#!/usr/bin/env node

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/target-tracker";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log("✅ Connected\n");

    // Find the most recent sheet
    const sheet = await db.collection('targetsheets').findOne({}, { sort: { createdAt: -1 } });
    
    if (!sheet) {
      console.log("No sheets found");
      return;
    }

    console.log(`Sheet: ${sheet._id}`);
    console.log(`Created: ${sheet.createdAt}\n`);

    // Get all bulls for this sheet
    const bulls = await db.collection('bullrecords').find({ targetSheetId: sheet._id }).toArray();
    
    console.log(`Bulls found: ${bulls.length}`);
    bulls.forEach((bull, i) => {
      const totalShots = 
        (bull.score5Count || 0) +
        (bull.score4Count || 0) +
        (bull.score3Count || 0) +
        (bull.score2Count || 0) +
        (bull.score1Count || 0) +
        (bull.score0Count || 0);
      console.log(`  Bull ${i + 1}: ${totalShots} shots (totalShots field: ${bull.totalShots})`);
    });

    const calculatedTotal = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);
    console.log(`\nCalculated total shots: ${calculatedTotal}\n`);

    // Find ammo transactions for this sheet - try both string and ObjectId
    const transactionsString = await db.collection('ammotransactions').find({
      sheetId: sheet._id.toString()
    }).toArray();

    const transactionsObjectId = await db.collection('ammotransactions').find({
      sheetId: sheet._id
    }).toArray();

    console.log(`Ammo transactions found (string): ${transactionsString.length}`);
    console.log(`Ammo transactions found (ObjectId): ${transactionsObjectId.length}`);
    
    const transactions = [...transactionsString, ...transactionsObjectId];
    if (transactions.length > 0) {
      transactions.forEach((tx, i) => {
        console.log(`  Transaction ${i + 1}:`);
        console.log(`    Delta: ${tx.delta}`);
        console.log(`    Reason: ${tx.reason}`);
        console.log(`    sheetId type: ${typeof tx.sheetId} = ${tx.sheetId}`);
        console.log(`    Created: ${tx.createdAt}`);
      });
    } else {
      console.log("\n❌ NO TRANSACTIONS FOUND - Ammo reconciliation did not run!");
      console.log("\nLet me check all transactions to see what format is used:");
      const allTx = await db.collection('ammotransactions').find({}).limit(3).toArray();
      allTx.forEach((tx, i) => {
        console.log(`  Sample ${i + 1}:`);
        console.log(`    sheetId: ${tx.sheetId} (type: ${typeof tx.sheetId})`);
        console.log(`    Delta: ${tx.delta}`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
