import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";
import { bullSchema } from "@/lib/validators/bull";
import { calculateBullMetrics } from "@/lib/metrics";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = bullSchema.parse(body);

    await connectToDatabase();
    
    const metrics = calculateBullMetrics(validated as any);
    const bull = await BullRecord.findByIdAndUpdate(
      id,
      { ...validated, totalShots: metrics.totalShots },
      { new: true }
    );

    if (!bull) {
      return NextResponse.json({ error: "Bull record not found" }, { status: 404 });
    }

    return NextResponse.json(bull);
  } catch (error: any) {
    console.error("Error updating bull:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update bull record" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    await BullRecord.findByIdAndDelete(id);

    return NextResponse.json({ message: "Bull record deleted successfully" });
  } catch (error) {
    console.error("Error deleting bull:", error);
    return NextResponse.json({ error: "Failed to delete bull record" }, { status: 500 });
  }
}

