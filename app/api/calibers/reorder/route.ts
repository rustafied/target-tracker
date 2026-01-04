import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Caliber } from "@/lib/models/Caliber";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { items } = body;

    await connectToDatabase();

    const updates = items.map((item: { _id: string; sortOrder: number }) =>
      Caliber.findByIdAndUpdate(item._id, { sortOrder: item.sortOrder })
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating caliber order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

