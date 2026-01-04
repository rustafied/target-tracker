import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Caliber } from "@/lib/models/Caliber";
import { caliberSchema } from "@/lib/validators/caliber";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const caliber = await Caliber.findById(id);

    if (!caliber) {
      return NextResponse.json({ error: "Caliber not found" }, { status: 404 });
    }

    return NextResponse.json(caliber);
  } catch (error) {
    console.error("Error fetching caliber:", error);
    return NextResponse.json({ error: "Failed to fetch caliber" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = caliberSchema.parse(body);

    await connectToDatabase();
    const caliber = await Caliber.findByIdAndUpdate(id, validated, { new: true });

    if (!caliber) {
      return NextResponse.json({ error: "Caliber not found" }, { status: 404 });
    }

    return NextResponse.json(caliber);
  } catch (error: any) {
    console.error("Error updating caliber:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update caliber" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const caliber = await Caliber.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!caliber) {
      return NextResponse.json({ error: "Caliber not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Caliber archived successfully" });
  } catch (error) {
    console.error("Error archiving caliber:", error);
    return NextResponse.json({ error: "Failed to archive caliber" }, { status: 500 });
  }
}

