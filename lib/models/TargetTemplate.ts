import mongoose, { Schema, Model } from "mongoose";

// Coordinate system definition
export interface ICoordinateSystem {
  type: "svg" | "image";
  width: number;
  height: number;
  origin: "top-left";
}

// Rendering configuration
export interface IRender {
  type: "svg" | "image";
  svgMarkup?: string;
  imageUrl?: string;
}

// Aim point definition (embedded in template)
export interface IAimPoint {
  id: string; // Stable ID like "bull-1", "head", "torso"
  name: string; // Display name like "Bull 1", "Head Zone"
  order: number; // Display sequence
  centerX: number; // X coordinate in template space
  centerY: number; // Y coordinate in template space
  interactiveRadius?: number; // Radius for click detection
  scoringModelId?: mongoose.Types.ObjectId; // Override default scoring
  tags?: string[]; // e.g., ["bull", "primary"], ["head", "critical"]
}

export interface ITargetTemplate {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  version: number;
  coordinateSystem: ICoordinateSystem;
  render: IRender;
  defaultScoringModelId?: mongoose.Types.ObjectId;
  aimPoints: IAimPoint[];
  isSystem: boolean; // Built-in templates
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AimPointSchema = new Schema<IAimPoint>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    centerX: { type: Number, required: true },
    centerY: { type: Number, required: true },
    interactiveRadius: { type: Number },
    scoringModelId: { type: Schema.Types.ObjectId, ref: "ScoringModel" },
    tags: [{ type: String }],
  },
  { _id: false }
);

const TargetTemplateSchema = new Schema<ITargetTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String },
    version: { type: Number, required: true, default: 1 },
    coordinateSystem: {
      type: {
        type: String,
        enum: ["svg", "image"],
        required: true,
      },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      origin: { type: String, default: "top-left" },
    },
    render: {
      type: {
        type: String,
        enum: ["svg", "image"],
        required: true,
      },
      svgMarkup: { type: String },
      imageUrl: { type: String },
    },
    defaultScoringModelId: { type: Schema.Types.ObjectId, ref: "ScoringModel" },
    aimPoints: [AimPointSchema],
    isSystem: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes for efficient queries
TargetTemplateSchema.index({ name: 1 });
TargetTemplateSchema.index({ isSystem: 1 });
TargetTemplateSchema.index({ createdBy: 1 });

export const TargetTemplate: Model<ITargetTemplate> =
  mongoose.models.TargetTemplate ||
  mongoose.model<ITargetTemplate>("TargetTemplate", TargetTemplateSchema);
