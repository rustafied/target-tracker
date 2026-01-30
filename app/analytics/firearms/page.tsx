"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";

import { Target, TrendingUp, Crosshair, Activity, Award, Trophy, Ruler, BarChart3, Check } from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/analytics/ChartCard";
import { EmptyState } from "@/components/analytics/EmptyState";
import { EChart } from "@/components/analytics/EChart";
import { SequenceAnalysisCard } from "@/components/analytics/SequenceAnalysisCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/spinner";
import { TableSkeleton, ChartCardSkeleton } from "@/components/analytics/SkeletonLoader";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";
import { FadeIn } from "@/components/ui/fade-in";
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
  firearmDistances?: Record<string, number>;
}

export default function FirearmsAnalyticsPage() {
  const [data, setData] = useState<FirearmsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFirearms, setSelectedFirearms] = useState<string[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    // Initialize selectedFirearms when data loads
    if (data && data.leaderboard.length > 0 && selectedFirearms.length === 0) {
      setSelectedFirearms(data.leaderboard.map(f => f.firearmId));
    }
  }, [data]);

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

  const toggleFirearm = (firearmId: string) => {
    setSelectedFirearms(prev => 
      prev.includes(firearmId) 
        ? prev.filter(id => id !== firearmId)
        : [...prev, firearmId]
    );
  };

  const toggleAll = () => {
    if (data && selectedFirearms.length === data.leaderboard.length) {
      setSelectedFirearms([]);
    } else if (data) {
      setSelectedFirearms(data.leaderboard.map(f => f.firearmId));
    }
  };

  // Filter data based on selected firearms
  const filteredLeaderboard = data?.leaderboard.filter(f => selectedFirearms.includes(f.firearmId)) || [];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <AnalyticsHeader
          title="Firearms Analytics"
          icon={Target}
          description="Performance leaderboard and trends by firearm"
        />
        <ChartCardSkeleton height="500px" />
        <ChartCardSkeleton height="400px" />
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-[#2a2a2a] rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="relative p-4 rounded-lg border bg-card animate-pulse">
                  <div className="h-10 w-10 bg-[#2a2a2a] rounded-full absolute -left-2 -top-2"></div>
                  <div className="flex items-center justify-between mb-3 ml-6">
                    <div className="h-6 w-32 bg-[#2a2a2a] rounded"></div>
                    <div className="h-8 w-16 bg-[#2a2a2a] rounded"></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-6">
                    <div className="h-10 bg-[#2a2a2a] rounded"></div>
                    <div className="h-10 bg-[#2a2a2a] rounded"></div>
                    <div className="h-10 bg-[#2a2a2a] rounded"></div>
                    <div className="h-10 bg-[#2a2a2a] rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <ChartCardSkeleton height="400px" />
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

    const series = filteredLeaderboard.map((firearm, index) => {
      const firearmCurve = data.distanceCurves[firearm.firearmId] || [];
      const dataMap = new Map(firearmCurve.map((point: any) => [point.distance, point.avgScorePerShot]));
      const color = firearm.firearmColor || defaultColors[index % defaultColors.length];
      
      return {
        name: firearm.firearmName,
        type: "line" as const,
        data: sortedDistances.map(d => dataMap.get(d) || null),
        smooth: true,
        connectNulls: true,
        lineStyle: {
          width: 3,
          color: color,
        },
        itemStyle: {
          color: color,
        },
        symbol: "circle",
        symbolSize: 8,
      };
    });

    // Calculate dynamic y-axis range based on actual data
    const allValues = series.flatMap(s => s.data.filter((v): v is number => v !== null));
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 5;
    const padding = (maxValue - minValue) * 0.1 || 0.5; // 10% padding or 0.5 minimum

    return {
      color: filteredLeaderboard.map((f, index) => f.firearmColor || defaultColors[index % defaultColors.length]),
      tooltip: {
        trigger: "axis" as const,
      },
      legend: {
        data: filteredLeaderboard.map((f) => f.firearmName),
        top: 10,
        type: "scroll" as const,
        orient: "horizontal" as const,
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
        min: Math.max(0, minValue - padding),
        max: Math.min(5, maxValue + padding),
      },
      series,
    };
  })();

  // Multi-firearm performance chart
  const performanceChartOption: EChartsOption | null = (() => {
    if (!data || filteredLeaderboard.length === 0) return null;

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
    const series: any[] = [];
    
    filteredLeaderboard.forEach((firearm, index) => {
      const trend = data.trends[firearm.firearmId] || [];
      
      // Sort by session index to ensure chronological order
      const sortedTrend = [...trend].sort((a: any, b: any) => a.sessionIndex - b.sessionIndex);
      const color = firearm.firearmColor || defaultColors[index % defaultColors.length];
      
      // Regular score line (solid)
      series.push({
        name: `${firearm.firearmName} (Raw)`,
        type: "line" as const,
        data: sortedTrend.map((s: any) => s.avgScorePerShot),
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: color,
        },
        itemStyle: {
          color: color,
        },
        emphasis: {
          focus: "series" as const,
        },
      });

      // Distance-adjusted score line (dotted)
      series.push({
        name: `${firearm.firearmName} (Distance Adj)`,
        type: "line" as const,
        data: sortedTrend.map((s: any) => s.distanceAdjustedScore),
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 6,
        lineStyle: {
          width: 2,
          type: "dashed" as const,
          color: color,
        },
        itemStyle: {
          color: color,
          opacity: 0.7,
        },
        emphasis: {
          focus: "series" as const,
        },
      });
    });

    // Find the maximum number of sessions any firearm has
    const maxSessions = Math.max(...filteredLeaderboard.map(f => (data.trends[f.firearmId] || []).length));
    const xAxisLabels = Array.from({ length: maxSessions }, (_, i) => `Sheet ${i + 1}`);

    // Calculate dynamic y-axis range based on actual data
    const allValues = series.flatMap((s: any) => s.data.filter((v: any): v is number => v !== undefined && v !== null));
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 5;
    const padding = (maxValue - minValue) * 0.1 || 0.5; // 10% padding or 0.5 minimum

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: {
          type: "cross" as const,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          
          const sessionIndex = params[0].dataIndex;
          let result = `<b>${params[0].axisValue}</b><br/>`;
          
          // Group by firearm (pairs of raw/adjusted)
          for (let i = 0; i < params.length; i += 2) {
            const rawParam = params[i];
            const adjParam = params[i + 1];
            
            if (rawParam && adjParam && rawParam.value !== undefined && rawParam.value !== null) {
              const firearmIndex = Math.floor(i / 2);
              const firearmId = filteredLeaderboard[firearmIndex]?.firearmId;
              const sessionData = data.trends[firearmId]?.[sessionIndex];
              const distance = sessionData?.distance || 0;
              const baseline = data.firearmDistances?.[firearmId] || 0;
              
              result += `<div style="margin-top: 8px;">`;
              result += `${rawParam.marker}${rawParam.seriesName.replace(' (Raw)', '')}<br/>`;
              result += `<span style="margin-left: 20px;">Raw: ${rawParam.value.toFixed(2)}</span><br/>`;
              result += `<span style="margin-left: 20px;">Dist Adj: ${adjParam.value?.toFixed(2) || 'N/A'}</span><br/>`;
              result += `<span style="margin-left: 20px; opacity: 0.6;">@ ${distance.toFixed(0)}yd (baseline: ${baseline.toFixed(0)}yd)</span>`;
              result += `</div>`;
            }
          }
          
          return result;
        },
      },
      legend: {
        data: series.map((s: any) => s.name),
        top: 10,
        type: "scroll" as const,
        orient: "horizontal" as const,
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
        min: Math.max(0, minValue - padding),
        max: Math.min(5, maxValue + padding),
      },
      series,
    };
  })();

  return (
    <div>
      <FadeIn duration={200}>
        <AnalyticsHeader
          title="Firearms Analytics"
          icon={Target}
          description="Performance leaderboard and trends by firearm"
        >
          <Link href="/analytics/compare?type=firearm">
            <Button variant="outline" className="dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Compare Firearms</span>
            </Button>
          </Link>
        </AnalyticsHeader>
      </FadeIn>

      {/* Firearm Selector */}
      {data && data.leaderboard.length > 0 && (
        <FadeIn delay={50} duration={200}>
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleAll}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedFirearms.length === data.leaderboard.length
                      ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400"
                      : "bg-white/5 text-foreground hover:bg-white/10 border border-white/20 hover:border-white/30"
                  }`}
                >
                  All Firearms
                </button>
                {data.leaderboard.map((firearm, index) => {
                  const defaultColors = [
                    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
                    "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
                  ];
                  const color = firearm.firearmColor || defaultColors[index % defaultColors.length];
                  const isSelected = selectedFirearms.includes(firearm.firearmId);
                  
                  return (
                    <button
                      key={firearm.firearmId}
                      onClick={() => toggleFirearm(firearm.firearmId)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? "text-white shadow-lg ring-2"
                          : "bg-white/5 text-foreground hover:bg-white/10 border border-white/20 hover:border-white/30"
                      }`}
                      style={isSelected ? { 
                        backgroundColor: color,
                        ringColor: `${color}66`
                      } : undefined}
                    >
                      {firearm.firearmName}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {performanceChartOption && (
        <FadeIn delay={100} duration={300}>
          <ChartCard title="Firearm Performance Over Time" icon={TrendingUp}>
            <EChart option={performanceChartOption} height={500} />
          </ChartCard>
        </FadeIn>
      )}

      {distancePerformanceOption && (
        <FadeIn delay={200} duration={300}>
          <div className="mt-6">
            <ChartCard title="Performance by Distance" icon={Ruler}>
              <EChart option={distancePerformanceOption} height={400} />
            </ChartCard>
          </div>
        </FadeIn>
      )}

      <FadeIn delay={300} duration={300}>
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
      </FadeIn>

      {/* Sequence Analysis by Firearm */}
      <FadeIn delay={400} duration={300}>
        <SequenceAnalysisCard
        filters={{ minShots: 20 }}
        title="Fatigue Analysis by Firearm"
        description="How performance changes throughout sessions for different firearms"
      />
      </FadeIn>
    </div>
  );
}

