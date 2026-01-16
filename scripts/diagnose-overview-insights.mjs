/**
 * Diagnostic script to understand why overview insights aren't showing
 * Usage: MONGODB_URI=... node scripts/diagnose-overview-insights.mjs <userId>
 */

import mongoose from 'mongoose';
import { RangeSession } from '../lib/models/RangeSession.js';
import { TargetSheet } from '../lib/models/TargetSheet.js';
import { BullRecord } from '../lib/models/BullRecord.js';
import { Firearm } from '../lib/models/Firearm.js';
import { Caliber } from '../lib/models/Caliber.js';
import { AmmoInventory } from '../lib/models/AmmoInventory.js';
import { calculateBullScore, calculateBullTotalShots } from '../lib/insights-engine.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aamttws_db_user:1pFBs8ROpfWww0UF@targettacker.4tnz3is.mongodb.net/?appName=TargetTacker';

async function diagnose(userId) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check total sessions
    const allSessions = await RangeSession.find({ userId: userObjectId }).sort({ date: -1 }).select('date').lean();
    console.log('📊 SESSION DATA:');
    console.log(`  Total sessions: ${allSessions.length}`);
    
    // Check sessions in last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentSessions = allSessions.filter(s => s.date >= threeMonthsAgo);
    console.log(`  Sessions in last 3 months: ${recentSessions.length} (need 5+ for Trend Summary)`);
    
    // Check last 10 sessions
    const last10Sessions = allSessions.slice(0, 10);
    console.log(`  Last 10 sessions: ${last10Sessions.length} (need 10 for Composite Flag)\n`);

    // Check firearms
    const firearms = await Firearm.find({ userId: userObjectId }).select('name').lean();
    console.log('🔫 FIREARM DATA:');
    console.log(`  Total firearms: ${firearms.length} (need 2+ for Usage Recommendation)`);
    if (firearms.length > 0) {
      firearms.forEach(f => console.log(`    - ${f.name}`));
    }
    console.log();

    // Check calibers with shot counts
    const calibers = await Caliber.find({ userId: userObjectId }).select('name').lean();
    console.log('🎯 CALIBER DATA:');
    console.log(`  Total calibers: ${calibers.length}`);
    
    if (calibers.length > 0) {
      const allSheets = await TargetSheet.find({ userId: userObjectId }).select('caliberId').lean();
      const allBulls = await BullRecord.find({ 
        targetSheetId: { $in: allSheets.map(s => s._id) } 
      }).select('targetSheetId score5Count score4Count score3Count score2Count score1Count score0Count totalShots').lean();

      for (const caliber of calibers) {
        const caliberSheets = allSheets.filter(s => s.caliberId?.toString() === caliber._id.toString());
        const bulls = allBulls.filter(b => 
          caliberSheets.some(s => s._id.toString() === b.targetSheetId.toString())
        );
        const shotCount = bulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
        const totalScore = bulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
        const avgScore = shotCount > 0 ? (totalScore / shotCount).toFixed(2) : 'N/A';
        console.log(`    - ${caliber.name}: ${shotCount} shots, avg ${avgScore}`);
      }
    }
    console.log();

    // Check ammo inventory
    const ammoInventory = await AmmoInventory.find({ userId }).select('caliberId onHand').lean();
    console.log('📦 AMMO INVENTORY:');
    console.log(`  Inventory records: ${ammoInventory.length} (need >0 for Inventory Alert)`);
    if (ammoInventory.length > 0) {
      for (const ammo of ammoInventory) {
        const caliber = await Caliber.findById(ammo.caliberId).select('name').lean();
        console.log(`    - ${caliber?.name || 'Unknown'}: ${ammo.onHand} rounds`);
      }
    }
    console.log();

    // Analyze trend if possible
    if (recentSessions.length >= 5) {
      console.log('📈 TREND ANALYSIS:');
      const sessionIds = recentSessions.map(s => s._id);
      const sheets = await TargetSheet.find({ rangeSessionId: { $in: sessionIds } }).select('_id rangeSessionId').lean();
      const bulls = await BullRecord.find({ 
        targetSheetId: { $in: sheets.map(s => s._id) } 
      }).select('targetSheetId score5Count score4Count score3Count score2Count score1Count score0Count totalShots').lean();

      const sessionAvgs = recentSessions.map(s => {
        const sessionSheets = sheets.filter(sh => sh.rangeSessionId.toString() === s._id.toString());
        const sessionBulls = bulls.filter(b => 
          sessionSheets.some(sh => sh._id.toString() === b.targetSheetId.toString())
        );
        const totalScore = sessionBulls.reduce((sum, b) => sum + calculateBullScore(b), 0);
        const totalShots = sessionBulls.reduce((sum, b) => sum + calculateBullTotalShots(b), 0);
        return totalShots > 0 ? totalScore / totalShots : 0;
      });

      const avgFirst = sessionAvgs.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const avgLast = sessionAvgs.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const change = ((avgLast - avgFirst) / avgFirst * 100).toFixed(1);
      
      console.log(`  First sessions avg: ${avgFirst.toFixed(2)}`);
      console.log(`  Last sessions avg: ${avgLast.toFixed(2)}`);
      console.log(`  Change: ${change}%`);
      console.log(`  (need >5% change and not 'stable' for Trend Summary)`);
    }

    console.log('\n=== INSIGHT REQUIREMENTS SUMMARY ===');
    console.log(`✅ Top Performers: ${calibers.length >= 2 ? 'PASS' : 'FAIL'} (have ${calibers.length} calibers, need 2+)`);
    console.log(`${recentSessions.length >= 5 ? '✅' : '❌'} Trend Summary: ${recentSessions.length >= 5 ? 'PASS' : 'FAIL'} (have ${recentSessions.length} sessions in 3mo, need 5+)`);
    console.log(`${firearms.length >= 2 ? '✅' : '❌'} Usage Recommendation: ${firearms.length >= 2 ? 'PASS (if conditions met)' : 'FAIL'} (have ${firearms.length} firearms, need 2+)`);
    console.log(`${ammoInventory.length > 0 ? '✅' : '❌'} Inventory Alert: ${ammoInventory.length > 0 ? 'PASS (if low stock)' : 'FAIL'} (have ${ammoInventory.length} ammo records, need >0)`);
    console.log(`${last10Sessions.length >= 10 ? '✅' : '❌'} Composite Flag: ${last10Sessions.length >= 10 ? 'PASS (if pattern detected)' : 'FAIL'} (have ${last10Sessions.length} sessions, need 10)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: MONGODB_URI=... node scripts/diagnose-overview-insights.mjs <userId>');
  console.error('\nExample: node scripts/diagnose-overview-insights.mjs 123456789');
  process.exit(1);
}

diagnose(userId);
