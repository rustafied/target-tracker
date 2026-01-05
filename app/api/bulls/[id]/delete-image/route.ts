import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { connectToDatabase } from "@/lib/db";
import { BullRecord } from "@/lib/models/BullRecord";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bullId } = await params;

    await connectToDatabase();
    
    // Get the bull record to find the image URL
    const bull = await BullRecord.findById(bullId);
    
    if (!bull) {
      return NextResponse.json(
        { error: "Bull record not found" },
        { status: 404 }
      );
    }

    if (!bull.imageUrl) {
      return NextResponse.json(
        { error: "No image to delete" },
        { status: 400 }
      );
    }

    // Delete the file from filesystem
    const filename = path.basename(bull.imageUrl);
    const filepath = path.join(process.cwd(), "public", "uploads", "targets", filename);
    
    try {
      await unlink(filepath);
      console.log(`Deleted image file: ${filepath}`);
    } catch (error) {
      console.error("Error deleting image file:", error);
      // Continue even if file deletion fails (file might not exist)
    }

    // Clear image metadata from bull record
    bull.imageUrl = undefined;
    bull.imageUploadedAt = undefined;
    bull.detectedShotCount = undefined;
    await bull.save();

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}
