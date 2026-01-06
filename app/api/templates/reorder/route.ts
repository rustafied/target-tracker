import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TargetTemplate } from "@/lib/models/TargetTemplate";
import { requireUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    // Ensure user is authenticated
    await requireUserId(request);
    
    const body = await request.json();
    const { items } = body; // Array of { _id, sortOrder }

    console.log("Reorder request received:", items);

    await connectToDatabase();

    // Update each template individually with explicit $set
    for (const item of items) {
      console.log(`Updating template ${item._id} to sortOrder ${item.sortOrder}`);
      const result = await TargetTemplate.updateOne(
        { _id: item._id },
        { $set: { sortOrder: item.sortOrder } }
      );
      console.log(`Update result:`, result);
    }

    // Verify the updates
    const updatedTemplates = await TargetTemplate.find({
      _id: { $in: items.map((item: { _id: string }) => item._id) }
    })
    .select('+sortOrder')
    .sort({ sortOrder: 1 });
    
    console.log("Verified updated templates:", updatedTemplates.map(t => ({ name: t.name, sortOrder: t.sortOrder })));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating template order:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
