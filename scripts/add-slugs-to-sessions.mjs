import mongoose from 'mongoose';
import { format } from 'date-fns';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/target-tracker';

const RangeSessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  slug: { type: String },
  location: { type: String },
  notes: { type: String },
}, { timestamps: true });

async function addSlugsToSessions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const RangeSession = mongoose.model('RangeSession', RangeSessionSchema);

    // Find all sessions without slugs
    const sessions = await RangeSession.find({ $or: [{ slug: null }, { slug: { $exists: false } }] });
    
    console.log(`Found ${sessions.length} sessions without slugs`);

    const slugCounts = new Map();

    for (const session of sessions) {
      const baseSlug = format(session.date, 'yyyy-MM-dd');
      
      // Check if we've used this slug in this batch
      let counter = slugCounts.get(baseSlug) || 0;
      let slug = counter === 0 ? baseSlug : `${baseSlug}-${counter}`;
      
      // Check if slug exists in database
      while (await RangeSession.findOne({ slug, _id: { $ne: session._id } })) {
        counter++;
        slug = `${baseSlug}-${counter}`;
      }
      
      slugCounts.set(baseSlug, counter + 1);
      
      session.slug = slug;
      await session.save();
      
      console.log(`✓ Added slug "${slug}" to session ${session._id}`);
    }

    console.log('\n✅ All sessions updated successfully!');
    
    // Add unique index on slug
    try {
      await RangeSession.collection.createIndex({ slug: 1 }, { unique: true });
      console.log('✓ Created unique index on slug field');
    } catch (error) {
      console.log('Index already exists or error:', error.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addSlugsToSessions();

