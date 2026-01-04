import mongoose, { Schema, Model } from "mongoose";

export interface ICaliber {
  _id?: mongoose.Types.ObjectId;
  name: string;
  shortCode?: string;
  category?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CaliberSchema = new Schema<ICaliber>(
  {
    name: { type: String, required: true },
    shortCode: { type: String },
    category: { type: String },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Caliber: Model<ICaliber> =
  mongoose.models.Caliber || mongoose.model<ICaliber>("Caliber", CaliberSchema);

