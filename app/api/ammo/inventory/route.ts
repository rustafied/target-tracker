import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AmmoInventory } from "@/lib/models/AmmoInventory";
import { Caliber } from "@/lib/models/Caliber";
import mongoose from "mongoose";

// GET /api/ammo/inventory - Get all inventory with caliber details
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || (session?.user as any)?.discordId;
    
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Ensure userId is a string (Discord ID)
    const userIdString = String(userId);
    
    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: { userId: userIdString } },
      {
        $lookup: {
          from: "calibers",
          localField: "caliberId",
          foreignField: "_id",
          as: "caliber",
        },
      },
      { $unwind: "$caliber" },
      { $match: { "caliber.isActive": true } },
      { $sort: { "caliber.sortOrder": 1, "caliber.name": 1 } },
      {
        $project: {
          _id: 1,
          onHand: 1,
          reserved: 1,
          updatedAt: 1,
          caliber: {
            _id: "$caliber._id",
            name: "$caliber.name",
            shortCode: "$caliber.shortCode",
            category: "$caliber.category",
          },
        },
      },
    ];

    const inventory = await AmmoInventory.aggregate(pipeline);

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
