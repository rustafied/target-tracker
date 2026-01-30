"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, MapPin, Plus, Edit, Trash2, Target as TargetIcon, TrendingUp, Crosshair, Eye, Ruler, FileText, Zap, Award, BarChart3, Clock, Package, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { BullseyeVisualization } from "@/components/BullseyeVisualization";
import { SingleBullVisualization } from "@/components/SingleBullVisualization";
import { SessionHeatmap } from "@/components/SessionHeatmap";
import { LoadingScreen } from "@/components/ui/spinner";
import { EChart } from "@/components/analytics/EChart";
import { SequenceAnalysisCard } from "@/components/analytics/SequenceAnalysisCard";
import { ExpandedInsightsPanel, Insight } from "@/components/ExpandedInsightsPanel";
import { FadeIn } from "@/components/ui/fade-in";
import { toast } from "sonner";
import { applyDistanceMultiplier } from "@/lib/analytics-utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

interface BullRecord {
  _id: string;
  bullIndex: number;
  aimPointId?: string;
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
  totalShots: number;
  totalScore: number;
}

interface AmmoTransaction {
  _id: string;
  caliberId: { _id: string; name: string; shortCode?: string };
  delta: number;
  reason: string;
  createdAt: string;
}

interface RangeSession {
  _id: string;
  slug: string;
  date: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

interface Sheet {
  _id: string;
  slug?: string;
  firearmId: { _id: string; name: string; color?: string };
  caliberId: { _id: string; name: string };
  opticId: { _id: string; name: string };
  distanceYards: number;
  sheetLabel?: string;
  notes?: string;
  bulls: BullRecord[];
  targetTemplateId?: {
    _id: string;
    name: string;
    render?: {
      type: string;
      svgMarkup?: string;
      imageUrl?: string;
    };
    aimPoints?: Array<{
      id: string;
      name: string;
    }>;
  };
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<RangeSession | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [ammoTransactions, setAmmoTransactions] = useState<AmmoTransaction[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteSheetDialogOpen, setDeleteSheetDialogOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);
  const [selectedFirearmId, setSelectedFirearmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    startTime: "",
    endTime: "",
    notes: "",
  });

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchLocations();
      fetchAllSessions();
      fetchInsights();
    }
  }, [sessionId]);

  const fetchInsights = async () => {
    try {
      console.log(`[fetchInsights] Fetching insights for session: ${sessionId}`);
      setInsightsLoading(true);
      const res = await fetch(`/api/insights/session/${sessionId}`);
      console.log(`[fetchInsights] Response status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`[fetchInsights] Insights data:`, data);
        setInsights(data.insights || []);
      } else {
        const errorText = await res.text();
        console.error(`[fetchInsights] Error response:`, errorText);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      // Silent fail for locations
    }
  };

  const fetchAllSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setAllSessions(data.sessions || []);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setSheets(data.sheets);
        setAmmoTransactions(data.ammoTransactions || []);
      } else {
        toast.error("Session not found");
        router.push("/sessions");
      }
    } catch (error) {
      toast.error("Failed to load session");
    } finally{
      setLoading(false);
    }
  };

  const openEditDialog = async () => {
    if (session) {
      // Fetch fresh session data before opening dialog
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            date: format(new Date(data.session.date), "yyyy-MM-dd"),
            location: data.session.location || "",
            startTime: data.session.startTime || "",
            endTime: data.session.endTime || "",
            notes: data.session.notes || "",
          });
          setEditDialogOpen(true);
        }
      } catch (error) {
        // Fallback to current state if fetch fails
        setFormData({
          date: format(new Date(session.date), "yyyy-MM-dd"),
          location: session.location || "",
          startTime: session.startTime || "",
          endTime: session.endTime || "",
          notes: session.notes || "",
        });
        setEditDialogOpen(true);
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Session updated");
        setEditDialogOpen(false);
        fetchSession();
      } else {
        toast.error("Failed to update session");
      }
    } catch (error) {
      toast.error("Failed to update session");
    }
  };

  const handleDeleteSession = async () => {
    if (!confirm("Delete this session and all its sheets?")) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Session deleted");
        router.push("/sessions");
      } else {
        toast.error("Failed to delete session");
      }
    } catch (error) {
      toast.error("Failed to delete session");
    }
  };

  const openDeleteSheetDialog = (sheet: Sheet) => {
    setSheetToDelete(sheet);
    setDeleteSheetDialogOpen(true);
  };

  const handleDeleteSheet = async () => {
    if (!sheetToDelete) return;

    try {
      const res = await fetch(`/api/sheets/${sheetToDelete._id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Sheet deleted");
        setDeleteSheetDialogOpen(false);
        setSheetToDelete(null);
        fetchSession(); // Refresh the session to update sheets list
      } else {
        toast.error("Failed to delete sheet");
      }
    } catch (error) {
      toast.error("Failed to delete sheet");
    }
  };

  if (loading) {
    return (
      <div>
        {/* Header with title, location, and buttons */}
        <div className="mb-6 animate-pulse">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Just 3 icon boxes on mobile to match the real buttons */}
            <div className="flex gap-2">
              <div className="h-10 w-10 bg-[#2a2a2a] rounded"></div>
              <div className="h-10 w-10 bg-[#2a2a2a] rounded"></div>
              <div className="h-10 w-10 bg-[#2a2a2a] rounded"></div>
            </div>
          </div>
        </div>

        {/* Session Summary Card */}
        <Card className="mb-6 animate-pulse">
          <CardHeader>
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-5 w-5 bg-[#2a2a2a] rounded flex-shrink-0"></div>
              <div className="h-6 w-full max-w-[12rem] bg-[#2a2a2a] rounded"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="min-w-0">
                  <div className="h-4 w-full max-w-[6rem] bg-[#2a2a2a] rounded mb-2"></div>
                  <div className="h-8 w-full max-w-[5rem] bg-[#2a2a2a] rounded mb-1"></div>
                  <div className="h-3 w-full max-w-[4rem] bg-[#2a2a2a] rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session Overview Chart */}
        <Card className="mb-6 animate-pulse">
          <CardHeader>
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-5 w-5 bg-[#2a2a2a] rounded flex-shrink-0"></div>
              <div className="h-6 w-full max-w-[20rem] bg-[#2a2a2a] rounded"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="lg:col-span-2 min-w-0">
                <div className="h-4 w-full max-w-[16rem] bg-[#2a2a2a] rounded mb-3"></div>
                <div className="h-[590px] bg-[#1a1a1a] rounded flex items-center justify-center">
                  <div className="h-32 w-32 bg-[#2a2a2a] rounded"></div>
                </div>
              </div>
              <div className="space-y-6 min-w-0">
                <div className="h-[250px] bg-[#1a1a1a] rounded"></div>
                <div className="h-[280px] bg-[#1a1a1a] rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sheets List */}
        <Card className="mb-6 animate-pulse">
          <CardHeader>
            <div className="h-6 w-24 bg-[#2a2a2a] rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg min-w-0">
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="h-6 w-full max-w-[10rem] bg-[#2a2a2a] rounded"></div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="h-6 w-20 bg-[#2a2a2a] rounded"></div>
                      ))}
                    </div>
                    <div className="h-4 w-full bg-[#2a2a2a] rounded"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-[#2a2a2a] rounded"></div>
                    <div className="h-8 w-8 bg-[#2a2a2a] rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Group sheets by firearm and create chart data
  const firearmColors = [
    "#8b5cf6", // purple
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  // Create a unified dataset with all sheets and their firearm scores
  const sheetsByFirearm = new Map<string, { name: string; sheets: any[] }>();
  
  sheets.forEach((sheet, index) => {
    const firearmId = sheet.firearmId._id;
    const firearmName = sheet.firearmId?.name || "Unknown";
    
    if (!sheetsByFirearm.has(firearmId)) {
      sheetsByFirearm.set(firearmId, { name: firearmName, sheets: [] });
    }
    
    const totalShots = sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0;
    const totalScore = sheet.bulls?.reduce((acc, bull) => acc + bull.totalScore, 0) || 0;
    const avgScore = totalShots > 0 ? parseFloat((totalScore / totalShots).toFixed(2)) : 0;
    
    sheetsByFirearm.get(firearmId)!.sheets.push({
      sheetLabel: sheet.sheetLabel || `Sheet ${index + 1}`,
      avgScore,
      totalShots,
      sheetIndex: index,
    });
  });

  // Create chart data with all sheet labels as x-axis
  const allSheetLabels = sheets.map((sheet, index) => sheet.sheetLabel || `Sheet ${index + 1}`);
  const chartData = allSheetLabels.map((label, index) => {
    const dataPoint: any = { name: label };
    
    // Add score for each firearm if they have a sheet at this position
    Array.from(sheetsByFirearm.entries()).forEach(([firearmId, firearmData]) => {
      const sheet = sheets[index];
      if (sheet && sheet.firearmId._id === firearmId) {
        const totalShots = sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0;
        const totalScore = sheet.bulls?.reduce((acc, bull) => acc + bull.totalScore, 0) || 0;
        const avgScore = totalShots > 0 ? parseFloat((totalScore / totalShots).toFixed(2)) : 0;
        dataPoint[firearmData.name] = avgScore;
      }
    });
    
    return dataPoint;
  });

  // Calculate session summary stats
  const totalBulletsFired = sheets.reduce((sum, sheet) => 
    sum + (sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0), 0
  );

  const totalScore = sheets.reduce((sum, sheet) => 
    sum + (sheet.bulls?.reduce((acc, bull) => acc + bull.totalScore, 0) || 0), 0
  );

  const sessionAvgScore = totalBulletsFired > 0 ? (totalScore / totalBulletsFired).toFixed(2) : "0.00";

  // Calculate bullseye percentage (5 points)
  const total5Points = sheets.reduce((sum, sheet) => 
    sum + (sheet.bulls?.reduce((acc, bull) => acc + bull.score5Count, 0) || 0), 0
  );
  const bullseyePercentage = totalBulletsFired > 0 ? ((total5Points / totalBulletsFired) * 100).toFixed(1) : "0.0";

  // Calculate average score by firearm for this session
  const firearmAvgs = new Map<string, { name: string; avgScore: number; shots: number }>();
  sheets.forEach(sheet => {
    const firearmId = sheet.firearmId._id;
    const firearmName = sheet.firearmId?.name || "Unknown";
    const totalShots = sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0;
    const totalScore = sheet.bulls?.reduce((acc, bull) => acc + bull.totalScore, 0) || 0;

    if (!firearmAvgs.has(firearmId)) {
      firearmAvgs.set(firearmId, { name: firearmName, avgScore: 0, shots: 0 });
    }
    
    const current = firearmAvgs.get(firearmId)!;
    current.shots += totalShots;
    current.avgScore = current.shots > 0 ? (current.avgScore * (current.shots - totalShots) + totalScore) / current.shots : 0;
  });

  // Find best weapon
  let bestWeapon = { name: "N/A", avgScore: 0 };
  firearmAvgs.forEach((data) => {
    if (data.shots > 0 && data.avgScore > bestWeapon.avgScore) {
      bestWeapon = { name: data.name, avgScore: data.avgScore };
    }
  });

  // Calculate improvement vs last session and overall average by firearm
  const firearmImprovements = new Map<string, { vsLast: number | null; vsOverall: number | null }>();
  
  if (allSessions.length > 0) {
    const currentSessionDate = new Date(session.date);
    const previousSessions = allSessions
      .filter(s => s._id !== session._id && new Date(s.date) < currentSessionDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    firearmAvgs.forEach((currentData, firearmId) => {
      // Calculate vs last session
      let lastSessionAvg: number | null = null;
      for (const prevSession of previousSessions) {
        // We'd need to fetch sheets for previous sessions - for now, skip this
        // This would require an API call to get historical data
      }

      // Calculate vs overall average
      // This would also require historical data across all sessions
      
      firearmImprovements.set(firearmId, { vsLast: null, vsOverall: null });
    });
  }

  // Generate chart option for session progression - group by firearm
  const getSessionProgressionChartOption = () => {
    if (sheets.length === 0) return null;

    const defaultColors = [
      "#3b82f6", // blue
      "#22c55e", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#06b6d4", // cyan
      "#ec4899", // pink
      "#14b8a6", // teal
    ];

    // Calculate baseline distance per firearm (each firearm's own average)
    const firearmBaselines = new Map<string, number>();
    
    sheets.forEach(sheet => {
      const firearmId = sheet.firearmId._id;
      if (!firearmBaselines.has(firearmId)) {
        // Calculate this firearm's average distance
        const firearmSheets = sheets.filter(s => s.firearmId._id === firearmId);
        const totalDistance = firearmSheets.reduce((sum, s) => sum + s.distanceYards, 0);
        const avgDistance = firearmSheets.length > 0 ? totalDistance / firearmSheets.length : 25;
        firearmBaselines.set(firearmId, avgDistance);
      }
    });

    // Group sheets by firearm in chronological order, capture colors and distances
    const firearmSheets = new Map<string, { 
      name: string; 
      color: string; 
      sheets: any[]; 
      distanceAdjustedSheets: any[];
      distances: number[];
      baseline: number;
    }>();
    
    sheets.forEach(sheet => {
      const firearmId = sheet.firearmId._id;
      const firearmName = sheet.firearmId.name;
      const firearmColor = sheet.firearmId.color;
      const baseline = firearmBaselines.get(firearmId) || 25;
      
      if (!firearmSheets.has(firearmId)) {
        const assignedColor = firearmColor || defaultColors[firearmSheets.size % defaultColors.length];
        firearmSheets.set(firearmId, { 
          name: firearmName, 
          color: assignedColor,
          sheets: [],
          distanceAdjustedSheets: [],
          distances: [],
          baseline,
        });
      }
      
      const totalShots = sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0;
      const totalScore = sheet.bulls?.reduce((acc, bull) => acc + bull.totalScore, 0) || 0;
      const avgScore = totalShots > 0 ? parseFloat((totalScore / totalShots).toFixed(2)) : 0;
      const distance = sheet.distanceYards || 0;
      
      // Calculate distance-adjusted score using THIS FIREARM'S baseline
      const distanceAdjustedScore = distance > 0 
        ? parseFloat(applyDistanceMultiplier(avgScore, distance, baseline).toFixed(2))
        : avgScore;
      
      firearmSheets.get(firearmId)!.sheets.push(avgScore);
      firearmSheets.get(firearmId)!.distanceAdjustedSheets.push(distanceAdjustedScore);
      firearmSheets.get(firearmId)!.distances.push(distance);
    });

    // Find max sheets for any firearm to set x-axis
    const maxSheets = Math.max(...Array.from(firearmSheets.values()).map(f => f.sheets.length));
    const xAxisLabels = Array.from({ length: maxSheets }, (_, i) => `Sheet ${i + 1}`);

    // Create series for each firearm - both raw and distance-adjusted
    const series: any[] = [];
    
    Array.from(firearmSheets.values()).forEach((firearmData) => {
      // Raw score (solid line)
      series.push({
        name: `${firearmData.name} (Raw)`,
        type: "line" as const,
        data: firearmData.sheets,
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: firearmData.color,
        },
        itemStyle: {
          color: firearmData.color,
        },
        emphasis: {
          focus: "series" as const,
        },
      });

      // Distance-adjusted score (dashed line)
      series.push({
        name: `${firearmData.name} (Distance Adj)`,
        type: "line" as const,
        data: firearmData.distanceAdjustedSheets,
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 6,
        lineStyle: {
          width: 2,
          type: "dashed" as const,
          color: firearmData.color,
        },
        itemStyle: {
          color: firearmData.color,
          opacity: 0.7,
        },
        emphasis: {
          focus: "series" as const,
        },
      });
    });

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: {
          type: "cross" as const,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          
          const sheetIndex = params[0].dataIndex;
          let result = `<b>${params[0].axisValue}</b><br/>`;
          
          // Group by firearm (pairs of raw/adjusted)
          for (let i = 0; i < params.length; i += 2) {
            const rawParam = params[i];
            const adjParam = params[i + 1];
            
            if (rawParam && adjParam && rawParam.value) {
              const firearmData = Array.from(firearmSheets.values())[Math.floor(i / 2)];
              const distance = firearmData?.distances[sheetIndex] || 0;
              const baseline = firearmData?.baseline || 0;
              
              result += `<div style="margin-top: 8px;">`;
              result += `${rawParam.marker}${rawParam.seriesName.replace(' (Raw)', '')}<br/>`;
              result += `<span style="margin-left: 20px;">Raw: ${rawParam.value}</span><br/>`;
              result += `<span style="margin-left: 20px;">Dist Adj: ${adjParam.value || 'N/A'}</span><br/>`;
              result += `<span style="margin-left: 20px; opacity: 0.6;">@ ${distance}yd (baseline: ${baseline.toFixed(0)}yd)</span>`;
              result += `</div>`;
            }
          }
          
          return result;
        },
      },
      legend: {
        data: series.map((s: any) => s.name),
        top: 10,
      },
      grid: {
        left: 60,
        right: 30,
        top: 60,
        bottom: 60,
        containLabel: true,
      },
      xAxis: {
        type: "category" as const,
        data: xAxisLabels,
        name: "Sheet Number (per firearm)",
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

  const sessionProgressionChartOption = getSessionProgressionChartOption();

  return (
    <TooltipProvider delayDuration={0}>
      <div>
        <FadeIn duration={200}>
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Calendar className="h-8 w-8" />
                  {format(new Date(session.date), "MMMM d, yyyy")}
                {session.notes && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="View session notes"
                      >
                        <StickyNote className="h-6 w-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm" side="bottom" align="start">
                      <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </h1>
              {session.location && (
                <p className="text-muted-foreground mt-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {session.location}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push(`/sessions/${sessionId}/sheets/new`)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Sheet</span>
              </Button>
              <Button variant="outline" size="icon" onClick={openEditDialog}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleDeleteSession}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          </div>
        </FadeIn>

      {/* Session Summary Stats */}
      {sheets.length > 0 && totalBulletsFired > 0 && (
        <FadeIn delay={100} duration={250}>
          <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="h-5 w-5" />
              Session Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Crosshair className="h-4 w-4" />
                  Bullets Fired
                </p>
                <p className="text-2xl font-bold">{totalBulletsFired}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <TargetIcon className="h-4 w-4" />
                  Bullseye %
                </p>
                <p className="text-2xl font-bold">{bullseyePercentage}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Avg Score
                </p>
                <p className="text-2xl font-bold">{sessionAvgScore}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  Best Weapon
                </p>
                <p className="text-lg font-bold">{bestWeapon.name}</p>
                <p className="text-xs text-muted-foreground">{bestWeapon.avgScore.toFixed(2)} avg</p>
              </div>
              <div className="col-span-2 md:col-span-4 lg:col-span-1">
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  By Firearm
                </p>
                <div className="space-y-1">
                  {Array.from(firearmAvgs.entries()).map(([id, data]) => (
                    <div key={id} className="text-xs">
                      <span className="font-medium">{data.name}:</span>{" "}
                      <span className="text-muted-foreground">{data.avgScore.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </FadeIn>
      )}

      {/* Sheet Averages Graph */}
      {sheets.length > 0 && sheets.some((s) => (s.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0) > 0) && (
        <FadeIn delay={150} duration={250}>
          <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Session Overview - Comparison by Firearm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Line Chart - 2/3 width on large screens */}
              <div className="lg:col-span-2">
                <h3 className="text-sm font-semibold mb-3">Average Score per Sheet by Firearm</h3>
                {sessionProgressionChartOption && (
                  <div style={{ width: "100%", height: "590px" }}>
                    <EChart option={sessionProgressionChartOption} height="100%" />
                  </div>
                )}
              </div>

              {/* Right column - Heatmap and Ammo */}
              <div className="space-y-6">
                {/* Heatmap */}
                <div className="flex items-center justify-center">
                  <SessionHeatmap sheets={sheets} />
                </div>

                {/* Ammo Usage */}
                {(() => {
                  // Calculate ammo usage from actual sheets and track firearm colors
                  const caliberData: Record<string, { rounds: number; firearmColors: Map<string, number> }> = {};
                  
                  sheets.forEach(sheet => {
                    const caliberName = sheet.caliberId.name;
                    const firearmColor = sheet.firearmId.color || "#3b82f6";
                    const totalShots = sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0;
                    
                    if (!caliberData[caliberName]) {
                      caliberData[caliberName] = { rounds: 0, firearmColors: new Map() };
                    }
                    
                    caliberData[caliberName].rounds += totalShots;
                    const currentCount = caliberData[caliberName].firearmColors.get(firearmColor) || 0;
                    caliberData[caliberName].firearmColors.set(firearmColor, currentCount + totalShots);
                  });

                  // For each caliber, find the firearm color that was used most
                  const chartData = Object.entries(caliberData)
                    .filter(([_, data]) => data.rounds > 0)
                    .map(([name, data]) => {
                      let primaryColor = "#3b82f6";
                      let maxShots = 0;
                      
                      data.firearmColors.forEach((shots, color) => {
                        if (shots > maxShots) {
                          maxShots = shots;
                          primaryColor = color;
                        }
                      });
                      
                      return {
                        name,
                        rounds: data.rounds,
                        fill: primaryColor,
                      };
                    });

                  if (chartData.length === 0) return null;

                  return (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Ammo Used
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="name" stroke="#888" />
                          <YAxis stroke="#888" />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "rgba(0, 0, 0, 0.8)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "6px",
                            }}
                            labelStyle={{ color: "#fff" }}
                            cursor={false}
                          />
                          <Bar dataKey="rounds" name="Rounds Used">
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList dataKey="rounds" position="top" fill="#fff" fontSize={12} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
        </FadeIn>
      )}

      <FadeIn delay={200} duration={250}>
        <h2 className="text-2xl font-bold mb-4">Target Sheets</h2>

        {/* Firearm Filter */}
        {(() => {
        const uniqueFirearms = Array.from(
          new Map(sheets.map(s => [s.firearmId._id, { id: s.firearmId._id, name: s.firearmId.name, color: s.firearmId.color }])).values()
        );
        
        if (uniqueFirearms.length > 2) {
          return (
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge
                variant={selectedFirearmId === null ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedFirearmId === null 
                    ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700" 
                    : "hover:bg-accent"
                }`}
                onClick={() => setSelectedFirearmId(null)}
              >
                All
              </Badge>
              {uniqueFirearms.map((firearm) => {
                const isSelected = selectedFirearmId === firearm.id;
                const firearmColor = firearm.color || "#3b82f6";
                return (
                  <Badge
                    key={firearm.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? "text-white" 
                        : "hover:bg-accent"
                    }`}
                    style={isSelected ? { 
                      backgroundColor: firearmColor,
                      borderColor: firearmColor,
                    } : {}}
                    onClick={() => setSelectedFirearmId(firearm.id)}
                  >
                    {firearm.name}
                  </Badge>
                );
              })}
            </div>
          );
        }
        return null;
      })()}

      {sheets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-6 mb-6">
              <TargetIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Target Sheets Yet</h3>
            <p className="text-center text-muted-foreground mb-6 max-w-md">
              Start recording your shooting session by adding your first target sheet. Track your accuracy with different firearms, calibers, and optics.
            </p>
            <Button onClick={() => router.push(`/sessions/${sessionId}/sheets/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Sheet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {sheets
            .filter(sheet => !selectedFirearmId || sheet.firearmId._id === selectedFirearmId)
            .map((sheet) => {
            // Get original index from full sheets array
            const originalIndex = sheets.findIndex(s => s._id === sheet._id);
            const totalShots = sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0;
            const totalScore = sheet.bulls?.reduce((acc, bull) => acc + bull.totalScore, 0) || 0;
            const avgScore = totalShots > 0 ? (totalScore / totalShots).toFixed(2) : "0.00";
            const firearmColor = sheet.firearmId?.color || "#3b82f6";

            // Data for per-sheet bull scores graph (filter out empty bulls)
            const bullChartData =
              sheet.bulls
                ?.filter((bull) => bull.totalShots > 0)
                .map((bull) => ({
                  name: `Bull ${bull.bullIndex}`,
                  avgScore:
                    bull.totalShots > 0 ? parseFloat((bull.totalScore / bull.totalShots).toFixed(2)) : 0,
                  totalShots: bull.totalShots,
                  totalScore: bull.totalScore,
                })) || [];

            return (
              <Card 
                key={sheet._id}
                style={{ borderLeftColor: firearmColor, borderLeftWidth: '4px' }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{sheet.sheetLabel || `Sheet ${originalIndex + 1}`}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Avg:</span>
                        <span 
                          className="text-2xl font-bold"
                          style={{ color: firearmColor }}
                        >
                          {avgScore}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/sheets/${sheet.slug || sheet._id}`)}
                      >
                        <TargetIcon className="h-4 w-4 mr-2" />
                        <span>View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteSheetDialog(sheet)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <TargetIcon className="h-3 w-3" />
                        <span>Firearm</span>
                      </div>
                      <p className="font-medium" style={{ color: firearmColor }}>
                        {sheet.firearmId?.name || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Crosshair className="h-3 w-3" />
                        <span>Caliber</span>
                      </div>
                      <p className="font-medium">{sheet.caliberId?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Eye className="h-3 w-3" />
                        <span>Optic</span>
                      </div>
                      <p className="font-medium">{sheet.opticId?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Ruler className="h-3 w-3" />
                        <span>Distance</span>
                      </div>
                      <p className="font-medium">{sheet.distanceYards} yards</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Individual Bull Visualizations */}
                    {sheet.bulls && sheet.bulls.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {sheet.bulls
                          .filter((bull) => bull.totalShots > 0)
                          .slice(0, 6)
                          .map((bull) => (
                            <SingleBullVisualization 
                              key={bull.bullIndex} 
                              bull={bull} 
                              size={100}
                              template={sheet.targetTemplateId}
                            />
                          ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Shots</p>
                        <p className="text-xl font-semibold">{totalShots}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Score</p>
                        <p className="text-xl font-semibold">{totalScore}</p>
                      </div>
                    </div>

                    {bullChartData.length > 0 && bullChartData.some((b) => b.totalShots > 0) && (
                      <div className="pt-2">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Scores by Bull
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={bullChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#888" />
                            <YAxis domain={[0, 5]} stroke="#888" />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "rgba(0, 0, 0, 0.8)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "6px",
                              }}
                              labelStyle={{ color: "#fff" }}
                              cursor={false}
                            />
                            <Bar dataKey="avgScore" fill="#3b82f6" name="Avg Score">
                              <LabelList dataKey="avgScore" position="inside" fill="#fff" fontSize={12} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Expanded Insights */}
      {totalBulletsFired >= 5 && (
        <div className="mt-6">
          <ExpandedInsightsPanel
            insights={insights}
            title="Session Insights"
            description="Personalized recommendations and observations for this session"
            loading={insightsLoading}
            maxVisible={5}
          />
        </div>
      )}

      {/* Fatigue & Sequence Analysis */}
      {totalBulletsFired >= 20 && (
        <div className="mt-6">
          <SequenceAnalysisCard
            filters={{ minShots: 10 }}
            sessionIds={[sessionId]}
            title="Shot-by-Shot Performance (This Session)"
            description="Analyze how your performance changes throughout this session"
          />
        </div>
      )}
      </FadeIn>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>Update session details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-6 py-4">
              <div>
                <Label htmlFor="date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="location" className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <LocationAutocomplete
                  value={formData.location}
                  onChange={(value) => setFormData({ ...formData, location: value })}
                  suggestions={locations}
                  placeholder="Select or type location..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime" className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Weather conditions, focus areas, etc."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Session</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Sheet Confirmation Dialog */}
      <Dialog open={deleteSheetDialogOpen} onOpenChange={setDeleteSheetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sheet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sheet? This will permanently delete all scores for this sheet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteSheetDialogOpen(false);
                setSheetToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSheet}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
