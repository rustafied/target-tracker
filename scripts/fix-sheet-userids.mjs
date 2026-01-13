import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment");
  process.exit(1);
}

async function fixSheetUserIds() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // Get the only user
    const user = await db.collection("users").findOne({});
    if (!user) {
      console.error("❌ No user found in database");
      process.exit(1);
    }

    console.log(`👤 Found user: ${user.name || 'No name'} (discordId: ${user.discordId})`);
    console.log(`   MongoDB _id: ${user._id}\n`);

    // Find sheets without userId
    const sheetsWithoutUserId = await db.collection("targetsheets")
      .find({ userId: null })
      .toArray();

    console.log(`📋 Found ${sheetsWithoutUserId.length} sheets without userId`);

    if (sheetsWithoutUserId.length === 0) {
      console.log("✅ All sheets already have a userId");
      return;
    }

    // Update all sheets without userId to have this user's _id
    const result = await db.collection("targetsheets").updateMany(
      { userId: null },
      { $set: { userId: user._id } }
    );

    console.log(`✅ Updated ${result.modifiedCount} sheets with userId: ${user._id}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

fixSheetUserIds();
