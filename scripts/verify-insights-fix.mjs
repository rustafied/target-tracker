/**
 * Script to verify the insights quadrant calculation fix
 * Usage: node scripts/verify-insights-fix.mjs <sessionId>
 */

import mongoose from 'mongoose';
import { RangeSession } from '../lib/models/RangeSession.js';
import { TargetSheet } from '../lib/models/TargetSheet.js';
import { BullRecord } from '../lib/models/BullRecord.js';
import { calculateQuadrantBias, getBullPositions, calculateBullTotalShots } from '../lib/insights-engine.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aamttws_db_user:1pFBs8ROpfWww0UF@targettacker.4tnz3is.mongodb.net/?appName=TargetTacker';

async function verifySession(sessionIdOrSlug) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find session
    let session = await RangeSession.findOne({ slug: sessionIdOrSlug });
    if (!session) {
      session = await RangeSession.findById(sessionIdOrSlug);
    }

    if (!session) {
      console.error('Session not found');
      process.exit(1);
    }

    console.log('\n=== SESSION INFO ===');
    console.log('ID:', session._id.toString());
    console.log('Date:', session.date);
    console.log('User:', session.userId);

    // Get sheets and bulls
    const sheets = await TargetSheet.find({ rangeSessionId: session._id });
    const bulls = await BullRecord.find({ 
      targetSheetId: { $in: sheets.map(s => s._id) } 
    });

    console.log('\n=== DATA SUMMARY ===');
    console.log('Sheets:', sheets.length);
    console.log('Bulls:', bulls.length);

    // Calculate total shots
    const shotsFired = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
    console.log('Total shots (from counts):', shotsFired);

    // Get all positions
    const positions = bulls.flatMap(b => getBullPositions(b));
    console.log('Position data available:', positions.length);
    console.log('Coverage:', ((positions.length / shotsFired) * 100).toFixed(1) + '%');

    if (positions.length === 0) {
      console.log('\n❌ No position data available for this session');
      process.exit(0);
    }

    // Show sample positions
    console.log('\n=== SAMPLE POSITIONS (first 10) ===');
    positions.slice(0, 10).forEach((pos, i) => {
      const cx = pos.x - 100;
      const cy = pos.y - 100;
      const quadrant = cx >= 0 
        ? (cy >= 0 ? 'low-right' : 'high-right')
        : (cy >= 0 ? 'low-left' : 'high-left');
      console.log(`${i + 1}. (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) -> centered (${cx.toFixed(1)}, ${cy.toFixed(1)}) = ${quadrant}`);
    });

    // Calculate bias
    const bias = calculateQuadrantBias(positions);

    console.log('\n=== QUADRANT DISTRIBUTION ===');
    console.log('High-Left (topLeft):', bias.counts.topLeft, `(${((bias.counts.topLeft / positions.length) * 100).toFixed(1)}%)`);
    console.log('High-Right (topRight):', bias.counts.topRight, `(${((bias.counts.topRight / positions.length) * 100).toFixed(1)}%)`);
    console.log('Low-Left (bottomLeft):', bias.counts.bottomLeft, `(${((bias.counts.bottomLeft / positions.length) * 100).toFixed(1)}%)`);
    console.log('Low-Right (bottomRight):', bias.counts.bottomRight, `(${((bias.counts.bottomRight / positions.length) * 100).toFixed(1)}%)`);

    console.log('\n=== BIAS RESULT ===');
    const quadrantNames = {
      topLeft: 'high-left',
      topRight: 'high-right',
      bottomLeft: 'low-left',
      bottomRight: 'low-right',
    };
    console.log('Dominant quadrant:', quadrantNames[bias.quadrant]);
    console.log('Concentration:', (bias.concentration * 100).toFixed(1) + '%');

    if (bias.concentration > 0.6) {
      console.log('\n✅ Would trigger bias insight (>60% concentration)');
    } else {
      console.log('\n❌ Would NOT trigger bias insight (<60% concentration)');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node scripts/verify-insights-fix.mjs <sessionId>');
  process.exit(1);
}

verifySession(sessionId);
