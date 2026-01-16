#!/usr/bin/env node

/**
 * Create database indexes for optimized anomaly detection queries
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables");
  process.exit(1);
}

async function createIndexes() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // Index for RangeSessions collection
    console.log("\n📊 Creating indexes for rangesessions...");
    
    // Date index for chronological queries
    await db.collection("rangesessions").createIndex(
      { date: -1 },
      { name: "date_desc" }
    );
    console.log("  ✓ Created index: date_desc");

    // Compound index for date range queries with userId (for multi-user)
    await db.collection("rangesessions").createIndex(
      { userId: 1, date: -1 },
      { name: "userId_date" }
    );
    console.log("  ✓ Created index: userId_date");

    // Index for TargetSheets collection
    console.log("\n📊 Creating indexes for targetsheets...");
    
    // Compound index for session lookups
    await db.collection("targetsheets").createIndex(
      { rangeSessionId: 1, distanceYards: 1 },
      { name: "session_distance" }
    );
    console.log("  ✓ Created index: session_distance");

    // Compound index for equipment lookups
    await db.collection("targetsheets").createIndex(
      { firearmId: 1, opticId: 1, caliberId: 1 },
      { name: "equipment_combo" }
    );
    console.log("  ✓ Created index: equipment_combo");

    // Index for BullRecords collection
    console.log("\n📊 Creating indexes for bullrecords...");
    
    // Index for sheet lookups (already exists but ensure it's there)
    await db.collection("bullrecords").createIndex(
      { targetSheetId: 1 },
      { name: "targetSheetId" }
    );
    console.log("  ✓ Created index: targetSheetId");

    // List all indexes to verify
    console.log("\n📋 Verifying indexes...");
    
    const sessionIndexes = await db.collection("rangesessions").indexes();
    console.log("\nRangeSessions indexes:");
    sessionIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    const sheetIndexes = await db.collection("targetsheets").indexes();
    console.log("\nTargetSheets indexes:");
    sheetIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    const bullIndexes = await db.collection("bullrecords").indexes();
    console.log("\nBullRecords indexes:");
    bullIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log("\n✅ All indexes created successfully!");
    console.log("\n💡 Performance tips:");
    console.log("  - Anomaly queries should now run in <500ms for 100+ sessions");
    console.log("  - Consider adding caching for global averages if dataset grows large");
    console.log("  - Monitor query performance with MongoDB Atlas Performance Advisor");

  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

createIndexes();
