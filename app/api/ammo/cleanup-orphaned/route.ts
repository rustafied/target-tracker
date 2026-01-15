import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import { AmmoInventory } from "@/lib/models/AmmoInventory";
import { TargetSheet } from "@/lib/models/TargetSheet";
import mongoose from "mongoose";

export async function POST() {
  try {
    await connectToDatabase();

    // Find all session_deduct transactions
    const transactions = await AmmoTransaction.find({ reason: "session_deduct" }).lean();
    
    const orphaned = [];
    
    for (const tx of transactions) {
      // Check if sheet still exists
      const sheet = await TargetSheet.findById(tx.sheetId).lean();
      
      if (!sheet) {
        orphaned.push(tx);
      }
    }

    console.log(`Found ${orphaned.length} orphaned transactions`);

    // Delete orphaned transactions and reverse inventory
    for (const tx of orphaned) {
      await AmmoTransaction.deleteOne({ _id: tx._id });
      
      // Reverse inventory change
      await AmmoInventory.updateOne(
        { caliberId: tx.caliberId.toString() },
        { $inc: { onHand: -tx.delta } } // Opposite of delta
      );
      
      console.log(`Cleaned up orphaned transaction: ${tx._id}, reversed ${-tx.delta} rounds`);
    }

    return NextResponse.json({
      success: true,
      cleaned: orphaned.length,
      transactions: orphaned.map(tx => ({
        _id: tx._id,
        sheetId: tx.sheetId,
        delta: tx.delta,
      }))
    });
  } catch (error) {
    console.error("Error cleaning up orphaned transactions:", error);
    return NextResponse.json(
      { error: "Failed to cleanup orphaned transactions" },
      { status: 500 }
    );
  }
}
