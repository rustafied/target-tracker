import mongoose, { Schema, Model } from "mongoose";

export interface IShotPosition {
  x: number; // X coordinate (0-200 in SVG viewBox)
  y: number; // Y coordinate (0-200 in SVG viewBox)
  score: number; // Score value (0-5)
}

export interface IBullRecord {
  _id?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  targetSheetId: mongoose.Types.ObjectId;
  bullIndex: number;
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
  shotPositions?: IShotPosition[]; // Optional array of exact shot positions
  totalShots?: number;
  imageUrl?: string; // Path to stored target image
  imageUploadedAt?: Date; // When the image was uploaded
  detectedShotCount?: number; // Number of shots detected from image
  createdAt: Date;
  updatedAt: Date;
}

const ShotPositionSchema = new Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  score: { type: Number, required: true, min: 0, max: 5 }
}, { _id: false });

const BullRecordSchema = new Schema<IBullRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    targetSheetId: { type: Schema.Types.ObjectId, ref: "TargetSheet", required: true },
    bullIndex: { type: Number, required: true, min: 1, max: 6 },
    score5Count: { type: Number, default: 0, min: 0, max: 10 },
    score4Count: { type: Number, default: 0, min: 0, max: 10 },
    score3Count: { type: Number, default: 0, min: 0, max: 10 },
    score2Count: { type: Number, default: 0, min: 0, max: 10 },
    score1Count: { type: Number, default: 0, min: 0, max: 10 },
    score0Count: { type: Number, default: 0, min: 0, max: 10 },
    shotPositions: [ShotPositionSchema],
    totalShots: { type: Number },
    imageUrl: { type: String },
    imageUploadedAt: { type: Date },
    detectedShotCount: { type: Number },
  },
  { timestamps: true }
);

export const BullRecord: Model<IBullRecord> =
  mongoose.models.BullRecord ||
  mongoose.model<IBullRecord>("BullRecord", BullRecordSchema);

