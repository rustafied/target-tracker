"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Target, TrendingUp, Crosshair, Activity, Award, Trophy, Ruler } from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { ChartCard } from "@/components/analytics/ChartCard";
import { EmptyState } from "@/components/analytics/EmptyState";
import { EChart } from "@/components/analytics/EChart";
import { SequenceAnalysisCard } from "@/components/analytics/SequenceAnalysisCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/spinner";
import type { EChartsOption } from "echarts";
import { meanRadiusToMOA } from "@/lib/utils";

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

  // Distance performance chart
  const distancePerformanceOption: EChartsOption | null = (() => {
    if (!data.distanceCurves || Object.keys(data.distanceCurves).length === 0) return null;

    // Collect all unique distances
    const allDistances = new Set<number>();
    Object.values(data.distanceCurves).forEach((curve: any) => {
      curve.forEach((point: any) => allDistances.add(point.distance));
    });

    const sortedDistances = Array.from(allDistances).sort((a, b) => a - b);
    const xAxisLabels = sortedDistances.map(d => `${d}yd`);

    const defaultColors = [
      "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
      "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
    ];

    const series = data.leaderboard.map((firearm, index) => {
      const firearmCurve = data.distanceCurves[firearm.firearmId] || [];
      const dataMap = new Map(firearmCurve.map((point: any) => [point.distance, point.avgScorePerShot]));
      
      return {
        name: firearm.firearmName,
        type: "line" as const,
        data: sortedDistances.map(d => dataMap.get(d) || null),
        smooth: true,
        connectNulls: true,
        lineStyle: {
          width: 3,
          color: firearm.firearmColor || defaultColors[index % defaultColors.length],
        },
        symbol: "circle",
        symbolSize: 8,
      };
    });

    return {
      tooltip: {
        trigger: "axis" as const,
      },
      legend: {
        data: data.leaderboard.map((f) => f.firearmName),
        top: 10,
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
        name: "Distance",
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

      {performanceChartOption && (
        <ChartCard title="Firearm Performance Over Time" icon={TrendingUp}>
          <EChart option={performanceChartOption} height={500} />
        </ChartCard>
      )}

      {distancePerformanceOption && (
        <div className="mt-6">
          <ChartCard title="Performance by Distance" icon={Ruler}>
            <EChart option={distancePerformanceOption} height={400} />
          </ChartCard>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Firearm Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.leaderboard.map((firearm, index) => {
              const defaultColors = [
                "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
                "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
              ];
              const firearmColor = firearm.firearmColor || defaultColors[index % defaultColors.length];
              
              return (
                <div
                  key={firearm.firearmId}
                  className="relative p-4 rounded-lg border bg-card transition-all hover:shadow-md"
                >
                  <div 
                    className="absolute -left-2 -top-2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg"
                    style={{ backgroundColor: firearmColor }}
                  >
                    #{index + 1}
                  </div>
                  
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                    style={{ backgroundColor: firearmColor }}
                  />
                  
                  <div className="flex items-center justify-between mb-3 ml-6">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      <span className="text-lg font-bold">{firearm.firearmName}</span>
                      {index === 0 && (
                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                          <Award className="h-3 w-3 mr-1" />
                          Top
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: firearmColor }}>
                        {firearm.avgScorePerShot.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-6">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Bull Rate</div>
                        <div className="font-semibold text-sm">{(firearm.bullRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Crosshair className="h-4 w-4 text-red-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Miss Rate</div>
                        <div className="font-semibold text-sm">{(firearm.missRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    {firearm.meanRadius !== undefined && firearm.meanRadius !== null && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-muted-foreground">Mean Radius</div>
                          <div className="font-semibold text-sm">{firearm.meanRadius.toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Total Shots</div>
                        <div className="font-semibold text-sm">{firearm.totalShots}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sequence Analysis by Firearm */}
      <SequenceAnalysisCard
        filters={{ minShots: 20 }}
        title="Fatigue Analysis by Firearm"
        description="How performance changes throughout sessions for different firearms"
      />
    </div>
  );
}

