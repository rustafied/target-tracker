import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { images, sheetId } = data;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    if (!sheetId) {
      return NextResponse.json(
        { error: "Sheet ID is required" },
        { status: 400 }
      );
    }

    // Process each image
    const results = await Promise.all(
      images.map(async (img) => {
        try {
          const { imageData, bullIndex } = img;

          if (!imageData || !bullIndex) {
            return {
              bullIndex,
              success: false,
              error: "Missing imageData or bullIndex",
            };
          }

          // Save image file
          const timestamp = Date.now();
          const filename = `${sheetId}_bull${bullIndex}_${timestamp}.png`;
          const filepath = path.join(
            process.cwd(),
            "public",
            "uploads",
            "targets",
            filename
          );

          // Convert base64 to buffer
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          await writeFile(filepath, buffer);

          const imageUrl = `/uploads/targets/${filename}`;

          // Call detection service
          let detectedShots = [];
          try {
            const detectionResponse = await fetch("http://localhost:5001/detect", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                imageData,
                targetType: "bullseye",
              }),
            });

            if (detectionResponse.ok) {
              const detectionData = await detectionResponse.json();
              if (detectionData.success) {
                detectedShots = detectionData.result.shots;
              }
            }
          } catch (error) {
            console.error(`Detection error for bull ${bullIndex}:`, error);
          }

          return {
            bullIndex,
            success: true,
            imageUrl,
            detectedShots,
          };
        } catch (error: any) {
          console.error(`Error processing image for bull ${img.bullIndex}:`, error);
          return {
            bullIndex: img.bullIndex,
            success: false,
            error: error.message,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Batch detection error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process images" },
      { status: 500 }
    );
  }
}
