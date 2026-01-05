import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { connectToDatabase } from "./db";
import { User } from "./models/User";
import mongoose from "mongoose";

/**
 * Get the current authenticated user's MongoDB _id from the request.
 * Returns null if no valid session.
 */
export async function getCurrentUserId(
  request: NextRequest
): Promise<mongoose.Types.ObjectId | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.discordId) {
    return null;
  }

  await connectToDatabase();
  const user = await User.findOne({ discordId: token.discordId });

  return user?._id || null;
}

/**
 * Get the current authenticated user's MongoDB _id from the request.
 * Throws an error if no valid session (for protected routes).
 */
export async function requireUserId(
  request: NextRequest
): Promise<mongoose.Types.ObjectId> {
  const userId = await getCurrentUserId(request);

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
