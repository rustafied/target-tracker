"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Target as TargetIcon, Calendar, Crosshair, Zap, Eye, Ruler, TrendingUp, Edit, Tag as TagIconLucide, FileText, Trash2, Maximize2, Upload, Image as ImageIcon, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "@/components/TagSelector";
import { InteractiveTargetInput } from "@/components/InteractiveTargetInput";
import { TargetUploadModal } from "@/components/TargetUploadModal";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { LoadingScreen } from "@/components/ui/spinner";
import { EChart } from "@/components/analytics/EChart";
import { FadeIn } from "@/components/ui/fade-in";
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
  targetTemplateId?: {
    _id: string;
    name: string;
    render?: {
      type: string;
      svgMarkup?: string;
      imageUrl?: string;
    };
    aimPoints: AimPoint[];
  };
}

interface AimPoint {
  id: string;
  name: string;
  order: number;
  centerX: number;
  centerY: number;
  interactiveRadius?: number;
  tags?: string[];
}

interface ShotPosition {
  x: number;
  y: number;
  score: number;
}

interface BullRecord {
  _id: string;
  bullIndex: number; // Legacy: 1-6
  aimPointId?: string; // New: e.g., "bull-1"
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
  shotPositions?: ShotPosition[];
  imageUrl?: string;
  imageUploadedAt?: Date;
  detectedShotCount?: number;
}

export default function SheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sheetId = params.sheetId as string;

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [bulls, setBulls] = useState<BullRecord[]>([]);
  const [shotPositions, setShotPositions] = useState<{ [key: number]: ShotPosition[] }>({});
  const [expandedBulls, setExpandedBulls] = useState<{ [key: number]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageBull, setSelectedImageBull] = useState<BullRecord | null>(null);
  const [progressionData, setProgressionData] = useState<any>(null);
  
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

  useEffect(() => {
    if (sheet) {
      fetchProgressionData();
    }
  }, [sheet]);

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

  const fetchProgressionData = async () => {
    try {
      // Wait for sheet to be loaded to get firearm ID
      if (!sheet) return;
      
      const firearmId = sheet.firearmId._id;
      const res = await fetch(`/api/analytics/progression?firearmId=${firearmId}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setProgressionData(data);
      }
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
        
        // Get aim points from template (or fallback to hardcoded 6 bulls for old sheets)
        const aimPoints = data.sheet.targetTemplateId?.aimPoints || 
          // Fallback for sheets without templates
          Array.from({ length: 6 }, (_, i) => ({
            id: `bull-${i + 1}`,
            name: `Bull ${i + 1}`,
            order: i + 1,
            centerX: 100,
            centerY: 100,
          }));
        
        // Map existing bulls
        const existingBulls = data.bulls || [];
        const bullsMap = new Map<number, BullRecord>(existingBulls.map((b: BullRecord) => [b.bullIndex, b]));
        
        const allBulls: BullRecord[] = [];
        const initialShotPositions: { [key: number]: ShotPosition[] } = {};
        
        // Create bulls based on template aim points
        aimPoints.forEach((aimPoint: AimPoint, index: number) => {
          const bullIndex = aimPoint.order || (index + 1);
          
          if (bullsMap.has(bullIndex)) {
            const bull = bullsMap.get(bullIndex)!;
            
            // Initialize shot positions if available
            const positions = bull.shotPositions || [];
            initialShotPositions[bullIndex] = positions;
            
            // Add bull with shot positions
            allBulls.push({
              ...bull,
              aimPointId: aimPoint.id,
              shotPositions: positions,
            });
          } else {
            // Create a temporary bull record for the UI
            allBulls.push({
              _id: `temp-${bullIndex}`,
              bullIndex,
              aimPointId: aimPoint.id,
              score5Count: 0,
              score4Count: 0,
              score3Count: 0,
              score2Count: 0,
              score1Count: 0,
              score0Count: 0,
              shotPositions: [],
            });
            initialShotPositions[bullIndex] = [];
          }
        });
        
        setBulls(allBulls);
        setShotPositions(initialShotPositions);
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

  const clearBull = async (bullIndex: number) => {
    const bull = bulls.find((b) => b.bullIndex === bullIndex);
    if (!bull) return;

    // If the bull exists in the database (has a real _id), delete it
    if (bull._id && !bull._id.startsWith('temp-')) {
      try {
        const res = await fetch(`/api/bulls/${bull._id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          toast.success(`Bull ${bullIndex} cleared`);
        } else {
          toast.error("Failed to clear bull from database");
        }
      } catch (error) {
        toast.error("Failed to clear bull");
      }
    }

    // Reset the bull in UI
    setBulls((prev) =>
      prev.map((b) =>
        b.bullIndex === bullIndex
          ? {
              ...b,
              score5Count: 0,
              score4Count: 0,
              score3Count: 0,
              score2Count: 0,
              score1Count: 0,
              score0Count: 0,
              shotPositions: undefined,
            }
          : b
      )
    );

    // Clear shot positions
    setShotPositions((prev) => ({ ...prev, [bullIndex]: [] }));
  };

  const undoLastShot = (bullIndex: number) => {
    const positions = shotPositions[bullIndex] || [];
    if (positions.length === 0) return;

    // Remove the last shot
    const newPositions = positions.slice(0, -1);
    handleShotPositionsChange(bullIndex, newPositions);
    toast.success("Last shot removed");
  };

  const handleShotPositionsChange = (bullIndex: number, positions: ShotPosition[]) => {
    // Update shot positions
    setShotPositions(prev => ({ ...prev, [bullIndex]: positions }));
    
    // Calculate counts from positions
    const counts = {
      score5Count: 0,
      score4Count: 0,
      score3Count: 0,
      score2Count: 0,
      score1Count: 0,
      score0Count: 0,
    };
    
    positions.forEach(pos => {
      switch (pos.score) {
        case 5: counts.score5Count++; break;
        case 4: counts.score4Count++; break;
        case 3: counts.score3Count++; break;
        case 2: counts.score2Count++; break;
        case 1: counts.score1Count++; break;
        case 0: counts.score0Count++; break;
      }
    });
    
    // Update bulls with new counts
    setBulls((prev) =>
      prev.map((bull) =>
        bull.bullIndex === bullIndex
          ? { ...bull, ...counts, shotPositions: positions }
          : bull
      )
    );
  };

  const handleShotsDetected = (bullIndex: number, detectedShots: ShotPosition[], imageUrl: string) => {
    // Merge detected shots with existing shots
    const existingShots = shotPositions[bullIndex] || [];
    const mergedShots = [...existingShots, ...detectedShots];
    
    // Update shot positions
    handleShotPositionsChange(bullIndex, mergedShots);
    
    // Update bull record with image info
    setBulls((prev) =>
      prev.map((bull) =>
        bull.bullIndex === bullIndex
          ? {
              ...bull,
              imageUrl,
              imageUploadedAt: new Date(),
              detectedShotCount: detectedShots.length,
            }
          : bull
      )
    );
    
    toast.success(`Added ${detectedShots.length} shots to Bull ${bullIndex}`);
  };

  const handleViewImage = (bull: BullRecord) => {
    setSelectedImageBull(bull);
    setImageViewerOpen(true);
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
            shotPositions: shotPositions[bull.bullIndex]?.length > 0 ? shotPositions[bull.bullIndex] : undefined,
            imageUrl: bull.imageUrl,
            imageUploadedAt: bull.imageUploadedAt,
            detectedShotCount: bull.detectedShotCount,
          }))
        ),
      });

      if (res.ok) {
        toast.success("Scores saved");
        fetchSheet();
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
    return (
      <div>
        {/* Header with buttons */}
        <div className="flex items-center justify-between mb-6 animate-pulse">
          <div className="h-10 w-32 bg-[#2a2a2a] rounded"></div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-[#2a2a2a] rounded"></div>
            <div className="h-10 w-24 bg-[#2a2a2a] rounded"></div>
            <div className="h-10 w-32 bg-[#2a2a2a] rounded"></div>
          </div>
        </div>

        {/* Progression Chart */}
        <Card className="mb-6 animate-pulse">
          <CardHeader>
            <div className="h-6 w-64 bg-[#2a2a2a] rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-[#1a1a1a] rounded flex items-center justify-center">
              <div className="h-24 w-24 bg-[#2a2a2a] rounded"></div>
            </div>
          </CardContent>
        </Card>

        {/* Sheet Info Card */}
        <Card className="mb-6 animate-pulse">
          <CardHeader>
            <div className="h-6 w-40 bg-[#2a2a2a] rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-20 bg-[#2a2a2a] rounded mb-1"></div>
                  <div className="h-5 w-24 bg-[#2a2a2a] rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bulls/Targets */}
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-6 w-32 bg-[#2a2a2a] rounded"></div>
                  <div className="h-8 w-24 bg-[#2a2a2a] rounded"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Target visualization area */}
                  <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] aspect-square flex items-center justify-center">
                    <div className="h-48 w-48 bg-[#2a2a2a] rounded-full"></div>
                  </div>
                  {/* Score input area */}
                  <div className="space-y-4">
                    <div className="h-10 w-full bg-[#2a2a2a] rounded"></div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j} className="h-16 bg-[#2a2a2a] rounded"></div>
                      ))}
                    </div>
                    <div className="h-24 bg-[#2a2a2a] rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!sheet) {
    return null;
  }

  const totalShots = bulls.reduce((sum, bull) => {
    const metrics = calculateBullMetrics(bull as any);
    return sum + metrics.totalShots;
  }, 0);

  const totalScore = bulls.reduce((sum, bull) => {
    const metrics = calculateBullMetrics(bull as any);
    return sum + metrics.totalScore;
  }, 0);

  const averageScore = totalShots > 0 ? (totalScore / totalShots).toFixed(2) : "0.00";

  // Generate chart option for progression
  const getProgressionChartOption = () => {
    if (!progressionData?.firearms || progressionData.firearms.length === 0) {
      return null;
    }

    // Get the current firearm's data (should only be one)
    const currentFirearm = progressionData.firearms[0];
    if (!currentFirearm || !currentFirearm.sheets || currentFirearm.sheets.length === 0) {
      return null;
    }

    // Use the firearm's color from the sheet
    const firearmColor = sheet?.firearmId?.color || "#3b82f6";

    const series = [{
      name: currentFirearm.firearmName,
      type: "line" as const,
      data: currentFirearm.sheets.map((s: any) => parseFloat(s.averageScore.toFixed(2))),
      smooth: true,
      symbol: "circle" as const,
      symbolSize: 8,
      color: firearmColor,
      lineStyle: {
        width: 3,
      },
      emphasis: {
        focus: "series" as const,
      },
    }];

    // Create x-axis labels showing most recent sheets (oldest to newest, with most recent labeled differently)
    const sheetCount = currentFirearm.sheets.length;
    const xAxisData = currentFirearm.sheets.map((s: any, i: number) => {
      if (i === sheetCount - 1) {
        return "Current";
      }
      const position = sheetCount - i - 1;
      return `-${position}`;
    });

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: {
          type: "cross" as const,
        },
        formatter: (params: any) => {
          if (params && params[0]) {
            const param = params[0];
            const index = param.dataIndex;
            const sheetData = currentFirearm.sheets[index];
            return `${param.marker}${param.seriesName}<br/>Score: ${param.value}<br/>Date: ${new Date(sheetData.date).toLocaleDateString()}`;
          }
          return "";
        },
      },
      grid: {
        left: 60,
        right: 30,
        top: 30,
        bottom: 60,
      },
      xAxis: {
        type: "category" as const,
        data: xAxisData,
        name: "Sheet History (Relative Position)",
        nameLocation: "middle" as const,
        nameGap: 30,
      },
      yAxis: {
        type: "value" as const,
        name: "Average Score",
        nameLocation: "middle" as const,
        nameGap: 45,
        min: 0,
        max: 5,
      },
      series,
    };
  };

  const progressionChartOption = getProgressionChartOption();

  return (
    <div>
      <FadeIn duration={200}>
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => sheet && router.push(`/sessions/${sheet.rangeSessionId.slug || sheet.rangeSessionId._id}`)}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Session</span>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit Sheet</span>
            </Button>
            <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{saving ? "Saving..." : "Save Scores"}</span>
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Progression Chart */}
      {progressionChartOption && (
        <FadeIn delay={100} duration={250}>
          <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance History - {sheet.firearmId.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Last 20 sheets across all sessions</p>
          </CardHeader>
          <CardContent>
            <EChart option={progressionChartOption} height={300} />
          </CardContent>
        </Card>
        </FadeIn>
      )}

      <FadeIn delay={150} duration={250}>
        <Card className="mb-6">
        <CardHeader>
          <CardTitle>{sheet.sheetLabel || "Target Sheet"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
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
                <TargetIcon className="h-3 w-3" />
                Target Type
              </p>
              <p className="font-medium">{sheet.targetTemplateId?.name || "Six Bull (Default)"}</p>
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
      </FadeIn>

      {/* Bulls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bulls.map((bull, index) => {
          const metrics = calculateBullMetrics(bull as any);
          return (
            <FadeIn key={bull._id} delay={200 + index * 50} duration={250}>
              <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {sheet?.targetTemplateId?.aimPoints?.find(ap => ap.id === bull.aimPointId)?.name || `Bull ${bull.bullIndex}`}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{metrics.totalShots} shots</p>
                  </div>
                  <div className="flex gap-2">
                    {(shotPositions[bull.bullIndex]?.length || 0) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => undoLastShot(bull.bullIndex)}
                        className="sm:px-3"
                      >
                        <Undo2 className="h-4 w-4" />
                        <span className="hidden sm:inline sm:ml-2">Undo</span>
                      </Button>
                    )}
                    {metrics.totalShots > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearBull(bull.bullIndex)}
                        className="sm:px-3"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline sm:ml-2">Clear</span>
                      </Button>
                    )}
                    {bull.imageUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewImage(bull)}
                        className="sm:px-3"
                      >
                        <ImageIcon className="h-4 w-4" />
                        <span className="hidden sm:inline sm:ml-2">View</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedBulls((prev) => ({ ...prev, [bull.bullIndex]: true }))}
                      className="sm:px-3"
                    >
                      <Maximize2 className="h-4 w-4" />
                      <span className="hidden sm:inline sm:ml-2">Expand</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  {/* Interactive Target Input */}
                  <div className="w-full max-w-md">
                    <InteractiveTargetInput
                      shots={shotPositions[bull.bullIndex] || []}
                      onShotsChange={(positions) => handleShotPositionsChange(bull.bullIndex, positions)}
                      bullIndex={bull.bullIndex}
                      isExpanded={expandedBulls[bull.bullIndex] || false}
                      setIsExpanded={(value) => setExpandedBulls((prev) => ({ ...prev, [bull.bullIndex]: value }))}
                      template={sheet.targetTemplateId as any}
                      aimPointId={bull.aimPointId}
                    />
                  </div>

                  {/* Metrics */}
                  <div className="w-full grid grid-cols-3 gap-4 text-sm border-t pt-4">
                    <div className="text-center">
                      <p className="text-muted-foreground">Total Shots</p>
                      <p className="text-xl font-bold">{metrics.totalShots}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Total Score</p>
                      <p className="text-xl font-bold">{metrics.totalScore}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Average</p>
                      <p className="text-xl font-bold">{metrics.averagePerShot.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </FadeIn>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save All Scores"}
        </Button>
      </div>

      {/* Upload Modal */}
      <TargetUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        sheetId={sheetId}
        onShotsDetected={handleShotsDetected}
      />

      {/* Image Viewer Modal */}
      {selectedImageBull && (
        <ImageViewerModal
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          imageUrl={selectedImageBull.imageUrl || ""}
          bullIndex={selectedImageBull.bullIndex}
          shotCount={selectedImageBull.detectedShotCount}
          bullId={selectedImageBull._id}
          onImageDeleted={() => {
            // Refresh the sheet data to update UI
            fetchSheet();
          }}
        />
      )}

      {/* Edit Sheet Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
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
