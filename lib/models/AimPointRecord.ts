import mongoose, { Schema, Model } from "mongoose";

export interface IShotPosition {
  x: number; // X coordinate in template space
  y: number; // Y coordinate in template space
  score: number; // Score value
}

export interface IAimPointRecord {
  _id?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  targetSheetId: mongoose.Types.ObjectId;
  aimPointId: string; // NEW: e.g., "bull-1", "head", "torso"
  countsByScore: { [score: string]: number }; // NEW: flexible scoring {"0": 2, "5": 3, "10": 1}
  shotPositions?: IShotPosition[];
  totalShots: number;
  imageUrl?: string;
  imageUploadedAt?: Date;
  detectedShotCount?: number;
  
  // LEGACY FIELDS - kept for backward compatibility, will be deprecated
  bullIndex?: number; // Maps to aimPointId for old data
  score5Count?: number;
  score4Count?: number;
  score3Count?: number;
  score2Count?: number;
  score1Count?: number;
  score0Count?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Backward compatibility alias
// IBullRecord requires bullIndex to be present (for legacy code)
export interface IBullRecord extends Omit<IAimPointRecord, 'bullIndex'> {
  bullIndex: number; // Required in old interface (1-6)
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
}

const ShotPositionSchema = new Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  score: { type: Number, required: true }
}, { _id: false });

const AimPointRecordSchema = new Schema<IAimPointRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    targetSheetId: { type: Schema.Types.ObjectId, ref: "TargetSheet", required: true },
    
    // New fields
    aimPointId: { type: String }, // Will be required after migration
    countsByScore: { type: Map, of: Number, default: {} },
    
    // Legacy fields - now optional
    bullIndex: { type: Number, min: 1, max: 6 },
    score5Count: { type: Number, default: 0, min: 0, max: 10 },
    score4Count: { type: Number, default: 0, min: 0, max: 10 },
    score3Count: { type: Number, default: 0, min: 0, max: 10 },
    score2Count: { type: Number, default: 0, min: 0, max: 10 },
    score1Count: { type: Number, default: 0, min: 0, max: 10 },
    score0Count: { type: Number, default: 0, min: 0, max: 10 },
    
    shotPositions: [ShotPositionSchema],
    totalShots: { type: Number, default: 0 },
    imageUrl: { type: String },
    imageUploadedAt: { type: Date },
    detectedShotCount: { type: Number },
  },
  { 
    timestamps: true,
    collection: 'bullrecords' // IMPORTANT: Use the existing collection!
  }
);

// Indexes
AimPointRecordSchema.index({ targetSheetId: 1, aimPointId: 1 });
AimPointRecordSchema.index({ targetSheetId: 1, bullIndex: 1 }); // Legacy index

// Pre-save hook to compute totalShots
AimPointRecordSchema.pre('save', function() {
  if (this.isModified('countsByScore') || this.isModified('shotPositions')) {
    // Calculate from countsByScore if available
    if (this.countsByScore && typeof this.countsByScore === 'object') {
      let total = 0;
      // Handle both Map and plain object representations
      if (this.countsByScore instanceof Map) {
        this.countsByScore.forEach((count: number) => {
          total += count;
        });
      } else {
        // Plain object
        Object.values(this.countsByScore).forEach((count) => {
          total += Number(count);
        });
      }
      this.totalShots = total;
    } 
    // Calculate from shotPositions if available
    else if (this.shotPositions && this.shotPositions.length > 0) {
      this.totalShots = this.shotPositions.length;
    }
    // Calculate from legacy fields
    else if (this.score5Count !== undefined) {
      this.totalShots = 
        (this.score5Count || 0) +
        (this.score4Count || 0) +
        (this.score3Count || 0) +
        (this.score2Count || 0) +
        (this.score1Count || 0) +
        (this.score0Count || 0);
    }
  }
});

export const AimPointRecord: Model<IAimPointRecord> =
  mongoose.models.AimPointRecord ||
  mongoose.model<IAimPointRecord>("AimPointRecord", AimPointRecordSchema);

// Export BullRecord as an alias for backward compatibility
// Note: This creates an alias to the same model and collection
export const BullRecord: Model<IAimPointRecord> =
  mongoose.models.BullRecord ||
  AimPointRecord;
