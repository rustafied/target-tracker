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
    
    // Try to find by slug first, fallback to _id for backward compatibility
    let session = await RangeSession.findOne({ slug: id });
    if (!session) {
      session = await RangeSession.findById(id);
    }
    
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get all sheets for this session with populated references
    const sheets = await TargetSheet.find({ rangeSessionId: session._id })
      .populate("firearmId")
      .populate("caliberId")
      .populate("opticId")
      .sort({ createdAt: 1 });

    // Get bull records for each sheet
    const sheetsWithBulls = await Promise.all(
      sheets.map(async (sheet) => {
        const bulls = await BullRecord.find({ targetSheetId: sheet._id }).sort({ bullIndex: 1 });
        const bullsWithMetrics = bulls.map((bull) => {
          const totalShots =
            bull.score5Count +
            bull.score4Count +
            bull.score3Count +
            bull.score2Count +
            bull.score1Count +
            bull.score0Count;
          const totalScore =
            bull.score5Count * 5 +
            bull.score4Count * 4 +
            bull.score3Count * 3 +
            bull.score2Count * 2 +
            bull.score1Count * 1;
          return {
            ...bull.toObject(),
            totalShots,
            totalScore,
          };
        });
        return {
          ...sheet.toObject(),
          bulls: bullsWithMetrics,
        };
      })
    );

    return NextResponse.json({ session, sheets: sheetsWithBulls });
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
    
    // Try to find by slug first, fallback to _id
    let session = await RangeSession.findOne({ slug: id });
    if (!session) {
      session = await RangeSession.findById(id);
    }
    
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update the session
    Object.assign(session, validated);
    await session.save();

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

    // Try to find by slug first, fallback to _id
    let session = await RangeSession.findOne({ slug: id });
    if (!session) {
      session = await RangeSession.findById(id);
    }
    
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Delete all associated sheets and bulls
    const sheets = await TargetSheet.find({ rangeSessionId: session._id });
    const sheetIds = sheets.map(s => s._id);
    
    await BullRecord.deleteMany({ targetSheetId: { $in: sheetIds } });
    await TargetSheet.deleteMany({ rangeSessionId: session._id });
    await RangeSession.findByIdAndDelete(session._id);

    return NextResponse.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}

