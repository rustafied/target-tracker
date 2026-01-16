"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, MapPin, FileText, Target, TrendingUp, Crosshair, ChevronRight, ArrowUp, ArrowDown, Clock } from "lucide-react";
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
import { LoadingCard } from "@/components/ui/spinner";
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
    startTime: "",
    endTime: "",
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
      startTime: "",
      endTime: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-9 w-32 bg-[#2a2a2a] rounded animate-pulse mb-2"></div>
            <div className="h-5 w-48 bg-[#2a2a2a] rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-[#2a2a2a] rounded animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 md:p-6">
                {/* Desktop Layout Skeleton */}
                <div className="hidden md:flex items-start justify-between gap-6">
                  <div className="flex-shrink-0 w-64">
                    <div className="h-7 w-40 bg-[#2a2a2a] rounded mb-2"></div>
                    <div className="h-4 w-48 bg-[#2a2a2a] rounded"></div>
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="text-center">
                        <div className="h-4 w-16 bg-[#2a2a2a] rounded mx-auto mb-2"></div>
                        <div className="h-8 w-12 bg-[#2a2a2a] rounded mx-auto"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-6 w-6 bg-[#2a2a2a] rounded"></div>
                </div>
                {/* Mobile Layout Skeleton */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="h-6 w-32 bg-[#2a2a2a] rounded mb-1"></div>
                      <div className="h-3 w-40 bg-[#2a2a2a] rounded"></div>
                    </div>
                    <div className="h-5 w-5 bg-[#2a2a2a] rounded"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="bg-muted/50 rounded-md p-2 flex items-center gap-2">
                        <div className="h-3.5 w-3.5 bg-[#2a2a2a] rounded"></div>
                        <div className="flex-1">
                          <div className="h-3 w-12 bg-[#2a2a2a] rounded mb-1"></div>
                          <div className="h-5 w-8 bg-[#2a2a2a] rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground mt-1">Track your range visits</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">New Session</span>
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
                <CardContent className="p-4 md:p-6">
                  {/* Mobile: Vertical Card Layout */}
                  <div className="md:hidden">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-lg font-bold">{format(new Date(session.date), "MMM d, yyyy")}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground ml-5.5">
                        {format(new Date(session.date), "EEEE")}
                        {session.location && (
                          <>
                            <span className="mx-1">@</span>
                            <span className="font-medium">{session.location}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </div>
                  
                  {/* Stats Grid - 2 columns on mobile */}
                  <div className="grid grid-cols-2 gap-3">
                    {session.sheetCount !== undefined && (
                      <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                        <Target className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Sheets</p>
                          <p className="text-lg font-bold leading-tight">{session.sheetCount}</p>
                        </div>
                      </div>
                    )}
                    
                    {session.totalShots !== undefined && (
                      <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                        <Crosshair className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Shots</p>
                          <p className="text-lg font-bold leading-tight">{session.totalShots}</p>
                        </div>
                      </div>
                    )}
                    
                    {session.avgScore !== undefined && session.avgScore !== null && (
                      <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Avg Score</p>
                          <p className="text-lg font-bold leading-tight">{session.avgScore.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                    
                    {session.improvement !== undefined && session.improvement !== null && (
                      <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                        {session.improvement >= 0 ? (
                          <ArrowUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">vs Last</p>
                          <p className={`text-lg font-bold leading-tight ${session.improvement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {session.improvement >= 0 ? '+' : ''}{session.improvement.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop: Horizontal Layout */}
                <div className="hidden md:flex items-start justify-between gap-6">
                  {/* Left: Date & Location */}
                  <div className="flex-shrink-0 w-64">
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
                  <div className="flex-1 grid grid-cols-4 gap-6 items-center">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Sheets</p>
                      </div>
                      <p className="text-2xl font-bold">{session.sheetCount ?? '-'}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Crosshair className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Shots</p>
                      </div>
                      <p className="text-2xl font-bold">{session.totalShots ?? '-'}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Score</p>
                      </div>
                      <p className="text-2xl font-bold">
                        {session.avgScore !== undefined && session.avgScore !== null ? session.avgScore.toFixed(2) : '-'}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {session.improvement !== undefined && session.improvement !== null && session.improvement >= 0 ? (
                          <ArrowUp className="h-4 w-4 text-green-500" />
                        ) : session.improvement !== undefined && session.improvement !== null ? (
                          <ArrowDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">vs Last</p>
                      </div>
                      <p className={`text-2xl font-bold ${
                        session.improvement !== undefined && session.improvement !== null 
                          ? session.improvement >= 0 ? 'text-green-500' : 'text-red-500'
                          : ''
                      }`}>
                        {session.improvement !== undefined && session.improvement !== null 
                          ? `${session.improvement >= 0 ? '+' : ''}${session.improvement.toFixed(1)}%`
                          : '-'
                        }
                      </p>
                    </div>
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
