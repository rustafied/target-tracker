#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

async function addSlugs() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const calibers = db.collection('calibers');

    const allCalibers = await calibers.find({}).toArray();
    console.log(`📊 Found ${allCalibers.length} calibers`);

    let updated = 0;
    const slugs = new Set();

    for (const caliber of allCalibers) {
      // Skip if already has slug
      if (caliber.slug) {
        console.log(`⏭️  ${caliber.name} already has slug: ${caliber.slug}`);
        continue;
      }

      // Generate slug
      let baseSlug = caliber.name
        .toLowerCase()
        .replace(/\./g, '')  // Remove periods
        .replace(/\s+/g, '-')  // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '');  // Remove special chars except hyphens

      let slug = baseSlug;
      let counter = 1;

      // Ensure uniqueness
      while (slugs.has(slug) || await calibers.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      slugs.add(slug);

      // Update caliber
      await calibers.updateOne(
        { _id: caliber._id },
        { $set: { slug } }
      );

      console.log(`✅ ${caliber.name} → ${slug}`);
      updated++;
    }

    console.log(`\n✨ Successfully added slugs to ${updated} calibers`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

addSlugs();
