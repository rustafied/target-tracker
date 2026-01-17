import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AmmoTransaction } from "@/lib/models/AmmoTransaction";
import { AmmoInventory } from "@/lib/models/AmmoInventory";
import { Caliber } from "@/lib/models/Caliber";
import { requireUserId } from "@/lib/auth-helpers";
import mongoose from "mongoose";

// GET /api/ammo/inventory-history - Get inventory levels over time for each caliber
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await requireUserId(req);
    const userIdString = userId.toString();
    
    // Ensure models are registered
    void Caliber;
    void AmmoInventory;

    // Get current inventory for all calibers
    const currentInventory = await AmmoInventory.find({ userId: userIdString }).populate('caliberId');
    
    // Get all transactions, sorted by date (oldest first)
    const transactions = await AmmoTransaction.find({ userId: userIdString })
      .sort({ createdAt: 1 })
      .lean();

    // Build inventory history for each caliber
    const caliberHistory = new Map<string, Array<{ date: string; inventory: number }>>();
    const caliberCurrentInventory = new Map<string, number>();
    
    // Initialize with current inventory
    currentInventory.forEach((inv: any) => {
      const caliberId = inv.caliberId._id.toString();
      caliberCurrentInventory.set(caliberId, inv.onHand);
      caliberHistory.set(caliberId, []);
    });

    // Calculate inventory at each transaction point by working backwards
    const caliberRunningTotal = new Map<string, number>();
    
    // Initialize running totals with current inventory
    currentInventory.forEach((inv: any) => {
      caliberRunningTotal.set(inv.caliberId._id.toString(), inv.onHand);
    });

    // Process transactions in reverse to calculate historical inventory
    const reversedTransactions = [...transactions].reverse();
    const inventorySnapshots = new Map<string, Array<{ date: Date; inventory: number }>>();
    
    reversedTransactions.forEach((tx) => {
      const caliberId = tx.caliberId.toString();
      const currentLevel = caliberRunningTotal.get(caliberId) || 0;
      
      if (!inventorySnapshots.has(caliberId)) {
        inventorySnapshots.set(caliberId, []);
      }
      
      // Record inventory level BEFORE this transaction
      const inventoryBeforeTx = currentLevel - tx.delta;
      inventorySnapshots.get(caliberId)!.push({
        date: new Date(tx.createdAt),
        inventory: currentLevel, // Inventory AFTER this transaction
      });
      
      // Update running total (going backwards)
      caliberRunningTotal.set(caliberId, inventoryBeforeTx);
    });

    // Reverse the snapshots to get chronological order and format
    const result: Array<{
      _id: string;
      caliberName: string;
      history: Array<{ date: string; inventory: number }>;
    }> = [];

    currentInventory.forEach((inv: any) => {
      const caliberId = inv.caliberId._id.toString();
      const snapshots = inventorySnapshots.get(caliberId) || [];
      
      // Reverse to get chronological order
      const chronologicalHistory = snapshots.reverse();
      
      // Add current inventory as the latest point
      chronologicalHistory.push({
        date: new Date(),
        inventory: inv.onHand,
      });

      result.push({
        _id: caliberId,
        caliberName: inv.caliberId.name,
        history: chronologicalHistory.map(s => ({
          date: s.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          inventory: s.inventory,
        })),
      });
    });

    return NextResponse.json({ calibers: result });
  } catch (error) {
    console.error("Error fetching inventory history:", error);
    return NextResponse.json({ error: "Failed to fetch inventory history" }, { status: 500 });
  }
}
