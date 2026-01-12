import mongoose from "mongoose";

export interface IAmmoInventory {
  _id: mongoose.Types.ObjectId;
  userId: string; // Discord ID string
  caliberId: mongoose.Types.ObjectId;
  onHand: number;
  reserved: number;
  updatedAt: Date;
}

const ammoInventorySchema = new mongoose.Schema<IAmmoInventory>(
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
    onHand: {
      type: Number,
      required: true,
      default: 0,
    },
    reserved: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Unique constraint: one inventory record per caliber per user
ammoInventorySchema.index({ userId: 1, caliberId: 1 }, { unique: true });

export const AmmoInventory =
  (mongoose.models.AmmoInventory as mongoose.Model<IAmmoInventory>) ||
  mongoose.model<IAmmoInventory>("AmmoInventory", ammoInventorySchema);
