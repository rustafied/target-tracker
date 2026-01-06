import mongoose, { Schema, Model } from "mongoose";

// Ring-based scoring threshold
export interface IRingThreshold {
  radius: number; // Distance from center
  score: number; // Score value for this ring
}

// Ring-based scoring definition
export interface IRings {
  thresholds: IRingThreshold[]; // Sorted from inner to outer
  missScore: number; // Score when outside all rings
}

// Region shape definition
export interface IRegion {
  id: string;
  label: string;
  score: number;
  shapeType: "polygon" | "circle" | "rect";
  shapeData: any; // Type-specific data: points[], {x,y,radius}, {x,y,width,height}
}

// Region-based scoring definition
export interface IRegions {
  regions: IRegion[];
  missScore: number; // Score when not in any region
}

export interface IScoringModel {
  _id?: mongoose.Types.ObjectId;
  name: string;
  type: "rings" | "regions";
  maxScore: number;
  allowMissScore: boolean;
  anchorX?: number; // For geometry metrics (bias, spread)
  anchorY?: number; // For geometry metrics
  rings?: IRings;
  regions?: IRegions;
  createdAt: Date;
  updatedAt: Date;
}

const RingThresholdSchema = new Schema<IRingThreshold>(
  {
    radius: { type: Number, required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const RegionSchema = new Schema<IRegion>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    score: { type: Number, required: true },
    shapeType: { type: String, enum: ["polygon", "circle", "rect"], required: true },
    shapeData: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const ScoringModelSchema = new Schema<IScoringModel>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["rings", "regions"], required: true },
    maxScore: { type: Number, required: true },
    allowMissScore: { type: Boolean, default: true },
    anchorX: { type: Number },
    anchorY: { type: Number },
    rings: {
      thresholds: [RingThresholdSchema],
      missScore: { type: Number, default: 0 },
    },
    regions: {
      regions: [RegionSchema],
      missScore: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Indexes
ScoringModelSchema.index({ name: 1 });
ScoringModelSchema.index({ type: 1 });

export const ScoringModel: Model<IScoringModel> =
  mongoose.models.ScoringModel ||
  mongoose.model<IScoringModel>("ScoringModel", ScoringModelSchema);
