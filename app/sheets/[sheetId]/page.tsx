"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Copy, Target as TargetIcon, Calendar, Crosshair, Zap, Eye, Ruler, TrendingUp, Edit, Tag as TagIconLucide, FileText } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CountButtons } from "@/components/CountButtons";
import { TagSelector } from "@/components/TagSelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { calculateBullMetrics } from "@/lib/metrics";

interface Sheet {
  _id: string;
  firearmId: { _id: string; name: string; caliberIds?: string[]; opticIds?: string[] };
  caliberId: { _id: string; name: string };
  opticId: { _id: string; name: string };
  distanceYards: number;
  sheetLabel?: string;
  notes?: string;
  rangeSessionId: { _id: string; slug?: string; date: string };
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [firearms, setFirearms] = useState<{ _id: string; name: string; caliberIds?: string[]; opticIds?: string[] }[]>([]);
  const [allOptics, setAllOptics] = useState<{ _id: string; name: string }[]>([]);
  const [allCalibers, setAllCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [filteredOptics, setFilteredOptics] = useState<{ _id: string; name: string }[]>([]);
  const [filteredCalibers, setFilteredCalibers] = useState<{ _id: string; name: string }[]>([]);

  const [editFormData, setEditFormData] = useState({
    firearmId: "",
    caliberId: "",
    opticId: "",
    distanceYards: "",
    sheetLabel: "",
    notes: "",
  });

  useEffect(() => {
    if (sheetId) {
      fetchSheet();
      fetchReferenceData();
    }
  }, [sheetId]);

  const fetchReferenceData = async () => {
    try {
      const [firearmsRes, opticsRes, calibersRes] = await Promise.all([
        fetch("/api/firearms"),
        fetch("/api/optics"),
        fetch("/api/calibers"),
      ]);

      if (firearmsRes.ok) setFirearms(await firearmsRes.json());
      if (opticsRes.ok) setAllOptics(await opticsRes.json());
      if (calibersRes.ok) setAllCalibers(await calibersRes.json());
    } catch (error) {
      // Silent fail
    }
  };

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

  const openEditDialog = () => {
    if (sheet) {
      setEditFormData({
        firearmId: sheet.firearmId._id,
        caliberId: sheet.caliberId._id,
        opticId: sheet.opticId._id,
        distanceYards: sheet.distanceYards.toString(),
        sheetLabel: sheet.sheetLabel || "",
        notes: sheet.notes || "",
      });

      // Filter optics and calibers based on firearm
      const selectedFirearm = firearms.find((f) => f._id === sheet.firearmId._id);
      if (selectedFirearm) {
        const filteredOpts = selectedFirearm.opticIds && selectedFirearm.opticIds.length > 0
          ? allOptics.filter((o) => selectedFirearm.opticIds!.includes(o._id))
          : allOptics;
        
        const filteredCals = selectedFirearm.caliberIds && selectedFirearm.caliberIds.length > 0
          ? allCalibers.filter((c) => selectedFirearm.caliberIds!.includes(c._id))
          : allCalibers;

        setFilteredOptics(filteredOpts);
        setFilteredCalibers(filteredCals);
      } else {
        setFilteredOptics(allOptics);
        setFilteredCalibers(allCalibers);
      }

      setEditDialogOpen(true);
    }
  };

  const handleFirearmChange = (firearmId: string) => {
    const selectedFirearm = firearms.find((f) => f._id === firearmId);
    if (selectedFirearm) {
      const filteredOpts = selectedFirearm.opticIds && selectedFirearm.opticIds.length > 0
        ? allOptics.filter((o) => selectedFirearm.opticIds!.includes(o._id))
        : allOptics;
      
      const filteredCals = selectedFirearm.caliberIds && selectedFirearm.caliberIds.length > 0
        ? allCalibers.filter((c) => selectedFirearm.caliberIds!.includes(c._id))
        : allCalibers;

      setFilteredOptics(filteredOpts);
      setFilteredCalibers(filteredCals);

      setEditFormData((prev) => ({
        ...prev,
        firearmId,
        opticId: filteredOpts.length > 0 ? filteredOpts[0]._id : "",
        caliberId: filteredCals.length > 0 ? filteredCals[0]._id : "",
      }));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/sheets/${sheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          distanceYards: parseInt(editFormData.distanceYards),
        }),
      });

      if (res.ok) {
        toast.success("Sheet updated");
        setEditDialogOpen(false);
        fetchSheet();
      } else {
        toast.error("Failed to update sheet");
      }
    } catch (error) {
      toast.error("Failed to update sheet");
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
        router.push(`/sessions/${sheet.rangeSessionId.slug || sheet.rangeSessionId._id}`);
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
        <Button variant="ghost" onClick={() => router.push(`/sessions/${sheet.rangeSessionId.slug || sheet.rangeSessionId._id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Session
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEditDialog}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Sheet
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Scores"}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{sheet.sheetLabel || "Target Sheet"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date
              </p>
              <p className="font-medium">{format(new Date(sheet.rangeSessionId.date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <TargetIcon className="h-3 w-3" />
                Firearm
              </p>
              <p className="font-medium">{sheet.firearmId.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Caliber
              </p>
              <p className="font-medium">{sheet.caliberId.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Optic
              </p>
              <p className="font-medium">{sheet.opticId.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                Distance
              </p>
              <p className="font-medium">{sheet.distanceYards} yards</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Crosshair className="h-3 w-3" />
                Total Shots
              </p>
              <p className="font-medium">{totalShots}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Total Score
              </p>
              <p className="font-medium">{totalScore}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Average
              </p>
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

      {/* Edit Sheet Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Target Sheet</DialogTitle>
            <DialogDescription>Update sheet details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-6 py-4">
              <TagSelector
                items={firearms}
                selectedId={editFormData.firearmId}
                onSelect={handleFirearmChange}
                label="Firearm"
                required
              />

              <TagSelector
                items={filteredCalibers}
                selectedId={editFormData.caliberId}
                onSelect={(id) => setEditFormData({ ...editFormData, caliberId: id })}
                label="Caliber"
                required
              />

              <TagSelector
                items={filteredOptics}
                selectedId={editFormData.opticId}
                onSelect={(id) => setEditFormData({ ...editFormData, opticId: id })}
                label="Optic"
                required
              />

              <div>
                <Label htmlFor="edit-distance" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Distance (yards) *
                </Label>
                <Input
                  id="edit-distance"
                  type="number"
                  value={editFormData.distanceYards}
                  onChange={(e) => setEditFormData({ ...editFormData, distanceYards: e.target.value })}
                  required
                  min="1"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-sheetLabel" className="flex items-center gap-2">
                  <TagIconLucide className="h-4 w-4" />
                  Sheet Label
                </Label>
                <Input
                  id="edit-sheetLabel"
                  value={editFormData.sheetLabel}
                  onChange={(e) => setEditFormData({ ...editFormData, sheetLabel: e.target.value })}
                  placeholder="e.g., Zeroing, Group Practice"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-notes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </Label>
                <Textarea
                  id="edit-notes"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Additional notes about this sheet..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Sheet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
