#!/usr/bin/env node

/**
 * Migrates data from paid MongoDB cluster to new free M0 tier cluster
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('=== MongoDB Migration to Free Tier ===\n');

  // Get old URI from env or prompt
  const oldUri = process.env.MONGODB_URI || await prompt('Enter OLD MongoDB URI (current paid cluster): ');
  
  // Get new password
  const newPassword = await prompt('Enter password for NEW free cluster: ');
  
  const newUri = `mongodb+srv://aamttws_db_user:${newPassword}@targettacker.4tnz3is.mongodb.net/?appName=TargetTacker`;

  console.log('\n📊 Step 1: Backing up current database...');
  
  const backupDir = './mongo-migration-backup';
  
  try {
    // Clean up old backup if exists
    if (existsSync(backupDir)) {
      console.log('Removing old backup directory...');
      rmSync(backupDir, { recursive: true, force: true });
    }

    // Dump from old cluster
    console.log('Exporting data from old cluster...');
    execSync(`mongodump --uri="${oldUri}" --out="${backupDir}"`, {
      stdio: 'inherit'
    });

    console.log('\n✅ Backup complete!\n');

    // Restore to new cluster
    console.log('📤 Step 2: Restoring to new free tier cluster...');
    execSync(`mongorestore --uri="${newUri}" --drop "${backupDir}/target-tracker"`, {
      stdio: 'inherit'
    });

    console.log('\n✅ Migration complete!\n');

    // Verify
    console.log('🔍 Step 3: Verifying migration...');
    const collections = execSync(`mongosh "${newUri}" --quiet --eval "db.getCollectionNames().join(', ')"`, {
      encoding: 'utf8'
    });
    
    console.log('Collections in new database:', collections.trim());

    // Cleanup
    console.log('\n🧹 Cleaning up backup files...');
    rmSync(backupDir, { recursive: true, force: true });

    console.log('\n✅ ALL DONE!\n');
    console.log('Next steps:');
    console.log('1. Test locally by updating your .env.local with the new URI');
    console.log('2. Update Vercel environment variables:');
    console.log('   vercel env rm MONGODB_URI production');
    console.log(`   echo "${newUri}" | vercel env add MONGODB_URI production`);
    console.log('3. Deploy: vercel --prod');
    console.log('4. DELETE the old paid cluster in MongoDB Atlas to stop billing\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nBackup is preserved at:', backupDir);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
