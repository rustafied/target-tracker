import mongoose, { Schema, Model } from "mongoose";

export interface ITargetSheet {
  _id?: mongoose.Types.ObjectId;
  rangeSessionId: mongoose.Types.ObjectId;
  firearmId: mongoose.Types.ObjectId;
  caliberId: mongoose.Types.ObjectId;
  opticId: mongoose.Types.ObjectId;
  distanceYards: number;
  slug: string;
  sheetLabel?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TargetSheetSchema = new Schema<ITargetSheet>(
  {
    rangeSessionId: { type: Schema.Types.ObjectId, ref: "RangeSession", required: true },
    firearmId: { type: Schema.Types.ObjectId, ref: "Firearm", required: true },
    caliberId: { type: Schema.Types.ObjectId, ref: "Caliber", required: true },
    opticId: { type: Schema.Types.ObjectId, ref: "Optic", required: true },
    distanceYards: { type: Number, required: true },
    slug: { type: String, required: true },
    sheetLabel: { type: String },
    notes: { type: String },
    photoUrl: { type: String },
  },
  { timestamps: true }
);

// Generate slug before saving
TargetSheetSchema.pre('save', async function(next: any) {
  if (this.isNew) {
    // We'll need to populate the references to build the slug
    const [session, firearm, caliber] = await Promise.all([
      mongoose.models.RangeSession.findById(this.rangeSessionId),
      mongoose.models.Firearm.findById(this.firearmId),
      mongoose.models.Caliber.findById(this.caliberId),
    ]);

    if (!session || !firearm || !caliber) {
      return next(new Error('Required references not found'));
    }

    // Create base slug: sessionDate-firearmName-caliberName-distance
    const dateStr = session.date.toISOString().split('T')[0];
    const firearmSlug = firearm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const caliberSlug = caliber.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const baseSlug = `${dateStr}-${firearmSlug}-${caliberSlug}-${this.distanceYards}yd`;
    
    // Check if slug exists and append counter if needed
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.models.TargetSheet.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

export const TargetSheet: Model<ITargetSheet> =
  mongoose.models.TargetSheet ||
  mongoose.model<ITargetSheet>("TargetSheet", TargetSheetSchema);

