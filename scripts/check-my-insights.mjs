/**
 * Check what's actually in the database for insight generation
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://aamttws_db_user:1pFBs8ROpfWww0UF@targettacker.4tnz3is.mongodb.net/?appName=TargetTacker';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await mongoose.connection.db.collection('users').find().toArray();
    console.log('Found users:', users.length);
    
    if (users.length === 0) {
      console.log('No users found');
      return;
    }

    // Use first user (assuming single user app for now)
    const user = users[0];
    console.log('User ID:', user._id);
    console.log('Discord ID:', user.discordId);
    console.log();

    // Check sessions
    const allSessions = await mongoose.connection.db.collection('rangesessions')
      .find({ userId: user._id })
      .sort({ date: -1 })
      .toArray();
    
    console.log('📊 SESSIONS:');
    console.log('  Total sessions:', allSessions.length);
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentSessions = allSessions.filter(s => new Date(s.date) >= threeMonthsAgo);
    console.log('  Sessions in last 3 months:', recentSessions.length);
    if (recentSessions.length > 0) {
      console.log('  Most recent session:', new Date(recentSessions[0].date).toLocaleDateString());
      console.log('  Oldest recent session:', new Date(recentSessions[recentSessions.length - 1].date).toLocaleDateString());
    }
    console.log();

    // Check firearms
    const firearms = await mongoose.connection.db.collection('firearms')
      .find({ userId: user._id })
      .toArray();
    
    console.log('🔫 FIREARMS:');
    console.log('  Total firearms:', firearms.length);
    if (firearms.length > 0) {
      firearms.forEach(f => console.log(`    - ${f.name}`));
    }
    console.log();

    // Check calibers
    const calibers = await mongoose.connection.db.collection('calibers')
      .find({ userId: user._id })
      .toArray();
    
    console.log('🎯 CALIBERS:');
    console.log('  Total calibers:', calibers.length);
    if (calibers.length > 0) {
      calibers.forEach(c => console.log(`    - ${c.name}`));
    }
    console.log();

    // Check ammo inventory
    const ammoRecords = await mongoose.connection.db.collection('ammoinventories')
      .find({ userId: user.discordId })
      .toArray();
    
    console.log('📦 AMMO INVENTORY:');
    console.log('  Total ammo records:', ammoRecords.length);
    if (ammoRecords.length > 0) {
      for (const ammo of ammoRecords) {
        const caliber = calibers.find(c => c._id.equals(ammo.caliberId));
        console.log(`    - ${caliber?.name || 'Unknown'}: ${ammo.onHand || 0} rounds`);
      }
    }
    console.log();

    // Check sheets and bulls to verify data
    const sheets = await mongoose.connection.db.collection('targetsheets')
      .find({ userId: user._id })
      .toArray();
    
    const bulls = await mongoose.connection.db.collection('bullrecords')
      .find({ targetSheetId: { $in: sheets.map(s => s._id) } })
      .toArray();
    
    console.log('📋 SHEET DATA:');
    console.log('  Total sheets:', sheets.length);
    console.log('  Total bull records:', bulls.length);
    
    // Calculate total shots
    let totalShots = 0;
    bulls.forEach(b => {
      totalShots += (b.score5Count || 0) + (b.score4Count || 0) + 
                    (b.score3Count || 0) + (b.score2Count || 0) + 
                    (b.score1Count || 0) + (b.score0Count || 0);
    });
    console.log('  Total shots tracked:', totalShots);
    console.log();

    // Firearm usage analysis
    if (firearms.length >= 2) {
      console.log('🔍 FIREARM USAGE ANALYSIS:');
      for (const firearm of firearms) {
        const firearmSheets = sheets.filter(s => s.firearmId?.equals(firearm._id));
        const firearmBulls = bulls.filter(b => 
          firearmSheets.some(s => s._id.equals(b.targetSheetId))
        );
        
        let shots = 0;
        let score = 0;
        firearmBulls.forEach(b => {
          const s5 = b.score5Count || 0;
          const s4 = b.score4Count || 0;
          const s3 = b.score3Count || 0;
          const s2 = b.score2Count || 0;
          const s1 = b.score1Count || 0;
          const s0 = b.score0Count || 0;
          shots += s5 + s4 + s3 + s2 + s1 + s0;
          score += s5*5 + s4*4 + s3*3 + s2*2 + s1*1;
        });
        
        const avg = shots > 0 ? (score / shots).toFixed(2) : 'N/A';
        const usage = totalShots > 0 ? ((shots / totalShots) * 100).toFixed(1) : '0';
        console.log(`  ${firearm.name}:`);
        console.log(`    Shots: ${shots} (${usage}% of total)`);
        console.log(`    Avg score: ${avg}`);
        console.log(`    High performer (≥3.5): ${parseFloat(avg) >= 3.5 ? 'YES' : 'NO'}`);
        console.log(`    Underused (<15%): ${parseFloat(usage) < 15 ? 'YES' : 'NO'}`);
        console.log();
      }
    }

    console.log('=== INSIGHT ELIGIBILITY ===');
    console.log(`✅ Top Performers: ${calibers.length >= 2 ? 'YES' : 'NO'}`);
    console.log(`${recentSessions.length >= 5 ? '✅' : '❌'} Trend Summary: ${recentSessions.length >= 5 ? 'YES' : 'NO'} (have ${recentSessions.length}/5)`);
    console.log(`${firearms.length >= 2 ? '✅' : '❌'} Usage Recommendation: ${firearms.length >= 2 ? 'MAYBE (see analysis above)' : 'NO'} (have ${firearms.length}/2)`);
    console.log(`${ammoRecords.length > 0 ? '✅' : '❌'} Inventory Alert: ${ammoRecords.length > 0 ? 'MAYBE (need low stock)' : 'NO'} (have ${ammoRecords.length} records)`);
    console.log(`${allSessions.length >= 10 ? '✅' : '❌'} Composite Flag: ${allSessions.length >= 10 ? 'MAYBE' : 'NO'} (have ${allSessions.length}/10)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

check();
