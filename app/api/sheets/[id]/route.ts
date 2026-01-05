import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { RangeSession } from "@/lib/models/RangeSession";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";
import { sheetSchema } from "@/lib/validators/sheet";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    // Try to find by slug first, fallback to _id
    let sheet = await TargetSheet.findOne({ slug: id })
      .populate("firearmId")
      .populate("caliberId")
      .populate("opticId")
      .populate("rangeSessionId");
    
    if (!sheet) {
      sheet = await TargetSheet.findById(id)
        .populate("firearmId")
        .populate("caliberId")
        .populate("opticId")
        .populate("rangeSessionId");
    }

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const bulls = await BullRecord.find({ targetSheetId: sheet._id }).sort({ bullIndex: 1 });

    return NextResponse.json({ sheet, bulls });
  } catch (error) {
    console.error("Error fetching sheet:", error);
    return NextResponse.json({ error: "Failed to fetch sheet" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = sheetSchema.parse(body);

    await connectToDatabase();
    
    // Don't update rangeSessionId if not provided
    const updateData: any = {
      firearmId: validated.firearmId,
      caliberId: validated.caliberId,
      opticId: validated.opticId,
      distanceYards: validated.distanceYards,
    };
    
    if (validated.sheetLabel !== undefined) updateData.sheetLabel = validated.sheetLabel;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    
    const sheet = await TargetSheet.findByIdAndUpdate(id, updateData, { new: true });

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    return NextResponse.json(sheet);
  } catch (error: any) {
    console.error("Error updating sheet:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update sheet" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    await BullRecord.deleteMany({ targetSheetId: id });
    await TargetSheet.findByIdAndDelete(id);

    return NextResponse.json({ message: "Sheet deleted successfully" });
  } catch (error) {
    console.error("Error deleting sheet:", error);
    return NextResponse.json({ error: "Failed to delete sheet" }, { status: 500 });
  }
}

