"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, Info, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";

interface AnomalyData {
  sessionId: string;
  slug: string;
  date: string;
  location?: string;
  severity: "high" | "medium" | "low";
  deviations: Array<{
    metric: string;
    value: number;
    average: number;
    percentDeviation: number;
    isAnomaly: boolean;
  }>;
}

interface AnomalySummaryWidgetProps {
  threshold?: number;
  minSessions?: number;
  maxDisplay?: number;
}

export function AnomalySummaryWidget({
  threshold = 20,
  minSessions = 5,
  maxDisplay = 5,
}: AnomalySummaryWidgetProps) {
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    fetchAnomalies();
  }, [threshold, minSessions]);

  const fetchAnomalies = async () => {
    try {
      const res = await fetch(
        `/api/analytics/anomalies?threshold=${threshold}&minSessions=${minSessions}`
      );
      if (res.ok) {
        const data = await res.json();
        setAnomalies(data.anomalies || []);
        setInsights(data.insights || []);
        setSessionCount(data.sessionCount || 0);
      }
    } catch (error) {
      console.error("Failed to load anomalies:", error);
    } finally {
      setLoading(false);
    }
  };

  const severityConfig = {
    high: {
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    medium: {
      icon: AlertTriangle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
    },
    low: {
      icon: Info,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Session Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading anomaly detection...</p>
        </CardContent>
      </Card>
    );
  }

  if (sessionCount < minSessions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Session Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Need at least {minSessions} sessions for anomaly detection. Currently have {sessionCount}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayedAnomalies = anomalies.slice(0, maxDisplay);
  const severityCounts = {
    high: anomalies.filter((a) => a.severity === "high").length,
    medium: anomalies.filter((a) => a.severity === "medium").length,
    low: anomalies.filter((a) => a.severity === "low").length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Session Anomalies
          </CardTitle>
          {anomalies.length > 0 && (
            <div className="flex items-center gap-2">
              {severityCounts.high > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                  {severityCounts.high} high
                </Badge>
              )}
              {severityCounts.medium > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  {severityCounts.medium} medium
                </Badge>
              )}
              {severityCounts.low > 0 && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  {severityCounts.low} low
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
              <TrendingDown className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium mb-1">No anomalies detected</p>
            <p className="text-xs text-muted-foreground">
              All {sessionCount} sessions are within normal performance ranges
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm">
                <strong>{anomalies.length}</strong> of <strong>{sessionCount}</strong> sessions show
                significant performance deviations ({((anomalies.length / sessionCount) * 100).toFixed(0)}%)
              </p>
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div className="mb-4 space-y-2">
                {insights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Anomaly List */}
            <div>
              {displayedAnomalies.map((anomaly, index) => {
                const config = severityConfig[anomaly.severity];
                const Icon = config.icon;
                const topDeviation = anomaly.deviations
                  .filter((d) => d.isAnomaly)
                  .sort((a, b) => Math.abs(b.percentDeviation) - Math.abs(a.percentDeviation))[0];

                return (
                  <Link 
                    key={anomaly.sessionId} 
                    href={`/sessions/${anomaly.slug}`}
                    className={index < displayedAnomalies.length - 1 ? "block mb-4" : "block"}
                  >
                    <Card
                      className={`
                        group p-3 transition-all duration-200 cursor-pointer border-0
                        ${config.bgColor}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(anomaly.date), "MMM d, yyyy")}
                            </p>
                            {anomaly.location && (
                              <p className="text-xs text-muted-foreground">
                                {anomaly.location}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {topDeviation && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {topDeviation.metric}
                              </p>
                              <p className="text-sm font-semibold">
                                <span className={topDeviation.percentDeviation > 0 ? "text-red-500" : "text-green-500"}>
                                  {topDeviation.percentDeviation > 0 ? "+" : ""}
                                  {topDeviation.percentDeviation.toFixed(1)}%
                                </span>
                              </p>
                            </div>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* View All Link */}
            {anomalies.length > maxDisplay && (
              <div className="mt-6 text-center">
                <Link href="/sessions">
                  <Button variant="outline" size="default">
                    View all {anomalies.length} anomalies
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
