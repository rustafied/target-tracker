"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Settings, TrendingDown, Filter } from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoadingCard } from "@/components/ui/spinner";
import { AnomalyFlag } from "@/components/AnomalyFlag";
import { InsightsPanel } from "@/components/InsightsPanel";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Deviation {
  metric: string;
  value: number;
  average: number;
  percentDeviation: number;
  isAnomaly: boolean;
}

interface Cause {
  type: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

interface AnomalyData {
  sessionId: string;
  slug: string;
  date: string;
  location?: string;
  isAnomaly: boolean;
  severity: "high" | "medium" | "low";
  deviations: Deviation[];
  causes: Cause[];
}

interface GlobalAverages {
  avgScore: number;
  missRate: number;
  bullRate: number;
  avgDistance: number;
  totalShots: number;
  sessionCount: number;
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [globalAverages, setGlobalAverages] = useState<GlobalAverages | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyData | null>(null);
  const [insightsPanelOpen, setInsightsPanelOpen] = useState(false);
  
  // Settings
  const [threshold, setThreshold] = useState(20);
  const [minSessions, setMinSessions] = useState(5);
  const [statistical, setStatistical] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  useEffect(() => {
    fetchAnomalies();
  }, [threshold, minSessions, statistical]);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        threshold: threshold.toString(),
        minSessions: minSessions.toString(),
        statistical: statistical.toString(),
      });

      const res = await fetch(`/api/analytics/anomalies?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAnomalies(data.anomalies || []);
        setGlobalAverages(data.globalAverages);
        setInsights(data.insights || []);
      } else {
        toast.error("Failed to load anomalies");
      }
    } catch (error) {
      toast.error("Failed to load anomalies");
    } finally {
      setLoading(false);
    }
  };

  const handleAnomalyClick = (anomaly: AnomalyData) => {
    setSelectedAnomaly(anomaly);
    setInsightsPanelOpen(true);
  };

  const filteredAnomalies =
    severityFilter === "all"
      ? anomalies
      : anomalies.filter((a) => a.severity === severityFilter);

  if (loading) {
    return (
      <div>
        <AnalyticsHeader
          title="Session Anomaly Detection"
          icon={AlertTriangle}
          description="Identify outlier sessions and diagnose performance variations"
        />
        <LoadingCard />
      </div>
    );
  }

  return (
    <div>
      <AnalyticsHeader
        title="Session Anomaly Detection"
        icon={AlertTriangle}
        description="Identify outlier sessions and diagnose performance variations"
      />

      {/* Settings Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Detection Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="threshold" className="mb-2 block">
                Deviation Threshold (%)
              </Label>
              <Input
                id="threshold"
                type="number"
                min="10"
                max="50"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 20)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Flag sessions with {threshold}%+ deviation
              </p>
            </div>

            <div>
              <Label htmlFor="minSessions" className="mb-2 block">
                Minimum Sessions
              </Label>
              <Input
                id="minSessions"
                type="number"
                min="3"
                max="20"
                value={minSessions}
                onChange={(e) => setMinSessions(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Need {minSessions}+ sessions for detection
              </p>
            </div>

            <div>
              <Label htmlFor="severityFilter" className="mb-2 block">
                Severity Filter
              </Label>
              <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)}>
                <SelectTrigger id="severityFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="high">High Only</SelectItem>
                  <SelectItem value="medium">Medium Only</SelectItem>
                  <SelectItem value="low">Low Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Averages */}
      {globalAverages && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Historical Baselines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">{globalAverages.avgScore.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bull Rate</p>
                <p className="text-2xl font-bold">{(globalAverages.bullRate * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Miss Rate</p>
                <p className="text-2xl font-bold">{(globalAverages.missRate * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Distance</p>
                <p className="text-2xl font-bold">{globalAverages.avgDistance.toFixed(0)} yd</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Based on {globalAverages.sessionCount} sessions
            </p>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p>{insight}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Anomalies List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Detected Anomalies ({filteredAnomalies.length})
            </CardTitle>
            {filteredAnomalies.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {((filteredAnomalies.length / (globalAverages?.sessionCount || 1)) * 100).toFixed(0)}% of sessions
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredAnomalies.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <TrendingDown className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No anomalies detected</h3>
              <p className="text-sm text-muted-foreground">
                {severityFilter === "all"
                  ? "All sessions are within normal performance ranges"
                  : `No ${severityFilter} severity anomalies found`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnomalies.map((anomaly) => (
                <div
                  key={anomaly.sessionId}
                  className="p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/sessions/${anomaly.slug}`}
                          className="text-lg font-semibold hover:underline"
                        >
                          {format(new Date(anomaly.date), "MMM d, yyyy")}
                        </Link>
                        {anomaly.location && (
                          <span className="text-sm text-muted-foreground">• {anomaly.location}</span>
                        )}
                        <AnomalyFlag
                          severity={anomaly.severity}
                          deviationCount={anomaly.deviations.filter((d) => d.isAnomaly).length}
                          onClick={() => handleAnomalyClick(anomaly)}
                        />
                      </div>

                      {/* Top Deviations */}
                      <div className="grid gap-2 md:grid-cols-2 mb-3">
                        {anomaly.deviations
                          .filter((d) => d.isAnomaly)
                          .slice(0, 2)
                          .map((deviation, index) => (
                            <div key={index} className="text-sm">
                              <span className="text-muted-foreground">{deviation.metric}:</span>{" "}
                              <span
                                className={
                                  deviation.percentDeviation > 0 ? "text-red-500" : "text-green-500"
                                }
                              >
                                {deviation.percentDeviation > 0 ? "+" : ""}
                                {deviation.percentDeviation.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* Top Causes */}
                      {anomaly.causes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {anomaly.causes.slice(0, 2).map((cause, index) => (
                            <div
                              key={index}
                              className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                            >
                              {cause.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnomalyClick(anomaly)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Panel */}
      {selectedAnomaly && (
        <InsightsPanel
          open={insightsPanelOpen}
          onOpenChange={setInsightsPanelOpen}
          sessionDate={selectedAnomaly.date}
          sessionLocation={selectedAnomaly.location}
          severity={selectedAnomaly.severity}
          deviations={selectedAnomaly.deviations}
          causes={selectedAnomaly.causes}
        />
      )}
    </div>
  );
}
