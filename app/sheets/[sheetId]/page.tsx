"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Copy } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountButtons } from "@/components/CountButtons";
import { toast } from "sonner";
import { calculateBullMetrics } from "@/lib/metrics";

interface Sheet {
  _id: string;
  firearmId: { name: string };
  caliberId: { name: string };
  opticId: { name: string };
  distanceYards: number;
  sheetLabel?: string;
  notes?: string;
  rangeSessionId: { _id: string; date: string };
}

interface BullRecord {
  _id: string;
  bullIndex: number;
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
}

export default function SheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sheetId = params.sheetId as string;

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [bulls, setBulls] = useState<BullRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sheetId) {
      fetchSheet();
    }
  }, [sheetId]);

  const fetchSheet = async () => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}`);
      if (res.ok) {
        const data = await res.json();
        setSheet(data.sheet);
        setBulls(data.bulls);
      } else {
        toast.error("Sheet not found");
        router.push("/sessions");
      }
    } catch (error) {
      toast.error("Failed to load sheet");
    } finally {
      setLoading(false);
    }
  };

  const updateBull = (bullIndex: number, field: keyof BullRecord, value: number) => {
    setBulls((prev) =>
      prev.map((bull) =>
        bull.bullIndex === bullIndex ? { ...bull, [field]: value } : bull
      )
    );
  };

  const copyBull = (fromIndex: number, toIndex: number) => {
    const fromBull = bulls.find((b) => b.bullIndex === fromIndex);
    if (!fromBull) return;

    setBulls((prev) =>
      prev.map((bull) =>
        bull.bullIndex === toIndex
          ? {
              ...bull,
              score5Count: fromBull.score5Count,
              score4Count: fromBull.score4Count,
              score3Count: fromBull.score3Count,
              score2Count: fromBull.score2Count,
              score1Count: fromBull.score1Count,
              score0Count: fromBull.score0Count,
            }
          : bull
      )
    );
    toast.success(`Copied Bull ${fromIndex} to Bull ${toIndex}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/bulls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          bulls.map((bull) => ({
            targetSheetId: sheetId,
            bullIndex: bull.bullIndex,
            score5Count: bull.score5Count,
            score4Count: bull.score4Count,
            score3Count: bull.score3Count,
            score2Count: bull.score2Count,
            score1Count: bull.score1Count,
            score0Count: bull.score0Count,
          }))
        ),
      });

      if (res.ok) {
        toast.success("Scores saved");
        fetchSheet(); // Refresh to get updated data
      } else {
        toast.error("Failed to save scores");
      }
    } catch (error) {
      toast.error("Failed to save scores");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!sheet) {
    return null;
  }

  const totalShots = bulls.reduce((sum, bull) => {
    const metrics = calculateBullMetrics(bull);
    return sum + metrics.totalShots;
  }, 0);

  const totalScore = bulls.reduce((sum, bull) => {
    const metrics = calculateBullMetrics(bull);
    return sum + metrics.totalScore;
  }, 0);

  const averageScore = totalShots > 0 ? (totalScore / totalShots).toFixed(2) : "0.00";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.push(`/sessions/${sheet.rangeSessionId._id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Session
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Scores"}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{sheet.sheetLabel || "Target Sheet"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(sheet.rangeSessionId.date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Firearm</p>
              <p className="font-medium">{sheet.firearmId.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Caliber</p>
              <p className="font-medium">{sheet.caliberId.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Optic</p>
              <p className="font-medium">{sheet.opticId.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Distance</p>
              <p className="font-medium">{sheet.distanceYards} yards</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Shots</p>
              <p className="font-medium">{totalShots}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Score</p>
              <p className="font-medium">{totalScore}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Average</p>
              <p className="font-medium">{averageScore}</p>
            </div>
          </div>
          {sheet.notes && (
            <p className="text-sm text-muted-foreground mt-4">{sheet.notes}</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {bulls.map((bull, index) => {
          const metrics = calculateBullMetrics(bull);
          return (
            <Card key={bull._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Bull {bull.bullIndex}</CardTitle>
                  {index > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyBull(bulls[index - 1].bullIndex, bull.bullIndex)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Previous
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CountButtons
                  label="5 Points (Center)"
                  value={bull.score5Count}
                  onChange={(v) => updateBull(bull.bullIndex, "score5Count", v)}
                />
                <CountButtons
                  label="4 Points"
                  value={bull.score4Count}
                  onChange={(v) => updateBull(bull.bullIndex, "score4Count", v)}
                />
                <CountButtons
                  label="3 Points"
                  value={bull.score3Count}
                  onChange={(v) => updateBull(bull.bullIndex, "score3Count", v)}
                />
                <CountButtons
                  label="2 Points"
                  value={bull.score2Count}
                  onChange={(v) => updateBull(bull.bullIndex, "score2Count", v)}
                />
                <CountButtons
                  label="1 Point"
                  value={bull.score1Count}
                  onChange={(v) => updateBull(bull.bullIndex, "score1Count", v)}
                />
                <CountButtons
                  label="0 Points (Miss)"
                  value={bull.score0Count}
                  onChange={(v) => updateBull(bull.bullIndex, "score0Count", v)}
                />

                <div className="pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Shots</p>
                    <p className="text-xl font-bold">{metrics.totalShots}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Score</p>
                    <p className="text-xl font-bold">{metrics.totalScore}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Average</p>
                    <p className="text-xl font-bold">{metrics.averagePerShot.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save All Scores"}
        </Button>
      </div>
    </div>
  );
}

