#!/usr/bin/env node
/**
 * Migrate TargetSheets to use Target Templates
 * 
 * This script updates all existing TargetSheets to reference the default
 * "Six Bull" target template.
 * 
 * Prerequisites:
 * - Run init-default-template.mjs first to create the default template
 * 
 * Run with: node scripts/migrate-target-sheets.mjs
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

const TargetTemplateSchema = new Schema({
  name: String,
  isSystem: Boolean,
  version: Number,
  aimPoints: Array,
}, { timestamps: true });

const TargetSheetSchema = new Schema({
  targetTemplateId: Schema.Types.ObjectId,
  targetTemplateVersion: Number,
  aimPointCountSnapshot: Number,
}, { timestamps: true, strict: false });

async function migrateTargetSheets() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const TargetTemplate = mongoose.models.TargetTemplate || mongoose.model('TargetTemplate', TargetTemplateSchema);
    const TargetSheet = mongoose.models.TargetSheet || mongoose.model('TargetSheet', TargetSheetSchema);

    // Find the default template
    console.log('Looking for default template...');
    const defaultTemplate = await TargetTemplate.findOne({ 
      name: 'Six Bull (Default)',
      isSystem: true 
    });

    if (!defaultTemplate) {
      console.error('\n❌ ERROR: Default template not found!');
      console.error('Please run: node scripts/init-default-template.mjs first\n');
      process.exit(1);
    }

    console.log(`✓ Found default template: ${defaultTemplate._id}`);
    console.log(`  Version: ${defaultTemplate.version}`);
    console.log(`  Aim Points: ${defaultTemplate.aimPoints.length}\n`);

    // Count sheets that need migration
    const sheetsToMigrate = await TargetSheet.countDocuments({
      targetTemplateId: { $exists: false }
    });

    if (sheetsToMigrate === 0) {
      console.log('✓ No sheets need migration. All sheets already have templates assigned.\n');
      return;
    }

    console.log(`Found ${sheetsToMigrate} sheets to migrate...\n`);

    // Update all sheets without a template
    const result = await TargetSheet.updateMany(
      { targetTemplateId: { $exists: false } },
      {
        $set: {
          targetTemplateId: defaultTemplate._id,
          targetTemplateVersion: defaultTemplate.version,
          aimPointCountSnapshot: defaultTemplate.aimPoints.length,
        }
      }
    );

    console.log('═══════════════════════════════════════════════════════');
    console.log('✓ TargetSheet migration complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Matched: ${result.matchedCount} sheets`);
    console.log(`Updated: ${result.modifiedCount} sheets`);
    console.log(`Template ID: ${defaultTemplate._id}`);
    console.log(`Template Version: ${defaultTemplate.version}\n`);

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
  migrateTargetSheets()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { migrateTargetSheets };
