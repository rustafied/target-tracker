import { NextRequest, NextResponse } from "next/server";
import { generateOverviewInsights } from "@/lib/insights-engine";
import { InsightPreferences } from "@/lib/models/InsightPreferences";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    console.log('[Overview Insights API] Starting...');
    await connectToDatabase();
    console.log('[Overview Insights API] Database connected');

    const userId = await requireUserId(request);
    console.log('[Overview Insights API] User ID:', userId);

    // Get user preferences
    let preferences = await InsightPreferences.findOne({
      userId,
    });
    console.log('[Overview Insights API] Preferences found:', !!preferences);

    // Create default if none exist
    if (!preferences) {
      console.log('[Overview Insights API] Creating default preferences');
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

    console.log('[Overview Insights API] Config:', JSON.stringify(config, null, 2));
    console.log('[Overview Insights API] Calling generateOverviewInsights...');
    
    const insights = await generateOverviewInsights(userId.toString(), config);
    
    console.log('[Overview Insights API] Generated insights:', insights.length);

    return NextResponse.json({
      insights,
      count: insights.length,
    });
  } catch (error) {
    console.error("!!! [Overview Insights API] FATAL ERROR !!!");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return NextResponse.json(
      { 
        error: "Failed to generate insights",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
