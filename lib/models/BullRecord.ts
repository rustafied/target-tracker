import mongoose, { Schema, Model } from "mongoose";

export interface IBullRecord {
  _id?: mongoose.Types.ObjectId;
  targetSheetId: mongoose.Types.ObjectId;
  bullIndex: number;
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
  totalShots?: number;
  createdAt: Date;
  updatedAt: Date;
}

const BullRecordSchema = new Schema<IBullRecord>(
  {
    targetSheetId: { type: Schema.Types.ObjectId, ref: "TargetSheet", required: true },
    bullIndex: { type: Number, required: true, min: 1, max: 6 },
    score5Count: { type: Number, default: 0, min: 0, max: 10 },
    score4Count: { type: Number, default: 0, min: 0, max: 10 },
    score3Count: { type: Number, default: 0, min: 0, max: 10 },
    score2Count: { type: Number, default: 0, min: 0, max: 10 },
    score1Count: { type: Number, default: 0, min: 0, max: 10 },
    score0Count: { type: Number, default: 0, min: 0, max: 10 },
    totalShots: { type: Number },
  },
  { timestamps: true }
);

export const BullRecord: Model<IBullRecord> =
  mongoose.models.BullRecord ||
  mongoose.model<IBullRecord>("BullRecord", BullRecordSchema);

