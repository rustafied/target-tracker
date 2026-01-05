import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { RangeSession } from "@/lib/models/RangeSession";
import { BullRecord } from "@/lib/models/BullRecord";
import { sheetSchema } from "@/lib/validators/sheet";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = sheetSchema.parse(body);

    await connectToDatabase();
    
    // If rangeSessionId looks like a slug (contains dashes and is not 24 hex chars), look it up
    let sessionId = validated.rangeSessionId;
    if (typeof sessionId === 'string' && (sessionId.includes('-') || sessionId.length !== 24)) {
      const session = await RangeSession.findOne({ slug: sessionId });
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      sessionId = session._id.toString();
    }

    // Create sheet with resolved sessionId, let pre-save hook generate slug
    const sheetData = {
      ...validated,
      rangeSessionId: sessionId,
    };
    
    const sheet = await TargetSheet.create(sheetData);

    // Don't create any bull records on sheet creation
    // Bulls will be created only when they have actual data

    return NextResponse.json(sheet, { status: 201 });
  } catch (error: any) {
    console.error("Error creating sheet:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create sheet" }, { status: 500 });
  }
}

