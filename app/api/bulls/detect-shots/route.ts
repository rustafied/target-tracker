import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { imageData, targetType = "bullseye" } = data;

    if (!imageData) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    // Call Python detection service
    const detectionResponse = await fetch("http://localhost:5001/detect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageData,
        targetType,
      }),
    });

    if (!detectionResponse.ok) {
      const errorData = await detectionResponse.json();
      return NextResponse.json(
        { error: errorData.error || "Detection service error" },
        { status: detectionResponse.status }
      );
    }

    const detectionData = await detectionResponse.json();

    return NextResponse.json({
      success: true,
      shots: detectionData.result.shots,
      metadata: {
        targetCenter: detectionData.result.targetCenter,
        targetRadius: detectionData.result.targetRadius,
        detectedCount: detectionData.result.detectedCount,
      },
    });
  } catch (error: any) {
    console.error("Detection error:", error);
    
    // Check if detection service is unavailable
    if (error.code === "ECONNREFUSED") {
      return NextResponse.json(
        { 
          error: "Detection service is not running. Please start the Python service.",
          details: "Run: cd python-ocr && source venv/bin/activate && python target_detector.py"
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to detect shots" },
      { status: 500 }
    );
  }
}
