import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TargetTemplate } from "@/lib/models/TargetTemplate";
import { requireUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    await connectToDatabase();

    // Get all system templates and user's custom templates
    const templates = await TargetTemplate.find({
      $or: [
        { isSystem: true },
        { createdBy: userId },
      ],
    })
    .select('+sortOrder') // Explicitly select sortOrder
    .sort({ sortOrder: 1, name: 1 }); // Sort by user-defined order

    console.log("Fetched templates:", templates.map(t => ({ name: t.name, sortOrder: t.sortOrder })));

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
