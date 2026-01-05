import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { bullSchema } from "@/lib/validators/bull";
import { calculateBullMetrics } from "@/lib/metrics";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    await connectToDatabase();
    
    // Handle batch creation/update
    if (Array.isArray(body)) {
      const validated = body.map(bull => bullSchema.parse(bull));
      
      // Filter out bulls with all zero counts (no shots)
      const nonEmptyBulls = validated.filter(bull => {
        return bull.score5Count > 0 || bull.score4Count > 0 || bull.score3Count > 0 || 
               bull.score2Count > 0 || bull.score1Count > 0 || bull.score0Count > 0;
      });
      
      // If no valid bulls, return empty array
      if (nonEmptyBulls.length === 0) {
        return NextResponse.json([], { status: 201 });
      }
      
      // Resolve sheet slug to ObjectId if needed
      const firstBull = nonEmptyBulls[0];
      let sheetId = firstBull.targetSheetId;
      
      if (typeof sheetId === 'string' && (sheetId.includes('-') || sheetId.length !== 24)) {
        const sheet = await TargetSheet.findOne({ slug: sheetId });
        if (!sheet) {
          return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
        }
        sheetId = sheet._id.toString();
      }
      
      // Update or create each non-empty bull with resolved sheetId
      const results = await Promise.all(
        nonEmptyBulls.map(async (bull) => {
          const metrics = calculateBullMetrics(bull as any);
          return await BullRecord.findOneAndUpdate(
            { targetSheetId: sheetId, bullIndex: bull.bullIndex },
            { ...bull, targetSheetId: sheetId, totalShots: metrics.totalShots },
            { new: true, upsert: true }
          );
        })
      );

      return NextResponse.json(results, { status: 201 });
    }

    // Single creation
    const validated = bullSchema.parse(body);
    
    // Resolve sheet slug to ObjectId if needed
    let sheetId = validated.targetSheetId;
    if (typeof sheetId === 'string' && (sheetId.includes('-') || sheetId.length !== 24)) {
      const sheet = await TargetSheet.findOne({ slug: sheetId });
      if (!sheet) {
        return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
      }
      sheetId = sheet._id.toString();
    }
    
    const metrics = calculateBullMetrics(validated as any);
    const bull = await BullRecord.create({ 
      ...validated, 
      targetSheetId: sheetId,
      totalShots: metrics.totalShots 
    });

    return NextResponse.json(bull, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bull:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create bull record" }, { status: 500 });
  }
}

