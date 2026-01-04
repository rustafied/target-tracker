"use client";

import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagSelector } from "@/components/TagSelector";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, Target, Crosshair, TrendingUp, Filter, Ruler } from "lucide-react";

interface SessionMetric {
  sessionId: string;
  date: string;
  location?: string;
  totalShots: number;
  totalScore: number;
  averageScore: number;
  sheetCount: number;
}

interface Summary {
  totalSessions: number;
  totalShots: number;
  totalScore: number;
  averageScore: number;
}

export default function AnalyticsPage() {
  const [firearms, setFirearms] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [sessions, setSessions] = useState<SessionMetric[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    dateStart: "",
    dateEnd: "",
    firearmIds: [] as string[],
    caliberIds: [] as string[],
    distanceMin: "",
    distanceMax: "",
  });

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const fetchReferenceData = async () => {
    try {
      const [firearmsRes, calibersRes] = await Promise.all([
        fetch("/api/firearms"),
        fetch("/api/calibers"),
      ]);

      if (firearmsRes.ok) setFirearms(await firearmsRes.json());
      if (calibersRes.ok) setCalibers(await calibersRes.json());
    } catch (error) {
      toast.error("Failed to load reference data");
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateStart) params.append("dateStart", filters.dateStart);
      if (filters.dateEnd) params.append("dateEnd", filters.dateEnd);
      if (filters.firearmIds.length > 0) params.append("firearmIds", filters.firearmIds.join(","));
      if (filters.caliberIds.length > 0) params.append("caliberIds", filters.caliberIds.join(","));
      if (filters.distanceMin) params.append("distanceMin", filters.distanceMin);
      if (filters.distanceMax) params.append("distanceMax", filters.distanceMax);

      const res = await fetch(`/api/analytics/summary?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        setSummary(data.summary);
      } else {
        toast.error("Failed to load analytics");
      }
    } catch (error) {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const toggleFirearm = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      firearmIds: prev.firearmIds.includes(id)
        ? prev.firearmIds.filter((fid) => fid !== id)
        : [...prev.firearmIds, id],
    }));
  };

  const toggleCaliber = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      caliberIds: prev.caliberIds.includes(id)
        ? prev.caliberIds.filter((cid) => cid !== id)
        : [...prev.caliberIds, id],
    }));
  };

  const chartData = sessions.map((session) => ({
    date: format(new Date(session.date), "MMM d"),
    score: parseFloat(session.averageScore.toFixed(2)),
    shots: session.totalShots,
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalSessions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Crosshair className="h-4 w-4" />
                Total Shots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalShots}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Total Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalScore}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.averageScore.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateStart" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="dateStart"
                type="date"
                value={filters.dateStart}
                onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateEnd" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="dateEnd"
                type="date"
                value={filters.dateEnd}
                onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
              />
            </div>
          </div>

          {firearms.length > 0 && (
            <div>
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Firearms (optional - select to filter)
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {firearms.map((firearm) => (
                  <button
                    key={firearm._id}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      filters.firearmIds.includes(firearm._id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                    onClick={() => toggleFirearm(firearm._id)}
                  >
                    {firearm.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {calibers.length > 0 && (
            <div>
              <Label className="flex items-center gap-2">
                <Crosshair className="h-4 w-4" />
                Calibers (optional - select to filter)
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {calibers.map((caliber) => (
                  <button
                    key={caliber._id}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      filters.caliberIds.includes(caliber._id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                    onClick={() => toggleCaliber(caliber._id)}
                  >
                    {caliber.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distanceMin" className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Min Distance (yards)
              </Label>
              <Input
                id="distanceMin"
                type="number"
                value={filters.distanceMin}
                onChange={(e) => setFilters({ ...filters, distanceMin: e.target.value })}
                placeholder="e.g., 25"
              />
            </div>
            <div>
              <Label htmlFor="distanceMax" className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Max Distance (yards)
              </Label>
              <Input
                id="distanceMax"
                type="number"
                value={filters.distanceMax}
                onChange={(e) => setFilters({ ...filters, distanceMax: e.target.value })}
                placeholder="e.g., 100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Chart */}
      {sessions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Average Score Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[0, 5]} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Average Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Session Table */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-right p-2">Shots</th>
                    <th className="text-right p-2">Score</th>
                    <th className="text-right p-2">Average</th>
                    <th className="text-right p-2">Sheets</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.sessionId} className="border-b hover:bg-accent">
                      <td className="p-2">{format(new Date(session.date), "MMM d, yyyy")}</td>
                      <td className="p-2 text-muted-foreground">{session.location || "-"}</td>
                      <td className="p-2 text-right">{session.totalShots}</td>
                      <td className="p-2 text-right">{session.totalScore}</td>
                      <td className="p-2 text-right font-medium">
                        {session.averageScore.toFixed(2)}
                      </td>
                      <td className="p-2 text-right">{session.sheetCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && sessions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading analytics...</p>
          </CardContent>
        </Card>
      )}

      {!loading && sessions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No data available for the selected filters. Try adjusting your date range or filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
