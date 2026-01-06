#!/usr/bin/env node
/**
 * Initialize Default Target Template and Scoring Model
 * 
 * This script creates the default "Six Bull" target template and its associated
 * ring-based scoring model. This represents the current 6-bull sheet system.
 * 
 * Run with: node scripts/init-default-template.mjs
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

// Define schemas inline to avoid model registration issues
const { Schema } = mongoose;

const ScoringModelSchema = new Schema({
  name: String,
  type: String,
  maxScore: Number,
  allowMissScore: Boolean,
  anchorX: Number,
  anchorY: Number,
  rings: {
    thresholds: [{
      radius: Number,
      score: Number,
    }],
    missScore: Number,
  },
}, { timestamps: true });

const TargetTemplateSchema = new Schema({
  name: String,
  description: String,
  version: Number,
  coordinateSystem: {
    type: {
      type: String,
      enum: ["svg", "image"],
    },
    width: Number,
    height: Number,
    origin: String,
  },
  render: {
    type: {
      type: String,
      enum: ["svg", "image"],
    },
    svgMarkup: String,
    imageUrl: String,
  },
  defaultScoringModelId: Schema.Types.ObjectId,
  aimPoints: [{
    id: String,
    name: String,
    order: Number,
    centerX: Number,
    centerY: Number,
    interactiveRadius: Number,
    tags: [String],
  }],
  isSystem: Boolean,
}, { timestamps: true });

async function initDefaultTemplate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const ScoringModel = mongoose.models.ScoringModel || mongoose.model('ScoringModel', ScoringModelSchema);
    const TargetTemplate = mongoose.models.TargetTemplate || mongoose.model('TargetTemplate', TargetTemplateSchema);

    // Check if default template already exists
    const existingTemplate = await TargetTemplate.findOne({ 
      name: 'Six Bull (Default)',
      isSystem: true 
    });

    if (existingTemplate) {
      console.log('✓ Default template already exists');
      console.log(`  Template ID: ${existingTemplate._id}`);
      console.log(`  Scoring Model ID: ${existingTemplate.defaultScoringModelId}`);
      return {
        templateId: existingTemplate._id,
        scoringModelId: existingTemplate.defaultScoringModelId
      };
    }

    // Create default scoring model (ring-based, 0-5 scoring)
    console.log('Creating default scoring model...');
    const scoringModel = await ScoringModel.create({
      name: 'Six Bull Ring Scoring (0-5)',
      type: 'rings',
      maxScore: 5,
      allowMissScore: true,
      anchorX: 100, // Center of 200x200 SVG viewBox
      anchorY: 100,
      rings: {
        thresholds: [
          { radius: 10, score: 5 },   // Innermost ring (X-ring equivalent)
          { radius: 25, score: 4 },
          { radius: 50, score: 3 },
          { radius: 75, score: 2 },
          { radius: 95, score: 1 },
        ],
        missScore: 0,
      },
    });
    console.log(`✓ Created scoring model: ${scoringModel._id}\n`);

    // Create default target template (6 bulls in 2x3 grid)
    console.log('Creating default target template...');
    const template = await TargetTemplate.create({
      name: 'Six Bull (Default)',
      description: 'Standard 6-bull target sheet with ring-based scoring (0-5 points per bull)',
      version: 1,
      coordinateSystem: {
        type: 'svg',
        width: 200,  // Per-bull coordinate system for easy migration
        height: 200,
        origin: 'top-left',
      },
      render: {
        type: 'svg',
        svgMarkup: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="95" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>
  <circle cx="100" cy="100" r="75" fill="none" stroke="#d1d5db" stroke-width="0.5"/>
  <circle cx="100" cy="100" r="50" fill="none" stroke="#9ca3af" stroke-width="0.5"/>
  <circle cx="100" cy="100" r="25" fill="none" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="100" cy="100" r="10" fill="none" stroke="#374151" stroke-width="0.5"/>
  <line x1="0" y1="100" x2="200" y2="100" stroke="#e5e7eb" stroke-width="0.25"/>
  <line x1="100" y1="0" x2="100" y2="200" stroke="#e5e7eb" stroke-width="0.25"/>
</svg>`,
      },
      defaultScoringModelId: scoringModel._id,
      aimPoints: [
        { id: 'bull-1', name: 'Bull 1', order: 1, centerX: 100, centerY: 100, interactiveRadius: 95, tags: ['bull'] },
        { id: 'bull-2', name: 'Bull 2', order: 2, centerX: 100, centerY: 100, interactiveRadius: 95, tags: ['bull'] },
        { id: 'bull-3', name: 'Bull 3', order: 3, centerX: 100, centerY: 100, interactiveRadius: 95, tags: ['bull'] },
        { id: 'bull-4', name: 'Bull 4', order: 4, centerX: 100, centerY: 100, interactiveRadius: 95, tags: ['bull'] },
        { id: 'bull-5', name: 'Bull 5', order: 5, centerX: 100, centerY: 100, interactiveRadius: 95, tags: ['bull'] },
        { id: 'bull-6', name: 'Bull 6', order: 6, centerX: 100, centerY: 100, interactiveRadius: 95, tags: ['bull'] },
      ],
      isSystem: true,
    });
    console.log(`✓ Created target template: ${template._id}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✓ Default template initialization complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Template ID: ${template._id}`);
    console.log(`Scoring Model ID: ${scoringModel._id}`);
    console.log('\nSave these IDs for the migration script.\n');

    return {
      templateId: template._id,
      scoringModelId: scoringModel._id
    };

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
  initDefaultTemplate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { initDefaultTemplate };
