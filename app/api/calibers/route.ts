import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Caliber } from "@/lib/models/Caliber";
import { caliberSchema } from "@/lib/validators/caliber";

export async function GET() {
  try {
    await connectToDatabase();
    const calibers = await Caliber.find({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json(calibers);
  } catch (error) {
    console.error("Error fetching calibers:", error);
    return NextResponse.json({ error: "Failed to fetch calibers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = caliberSchema.parse(body);

    await connectToDatabase();
    const caliber = await Caliber.create(validated);

    return NextResponse.json(caliber, { status: 201 });
  } catch (error: any) {
    console.error("Error creating caliber:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create caliber" }, { status: 500 });
  }
}

