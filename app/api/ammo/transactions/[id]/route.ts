import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import { AmmoInventory } from "@/lib/models/AmmoInventory";
import { requireUserId } from "@/lib/auth-helpers";
import mongoose from "mongoose";

// DELETE /api/ammo/transactions/[id] - Delete a manual transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const userId = await requireUserId(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    const userIdString = userId.toString();

    // Find the transaction
    const transaction = await AmmoTransaction.findById(id).lean();

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (transaction.userId !== userIdString) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Only allow deletion of manual transactions (not session-linked)
    if (transaction.reason !== "manual_add" && transaction.reason !== "manual_subtract") {
      return NextResponse.json(
        { error: "Can only delete manual transactions (add/subtract). Session-linked transactions cannot be deleted." },
        { status: 400 }
      );
    }

    // Reverse the inventory change (opposite of the transaction delta)
    await AmmoInventory.updateOne(
      { userId: userIdString, caliberId: transaction.caliberId },
      { $inc: { onHand: -transaction.delta } }
    );

    // Delete the transaction
    await AmmoTransaction.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      message: "Transaction deleted and inventory adjusted",
    });
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
