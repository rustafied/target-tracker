"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Target } from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { EmptyState } from "@/components/analytics/EmptyState";
import { EChart } from "@/components/analytics/EChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from "@/components/ui/spinner";
import type { EChartsOption } from "echarts";

interface FirearmMetrics {
  firearmId: string;
  firearmName: string;
  firearmColor?: string;
  totalShots: number;
  totalScore: number;
  avgScorePerShot: number;
  bullRate: number;
  missRate: number;
  goodHitRate: number;
  tightnessScore: number;
  shotCoverage: number;
  meanRadius?: number;
  centroidDistance?: number;
}

interface FirearmsData {
  leaderboard: FirearmMetrics[];
  trends: Record<string, any[]>;
  distanceCurves: Record<string, any[]>;
}

export default function FirearmsAnalyticsPage() {
  const [data, setData] = useState<FirearmsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/firearms`);
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
      } else {
        toast.error("Failed to load firearm analytics");
      }
    } catch (error) {
      toast.error("Failed to load firearm analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div>
        <AnalyticsHeader
          title="Firearms Analytics"
          icon={Target}
          description="Performance leaderboard and trends by firearm"
        />
        <LoadingCard />
      </div>
    );
  }

  if (!data || data.leaderboard.length === 0) {
    return (
      <div>
        <AnalyticsHeader
          title="Firearms Analytics"
          icon={Target}
          description="Performance leaderboard and trends by firearm"
        />
        <EmptyState
          title="No firearm data available"
          description="Record some shooting sessions to see analytics."
        />
      </div>
    );
  }

  // Multi-firearm performance chart
  const performanceChartOption: EChartsOption | null = (() => {
    if (!data || data.leaderboard.length === 0) return null;

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

    // Create series for each firearm with their own data points
    const series = data.leaderboard.map((firearm, index) => {
      const trend = data.trends[firearm.firearmId] || [];
      
      // Sort by session index to ensure chronological order
      const sortedTrend = [...trend].sort((a: any, b: any) => a.sessionIndex - b.sessionIndex);
      
      return {
        name: firearm.firearmName,
        type: "line" as const,
        data: sortedTrend.map((s: any) => s.avgScorePerShot),
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 8,
        color: firearm.firearmColor || defaultColors[index % defaultColors.length],
        lineStyle: {
          width: 3,
        },
        emphasis: {
          focus: "series" as const,
        },
      };
    });

    // Find the maximum number of sessions any firearm has
    const maxSessions = Math.max(...data.leaderboard.map(f => (data.trends[f.firearmId] || []).length));
    const xAxisLabels = Array.from({ length: maxSessions }, (_, i) => `Sheet ${i + 1}`);

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: {
          type: "cross" as const,
        },
        formatter: (params: any) => {
          let result = "";
          params.forEach((param: any) => {
            if (param.value !== undefined && param.value !== null) {
              result += `${param.marker}${param.seriesName}: ${param.value.toFixed(2)}<br/>`;
            }
          });
          return result;
        },
      },
      legend: {
        data: data.leaderboard.map((f) => f.firearmName),
        top: 10,
        textStyle: { color: "hsl(var(--foreground))" },
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
  })();

  return (
    <div>
      <AnalyticsHeader
        title="Firearms Analytics"
        icon={Target}
        description="Performance leaderboard and trends by firearm"
      />

      {/* Main Layout: Chart + Leaderboard */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance by Firearm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Performance Chart - 2/3 width */}
            <div className="lg:col-span-2">
              {performanceChartOption && (
                <div style={{ width: "100%", height: "590px" }}>
                  <EChart option={performanceChartOption} height="100%" />
                </div>
              )}
            </div>

            {/* Right: Leaderboard - 1/3 width */}
            <div className="space-y-3 max-h-[590px] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-card pt-2 pb-2">Leaderboard</h3>
              {data.leaderboard.map((firearm, index) => (
                <div
                  key={firearm.firearmId}
                  className="w-full text-left p-3 rounded-lg bg-secondary"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">#{index + 1}</span>
                      <span className="font-semibold">{firearm.firearmName}</span>
                    </div>
                    <span className="text-xl font-bold">{firearm.avgScorePerShot.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="opacity-70">Bull Rate</div>
                      <div className="font-semibold">{(firearm.bullRate * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="opacity-70">Shots</div>
                      <div className="font-semibold">{firearm.totalShots}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

