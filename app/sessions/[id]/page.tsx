"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, MapPin, Plus, Edit, Trash2, Target as TargetIcon, TrendingUp } from "lucide-react";
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
  date: string;
  location?: string;
  notes?: string;
}

interface Sheet {
  _id: string;
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
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchLocations();
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
              Average Score per Sheet
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Target Sheets</h2>
        <Button onClick={() => router.push(`/sessions/${sessionId}/sheets/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Sheet
        </Button>
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
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{sheet.sheetLabel || `Sheet ${index + 1}`}</span>
                  </CardTitle>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Firearm:</strong> {sheet.firearmId?.name || "Unknown"}
                    </p>
                    <p>
                      <strong>Caliber:</strong> {sheet.caliberId?.name || "Unknown"}
                    </p>
                    <p>
                      <strong>Optic:</strong> {sheet.opticId?.name || "Unknown"}
                    </p>
                    <p>
                      <strong>Distance:</strong> {sheet.distanceYards} yards
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Total Shots:</strong> {totalShots}
                      </p>
                      <p className="text-sm">
                        <strong>Total Score:</strong> {totalScore}
                      </p>
                      <p className="text-sm">
                        <strong>Average Score/Shot:</strong> {avgScore}
                      </p>
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
                                backgroundColor: "#1a1a1a",
                                border: "1px solid #333",
                                borderRadius: "6px",
                              }}
                              labelStyle={{ color: "#fff" }}
                            />
                            <Bar dataKey="avgScore" fill="#8b5cf6" name="Avg Score" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/sheets/${sheet._id}`)}
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
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="date" className="flex items-center gap-2">
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
                <Label htmlFor="location" className="flex items-center gap-2">
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
                <Label htmlFor="notes">Notes</Label>
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
    </div>
  );
}
