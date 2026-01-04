import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Optic } from "@/lib/models/Optic";
import { opticSchema } from "@/lib/validators/optic";

export async function GET() {
  try {
    await connectToDatabase();
    const optics = await Optic.find({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json(optics);
  } catch (error) {
    console.error("Error fetching optics:", error);
    return NextResponse.json({ error: "Failed to fetch optics" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = opticSchema.parse(body);

    await connectToDatabase();
    const optic = await Optic.create(validated);

    return NextResponse.json(optic, { status: 201 });
  } catch (error: any) {
    console.error("Error creating optic:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create optic" }, { status: 500 });
  }
}

