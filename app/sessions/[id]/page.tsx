"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, MapPin, Plus, Edit, Trash2, Target as TargetIcon, TrendingUp, Crosshair, Eye, Ruler, FileText, Image as ImageIcon } from "lucide-react";
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
import { OCRUploader } from "@/components/OCRUploader";
import type { ParsedSheetData } from "@/lib/ocr-parser";
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
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [ocrData, setOcrData] = useState<ParsedSheetData | null>(null);
  const [firearms, setFirearms] = useState<{ _id: string; name: string; caliberIds?: string[]; opticIds?: string[] }[]>([]);
  const [allOptics, setAllOptics] = useState<{ _id: string; name: string }[]>([]);
  const [allCalibers, setAllCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [filteredOptics, setFilteredOptics] = useState<{ _id: string; name: string }[]>([]);
  const [filteredCalibers, setFilteredCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    notes: "",
  });
  const [quickSheetFormData, setQuickSheetFormData] = useState({
    firearmId: "",
    caliberId: "",
    opticId: "",
    distanceYards: "25",
    sheetLabel: "",
    notes: "",
  });

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchLocations();
      fetchReferenceData();
    }
  }, [sessionId]);

  const fetchReferenceData = async () => {
    try {
      const [firearmsRes, opticsRes, calibersRes] = await Promise.all([
        fetch("/api/firearms"),
        fetch("/api/optics"),
        fetch("/api/calibers"),
      ]);

      let firearmsData: { _id: string; name: string; caliberIds?: string[]; opticIds?: string[] }[] = [];
      let opticsData: { _id: string; name: string }[] = [];
      let calibersData: { _id: string; name: string }[] = [];

      if (firearmsRes.ok) {
        firearmsData = await firearmsRes.json();
        setFirearms(firearmsData);
      }
      if (opticsRes.ok) {
        opticsData = await opticsRes.json();
        setAllOptics(opticsData);
        setFilteredOptics(opticsData);
      }
      if (calibersRes.ok) {
        calibersData = await calibersRes.json();
        setAllCalibers(calibersData);
        setFilteredCalibers(calibersData);
      }

      // Set defaults
      if (firearmsData.length > 0 && opticsData.length > 0 && calibersData.length > 0) {
        setQuickSheetFormData({
          firearmId: firearmsData[0]._id,
          opticId: opticsData[0]._id,
          caliberId: calibersData[0]._id,
          distanceYards: "25",
          sheetLabel: "",
          notes: "",
        });
        filterByFirearm(firearmsData[0]._id, firearmsData, opticsData, calibersData);
      }
    } catch (error) {
      // Silent fail
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

  const filterByFirearm = (
    firearmId: string,
    firearmsData = firearms,
    opticsData = allOptics,
    calibersData = allCalibers
  ) => {
    const selectedFirearm = firearmsData.find((f) => f._id === firearmId);
    if (selectedFirearm) {
      const filteredOpts = selectedFirearm.opticIds && selectedFirearm.opticIds.length > 0
        ? opticsData.filter((o) => selectedFirearm.opticIds!.includes(o._id))
        : opticsData;
      
      const filteredCals = selectedFirearm.caliberIds && selectedFirearm.caliberIds.length > 0
        ? calibersData.filter((c) => selectedFirearm.caliberIds!.includes(c._id))
        : calibersData;

      setFilteredOptics(filteredOpts);
      setFilteredCalibers(filteredCals);

      setQuickSheetFormData((prev) => ({
        ...prev,
        firearmId,
        opticId: filteredOpts.length > 0 ? filteredOpts[0]._id : "",
        caliberId: filteredCals.length > 0 ? filteredCals[0]._id : "",
      }));
    }
  };

  const handleOCRDataParsed = (data: ParsedSheetData) => {
    setOcrData(data);
    
    // Auto-populate distance if found
    if (data.distance) {
      setQuickSheetFormData((prev) => ({
        ...prev,
        distanceYards: data.distance!.toString(),
      }));
    }
    
    toast.success(
      `Data ready: ${data.bullsData.length} bulls${data.distance ? `, ${data.distance} yards` : ''}. Review and create sheet.`
    );
  };

  const handleCreateSheetFromOCR = async () => {
    if (!session || !ocrData || ocrData.bullsData.length === 0) {
      toast.error("No OCR data available");
      return;
    }

    if (!quickSheetFormData.firearmId || !quickSheetFormData.caliberId || !quickSheetFormData.opticId) {
      toast.error("Please select firearm, caliber, and optic");
      return;
    }

    try {
      // Create the sheet
      const sheetRes = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rangeSessionId: session._id,
          ...quickSheetFormData,
          distanceYards: parseInt(quickSheetFormData.distanceYards),
        }),
      });

      if (!sheetRes.ok) {
        toast.error("Failed to create sheet");
        return;
      }

      const sheet = await sheetRes.json();
      
      // Save the bull records
      const bullsRes = await fetch("/api/bulls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          ocrData.bullsData.map((bull) => ({
            targetSheetId: sheet._id,
            ...bull,
          }))
        ),
      });

      if (bullsRes.ok) {
        toast.success("Sheet created with OCR data!");
        setOcrDialogOpen(false);
        setOcrData(null);
        fetchSession(); // Refresh to show new sheet
      } else {
        toast.warning("Sheet created but failed to save OCR data");
      }
    } catch (error) {
      toast.error("Failed to create sheet");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  // Data for sheet averages graph (top of page)
  const sheetAveragesData = sheets.map((sheet, index) => {
    const totalShots = sheet.bulls?.reduce((acc, bull) => acc + bull.totalShots, 0) || 0;
    const totalScore = sheet.bulls?.reduce((acc, bull) => acc + bull.totalScore, 0) || 0;
    const avgScore = totalShots > 0 ? parseFloat((totalScore / totalShots).toFixed(2)) : 0;

    return {
      name: sheet.sheetLabel || `Sheet ${index + 1}`,
      avgScore,
      totalShots,
    };
  });

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

      {/* Sheet Averages Graph */}
      {sheets.length > 0 && sheetAveragesData.some((s) => s.totalShots > 0) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Session Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Line Chart - 2/3 width on large screens */}
              <div className="lg:col-span-2">
                <h3 className="text-sm font-semibold mb-3">Average Score per Sheet</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sheetAveragesData}>
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
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Avg Score"
                      dot={{ fill: "#8b5cf6", r: 4 }}
                    />
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

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Target Sheets</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOcrDialogOpen(true)}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Upload Range Notes
          </Button>
          <Button onClick={() => router.push(`/sessions/${sessionId}/sheets/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sheet
          </Button>
        </div>
      </div>

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

            // Data for per-sheet bull scores graph
            const bullChartData =
              sheet.bulls?.map((bull) => ({
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
                        {sheet.bulls.slice(0, 6).map((bull) => (
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
                            />
                            <Bar dataKey="avgScore" fill="#8b5cf6" name="Avg Score">
                              <LabelList dataKey="avgScore" position="inside" fill="#fff" fontSize={12} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/sheets/${sheet.slug || sheet._id}`)}
                    >
                      <TargetIcon className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
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

      {/* OCR Upload Dialog */}
      <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Range Notes</DialogTitle>
            <DialogDescription>
              Upload a photo of your handwritten range notes to automatically create a sheet
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <OCRUploader onDataParsed={handleOCRDataParsed} />

            {ocrData && ocrData.bullsData.length > 0 && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-primary">
                    ✓ Data Parsed - Configure Sheet Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-1 mb-4">
                    <p>
                      <span className="font-semibold">{ocrData.bullsData.length}</span> bulls detected
                    </p>
                    {ocrData.distance && (
                      <p>
                        Distance: <span className="font-semibold">{ocrData.distance}</span> yards
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Firearm *</Label>
                      <select
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        value={quickSheetFormData.firearmId}
                        onChange={(e) => filterByFirearm(e.target.value)}
                      >
                        {firearms.map((f) => (
                          <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Caliber *</Label>
                      <select
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        value={quickSheetFormData.caliberId}
                        onChange={(e) => setQuickSheetFormData({ ...quickSheetFormData, caliberId: e.target.value })}
                      >
                        {filteredCalibers.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Optic *</Label>
                      <select
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        value={quickSheetFormData.opticId}
                        onChange={(e) => setQuickSheetFormData({ ...quickSheetFormData, opticId: e.target.value })}
                      >
                        {filteredOptics.map((o) => (
                          <option key={o._id} value={o._id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="ocrDistance">Distance (yards) *</Label>
                      <Input
                        id="ocrDistance"
                        type="number"
                        value={quickSheetFormData.distanceYards}
                        onChange={(e) => setQuickSheetFormData({ ...quickSheetFormData, distanceYards: e.target.value })}
                        required
                        min="1"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ocrSheetLabel">Sheet Label</Label>
                      <Input
                        id="ocrSheetLabel"
                        value={quickSheetFormData.sheetLabel}
                        onChange={(e) => setQuickSheetFormData({ ...quickSheetFormData, sheetLabel: e.target.value })}
                        placeholder="e.g., Zeroing, Group Practice"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ocrNotes">Notes</Label>
                      <Textarea
                        id="ocrNotes"
                        value={quickSheetFormData.notes}
                        onChange={(e) => setQuickSheetFormData({ ...quickSheetFormData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setOcrDialogOpen(false);
              setOcrData(null);
            }}>
              Cancel
            </Button>
            {ocrData && ocrData.bullsData.length > 0 && (
              <Button onClick={handleCreateSheetFromOCR}>
                Create Sheet with Data
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
