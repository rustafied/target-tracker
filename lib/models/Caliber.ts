import mongoose, { Schema, Model } from "mongoose";

export interface ICaliber {
  _id?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  shortCode?: string;
  category?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  // Cost tracking for efficiency metrics
  costPerRound?: number;
  bulkCost?: number;
  bulkQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CaliberSchema = new Schema<ICaliber>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortCode: { type: String },
    category: { type: String },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    costPerRound: { type: Number, min: 0 },
    bulkCost: { type: Number, min: 0 },
    bulkQuantity: { type: Number, min: 1 },
  },
  { timestamps: true }
);

// Generate slug before validation
CaliberSchema.pre('validate', async function() {
  if (this.isNew || this.isModified('name')) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/\./g, '')  // Remove periods
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '');  // Remove special chars except hyphens
    
    // Check if slug exists and append counter if needed
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.models.Caliber.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
});

export const Caliber: Model<ICaliber> =
  mongoose.models.Caliber || mongoose.model<ICaliber>("Caliber", CaliberSchema);

