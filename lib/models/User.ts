import mongoose, { Schema, Model } from "mongoose";

export interface IUser {
  _id?: mongoose.Types.ObjectId;
  discordId: string;
  username?: string;
  discriminator?: string;
  avatar?: string;
  isApproved: boolean;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    discordId: { type: String, required: true, unique: true },
    username: { type: String },
    discriminator: { type: String },
    avatar: { type: String },
    isApproved: { type: Boolean, default: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
