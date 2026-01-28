import { NextRequest, NextResponse } from "next/server";
import { generateOverviewInsights } from "@/lib/insights-engine";
import { InsightPreferences } from "@/lib/models/InsightPreferences";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const userId = await requireUserId(request);

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

    // Get config from query params if provided (overrides preferences)
    const searchParams = request.nextUrl.searchParams;
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
    
    const insights = await generateOverviewInsights(userId.toString(), config);

    return NextResponse.json({
      insights,
      count: insights.length,
    });
  } catch (error) {
    console.error("[Overview Insights API] Error:", error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { 
        error: "Failed to generate insights",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
