import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AmmoInventory } from "@/lib/models/AmmoInventory";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import mongoose from "mongoose";
import { z } from "zod";

const adjustInventorySchema = z.object({
  caliberId: z.string().min(1, "Caliber is required"),
  delta: z.number().int().refine((val) => val !== 0, {
    message: "Delta cannot be zero",
  }),
  note: z.string().max(200).optional(),
});

// POST /api/ammo/inventory/adjust - Manual inventory adjustment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || (session?.user as any)?.discordId;
    
    if (!session?.user || !userId) {
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const validation = adjustInventorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { caliberId, delta, note } = validation.data;
    // Ensure userId is a string (Discord ID)
    const userIdString = String(userId);
    const caliberObjectId = new mongoose.Types.ObjectId(caliberId);

    // Create transaction
    const reason = delta > 0 ? "manual_add" : "manual_subtract";
    await AmmoTransaction.create({
      userId: userIdString,
      caliberId: caliberObjectId,
      delta,
      reason,
      note,
    });

    // Update inventory atomically
    const inventory = await AmmoInventory.findOneAndUpdate(
      { userId: userIdString, caliberId: caliberObjectId },
      { $inc: { onHand: delta } },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      onHand: inventory.onHand,
    });
  } catch (error: any) {
    console.error("Error adjusting inventory:", error);
    return NextResponse.json(
      { 
        error: "Failed to adjust inventory",
        details: error.message || error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
