import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { bullSchema } from "@/lib/validators/bull";
import { calculateBullMetrics } from "@/lib/metrics";
import { requireUserId } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    await connectToDatabase();
    const userId = await requireUserId(request);
    
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
          
          // Find existing or create new
          let existingBull = await BullRecord.findOne({ 
            targetSheetId: sheetId, 
            bullIndex: bull.bullIndex 
          });
          
          if (existingBull) {
            // Update existing
            existingBull.score5Count = bull.score5Count;
            existingBull.score4Count = bull.score4Count;
            existingBull.score3Count = bull.score3Count;
            existingBull.score2Count = bull.score2Count;
            existingBull.score1Count = bull.score1Count;
            existingBull.score0Count = bull.score0Count;
            existingBull.shotPositions = bull.shotPositions || [];
            existingBull.totalShots = metrics.totalShots;
            
            await existingBull.save();
            return existingBull;
          } else {
            // Create new
            const newBull = new BullRecord({
              userId,
              targetSheetId: sheetId,
              bullIndex: bull.bullIndex,
              score5Count: bull.score5Count,
              score4Count: bull.score4Count,
              score3Count: bull.score3Count,
              score2Count: bull.score2Count,
              score1Count: bull.score1Count,
              score0Count: bull.score0Count,
              shotPositions: bull.shotPositions || [],
              totalShots: metrics.totalShots
            });
            
            await newBull.save();
            return newBull;
          }
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
      userId,
      targetSheetId: sheetId,
      totalShots: metrics.totalShots 
    });

    return NextResponse.json(bull, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bull:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create bull record" }, { status: 500 });
  }
}

