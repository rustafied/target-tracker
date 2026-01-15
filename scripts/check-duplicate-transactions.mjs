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

    for (const sheet of sheets) {
      // Find all transactions for this sheet
      const transactions = await db.collection('ammotransactions').find({
        sheetId: sheet._id.toString(),
        reason: "session_deduct"
      }).toArray();

      if (transactions.length > 1) {
        console.log(`\n❌ DUPLICATE for sheet ${sheet._id}:`);
        transactions.forEach((tx, i) => {
          console.log(`  Transaction ${i + 1}: delta=${tx.delta}, created=${tx.createdAt}`);
        });
        
        // Get bulls to see what it should be
        const bulls = await db.collection('bullrecords').find({ targetSheetId: sheet._id }).toArray();
        const totalShots = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);
        console.log(`  Should be: -${totalShots}`);
      } else if (transactions.length === 1) {
        const bulls = await db.collection('bullrecords').find({ targetSheetId: sheet._id }).toArray();
        const totalShots = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);
        if (transactions[0].delta !== -totalShots) {
          console.log(`\n⚠️  MISMATCH for sheet ${sheet._id}:`);
          console.log(`  Transaction: ${transactions[0].delta}, Should be: -${totalShots}`);
        }
      }
    }

    console.log("\n✅ Check complete!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
