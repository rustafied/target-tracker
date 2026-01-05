import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { sessionSchema } from "@/lib/validators/session";

export async function GET() {
  try {
    await connectToDatabase();
    const sessions = await RangeSession.find().sort({ date: -1 });
    
    // Get summary stats for each session
    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        const sheets = await TargetSheet.find({ rangeSessionId: session._id });
        const sheetIds = sheets.map(s => s._id);
        const bulls = await BullRecord.find({ targetSheetId: { $in: sheetIds } });
        
        const totalShots = bulls.reduce((sum, bull) => sum + (bull.totalShots || 0), 0);
        
        // Calculate total score from score counts
        const totalScore = bulls.reduce((sum, bull) => {
          return sum + 
            (bull.score5Count * 5) + 
            (bull.score4Count * 4) + 
            (bull.score3Count * 3) + 
            (bull.score2Count * 2) + 
            (bull.score1Count * 1);
        }, 0);
        
        const avgScore = totalShots > 0 ? totalScore / totalShots : 0;
        
        return {
          ...session.toObject(),
          sheetCount: sheets.length,
          totalShots,
          avgScore,
        };
      })
    );
    
    // Calculate improvement from previous session (chronologically)
    const sessionsWithImprovement = sessionsWithStats.map((session, index) => {
      // Find the previous session chronologically (next in the sorted array since we sort by date desc)
      const previousSession = sessionsWithStats[index + 1];
      
      let improvement: number | null = null;
      if (previousSession && previousSession.avgScore > 0 && session.avgScore > 0) {
        improvement = ((session.avgScore - previousSession.avgScore) / previousSession.avgScore) * 100;
      }
      
      return {
        ...session,
        improvement,
      };
    });
    
    // Get unique locations for autocomplete
    const locations = await RangeSession.distinct("location", { 
      location: { $exists: true, $nin: [null, ""] } 
    });
    
    return NextResponse.json({ sessions: sessionsWithImprovement, locations });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ 
      error: "Failed to fetch sessions", 
      details: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = sessionSchema.parse(body);

    await connectToDatabase();
    const session = await RangeSession.create(validated);

    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    console.error("Error creating session:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

