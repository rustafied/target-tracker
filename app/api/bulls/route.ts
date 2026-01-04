import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";
import { bullSchema } from "@/lib/validators/bull";
import { calculateBullMetrics } from "@/lib/metrics";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Handle batch creation/update
    if (Array.isArray(body)) {
      const validated = body.map(bull => bullSchema.parse(bull));
      
      await connectToDatabase();
      
      // Update or create each bull
      const results = await Promise.all(
        validated.map(async (bull) => {
          const metrics = calculateBullMetrics(bull as any);
          return await BullRecord.findOneAndUpdate(
            { targetSheetId: bull.targetSheetId, bullIndex: bull.bullIndex },
            { ...bull, totalShots: metrics.totalShots },
            { new: true, upsert: true }
          );
        })
      );

      return NextResponse.json(results, { status: 201 });
    }

    // Single creation
    const validated = bullSchema.parse(body);
    await connectToDatabase();
    
    const metrics = calculateBullMetrics(validated as any);
    const bull = await BullRecord.create({ ...validated, totalShots: metrics.totalShots });

    return NextResponse.json(bull, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bull:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create bull record" }, { status: 500 });
  }
}

