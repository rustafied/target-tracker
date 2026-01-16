"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Target, Crosshair, Activity, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

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

interface InsightsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionDate?: string;
  sessionLocation?: string;
  severity: "high" | "medium" | "low";
  deviations: Deviation[];
  causes: Cause[];
}

export function InsightsPanel({
  open,
  onOpenChange,
  sessionDate,
  sessionLocation,
  severity,
  deviations,
  causes,
}: InsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<"deviations" | "causes" | "chart">("deviations");

  const severityConfig = {
    high: { color: "text-red-500", bgColor: "bg-red-500/10", icon: AlertTriangle },
    medium: { color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: AlertTriangle },
    low: { color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Info },
  };

  const { color, bgColor, icon: SeverityIcon } = severityConfig[severity];

  // Prepare chart data
  const chartData = deviations
    .filter(d => d.isAnomaly)
    .map(d => ({
      metric: d.metric,
      value: d.value,
      average: d.average,
      deviation: d.percentDeviation,
    }));

  const getMetricIcon = (metric: string) => {
    if (metric.toLowerCase().includes("score")) return Target;
    if (metric.toLowerCase().includes("miss")) return Crosshair;
    if (metric.toLowerCase().includes("bull")) return Activity;
    return TrendingUp;
  };

  const confidenceColors = {
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bgColor}`}>
              <SeverityIcon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <DialogTitle>Session Anomaly Detected</DialogTitle>
              <DialogDescription>
                {sessionDate && new Date(sessionDate).toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
                {sessionLocation && ` • ${sessionLocation}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("deviations")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "deviations"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Deviations ({deviations.filter(d => d.isAnomaly).length})
          </button>
          <button
            onClick={() => setActiveTab("causes")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "causes"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Likely Causes ({causes.length})
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "chart"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Comparison
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          {/* Deviations Tab */}
          {activeTab === "deviations" && (
            <div className="space-y-3">
              {deviations.filter(d => d.isAnomaly).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No significant deviations detected
                </p>
              ) : (
                deviations
                  .filter(d => d.isAnomaly)
                  .map((deviation, index) => {
                    const Icon = getMetricIcon(deviation.metric);
                    const isPositive = deviation.percentDeviation > 0;
                    const TrendIcon = isPositive ? TrendingUp : TrendingDown;
                    const trendColor = isPositive ? "text-green-500" : "text-red-500";

                    return (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-background">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{deviation.metric}</h4>
                              <Badge variant="outline" className={trendColor}>
                                <TrendIcon className="h-3 w-3 mr-1" />
                                {isPositive ? "+" : ""}
                                {deviation.percentDeviation.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Session:</span>{" "}
                                <span className="font-medium">
                                  {deviation.metric.toLowerCase().includes("rate")
                                    ? `${(deviation.value * 100).toFixed(1)}%`
                                    : deviation.value.toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Average:</span>{" "}
                                <span className="font-medium">
                                  {deviation.metric.toLowerCase().includes("rate")
                                    ? `${(deviation.average * 100).toFixed(1)}%`
                                    : deviation.average.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* Causes Tab */}
          {activeTab === "causes" && (
            <div className="space-y-3">
              {causes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No specific causes identified
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on session data, here are potential factors contributing to the anomaly:
                  </p>
                  {causes.map((cause, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">{cause.description}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${confidenceColors[cause.confidence]}`}
                          >
                            {cause.confidence} confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Chart Tab */}
          {activeTab === "chart" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Comparison of session metrics vs. your historical averages:
              </p>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No chart data available
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="metric" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      className="text-xs fill-muted-foreground"
                    />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="value" name="Session Value" fill="hsl(var(--primary))" />
                    <Bar dataKey="average" name="Historical Average" fill="hsl(var(--muted-foreground))" opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
