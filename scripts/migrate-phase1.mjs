#!/usr/bin/env node
/**
 * Master Migration Script for Phase 1: Custom Target Types
 * 
 * This script runs all Phase 1 migration steps in order:
 * 1. Initialize default template and scoring model
 * 2. Migrate TargetSheets to use templates
 * 3. Migrate BullRecords to AimPointRecords
 * 
 * Run with: node scripts/migrate-phase1.mjs
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables - try multiple paths
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

// Import migration functions
import { initDefaultTemplate } from './init-default-template.mjs';
import { migrateTargetSheets } from './migrate-target-sheets.mjs';
import { migrateBullRecords } from './migrate-bull-records.mjs';

async function runPhase1Migration() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   Phase 1 Migration: Custom Target Types             ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log();

  try {
    // Step 1: Initialize default template
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ Step 1: Initialize Default Template                │');
    console.log('└─────────────────────────────────────────────────────┘');
    await initDefaultTemplate();
    console.log();

    // Step 2: Migrate TargetSheets
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ Step 2: Migrate TargetSheets                        │');
    console.log('└─────────────────────────────────────────────────────┘');
    await migrateTargetSheets();
    console.log();

    // Step 3: Migrate BullRecords
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ Step 3: Migrate BullRecords                         │');
    console.log('└─────────────────────────────────────────────────────┘');
    await migrateBullRecords();
    console.log();

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   ✓ Phase 1 Migration Complete!                      ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log();
    console.log('Next steps:');
    console.log('1. Test your application to verify existing data works');
    console.log('2. Check analytics pages for any issues');
    console.log('3. Verify sheet editing and shot entry still works');
    console.log();

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease fix the error and run the migration again.');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase1Migration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runPhase1Migration };
