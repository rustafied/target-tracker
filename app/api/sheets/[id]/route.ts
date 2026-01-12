import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { TargetTemplate } from "@/lib/models/TargetTemplate";
import { RangeSession } from "@/lib/models/RangeSession";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";
import { sheetSchema } from "@/lib/validators/sheet";
import { reconcileSheetAmmo, reverseSheetAmmo } from "@/lib/ammo-reconciliation";
import { requireUserId } from "@/lib/auth-helpers";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    // Ensure models are registered before any queries
    void Firearm;
    void Caliber;
    void Optic;
    void TargetTemplate;
    
    // Try to find by slug first, fallback to _id
    let sheet = await TargetSheet.findOne({ slug: id })
      .populate("firearmId")
      .populate("caliberId")
      .populate("opticId")
      .populate("rangeSessionId")
      .populate("targetTemplateId");
    
    if (!sheet) {
      sheet = await TargetSheet.findById(id)
        .populate("firearmId")
        .populate("caliberId")
        .populate("opticId")
        .populate("rangeSessionId")
        .populate("targetTemplateId");
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = sheetSchema.parse(body);

    await connectToDatabase();
    const userId = await requireUserId(request);
    
    // Try to find by slug first, fallback to _id
    let sheet = await TargetSheet.findOne({ slug: id });
    if (!sheet) {
      sheet = await TargetSheet.findById(id);
    }
    
    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }
    
    // Don't update rangeSessionId if not provided
    const updateData: any = {
      firearmId: validated.firearmId,
      caliberId: validated.caliberId,
      opticId: validated.opticId,
      distanceYards: validated.distanceYards,
    };
    
    if (validated.sheetLabel !== undefined) updateData.sheetLabel = validated.sheetLabel;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    
    // Update the found sheet
    Object.assign(sheet, updateData);
    await sheet.save();

    // Reconcile ammo inventory (based on caliber)
    await reconcileSheetAmmo({
      userId: new mongoose.Types.ObjectId(userId),
      sheetId: sheet._id,
      sessionId: sheet.rangeSessionId,
      caliberId: new mongoose.Types.ObjectId(validated.caliberId),
    });

    return NextResponse.json(sheet);
  } catch (error: any) {
    console.error("Error updating sheet:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update sheet" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const userId = await requireUserId(request);

    // Find the sheet first to get caliber info
    const sheet = await TargetSheet.findById(id);
    if (sheet && sheet.caliberId) {
      // Reverse ammo deduction before deleting
      await reverseSheetAmmo(
        new mongoose.Types.ObjectId(userId),
        sheet._id,
        sheet.caliberId
      );
    }

    await BullRecord.deleteMany({ targetSheetId: id });
    await TargetSheet.findByIdAndDelete(id);

    return NextResponse.json({ message: "Sheet deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting sheet:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete sheet" }, { status: 500 });
  }
}

