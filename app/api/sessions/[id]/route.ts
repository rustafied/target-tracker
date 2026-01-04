import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";
import { sessionSchema } from "@/lib/validators/session";
import { calculateSheetMetrics } from "@/lib/metrics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    // Ensure models are registered
    const _ = [Firearm, Caliber, Optic];
    
    const session = await RangeSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get all sheets for this session with populated references
    const sheets = await TargetSheet.find({ rangeSessionId: id })
      .populate("firearmId")
      .populate("caliberId")
      .populate("opticId")
      .sort({ createdAt: 1 });

    return NextResponse.json({ session, sheets });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = sessionSchema.parse(body);

    await connectToDatabase();
    const session = await RangeSession.findByIdAndUpdate(id, validated, { new: true });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Error updating session:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    // Delete all associated sheets and bulls
    const sheets = await TargetSheet.find({ rangeSessionId: id });
    const sheetIds = sheets.map(s => s._id);
    
    await BullRecord.deleteMany({ targetSheetId: { $in: sheetIds } });
    await TargetSheet.deleteMany({ rangeSessionId: id });
    await RangeSession.findByIdAndDelete(id);

    return NextResponse.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}

