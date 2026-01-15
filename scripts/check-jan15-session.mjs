#!/usr/bin/env node

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/target-tracker";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log("✅ Connected\n");

    // Find Jan 15, 2026 session
    const session = await db.collection('rangesessions').findOne({
      date: { $gte: new Date('2026-01-15'), $lt: new Date('2026-01-16') }
    });

    if (!session) {
      console.log("No session found for Jan 15, 2026");
      return;
    }

    console.log(`Session: ${session._id}`);
    console.log(`Date: ${session.date}`);
    console.log(`Location: ${session.location}\n`);

    // Find all sheets for this session
    const sheets = await db.collection('targetsheets').find({
      rangeSessionId: session._id
    }).toArray();

    console.log(`Sheets in session: ${sheets.length}\n`);

    let totalShots = 0;
    for (const sheet of sheets) {
      const bulls = await db.collection('bullrecords').find({
        targetSheetId: sheet._id
      }).toArray();
      
      const sheetShots = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);
      totalShots += sheetShots;
      console.log(`Sheet ${sheet._id}: ${sheetShots} shots`);
    }

    console.log(`\nTotal shots in session: ${totalShots}\n`);

    // Find all transactions for this session (both by sessionId and by sheetId)
    const sessionTransactions = await db.collection('ammotransactions').find({
      sessionId: session._id.toString()
    }).toArray();

    console.log(`Transactions with sessionId: ${sessionTransactions.length}`);
    sessionTransactions.forEach((tx, i) => {
      console.log(`  ${i + 1}. Delta: ${tx.delta}, Reason: ${tx.reason}, Created: ${tx.createdAt}`);
    });

    // Also check for sheet-level transactions
    const sheetIds = sheets.map(s => s._id.toString());
    const sheetTransactions = await db.collection('ammotransactions').find({
      sheetId: { $in: sheetIds }
    }).toArray();

    console.log(`\nTransactions with sheetId: ${sheetTransactions.length}`);
    sheetTransactions.forEach((tx, i) => {
      console.log(`  ${i + 1}. Delta: ${tx.delta}, Reason: ${tx.reason}, sheetId: ${tx.sheetId}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
