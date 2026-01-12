import mongoose from "mongoose";

export type AmmoTransactionReason =
  | "manual_add"
  | "manual_subtract"
  | "session_deduct"
  | "session_adjust"
  | "session_reversal"
  | "inventory_set";

export interface IAmmoTransaction {
  _id: mongoose.Types.ObjectId;
  userId: string; // Discord ID string
  caliberId: mongoose.Types.ObjectId;
  delta: number;
  reason: AmmoTransactionReason;
  sessionId?: mongoose.Types.ObjectId;
  sheetId?: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const ammoTransactionSchema = new mongoose.Schema<IAmmoTransaction>(
  {
    userId: {
      type: String, // Discord ID
      required: true,
      index: true,
    },
    caliberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Caliber",
      required: true,
      index: true,
    },
    delta: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "manual_add",
        "manual_subtract",
        "session_deduct",
        "session_adjust",
        "session_reversal",
        "inventory_set",
      ],
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RangeSession",
      index: true,
    },
    sheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TargetSheet",
      index: true,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for efficient queries
ammoTransactionSchema.index({ userId: 1, caliberId: 1, createdAt: -1 });
ammoTransactionSchema.index({ userId: 1, createdAt: -1 });
ammoTransactionSchema.index({ sheetId: 1, reason: 1 });

export const AmmoTransaction =
  (mongoose.models.AmmoTransaction as mongoose.Model<IAmmoTransaction>) ||
  mongoose.model<IAmmoTransaction>("AmmoTransaction", ammoTransactionSchema);
