#!/usr/bin/env node

/**
 * Migration script to attach all existing data to the master admin user.
 * This prepares the database for multi-user support.
 * 
 * Usage: node scripts/attach-data-to-user.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const MASTER_DISCORD_ID = process.env.MASTER_DISCORD_ID;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

if (!MASTER_DISCORD_ID) {
  console.error('❌ MASTER_DISCORD_ID not found in environment variables');
  console.error('   Please set MASTER_DISCORD_ID in your .env.local file');
  process.exit(1);
}

// Define schemas inline
const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String },
  discriminator: { type: String },
  avatar: { type: String },
  isApproved: { type: Boolean, default: false },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  lastLoginAt: { type: Date },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function getMasterAdminUser() {
  // Try to find existing master admin user
  let user = await User.findOne({ discordId: MASTER_DISCORD_ID });
  
  if (!user) {
    console.log('⚠️  Master admin user not found in database');
    console.log('   Creating placeholder user record...');
    
    user = await User.create({
      discordId: MASTER_DISCORD_ID,
      username: 'Master Admin',
      isApproved: true,
      role: 'admin',
    });
    
    console.log('✅ Created master admin user:', user._id);
  } else {
    console.log('✅ Found master admin user:', user._id);
    console.log(`   Discord ID: ${user.discordId}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
  }
  
  return user;
}

async function updateCollection(collectionName, userId) {
  const collection = mongoose.connection.collection(collectionName);
  
  // Count documents without userId
  const count = await collection.countDocuments({ userId: { $exists: false } });
  
  if (count === 0) {
    console.log(`   ${collectionName}: No records to update`);
    return 0;
  }
  
  // Update all documents without userId
  const result = await collection.updateMany(
    { userId: { $exists: false } },
    { $set: { userId: userId } }
  );
  
  console.log(`   ${collectionName}: Updated ${result.modifiedCount} records`);
  return result.modifiedCount;
}

async function main() {
  console.log('🚀 Starting data migration...\n');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get or create master admin user
    console.log('👤 Getting master admin user...');
    const masterUser = await getMasterAdminUser();
    console.log('');
    
    // Update all collections
    console.log('📝 Updating collections...');
    let totalUpdated = 0;
    
    totalUpdated += await updateCollection('rangesessions', masterUser._id);
    totalUpdated += await updateCollection('targetsheets', masterUser._id);
    totalUpdated += await updateCollection('firearms', masterUser._id);
    totalUpdated += await updateCollection('optics', masterUser._id);
    totalUpdated += await updateCollection('calibers', masterUser._id);
    totalUpdated += await updateCollection('bullrecords', masterUser._id);
    
    console.log('');
    console.log(`✅ Migration complete! Updated ${totalUpdated} total records`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   User ID: ${masterUser._id}`);
    console.log(`   Discord ID: ${masterUser.discordId}`);
    console.log(`   All existing data is now owned by this user`);
    console.log('');
    console.log('🎉 Your database is ready for multi-user support!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main();
