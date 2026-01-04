import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { sheetSchema } from "@/lib/validators/sheet";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = sheetSchema.parse(body);

    await connectToDatabase();
    const sheet = await TargetSheet.create(validated);

    // Create 6 empty bull records for this sheet
    const bulls = [];
    for (let i = 1; i <= 6; i++) {
      bulls.push({
        targetSheetId: sheet._id,
        bullIndex: i,
        score5Count: 0,
        score4Count: 0,
        score3Count: 0,
        score2Count: 0,
        score1Count: 0,
        score0Count: 0,
        totalShots: 0,
      });
    }
    await BullRecord.insertMany(bulls);

    return NextResponse.json(sheet, { status: 201 });
  } catch (error: any) {
    console.error("Error creating sheet:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create sheet" }, { status: 500 });
  }
}

