#!/usr/bin/env node
/**
 * Fix Default Template SVG
 * 
 * Updates the "Six Bull (Default)" template to use the colored ring SVG
 * that matches the rest of the UI.
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';
import { TargetTemplate } from '../lib/models/TargetTemplate.ts';

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in environment variables');
  process.exit(1);
}

const COLORED_RING_SVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- 0 - White (miss) -->
  <circle cx="100" cy="100" r="100" fill="white" stroke="#333" stroke-width="1"/>
  
  <!-- 1 - Light gray -->
  <circle cx="100" cy="100" r="85" fill="#d4d4d4" stroke="#333" stroke-width="1"/>
  
  <!-- 2 - Dark gray -->
  <circle cx="100" cy="100" r="70" fill="#737373" stroke="#333" stroke-width="1"/>
  
  <!-- 3 - Black -->
  <circle cx="100" cy="100" r="50" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
  
  <!-- 4 - Black -->
  <circle cx="100" cy="100" r="30" fill="#0a0a0a" stroke="#333" stroke-width="1"/>
  
  <!-- 5 - Red center (bullseye) -->
  <circle cx="100" cy="100" r="15" fill="#dc2626" stroke="#333" stroke-width="1"/>
  
  <!-- Crosshairs -->
  <line x1="0" y1="100" x2="200" y2="100" stroke="#333" stroke-width="0.5" opacity="0.3"/>
  <line x1="100" y1="0" x2="100" y2="200" stroke="#333" stroke-width="0.5" opacity="0.3"/>
</svg>`;

async function fixDefaultTemplateSVG() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find the default template
    const defaultTemplate = await TargetTemplate.findOne({ 
      name: "Six Bull (Default)", 
      isSystem: true 
    });

    if (!defaultTemplate) {
      console.log('❌ Default template not found');
      process.exit(1);
    }

    console.log('Found default template:', defaultTemplate._id);
    console.log('Current SVG type:', defaultTemplate.render?.type);
    
    // Update the SVG
    defaultTemplate.render = {
      type: 'svg',
      svgMarkup: COLORED_RING_SVG,
    };

    await defaultTemplate.save();

    console.log('\n✓ Updated default template SVG with colored rings!');
    console.log('The template now matches the UI rendering.\n');

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
  fixDefaultTemplateSVG()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { fixDefaultTemplateSVG };
