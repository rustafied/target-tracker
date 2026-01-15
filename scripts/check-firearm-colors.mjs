#!/usr/bin/env node

import mongoose from "mongoose";
import { Firearm } from "../lib/models/Firearm.ts";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/target-tracker";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected\n");

    // Get all firearms
    const firearms = await Firearm.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    
    console.log(`Found ${firearms.length} firearms:\n`);
    
    firearms.forEach((firearm) => {
      console.log(`- ${firearm.name}`);
      console.log(`  Color: ${firearm.color || "(not set)"}`);
      console.log(`  ID: ${firearm._id}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
