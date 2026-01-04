import mongoose from 'mongoose';
import { config } from 'dotenv';

config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/target-tracker';

const FirearmSchema = new mongoose.Schema({
  name: String,
  manufacturer: String,
  model: String,
  notes: String,
  isActive: Boolean,
  sortOrder: Number,
}, { timestamps: true });

const OpticSchema = new mongoose.Schema({
  name: String,
  type: String,
  magnification: String,
  notes: String,
  isActive: Boolean,
  sortOrder: Number,
}, { timestamps: true });

const CaliberSchema = new mongoose.Schema({
  name: String,
  shortCode: String,
  category: String,
  notes: String,
  isActive: Boolean,
  sortOrder: Number,
}, { timestamps: true });

const Firearm = mongoose.model('Firearm', FirearmSchema);
const Optic = mongoose.model('Optic', OpticSchema);
const Caliber = mongoose.model('Caliber', CaliberSchema);

async function fixSortOrder() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Fix firearms
    const firearms = await Firearm.find({}).sort({ createdAt: 1 });
    console.log(`Found ${firearms.length} firearms`);
    for (let i = 0; i < firearms.length; i++) {
      if (firearms[i].sortOrder === undefined || firearms[i].sortOrder === null) {
        await Firearm.findByIdAndUpdate(firearms[i]._id, { sortOrder: i });
        console.log(`Updated firearm ${firearms[i].name} with sortOrder ${i}`);
      }
    }

    // Fix optics
    const optics = await Optic.find({}).sort({ createdAt: 1 });
    console.log(`Found ${optics.length} optics`);
    for (let i = 0; i < optics.length; i++) {
      if (optics[i].sortOrder === undefined || optics[i].sortOrder === null) {
        await Optic.findByIdAndUpdate(optics[i]._id, { sortOrder: i });
        console.log(`Updated optic ${optics[i].name} with sortOrder ${i}`);
      }
    }

    // Fix calibers
    const calibers = await Caliber.find({}).sort({ createdAt: 1 });
    console.log(`Found ${calibers.length} calibers`);
    for (let i = 0; i < calibers.length; i++) {
      if (calibers[i].sortOrder === undefined || calibers[i].sortOrder === null) {
        await Caliber.findByIdAndUpdate(calibers[i]._id, { sortOrder: i });
        console.log(`Updated caliber ${calibers[i].name} with sortOrder ${i}`);
      }
    }

    console.log('✅ Sort order migration complete');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixSortOrder();

