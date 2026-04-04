import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { recalculateOnHand } from "@/lib/ammo-reconciliation";

export async function POST() {
  try {
    await connectToDatabase();

    // Find all session_deduct transactions
    const transactions = await AmmoTransaction.find({ reason: "session_deduct" }).lean();

    const orphaned = [];

    for (const tx of transactions) {
      const sheet = await TargetSheet.findById(tx.sheetId).lean();
      if (!sheet) {
        orphaned.push(tx);
      }
    }

    console.log(`Found ${orphaned.length} orphaned transactions`);

    // Track calibers that need recalculation
    const caliberUserPairs = new Set<string>();

    // Delete orphaned transactions
    for (const tx of orphaned) {
      await AmmoTransaction.deleteOne({ _id: tx._id });
      caliberUserPairs.add(`${tx.userId}|${tx.caliberId.toString()}`);
      console.log(`Cleaned up orphaned transaction: ${tx._id}`);
    }

    // Recalculate onHand for affected calibers
    for (const pair of caliberUserPairs) {
      const [userId, caliberId] = pair.split("|");
      await recalculateOnHand(userId, caliberId);
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
