import mongoose, { Schema, Model } from "mongoose";

export interface IFirearm {
  _id?: mongoose.Types.ObjectId;
  name: string;
  manufacturer?: string;
  model?: string;
  defaultCaliberId?: mongoose.Types.ObjectId;
  defaultDistanceYards?: number;
  caliberIds: mongoose.Types.ObjectId[]; // Multiple calibers
  opticIds: mongoose.Types.ObjectId[]; // Multiple optics
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const FirearmSchema = new Schema<IFirearm>(
  {
    name: { type: String, required: true },
    manufacturer: { type: String },
    model: { type: String },
    defaultCaliberId: { type: Schema.Types.ObjectId, ref: "Caliber" },
    defaultDistanceYards: { type: Number },
    caliberIds: [{ type: Schema.Types.ObjectId, ref: "Caliber" }],
    opticIds: [{ type: Schema.Types.ObjectId, ref: "Optic" }],
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Firearm: Model<IFirearm> =
  mongoose.models.Firearm || mongoose.model<IFirearm>("Firearm", FirearmSchema);

