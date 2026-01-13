import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import { requireUserId } from "@/lib/auth-helpers";
import mongoose from "mongoose";

// GET /api/ammo/usage-over-time - Get ammo usage trends
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await requireUserId(req);
    const userIdString = userId.toString();

    // Get all session deduction transactions, grouped by date and caliber
    const usageData = await AmmoTransaction.aggregate([
      {
        $match: {
          userId: userIdString,
          reason: "session_deduct",
          sessionId: { $exists: true },
        },
      },
      {
        $lookup: {
          from: "calibers",
          localField: "caliberId",
          foreignField: "_id",
          as: "caliber",
        },
      },
      { $unwind: "$caliber" },
      {
        $lookup: {
          from: "rangesessions",
          localField: "sessionId",
          foreignField: "_id",
          as: "session",
        },
      },
      { $unwind: "$session" },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$session.date" } },
            caliberId: "$caliberId",
          },
          caliberName: { $first: "$caliber.name" },
          totalUsed: { $sum: { $abs: "$delta" } },
          sessionDate: { $first: "$session.date" },
        },
      },
      {
        $sort: { sessionDate: 1 },
      },
      {
        $group: {
          _id: "$_id.caliberId",
          caliberName: { $first: "$caliberName" },
          usage: {
            $push: {
              date: "$_id.date",
              rounds: "$totalUsed",
            },
          },
        },
      },
      {
        $sort: { caliberName: 1 },
      },
    ]);

    return NextResponse.json({ calibers: usageData });
  } catch (error) {
    console.error("Error fetching usage over time:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
