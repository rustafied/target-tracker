import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Firearm } from "@/lib/models/Firearm";
import { firearmSchema } from "@/lib/validators/firearm";

export async function GET() {
  try {
    await connectToDatabase();
    const firearms = await Firearm.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    return NextResponse.json(firearms);
  } catch (error) {
    console.error("Error fetching firearms:", error);
    return NextResponse.json({ error: "Failed to fetch firearms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = firearmSchema.parse(body);

    await connectToDatabase();
    
    // Convert string IDs to ObjectIds
    const firearmData = {
      ...validated,
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
    return NextResponse.json({ error: "Failed to create firearm" }, { status: 500 });
  }
}

