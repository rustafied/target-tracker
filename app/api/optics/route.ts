import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Optic } from "@/lib/models/Optic";
import { opticSchema } from "@/lib/validators/optic";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await requireUserId(request);
    
    // TODO: When multi-user is enabled, filter by userId
    // For now, return all optics (only master admin can access)
    const optics = await Optic.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    return NextResponse.json(optics);
  } catch (error: any) {
    console.error("Error fetching optics:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch optics" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = opticSchema.parse(body);

    await connectToDatabase();
    const userId = await requireUserId(request);
    
    const optic = await Optic.create({
      ...validated,
      userId,
    });

    return NextResponse.json(optic, { status: 201 });
  } catch (error: any) {
    console.error("Error creating optic:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create optic" }, { status: 500 });
  }
}

