import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Caliber } from "@/lib/models/Caliber";
import { caliberSchema } from "@/lib/validators/caliber";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await requireUserId(request);
    
    // Return calibers - filter by userId if present, otherwise return all (for backward compatibility)
    const query: any = { isActive: true };
    
    // First check if there are any calibers with userId set
    const userCalibers = await Caliber.find({ userId, isActive: true });
    
    if (userCalibers.length > 0) {
      // User has calibers with userId set, only show those
      query.userId = userId;
    } else {
      // No user-specific calibers found, show all (backward compatibility)
      // This allows existing calibers without userId to still show
      const allCalibers = await Caliber.find({ isActive: true });
      
      // If there are calibers without userId, return them
      if (allCalibers.length > 0) {
        return NextResponse.json(allCalibers.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      }
    }
    
    const calibers = await Caliber.find(query).sort({ sortOrder: 1, createdAt: -1 });
    return NextResponse.json(calibers);
  } catch (error: any) {
    console.error("Error fetching calibers:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch calibers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = caliberSchema.parse(body);

    await connectToDatabase();
    const userId = await requireUserId(request);
    
    const caliber = await Caliber.create({
      ...validated,
      userId,
    });

    return NextResponse.json(caliber, { status: 201 });
  } catch (error: any) {
    console.error("Error creating caliber:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create caliber" }, { status: 500 });
  }
}

