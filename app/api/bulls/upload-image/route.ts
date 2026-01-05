import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;
    const bullId = formData.get("bullId") as string;
    const sheetId = formData.get("sheetId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    if (!bullId || !sheetId) {
      return NextResponse.json(
        { error: "Bull ID and Sheet ID are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WEBP are supported" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const filename = `${sheetId}_${bullId}_${timestamp}${ext}`;
    const filepath = path.join(process.cwd(), "public", "uploads", "targets", filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Generate public URL
    const imageUrl = `/uploads/targets/${filename}`;

    // Convert image to base64 for detection service
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Call Python detection service
    let detectedShots = [];
    try {
      const detectionResponse = await fetch("http://localhost:5001/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: base64Image,
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
      console.error("Detection service error:", error);
      // Continue without detection if service is unavailable
    }

    // Update bull record with image info
    await connectToDatabase();
    const bull = await BullRecord.findByIdAndUpdate(
      bullId,
      {
        imageUrl,
        imageUploadedAt: new Date(),
        detectedShotCount: detectedShots.length,
      },
      { new: true }
    );

    if (!bull) {
      return NextResponse.json(
        { error: "Bull record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      detectedShots,
      bull,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
