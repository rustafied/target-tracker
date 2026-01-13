import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import { requireUserId } from "@/lib/auth-helpers";
import mongoose from "mongoose";

// GET /api/ammo/transactions - Get transaction log
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const caliberId = searchParams.get("caliberId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Ensure userId is a string
    const userIdString = userId.toString();
    const filter: any = { userId: userIdString };
    if (caliberId) {
      filter.caliberId = new mongoose.Types.ObjectId(caliberId);
    }

    const [transactions, total] = await Promise.all([
      AmmoTransaction.find(filter)
        .populate("caliberId", "name shortCode")
        .populate("sessionId", "date location slug")
        .populate("sheetId", "sheetLabel slug")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      AmmoTransaction.countDocuments(filter),
    ]);

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
