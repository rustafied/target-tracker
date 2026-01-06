#!/usr/bin/env node
/**
 * Migrate BullRecords to AimPointRecords
 * 
 * This script updates all existing BullRecords to include the new fields:
 * - aimPointId (derived from bullIndex)
 * - countsByScore (derived from score0Count, score1Count, etc.)
 * 
 * The legacy fields are retained for backward compatibility.
 * 
 * Run with: node scripts/migrate-bull-records.mjs
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in environment variables');
  process.exit(1);
}

const { Schema } = mongoose;

// Use loose schema to allow updates
const BullRecordSchema = new Schema({
  bullIndex: Number,
  aimPointId: String,
  countsByScore: Map,
  score0Count: Number,
  score1Count: Number,
  score2Count: Number,
  score3Count: Number,
  score4Count: Number,
  score5Count: Number,
  shotPositions: Array,
  totalShots: Number,
}, { timestamps: true, strict: false });

async function migrateBullRecords() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const BullRecord = mongoose.models.BullRecord || mongoose.model('BullRecord', BullRecordSchema);

    // Count records that need migration
    const recordsToMigrate = await BullRecord.countDocuments({
      aimPointId: { $exists: false }
    });

    if (recordsToMigrate === 0) {
      console.log('✓ No records need migration. All records already have aimPointId.\n');
      return;
    }

    console.log(`Found ${recordsToMigrate} bull records to migrate...\n`);

    // Get all records without aimPointId
    const records = await BullRecord.find({ aimPointId: { $exists: false } });
    
    let updated = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Map bullIndex to aimPointId (e.g., 1 -> "bull-1")
        const aimPointId = `bull-${record.bullIndex}`;
        
        // Build countsByScore from legacy fields
        const countsByScore = {};
        if (record.score0Count > 0) countsByScore['0'] = record.score0Count;
        if (record.score1Count > 0) countsByScore['1'] = record.score1Count;
        if (record.score2Count > 0) countsByScore['2'] = record.score2Count;
        if (record.score3Count > 0) countsByScore['3'] = record.score3Count;
        if (record.score4Count > 0) countsByScore['4'] = record.score4Count;
        if (record.score5Count > 0) countsByScore['5'] = record.score5Count;
        
        // Calculate totalShots if not set
        let totalShots = record.totalShots;
        if (!totalShots) {
          totalShots = 
            (record.score0Count || 0) +
            (record.score1Count || 0) +
            (record.score2Count || 0) +
            (record.score3Count || 0) +
            (record.score4Count || 0) +
            (record.score5Count || 0);
        }
        
        // Update the record
        await BullRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              aimPointId,
              countsByScore,
              totalShots,
            }
          }
        );
        
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`  Processed ${updated}/${recordsToMigrate} records...`);
        }
      } catch (error) {
        console.error(`  Error updating record ${record._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✓ BullRecord migration complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total records: ${recordsToMigrate}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}\n`);

  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateBullRecords()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { migrateBullRecords };
