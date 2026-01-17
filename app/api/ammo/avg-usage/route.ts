import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import { requireUserId } from "@/lib/auth-helpers";

// GET /api/ammo/avg-usage - Get average usage per session for each caliber
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await requireUserId(req);
    const userIdString = userId.toString();

    // Get session deduction transactions grouped by caliber and session
    const avgUsageData = await AmmoTransaction.aggregate([
      {
        $match: {
          userId: userIdString,
          reason: "session_deduct",
          sessionId: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            caliberId: "$caliberId",
            sessionId: "$sessionId",
          },
          roundsUsed: { $sum: { $abs: "$delta" } },
        },
      },
      {
        $group: {
          _id: "$_id.caliberId",
          avgRoundsPerSession: { $avg: "$roundsUsed" },
          totalSessions: { $sum: 1 },
        },
      },
    ]);

    // Convert to a map for easy lookup
    const avgUsageMap: Record<string, { avgRoundsPerSession: number; totalSessions: number }> = {};
    avgUsageData.forEach((item) => {
      avgUsageMap[item._id.toString()] = {
        avgRoundsPerSession: Math.round(item.avgRoundsPerSession),
        totalSessions: item.totalSessions,
      };
    });

    return NextResponse.json(avgUsageMap);
  } catch (error) {
    console.error("Error fetching avg usage:", error);
    return NextResponse.json({ error: "Failed to fetch average usage" }, { status: 500 });
  }
}
