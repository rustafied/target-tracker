import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Caliber } from "@/lib/models/Caliber";
import { caliberSchema } from "@/lib/validators/caliber";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    // Try to find by slug first, then fall back to ID for backward compatibility
    let caliber = await Caliber.findOne({ slug: id });
    
    if (!caliber) {
      // Try by ID as fallback
      try {
        caliber = await Caliber.findById(id);
      } catch (e) {
        // Invalid ObjectId format, continue
      }
    }

    if (!caliber) {
      return NextResponse.json({ error: "Caliber not found" }, { status: 404 });
    }

    return NextResponse.json(caliber);
  } catch (error) {
    console.error("Error fetching caliber:", error);
    return NextResponse.json({ error: "Failed to fetch caliber" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = caliberSchema.parse(body);

    await connectToDatabase();
    
    // Update caliber (backward compatible)
    const caliber = await Caliber.findByIdAndUpdate(id, validated, { new: true });

    if (!caliber) {
      return NextResponse.json({ error: "Caliber not found" }, { status: 404 });
    }

    return NextResponse.json(caliber);
  } catch (error: any) {
    console.error("Error updating caliber:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update caliber" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    await connectToDatabase();
    
    // Partial update for cost fields (no validation needed for cost updates)
    const updateFields: any = {};
    if (body.costPerRound !== undefined) updateFields.costPerRound = body.costPerRound;
    if (body.bulkCost !== undefined) updateFields.bulkCost = body.bulkCost;
    if (body.bulkQuantity !== undefined) updateFields.bulkQuantity = body.bulkQuantity;

    const caliber = await Caliber.findByIdAndUpdate(id, updateFields, { new: true });

    if (!caliber) {
      return NextResponse.json({ error: "Caliber not found" }, { status: 404 });
    }

    return NextResponse.json(caliber);
  } catch (error) {
    console.error("Error updating caliber cost:", error);
    return NextResponse.json({ error: "Failed to update caliber cost" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    // Archive caliber (backward compatible)
    const caliber = await Caliber.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!caliber) {
      return NextResponse.json({ error: "Caliber not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Caliber archived successfully" });
  } catch (error) {
    console.error("Error archiving caliber:", error);
    return NextResponse.json({ error: "Failed to archive caliber" }, { status: 500 });
  }
}

