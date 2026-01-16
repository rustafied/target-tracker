import { NextRequest, NextResponse } from "next/server";
import { generateComparisonInsights } from "@/lib/insights-engine";
import { InsightPreferences } from "@/lib/models/InsightPreferences";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const userId = await requireUserId(request);

    // Get config from query params
    const searchParams = request.nextUrl.searchParams;
    const itemIds = searchParams.get("itemIds")?.split(",") || [];
    const itemType = searchParams.get("itemType") as
      | "firearms"
      | "optics"
      | "calibers"
      | null;

    if (!itemType || itemIds.length === 0) {
      return NextResponse.json(
        { error: "itemIds and itemType are required" },
        { status: 400 }
      );
    }

    if (!["firearms", "optics", "calibers"].includes(itemType)) {
      return NextResponse.json(
        { error: "itemType must be firearms, optics, or calibers" },
        { status: 400 }
      );
    }

    // Get user preferences
    let preferences = await InsightPreferences.findOne({
      userId,
    });

    // Create default if none exist
    if (!preferences) {
      preferences = await InsightPreferences.create({
        userId,
      });
    }

    const minConfidence = searchParams.get("minConfidence");
    const maxInsights = searchParams.get("maxInsights");
    const verbosity = searchParams.get("verbosity");

    const config: any = {
      minConfidence: preferences.minConfidence,
      maxInsights: preferences.maxInsights,
      verbosity: preferences.verbosity,
      enabledTypes: preferences.enabledTypes,
    };

    if (minConfidence) config.minConfidence = parseFloat(minConfidence);
    if (maxInsights) config.maxInsights = parseInt(maxInsights);
    if (verbosity) config.verbosity = verbosity as "short" | "long";

    const insights = await generateComparisonInsights(
      itemIds,
      itemType,
      userId,
      config
    );

    return NextResponse.json({
      insights,
      count: insights.length,
      itemIds,
      itemType,
    });
  } catch (error) {
    console.error("Error generating comparison insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
