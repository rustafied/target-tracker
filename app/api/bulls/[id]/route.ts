import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { bullSchema } from "@/lib/validators/bull";
import { calculateBullMetrics } from "@/lib/metrics";
import { reconcileSheetAmmo } from "@/lib/ammo-reconciliation";
import { requireUserId } from "@/lib/auth-helpers";
import mongoose from "mongoose";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = bullSchema.parse(body);

    await connectToDatabase();
    const userId = await requireUserId(request);
    
    const metrics = calculateBullMetrics(validated as any);
    const bull = await BullRecord.findByIdAndUpdate(
      id,
      { ...validated, totalShots: metrics.totalShots },
      { new: true }
    );

    if (!bull) {
      return NextResponse.json({ error: "Bull record not found" }, { status: 404 });
    }

    // Reconcile ammo after bull update
    const sheet = await TargetSheet.findById(bull.targetSheetId);
    if (sheet && sheet.caliberId) {
      await reconcileSheetAmmo({
        userId: new mongoose.Types.ObjectId(userId),
        sheetId: new mongoose.Types.ObjectId(bull.targetSheetId.toString()),
        sessionId: sheet.rangeSessionId ? new mongoose.Types.ObjectId(sheet.rangeSessionId) : undefined,
        caliberId: new mongoose.Types.ObjectId(sheet.caliberId),
      });
    }

    return NextResponse.json(bull);
  } catch (error: any) {
    console.error("Error updating bull:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update bull record" }, { status: 500 });
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
    
    const bull = await BullRecord.findById(id);
    if (!bull) {
      return NextResponse.json({ error: "Bull record not found" }, { status: 404 });
    }

    const sheetId = bull.targetSheetId;
    await BullRecord.findByIdAndDelete(id);

    // Reconcile ammo after bull deletion
    const sheet = await TargetSheet.findById(sheetId);
    if (sheet && sheet.caliberId) {
      await reconcileSheetAmmo({
        userId: new mongoose.Types.ObjectId(userId),
        sheetId: new mongoose.Types.ObjectId(sheetId.toString()),
        sessionId: sheet.rangeSessionId ? new mongoose.Types.ObjectId(sheet.rangeSessionId) : undefined,
        caliberId: new mongoose.Types.ObjectId(sheet.caliberId),
      });
    }

    return NextResponse.json({ message: "Bull record deleted successfully" });
  } catch (error) {
    console.error("Error deleting bull:", error);
    return NextResponse.json({ error: "Failed to delete bull record" }, { status: 500 });
  }
}

