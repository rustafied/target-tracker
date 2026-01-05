import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Firearm } from "@/lib/models/Firearm";
import { firearmSchema } from "@/lib/validators/firearm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const firearm = await Firearm.findById(id);

    if (!firearm) {
      return NextResponse.json({ error: "Firearm not found" }, { status: 404 });
    }

    return NextResponse.json(firearm);
  } catch (error) {
    console.error("Error fetching firearm:", error);
    return NextResponse.json({ error: "Failed to fetch firearm" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    const firearm = await Firearm.findByIdAndUpdate(id, firearmData, { new: true });

    if (!firearm) {
      return NextResponse.json({ error: "Firearm not found" }, { status: 404 });
    }

    return NextResponse.json(firearm);
  } catch (error: any) {
    console.error("Error updating firearm:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update firearm" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const firearm = await Firearm.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!firearm) {
      return NextResponse.json({ error: "Firearm not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Firearm archived successfully" });
  } catch (error) {
    console.error("Error archiving firearm:", error);
    return NextResponse.json({ error: "Failed to archive firearm" }, { status: 500 });
  }
}

