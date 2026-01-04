import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Optic } from "@/lib/models/Optic";
import { opticSchema } from "@/lib/validators/optic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const optic = await Optic.findById(id);

    if (!optic) {
      return NextResponse.json({ error: "Optic not found" }, { status: 404 });
    }

    return NextResponse.json(optic);
  } catch (error) {
    console.error("Error fetching optic:", error);
    return NextResponse.json({ error: "Failed to fetch optic" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = opticSchema.parse(body);

    await connectToDatabase();
    const optic = await Optic.findByIdAndUpdate(id, validated, { new: true });

    if (!optic) {
      return NextResponse.json({ error: "Optic not found" }, { status: 404 });
    }

    return NextResponse.json(optic);
  } catch (error: any) {
    console.error("Error updating optic:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update optic" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const optic = await Optic.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!optic) {
      return NextResponse.json({ error: "Optic not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Optic archived successfully" });
  } catch (error) {
    console.error("Error archiving optic:", error);
    return NextResponse.json({ error: "Failed to archive optic" }, { status: 500 });
  }
}

