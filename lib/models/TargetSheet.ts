import mongoose, { Schema, Model } from "mongoose";

export interface ITargetSheet {
  _id?: mongoose.Types.ObjectId;
  rangeSessionId: mongoose.Types.ObjectId;
  firearmId: mongoose.Types.ObjectId;
  caliberId: mongoose.Types.ObjectId;
  opticId: mongoose.Types.ObjectId;
  distanceYards: number;
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
    sheetLabel: { type: String },
    notes: { type: String },
    photoUrl: { type: String },
  },
  { timestamps: true }
);

export const TargetSheet: Model<ITargetSheet> =
  mongoose.models.TargetSheet ||
  mongoose.model<ITargetSheet>("TargetSheet", TargetSheetSchema);

