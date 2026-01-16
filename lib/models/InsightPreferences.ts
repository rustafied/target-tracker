import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInsightPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  minConfidence: number;
  maxInsights: number;
  verbosity: "short" | "long";
  enabledTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const InsightPreferencesSchema = new Schema<IInsightPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    minConfidence: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1,
    },
    maxInsights: {
      type: Number,
      default: 5,
      min: 1,
      max: 20,
    },
    verbosity: {
      type: String,
      enum: ["short", "long"],
      default: "short",
    },
    enabledTypes: {
      type: [String],
      default: [
        "vs-average",
        "setup-milestone",
        "distance-diagnostic",
        "efficiency-snapshot",
        "bias-pattern",
        "trend-summary",
        "top-performers",
        "usage-recommendation",
        "inventory-alert",
        "composite-flag",
        "pairwise-winner",
        "group-ranking",
        "contextual-difference",
        "crossover-point",
        "composite-recommendation",
      ],
    },
  },
  { timestamps: true }
);

InsightPreferencesSchema.index({ userId: 1 });

export const InsightPreferences: Model<IInsightPreferences> =
  mongoose.models.InsightPreferences ||
  mongoose.model<IInsightPreferences>("InsightPreferences", InsightPreferencesSchema);
