import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RangeSession } from "@/lib/models/RangeSession";
import { TargetSheet } from "@/lib/models/TargetSheet";
import { BullRecord } from "@/lib/models/BullRecord";
import { Firearm } from "@/lib/models/Firearm";
import { Caliber } from "@/lib/models/Caliber";
import { Optic } from "@/lib/models/Optic";
import { TargetTemplate } from "@/lib/models/TargetTemplate";
import { calculateBullMetrics } from "@/lib/metrics";

interface SheetWithMetrics {
  _id: string;
  firearmId: string;
  firearmName: string;
  createdAt: Date;
  distanceYards: number;
  averageScore: number;
  totalShots: number;
  totalScore: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    await connectToDatabase();

    // Ensure models are registered
    void Firearm;
    void Caliber;
    void Optic;
    void TargetTemplate;

    // Build query - filter by session if provided
    const query: any = {};
    if (sessionId) {
      query.rangeSessionId = sessionId;
    }

    // Fetch sheets with populated firearm info
    const sheets = await TargetSheet.find(query)
      .populate("firearmId", "name")
      .sort({ createdAt: 1 });

    // Calculate metrics for each sheet
    const sheetsWithMetrics: SheetWithMetrics[] = await Promise.all(
      sheets.map(async (sheet) => {
        const bulls = await BullRecord.find({ targetSheetId: sheet._id });
        
        let totalShots = 0;
        let totalScore = 0;

        bulls.forEach((bull) => {
          const metrics = calculateBullMetrics(bull as any);
          totalShots += metrics.totalShots;
          totalScore += metrics.totalScore;
        });

        const averageScore = totalShots > 0 ? totalScore / totalShots : 0;

        return {
          _id: sheet._id.toString(),
          firearmId: (sheet.firearmId as any)._id.toString(),
          firearmName: (sheet.firearmId as any).name,
          createdAt: sheet.createdAt,
          distanceYards: sheet.distanceYards,
          averageScore,
          totalShots,
          totalScore,
        };
      })
    );

    // Filter out sheets with no shots
    const validSheets = sheetsWithMetrics.filter(s => s.totalShots > 0);

    // Group by firearm
    const groupedByFirearm = validSheets.reduce((acc, sheet) => {
      if (!acc[sheet.firearmId]) {
        acc[sheet.firearmId] = {
          firearmId: sheet.firearmId,
          firearmName: sheet.firearmName,
          sheets: [],
        };
      }
      acc[sheet.firearmId].sheets.push(sheet);
      return acc;
    }, {} as Record<string, { firearmId: string; firearmName: string; sheets: SheetWithMetrics[] }>);

    // Convert to array and sort sheets within each firearm chronologically
    const firearms = Object.values(groupedByFirearm).map(group => ({
      ...group,
      sheets: group.sheets.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }));

    return NextResponse.json({ firearms });
  } catch (error) {
    console.error("Error fetching progression data:", error);
    return NextResponse.json({ error: "Failed to fetch progression data" }, { status: 500 });
  }
}
