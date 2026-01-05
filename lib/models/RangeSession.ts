import mongoose, { Schema, Model } from "mongoose";
import { format } from "date-fns";

export interface IRangeSession {
  _id?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  date: Date;
  slug: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RangeSessionSchema = new Schema<IRangeSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, required: true },
    slug: { type: String, required: true, unique: true },
    location: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Generate slug before validation (runs before save)
RangeSessionSchema.pre('validate', async function() {
  if (this.isNew || this.isModified('date') || this.isModified('location')) {
    const dateStr = format(this.date, 'yyyy-MM-dd');
    
    // Create slug with location if available
    let baseSlug = dateStr;
    if (this.location) {
      const locationSlug = this.location
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      baseSlug = `${dateStr}-${locationSlug}`;
    }
    
    // Check if slug exists and append counter if needed
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.models.RangeSession.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
});

export const RangeSession: Model<IRangeSession> =
  mongoose.models.RangeSession ||
  mongoose.model<IRangeSession>("RangeSession", RangeSessionSchema);

