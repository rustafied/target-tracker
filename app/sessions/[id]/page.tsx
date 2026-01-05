"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, MapPin, Plus, Edit, Trash2, Target as TargetIcon, TrendingUp, Crosshair, Eye, Ruler, FileText, Zap, Award, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface BullRecord {
  _id: string;
  bullIndex: number;
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
  totalShots: number;
  totalScore: number;
}

interface RangeSession {
  _id: string;
  slug: string;
  date: string;
  location?: string;
  notes?: string;
}

interface Sheet {
  _id: string;
  slug?: string;
  firearmId: { _id: string; name: string };
  caliberId: { _id: string; name: string };
  opticId: { _id: string; name: string };
  distanceYards: number;
  sheetLabel?: string;
  notes?: string;
  bulls: BullRecord[];
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<RangeSession | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteSheetDialogOpen, setDeleteSheetDialogOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<Sheet | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchLocations();
      fetchAllSessions();
    }
  }, [sessionId]);

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
      } else {
        toast.error("Session not found");
        router.push("/sessions");
      }
    } catch (error) {
      toast.error("Failed to load session");
    } finally {
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
            notes: data.session.notes || "",
          });
          setEditDialogOpen(true);
        }
      } catch (error) {
        // Fallback to current state if fetch fails
        setFormData({
          date: format(new Date(session.date), "yyyy-MM-dd"),
          location: session.location || "",
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
    return <div>Loading...</div>;
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

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calendar className="h-8 w-8" />
              {format(new Date(session.date), "MMMM d, yyyy")}
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
              <Plus className="h-4 w-4 mr-2" />
              Add Sheet
            </Button>
            <Button variant="outline" size="icon" onClick={openEditDialog}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDeleteSession}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {session.notes && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm">{session.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Session Summary Stats */}
      {sheets.length > 0 && totalBulletsFired > 0 && (
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
      )}

      {/* Sheet Averages Graph */}
      {sheets.length > 0 && sheets.some((s) => (s.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0) > 0) && (
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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis domain={[0, 5]} stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "6px",
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Legend />
                    {Array.from(sheetsByFirearm.entries()).map(([firearmId, firearmData], index) => (
                      <Line
                        key={firearmId}
                        type="monotone"
                        dataKey={firearmData.name}
                        stroke={firearmColors[index % firearmColors.length]}
                        strokeWidth={2}
                        name={firearmData.name}
                        dot={{ fill: firearmColors[index % firearmColors.length], r: 4 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Heatmap - 1/3 width on large screens */}
              <div className="flex items-center justify-center">
                <SessionHeatmap sheets={sheets} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-2xl font-bold mb-4">Target Sheets</h2>

      {sheets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No target sheets yet. Click "Add Sheet" to record your shooting.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {sheets.map((sheet, index) => {
            const totalShots = sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0;
            const totalScore = sheet.bulls?.reduce((acc, bull) => acc + bull.totalScore, 0) || 0;
            const avgScore = totalShots > 0 ? (totalScore / totalShots).toFixed(2) : "0.00";

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
              <Card key={sheet._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <CardTitle className="text-lg">{sheet.sheetLabel || `Sheet ${index + 1}`}</CardTitle>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Average Score</p>
                      <p className="text-3xl font-bold">{avgScore}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <TargetIcon className="h-3 w-3" />
                        <span>Firearm</span>
                      </div>
                      <p className="font-medium">{sheet.firearmId?.name || "Unknown"}</p>
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
                            <SingleBullVisualization key={bull.bullIndex} bull={bull} size={100} />
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
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(0, 0, 0, 0.8)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "6px",
                              }}
                              labelStyle={{ color: "#fff" }}
                              cursor={false}
                            />
                            <Bar dataKey="avgScore" fill="#8b5cf6" name="Avg Score">
                              <LabelList dataKey="avgScore" position="inside" fill="#fff" fontSize={12} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/sheets/${sheet.slug || sheet._id}`)}
                      >
                        <TargetIcon className="h-4 w-4 mr-2" />
                        View Details
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
  );
}
