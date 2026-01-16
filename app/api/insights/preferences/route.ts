import { NextRequest, NextResponse } from "next/server";
import { InsightPreferences } from "@/lib/models/InsightPreferences";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const userId = await requireUserId(request);
    let preferences = await InsightPreferences.findOne({ userId });

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await InsightPreferences.create({ userId });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching insight preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const userId = await requireUserId(request);
    const body = await request.json();

    // Validate input
    const updates: any = {};
    if (body.minConfidence !== undefined) {
      const conf = parseFloat(body.minConfidence);
      if (conf < 0 || conf > 1) {
        return NextResponse.json(
          { error: "minConfidence must be between 0 and 1" },
          { status: 400 }
        );
      }
      updates.minConfidence = conf;
    }
    if (body.maxInsights !== undefined) {
      const max = parseInt(body.maxInsights);
      if (max < 1 || max > 20) {
        return NextResponse.json(
          { error: "maxInsights must be between 1 and 20" },
          { status: 400 }
        );
      }
      updates.maxInsights = max;
    }
    if (body.verbosity !== undefined) {
      if (!["short", "long"].includes(body.verbosity)) {
        return NextResponse.json(
          { error: "verbosity must be 'short' or 'long'" },
          { status: 400 }
        );
      }
      updates.verbosity = body.verbosity;
    }
    if (body.enabledTypes !== undefined) {
      if (!Array.isArray(body.enabledTypes)) {
        return NextResponse.json(
          { error: "enabledTypes must be an array" },
          { status: 400 }
        );
      }
      updates.enabledTypes = body.enabledTypes;
    }

    const preferences = await InsightPreferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error updating insight preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
