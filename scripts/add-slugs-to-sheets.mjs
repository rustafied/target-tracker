import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/target-tracker';

// Define schemas inline
const RangeSessionSchema = new mongoose.Schema({
  date: Date,
  slug: String,
  location: String,
  notes: String,
}, { timestamps: true });

const TargetSheetSchema = new mongoose.Schema({
  rangeSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RangeSession' },
  firearmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firearm' },
  caliberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Caliber' },
  opticId: { type: mongoose.Schema.Types.ObjectId, ref: 'Optic' },
  distanceYards: Number,
  slug: String,
  sheetLabel: String,
  notes: String,
  photoUrl: String,
}, { timestamps: true });

const FirearmSchema = new mongoose.Schema({
  name: String,
  sortOrder: Number,
}, { timestamps: true });

const CaliberSchema = new mongoose.Schema({
  name: String,
  sortOrder: Number,
}, { timestamps: true });

async function addSlugsToSheets() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const RangeSession = mongoose.models.RangeSession || mongoose.model('RangeSession', RangeSessionSchema);
    const TargetSheet = mongoose.models.TargetSheet || mongoose.model('TargetSheet', TargetSheetSchema);
    const Firearm = mongoose.models.Firearm || mongoose.model('Firearm', FirearmSchema);
    const Caliber = mongoose.models.Caliber || mongoose.model('Caliber', CaliberSchema);

    // Update sessions first to add location to slugs
    const sessions = await RangeSession.find();
    console.log(`\nFound ${sessions.length} sessions`);
    
    for (const session of sessions) {
      const oldSlug = session.slug;
      
      // Regenerate slug with location
      const dateStr = session.date.toISOString().split('T')[0];
      let baseSlug = dateStr;
      
      if (session.location) {
        const locationSlug = session.location
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        baseSlug = `${dateStr}-${locationSlug}`;
      }
      
      let slug = baseSlug;
      let counter = 1;
      
      while (await RangeSession.findOne({ slug, _id: { $ne: session._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      if (oldSlug !== slug) {
        session.slug = slug;
        await session.save();
        console.log(`✓ Session: ${oldSlug} → ${slug}`);
      }
    }

    // Find all sheets
    const sheets = await TargetSheet.find();
    
    console.log(`\nFound ${sheets.length} sheets to process`);

    for (const sheet of sheets) {
      try {
        const [session, firearm, caliber] = await Promise.all([
          RangeSession.findById(sheet.rangeSessionId),
          Firearm.findById(sheet.firearmId),
          Caliber.findById(sheet.caliberId),
        ]);

        if (!session || !firearm || !caliber) {
          console.log(`⚠ Skipping sheet ${sheet._id} - missing references`);
          continue;
        }

        // Create base slug
        const dateStr = session.date.toISOString().split('T')[0];
        const firearmSlug = firearm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const caliberSlug = caliber.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const baseSlug = `${dateStr}-${firearmSlug}-${caliberSlug}-${sheet.distanceYards}yd`;
        
        // Check for duplicates
        let slug = baseSlug;
        let counter = 1;
        
        while (await TargetSheet.findOne({ slug, _id: { $ne: sheet._id } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        sheet.slug = slug;
        await sheet.save();
        
        console.log(`✓ Added slug "${slug}" to sheet ${sheet._id}`);
      } catch (error) {
        console.error(`✗ Error processing sheet ${sheet._id}:`, error.message);
      }
    }

    console.log('\n✅ All sheets updated successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addSlugsToSheets();

