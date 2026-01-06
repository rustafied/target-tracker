#!/usr/bin/env node
/**
 * Add Additional Built-In Target Templates
 * 
 * This script adds 4 new built-in templates:
 * 1. Single Bullseye - For precision shooting
 * 2. Sight-In Grid - For zeroing (5 squares)
 * 3. Silhouette - Head/torso zones
 * 4. Qualification Target - B-27 style
 * 
 * Run with: node scripts/add-builtin-templates.mjs
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { ScoringModel } from '../lib/models/ScoringModel.ts';
import { TargetTemplate } from '../lib/models/TargetTemplate.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function addBuiltInTemplates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Template 1: Single Bullseye (9-5 scoring for precision)
    console.log('Creating Single Bullseye template...');
    let bullseyeScoring = await ScoringModel.findOne({ name: 'Single Bullseye Scoring (9-5)' });
    if (!bullseyeScoring) {
      bullseyeScoring = await ScoringModel.create({
        name: 'Single Bullseye Scoring (9-5)',
        type: 'rings',
        maxScore: 9,
        allowMissScore: true,
        anchorX: 100,
        anchorY: 100,
        rings: {
          thresholds: [
            { radius: 10, score: 9 },   // X-ring
            { radius: 20, score: 8 },
            { radius: 35, score: 7 },
            { radius: 50, score: 6 },
            { radius: 70, score: 5 },
          ],
          missScore: 0,
        },
      });
    }

    let bullseyeTemplate = await TargetTemplate.findOne({ name: 'Single Bullseye', isSystem: true });
    if (!bullseyeTemplate) {
      bullseyeTemplate = await TargetTemplate.create({
        name: 'Single Bullseye',
        description: 'Single large bullseye for precision shooting with 9-5 scoring',
        version: 1,
        coordinateSystem: {
          type: 'svg',
          width: 200,
          height: 200,
          origin: 'top-left',
        },
        render: {
          type: 'svg',
          svgMarkup: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="95" fill="white" stroke="#e5e7eb" stroke-width="1"/>
  <circle cx="100" cy="100" r="70" fill="none" stroke="#d1d5db" stroke-width="0.5"/>
  <circle cx="100" cy="100" r="50" fill="none" stroke="#9ca3af" stroke-width="0.5"/>
  <circle cx="100" cy="100" r="35" fill="none" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="100" cy="100" r="20" fill="none" stroke="#374151" stroke-width="0.5"/>
  <circle cx="100" cy="100" r="10" fill="#dc2626" stroke="#991b1b" stroke-width="0.5"/>
  <line x1="0" y1="100" x2="200" y2="100" stroke="#e5e7eb" stroke-width="0.25"/>
  <line x1="100" y1="0" x2="100" y2="200" stroke="#e5e7eb" stroke-width="0.25"/>
</svg>`,
        },
        defaultScoringModelId: bullseyeScoring._id,
        aimPoints: [
          { id: 'center', name: 'Center', order: 1, centerX: 100, centerY: 100, interactiveRadius: 95, tags: ['bullseye'] },
        ],
        isSystem: true,
      });
      console.log(`✓ Created Single Bullseye template: ${bullseyeTemplate._id}`);
    } else {
      console.log('✓ Single Bullseye template already exists');
    }

    // Template 2: Sight-In Grid (5 squares for zeroing)
    console.log('\nCreating Sight-In Grid template...');
    let gridScoring = await ScoringModel.findOne({ name: 'Hit/Miss Scoring' });
    if (!gridScoring) {
      gridScoring = await ScoringModel.create({
        name: 'Hit/Miss Scoring',
        type: 'rings',
        maxScore: 1,
        allowMissScore: true,
        anchorX: 50,
        anchorY: 50,
        rings: {
          thresholds: [
            { radius: 40, score: 1 },   // Inside square = hit
          ],
          missScore: 0,
        },
      });
    }

    let gridTemplate = await TargetTemplate.findOne({ name: 'Sight-In Grid', isSystem: true });
    if (!gridTemplate) {
      gridTemplate = await TargetTemplate.create({
        name: 'Sight-In Grid',
        description: 'Five squares for zeroing your optic - simple hit/miss scoring',
        version: 1,
        coordinateSystem: {
          type: 'svg',
          width: 200,
          height: 200,
          origin: 'top-left',
        },
        render: {
          type: 'svg',
          svgMarkup: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="75" y="10" width="50" height="50" fill="white" stroke="black" stroke-width="2"/>
  <rect x="10" y="75" width="50" height="50" fill="white" stroke="black" stroke-width="2"/>
  <rect x="75" y="75" width="50" height="50" fill="#fef3c7" stroke="black" stroke-width="2"/>
  <rect x="140" y="75" width="50" height="50" fill="white" stroke="black" stroke-width="2"/>
  <rect x="75" y="140" width="50" height="50" fill="white" stroke="black" stroke-width="2"/>
  <circle cx="100" cy="35" r="3" fill="#dc2626"/>
  <circle cx="35" cy="100" r="3" fill="#dc2626"/>
  <circle cx="100" cy="100" r="3" fill="#dc2626"/>
  <circle cx="165" cy="100" r="3" fill="#dc2626"/>
  <circle cx="100" cy="165" r="3" fill="#dc2626"/>
</svg>`,
        },
        defaultScoringModelId: gridScoring._id,
        aimPoints: [
          { id: 'center', name: 'Center', order: 1, centerX: 100, centerY: 100, interactiveRadius: 40, tags: ['center'] },
          { id: 'top', name: 'Top', order: 2, centerX: 100, centerY: 35, interactiveRadius: 40, tags: ['cardinal'] },
          { id: 'left', name: 'Left', order: 3, centerX: 35, centerY: 100, interactiveRadius: 40, tags: ['cardinal'] },
          { id: 'right', name: 'Right', order: 4, centerX: 165, centerY: 100, interactiveRadius: 40, tags: ['cardinal'] },
          { id: 'bottom', name: 'Bottom', order: 5, centerX: 100, centerY: 165, interactiveRadius: 40, tags: ['cardinal'] },
        ],
        isSystem: true,
      });
      console.log(`✓ Created Sight-In Grid template: ${gridTemplate._id}`);
    } else {
      console.log('✓ Sight-In Grid template already exists');
    }

    // Template 3: Silhouette (Head + Torso with rings)
    console.log('\nCreating Silhouette template...');
    let silhouetteScoring = await ScoringModel.findOne({ name: 'Silhouette Zone Scoring (10-6)' });
    if (!silhouetteScoring) {
      silhouetteScoring = await ScoringModel.create({
        name: 'Silhouette Zone Scoring (10-6)',
        type: 'rings',
        maxScore: 10,
        allowMissScore: true,
        anchorX: 100,
        anchorY: 100,
        rings: {
          thresholds: [
            { radius: 15, score: 10 },  // X-ring
            { radius: 30, score: 9 },
            { radius: 50, score: 8 },
            { radius: 70, score: 7 },
            { radius: 90, score: 6 },
          ],
          missScore: 0,
        },
      });
    }

    let silhouetteTemplate = await TargetTemplate.findOne({ name: 'Silhouette', isSystem: true });
    if (!silhouetteTemplate) {
      silhouetteTemplate = await TargetTemplate.create({
        name: 'Silhouette',
        description: 'Human silhouette with head and torso zones for defensive training',
        version: 1,
        coordinateSystem: {
          type: 'svg',
          width: 200,
          height: 200,
          origin: 'top-left',
        },
        render: {
          type: 'svg',
          svgMarkup: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="100" cy="40" rx="25" ry="30" fill="#f3f4f6" stroke="black" stroke-width="1"/>
  <rect x="60" y="70" width="80" height="100" rx="15" fill="#f3f4f6" stroke="black" stroke-width="1"/>
  <circle cx="100" cy="40" r="15" fill="none" stroke="#dc2626" stroke-width="0.5"/>
  <circle cx="100" cy="40" r="8" fill="none" stroke="#dc2626" stroke-width="0.5"/>
  <circle cx="100" cy="120" r="40" fill="none" stroke="#dc2626" stroke-width="0.5"/>
  <circle cx="100" cy="120" r="25" fill="none" stroke="#dc2626" stroke-width="0.5"/>
  <circle cx="100" cy="120" r="10" fill="none" stroke="#dc2626" stroke-width="1"/>
</svg>`,
        },
        defaultScoringModelId: silhouetteScoring._id,
        aimPoints: [
          { id: 'head', name: 'Head', order: 1, centerX: 100, centerY: 40, interactiveRadius: 30, tags: ['critical'] },
          { id: 'torso', name: 'Torso', order: 2, centerX: 100, centerY: 120, interactiveRadius: 50, tags: ['center-mass'] },
        ],
        isSystem: true,
      });
      console.log(`✓ Created Silhouette template: ${silhouetteTemplate._id}`);
    } else {
      console.log('✓ Silhouette template already exists');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✓ Built-in templates setup complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Available templates:');
    console.log('  1. Six Bull (Default) - Standard practice');
    console.log('  2. Single Bullseye - Precision shooting');
    console.log('  3. Sight-In Grid - Optic zeroing');
    console.log('  4. Silhouette - Defensive training\n');

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
  addBuiltInTemplates()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { addBuiltInTemplates };
