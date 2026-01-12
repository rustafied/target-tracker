import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import mongoose from "mongoose";

// GET /api/ammo/transactions - Get transaction log
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || (session?.user as any)?.discordId;
    
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const caliberId = searchParams.get("caliberId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Ensure userId is a string (Discord ID)
    const userIdString = String(userId);
    const filter: any = { userId: userIdString };
    if (caliberId) {
      filter.caliberId = new mongoose.Types.ObjectId(caliberId);
    }

    const [transactions, total] = await Promise.all([
      AmmoTransaction.find(filter)
        .populate("caliberId", "name shortCode")
        .populate("sessionId", "date location")
        .populate("sheetId", "sheetLabel")
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
