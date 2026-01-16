import { NextRequest, NextResponse } from "next/server";
import { generateSessionInsights } from "@/lib/insights-engine";
import { InsightPreferences } from "@/lib/models/InsightPreferences";
import { RangeSession } from "@/lib/models/RangeSession";
import { connectToDatabase } from "@/lib/db";
import { requireUserId } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const userId = await requireUserId(request);
    const { id } = await params;
    const sessionIdOrSlug = id;

    // Try to find by slug first, fallback to _id
    let rangeSession = await RangeSession.findOne({ slug: sessionIdOrSlug });
    if (!rangeSession) {
      rangeSession = await RangeSession.findById(sessionIdOrSlug);
    }

    if (!rangeSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionId = rangeSession._id.toString();

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

    const insights = await generateSessionInsights(sessionId, userId.toString(), config);

    return NextResponse.json({
      insights,
      count: insights.length,
    });
  } catch (error) {
    console.error("Error generating session insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
