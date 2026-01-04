import mongoose, { Schema, Model } from "mongoose";

export interface IRangeSession {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RangeSessionSchema = new Schema<IRangeSession>(
  {
    date: { type: Date, required: true },
    location: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export const RangeSession: Model<IRangeSession> =
  mongoose.models.RangeSession ||
  mongoose.model<IRangeSession>("RangeSession", RangeSessionSchema);

