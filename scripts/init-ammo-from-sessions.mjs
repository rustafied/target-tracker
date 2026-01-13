import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment");
  process.exit(1);
}

async function initAmmoFromSessions() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // Get all sheets grouped by user, session, and caliber
    const sheets = await db.collection("targetsheets").find({}).toArray();
    console.log(`📋 Found ${sheets.length} sheets`);

    // Get all bulls to calculate shot counts
    const bulls = await db.collection("bullrecords").find({}).toArray();
    const bullsBySheet = bulls.reduce((acc, bull) => {
      const sheetId = bull.targetSheetId.toString();
      if (!acc[sheetId]) acc[sheetId] = [];
      acc[sheetId].push(bull);
      return acc;
    }, {});

    // Calculate shots per sheet
    const sheetShotCounts = {};
    for (const sheet of sheets) {
      const sheetBulls = bullsBySheet[sheet._id.toString()] || [];
      const totalShots = sheetBulls.reduce((sum, bull) => {
        return sum + (
          (bull.score5Count || 0) +
          (bull.score4Count || 0) +
          (bull.score3Count || 0) +
          (bull.score2Count || 0) +
          (bull.score1Count || 0) +
          (bull.score0Count || 0)
        );
      }, 0);
      sheetShotCounts[sheet._id.toString()] = totalShots;
    }

    // Group by user and caliber
    const userCaliberUsage = {};
    const userCaliberSessions = {};

    for (const sheet of sheets) {
      if (!sheet.caliberId) continue;
      if (!sheet.userId) {
        console.log(`⚠️  Skipping sheet ${sheet._id} - no userId`);
        continue;
      }

      const userId = String(sheet.userId); // Ensure it's a string
      const caliberId = sheet.caliberId.toString();
      const shots = sheetShotCounts[sheet._id.toString()] || 0;

      if (shots === 0) continue; // Skip sheets with no shots

      const key = `${userId}_${caliberId}`;
      
      if (!userCaliberUsage[key]) {
        userCaliberUsage[key] = {
          userId,
          caliberId,
          totalShots: 0,
          sessions: []
        };
      }

      userCaliberUsage[key].totalShots += shots;
      userCaliberUsage[key].sessions.push({
        sheetId: sheet._id,
        sessionId: sheet.rangeSessionId,
        shots,
        date: sheet.createdAt || new Date()
      });
    }

    console.log(`\n📊 Summary by caliber:`);
    for (const [key, data] of Object.entries(userCaliberUsage)) {
      const caliber = await db.collection("calibers").findOne({ _id: new ObjectId(data.caliberId) });
      console.log(`   ${caliber?.name || data.caliberId}: ${data.totalShots} shots across ${data.sessions.length} sessions`);
    }

    // Ask for confirmation
    console.log("\n⚠️  This will:");
    console.log("   1. Clear existing ammo inventory and transactions");
    console.log("   2. Set initial inventory = total shots used (break-even)");
    console.log("   3. Create transaction history for each session\n");

    // For now, let's just do it (you can add a prompt if you want)
    console.log("🚀 Starting migration...\n");

    // Clear existing ammo data
    await db.collection("ammoinventories").deleteMany({});
    await db.collection("ammotransactions").deleteMany({});
    console.log("✅ Cleared existing ammo data");

    // Process each user-caliber combination
    let inventoryCount = 0;
    let transactionCount = 0;

    for (const [key, data] of Object.entries(userCaliberUsage)) {
      // Ensure userId is a string
      const userIdString = String(data.userId);

      // Create initial inventory (set to total used so we start at break-even)
      await db.collection("ammoinventories").insertOne({
        userId: userIdString,
        caliberId: new ObjectId(data.caliberId),
        onHand: data.totalShots,
        reserved: 0,
        updatedAt: new Date()
      });
      inventoryCount++;

      // Add initial stock transaction
      await db.collection("ammotransactions").insertOne({
        userId: userIdString,
        caliberId: new ObjectId(data.caliberId),
        delta: data.totalShots,
        reason: "inventory_set",
        note: "Initial inventory from historical sessions",
        createdAt: new Date(Math.min(...data.sessions.map(s => s.date.getTime()))),
      });
      transactionCount++;

      // Create deduction transaction for each session (sorted by date)
      const sortedSessions = data.sessions.sort((a, b) => a.date - b.date);
      
      for (const session of sortedSessions) {
        await db.collection("ammotransactions").insertOne({
          userId: userIdString,
          caliberId: new ObjectId(data.caliberId),
          sheetId: session.sheetId,
          sessionId: session.sessionId,
          delta: -session.shots,
          reason: "session_deduct",
          note: `Historical session - ${session.shots} rounds`,
          createdAt: session.date,
        });
        transactionCount++;
      }

      // Update inventory to reflect all deductions (should end at 0 for break-even)
      await db.collection("ammoinventories").updateOne(
        { userId: userIdString, caliberId: new ObjectId(data.caliberId) },
        { 
          $inc: { onHand: -data.totalShots },
          $set: { updatedAt: new Date() }
        }
      );

      const caliber = await db.collection("calibers").findOne({ _id: new ObjectId(data.caliberId) });
      console.log(`✅ ${caliber?.name}: Set inventory to ${data.totalShots}, then deducted ${data.totalShots} (${sortedSessions.length} sessions)`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Created ${inventoryCount} inventory records`);
    console.log(`   Created ${transactionCount} transaction records`);
    console.log(`\n💡 All caliber inventories are now at 0 (break-even)`);
    console.log(`   Add stock using "Add Order" to increase inventory`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

initAmmoFromSessions();
