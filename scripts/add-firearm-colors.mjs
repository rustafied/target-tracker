#!/usr/bin/env node

import mongoose from "mongoose";
import { Firearm } from "../lib/models/Firearm.ts";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/target-tracker";

const defaultColors = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
];

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected");

    // Get all firearms without colors
    const firearms = await Firearm.find({ $or: [{ color: null }, { color: { $exists: false } }] }).sort({ sortOrder: 1, name: 1 });
    
    if (firearms.length === 0) {
      console.log("✅ All firearms already have colors assigned");
      return;
    }

    console.log(`Found ${firearms.length} firearms without colors`);

    // Assign colors
    for (let i = 0; i < firearms.length; i++) {
      const firearm = firearms[i];
      const color = defaultColors[i % defaultColors.length];
      
      await Firearm.updateOne(
        { _id: firearm._id },
        { $set: { color } }
      );
      
      console.log(`✅ Assigned ${color} to ${firearm.name}`);
    }

    console.log("\n✅ Migration complete!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
