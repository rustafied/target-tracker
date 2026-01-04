import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Firearm } from "@/lib/models/Firearm";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { items } = body; // Array of { _id, sortOrder }

    await connectToDatabase();

    // Update all firearms with new sort order
    const updates = items.map((item: { _id: string; sortOrder: number }) =>
      Firearm.findByIdAndUpdate(item._id, { sortOrder: item.sortOrder })
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating firearm order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

