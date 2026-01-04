import mongoose, { Schema, Model } from "mongoose";

export interface IOptic {
  _id?: mongoose.Types.ObjectId;
  name: string;
  type?: string;
  magnification?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const OpticSchema = new Schema<IOptic>(
  {
    name: { type: String, required: true },
    type: { type: String },
    magnification: { type: String },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Optic: Model<IOptic> =
  mongoose.models.Optic || mongoose.model<IOptic>("Optic", OpticSchema);

