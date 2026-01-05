import mongoose, { Schema, Model } from "mongoose";

export interface ICaliber {
  _id?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  shortCode?: string;
  category?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CaliberSchema = new Schema<ICaliber>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    shortCode: { type: String },
    category: { type: String },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Caliber: Model<ICaliber> =
  mongoose.models.Caliber || mongoose.model<ICaliber>("Caliber", CaliberSchema);

