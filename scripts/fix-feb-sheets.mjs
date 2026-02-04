#!/usr/bin/env node

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/target-tracker";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log("✅ Connected\n");

    // Find Feb 2 and Feb 3 sessions by slug pattern
    const feb2Session = await db.collection('rangesessions').findOne({
      slug: { $regex: /^2026-02-02/ }
    });

    const feb3Session = await db.collection('rangesessions').findOne({
      slug: { $regex: /^2026-02-03/ }
    });

    if (!feb2Session) {
      console.log("No session found for Feb 2, 2026");
      return;
    }
    if (!feb3Session) {
      console.log("No session found for Feb 3, 2026");
      return;
    }

    console.log(`Feb 2 Session: ${feb2Session._id} (slug: ${feb2Session.slug})`);
    console.log(`Feb 3 Session: ${feb3Session._id} (slug: ${feb3Session.slug})\n`);

    // Today is Feb 3, 2026 - find sheets on Feb 2 session created today
    const todayStart = new Date('2026-02-03T00:00:00.000Z');
    const todayEnd = new Date('2026-02-04T00:00:00.000Z');

    const feb2Sheets = await db.collection('targetsheets').find({
      rangeSessionId: feb2Session._id
    }).sort({ createdAt: 1 }).toArray();

    const feb3Sheets = await db.collection('targetsheets').find({
      rangeSessionId: feb3Session._id
    }).sort({ createdAt: 1 }).toArray();

    console.log(`=== Feb 2 Session Sheets (${feb2Sheets.length} total) ===`);
    const sheetsToMove = [];
    for (const sheet of feb2Sheets) {
      const createdToday = sheet.createdAt >= todayStart && sheet.createdAt < todayEnd;
      const marker = createdToday ? "📦 MOVE" : "";
      console.log(`  ${sheet.slug} - created: ${sheet.createdAt.toISOString()} ${marker}`);
      if (createdToday) {
        sheetsToMove.push(sheet);
      }
    }

    console.log(`\n=== Feb 3 Session Sheets (${feb3Sheets.length} total) ===`);
    for (const sheet of feb3Sheets) {
      console.log(`  ${sheet.slug} - created: ${sheet.createdAt.toISOString()}`);
    }

    console.log(`\n=== Summary ===`);
    console.log(`Sheets to move from Feb 2 to Feb 3: ${sheetsToMove.length}`);

    if (sheetsToMove.length === 0) {
      console.log("Nothing to move!");
      return;
    }

    // Confirm before proceeding
    const args = process.argv.slice(2);
    if (!args.includes('--execute')) {
      console.log("\nRun with --execute to actually move the sheets");
      return;
    }

    console.log("\n=== Moving Sheets ===");
    for (const sheet of sheetsToMove) {
      const result = await db.collection('targetsheets').updateOne(
        { _id: sheet._id },
        { $set: { rangeSessionId: feb3Session._id } }
      );
      console.log(`  Moved ${sheet.slug}: ${result.modifiedCount === 1 ? '✅' : '❌'}`);
    }

    // Verify final state
    const finalFeb2 = await db.collection('targetsheets').find({
      rangeSessionId: feb2Session._id
    }).sort({ createdAt: 1 }).toArray();

    const finalFeb3 = await db.collection('targetsheets').find({
      rangeSessionId: feb3Session._id
    }).sort({ createdAt: 1 }).toArray();

    console.log(`\n=== Final State ===`);
    console.log(`Feb 2 Session: ${finalFeb2.length} sheets`);
    console.log(`Feb 3 Session: ${finalFeb3.length} sheets`);
    
    console.log(`\nFeb 3 sheets in order:`);
    for (const sheet of finalFeb3) {
      console.log(`  ${sheet.slug} - created: ${sheet.createdAt.toISOString()}`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
