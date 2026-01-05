"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, MapPin, FileText, Target, TrendingUp, Crosshair, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
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

interface RangeSession {
  _id: string;
  slug: string;
  date: string;
  location?: string;
  notes?: string;
  sheetCount?: number;
  totalShots?: number;
  avgScore?: number;
  improvement?: number | null;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<RangeSession[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    location: "",
    notes: "",
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        console.log('Sessions data:', data.sessions); // Debug
        setSessions(data.sessions || data); // Handle both old and new format
        setLocations(data.locations || []);
      }
    } catch (error) {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const session = await res.json();
        toast.success("Session created");
        setDialogOpen(false);
        router.push(`/sessions/${session.slug || session._id}`);
      } else {
        toast.error("Failed to create session");
      }
    } catch (error) {
      toast.error("Failed to create session");
    }
  };

  const openCreateDialog = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      location: "Reloaderz",
      notes: "",
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Range Sessions</h1>
          <p className="text-muted-foreground mt-1">Track your range visits and performance</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No sessions yet. Click "New Session" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card
              key={session._id}
              className="cursor-pointer hover:bg-accent transition-colors group"
              onClick={() => router.push(`/sessions/${session.slug || session._id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6">
                  {/* Left: Date & Location */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-xl font-bold">{format(new Date(session.date), "MMM d, yyyy")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground ml-7">
                      {format(new Date(session.date), "EEEE")}
                      {session.location && (
                        <>
                          <span className="mx-1.5">@</span>
                          <span className="font-medium">{session.location}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Right: Stats Grid */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
                    {session.sheetCount !== undefined && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sheets</p>
                        </div>
                        <p className="text-2xl font-bold">{session.sheetCount}</p>
                      </div>
                    )}
                    
                    {session.totalShots !== undefined && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Crosshair className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Shots</p>
                        </div>
                        <p className="text-2xl font-bold">{session.totalShots}</p>
                      </div>
                    )}
                    
                    {session.avgScore !== undefined && session.avgScore !== null && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Score</p>
                        </div>
                        <p className="text-2xl font-bold">{session.avgScore.toFixed(2)}</p>
                      </div>
                    )}
                    
                    {session.improvement !== undefined && session.improvement !== null && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          {session.improvement >= 0 ? (
                            <ArrowUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-red-500" />
                          )}
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">vs Last</p>
                        </div>
                        <p className={`text-2xl font-bold ${session.improvement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {session.improvement >= 0 ? '+' : ''}{session.improvement.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <div className="flex-shrink-0 self-center">
                    <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Range Session</DialogTitle>
            <DialogDescription>Create a new range session to track your shooting</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Session</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
