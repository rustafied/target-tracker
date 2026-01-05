import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Firearm } from "@/lib/models/Firearm";
import { firearmSchema } from "@/lib/validators/firearm";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await requireUserId(request);
    
    // TODO: When multi-user is enabled, filter by userId
    // For now, return all firearms (only master admin can access)
    const firearms = await Firearm.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    return NextResponse.json(firearms);
  } catch (error: any) {
    console.error("Error fetching firearms:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch firearms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = firearmSchema.parse(body);

    await connectToDatabase();
    const userId = await requireUserId(request);
    
    // Convert string IDs to ObjectIds
    const firearmData = {
      ...validated,
      userId,
      caliberIds: validated.caliberIds.map(id => new mongoose.Types.ObjectId(id)),
      opticIds: validated.opticIds.map(id => new mongoose.Types.ObjectId(id)),
      ...(validated.defaultCaliberId && { 
        defaultCaliberId: new mongoose.Types.ObjectId(validated.defaultCaliberId) 
      }),
    };
    
    const firearm = await Firearm.create(firearmData);

    return NextResponse.json(firearm, { status: 201 });
  } catch (error: any) {
    console.error("Error creating firearm:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create firearm" }, { status: 500 });
  }
}

