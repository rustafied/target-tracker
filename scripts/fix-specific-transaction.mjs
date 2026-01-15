#!/usr/bin/env node

// This script can be run against production database
// Usage: MONGODB_URI="your-prod-uri" node fix-specific-transaction.mjs

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/target-tracker";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log("✅ Connected\n");

    // The problematic transaction
    const txId = '69691cbabb1f4bb06532ba21';
    const sheetId = '69691b99ac10a47ed0b1447c';

    // Check if sheet exists
    const sheet = await db.collection('targetsheets').findOne({ 
      _id: new mongoose.Types.ObjectId(sheetId) 
    });
    
    if (!sheet) {
      console.log('❌ Sheet not found - it is orphaned, delete the transaction');
      const tx = await db.collection('ammotransactions').findOne({ 
        _id: new mongoose.Types.ObjectId(txId) 
      });
      if (tx) {
        await db.collection('ammotransactions').deleteOne({ _id: tx._id });
        await db.collection('ammoinventories').updateOne(
          { caliberId: tx.caliberId.toString() },
          { $inc: { onHand: -tx.delta } }
        );
        console.log('✅ Deleted orphaned transaction and reversed inventory');
      }
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Sheet exists: ${sheetId}`);

    // Get actual shot count from bulls
    const bulls = await db.collection('bullrecords').find({ 
      targetSheetId: sheet._id 
    }).toArray();

    const actualShots = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);
    console.log(`Actual shots from bulls: ${actualShots}`);

    // Get the transaction
    const tx = await db.collection('ammotransactions').findOne({ 
      _id: new mongoose.Types.ObjectId(txId) 
    });

    if (!tx) {
      console.log('❌ Transaction not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`Current transaction delta: ${tx.delta}`);
    console.log(`Should be: -${actualShots}`);
    console.log(`Difference: ${actualShots - Math.abs(tx.delta)} shots\n`);

    if (tx.delta === -actualShots) {
      console.log('✅ Transaction is correct, no fix needed');
    } else {
      console.log('Fixing transaction...');
      const oldDelta = tx.delta;
      const newDelta = -actualShots;
      const inventoryAdjustment = oldDelta - newDelta; // How much to adjust inventory

      // Update transaction
      await db.collection('ammotransactions').updateOne(
        { _id: tx._id },
        { $set: { delta: newDelta } }
      );

      // Adjust inventory
      await db.collection('ammoinventories').updateOne(
        { caliberId: tx.caliberId.toString() },
        { $inc: { onHand: inventoryAdjustment } }
      );

      console.log(`✅ Updated transaction from ${oldDelta} to ${newDelta}`);
      console.log(`✅ Adjusted inventory by ${inventoryAdjustment}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
