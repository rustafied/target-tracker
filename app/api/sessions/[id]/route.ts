import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { TargetTemplate } from "@/lib/models/TargetTemplate";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
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
    void Firearm;
    void Caliber;
    void Optic;
    void TargetTemplate;
    
    // Try to find by slug first, fallback to _id for backward compatibility
    let session = await RangeSession.findOne({ slug: id });
    if (!session) {
      session = await RangeSession.findById(id);
    }
    
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get all sheets for this session
    const rawSheets = await TargetSheet.find({ rangeSessionId: session._id })
      .sort({ createdAt: 1 })
      .lean();
    
    // Manually fetch and populate references to ensure all fields are included
    const firearmIds = [...new Set(rawSheets.map(s => s.firearmId.toString()))];
    const caliberIds = [...new Set(rawSheets.map(s => s.caliberId.toString()))];
    const opticIds = [...new Set(rawSheets.map(s => s.opticId.toString()))];
    const templateIds = [...new Set(rawSheets.map(s => s.targetTemplateId?.toString()).filter((id): id is string => Boolean(id)))];
    
    const [firearms, calibers, optics, templates] = await Promise.all([
      Firearm.find({ _id: { $in: firearmIds } }).lean(),
      Caliber.find({ _id: { $in: caliberIds } }).lean(),
      Optic.find({ _id: { $in: opticIds } }).lean(),
      templateIds.length > 0 ? TargetTemplate.find({ _id: { $in: templateIds } }).lean() : Promise.resolve([]),
    ]);
    
    // Create lookup maps
    const firearmMap = new Map(firearms.map(f => [f._id.toString(), f]));
    const caliberMap = new Map(calibers.map(c => [c._id.toString(), c]));
    const opticMap = new Map(optics.map(o => [o._id.toString(), o]));
    const templateMap = new Map(templates.map(t => [t._id.toString(), t]));
    
    // Attach references to sheets
    const sheets = rawSheets.map(sheet => ({
      ...sheet,
      firearmId: firearmMap.get(sheet.firearmId.toString()),
      caliberId: caliberMap.get(sheet.caliberId.toString()),
      opticId: opticMap.get(sheet.opticId.toString()),
      targetTemplateId: sheet.targetTemplateId ? templateMap.get(sheet.targetTemplateId.toString()) : undefined,
    }));

    // Get bull records for each sheet
    const sheetsWithBulls = await Promise.all(
      sheets.map(async (sheet: any) => {
        const bulls = await BullRecord.find({ targetSheetId: sheet._id }).sort({ bullIndex: 1 }).lean();
        const bullsWithMetrics = bulls.map((bull: any) => {
          const totalShots =
            (bull.score5Count || 0) +
            (bull.score4Count || 0) +
            (bull.score3Count || 0) +
            (bull.score2Count || 0) +
            (bull.score1Count || 0) +
            (bull.score0Count || 0);
          const totalScore =
            (bull.score5Count || 0) * 5 +
            (bull.score4Count || 0) * 4 +
            (bull.score3Count || 0) * 3 +
            (bull.score2Count || 0) * 2 +
            (bull.score1Count || 0) * 1;
          return {
            ...bull,
            totalShots,
            totalScore,
          };
        });
        return {
          ...sheet,
          bulls: bullsWithMetrics,
        };
      })
    );

    // Get ammo transactions for this session
    // Query by both sessionId and sheetIds to ensure we capture all transactions
    // Note: IDs might be stored as either ObjectId or string, so we check both
    const sheetIds = sheets.map(s => s._id);
    const sheetIdStrings = sheetIds.map(id => id.toString());
    const ammoTransactions = await AmmoTransaction.find({
      $or: [
        { sessionId: session._id },
        { sessionId: session._id.toString() },
        { sheetId: { $in: sheetIds } },
        { sheetId: { $in: sheetIdStrings } }
      ]
    })
      .populate("caliberId", "name shortCode")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ session, sheets: sheetsWithBulls, ammoTransactions });
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

