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
    
    // Get unique locations for autocomplete
    const locations = await RangeSession.distinct("location", { 
      location: { $exists: true, $nin: [null, ""] } 
    });
    
    return NextResponse.json({ sessions, locations });
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

