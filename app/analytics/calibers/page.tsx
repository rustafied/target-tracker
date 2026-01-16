"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Crosshair,
  TrendingUp,
  Target,
  Activity,
  Award,
  Trophy,
  Ruler,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { Button } from "@/components/ui/button";
import { FilterBar, AnalyticsFilters } from "@/components/analytics/FilterBar";
import { ChartCard } from "@/components/analytics/ChartCard";
import { EmptyState } from "@/components/analytics/EmptyState";
import { EChart } from "@/components/analytics/EChart";
import { SequenceAnalysisCard } from "@/components/analytics/SequenceAnalysisCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/spinner";
import type { EChartsOption } from "echarts";

interface CaliberMetrics {
  caliberId: string;
  caliberName: string;
  firearmColor?: string | null;
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

interface CalibersData {
  leaderboard: CaliberMetrics[];
  trends: Record<string, any[]>;
  distanceCurves: Record<string, any[]>;
}

export default function CalibersAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<CalibersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firearms, setFirearms] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [optics, setOptics] = useState<{ _id: string; name: string }[]>([]);

  const [filters, setFilters] = useState<AnalyticsFilters>({
    firearmIds: searchParams.get("firearmIds")?.split(",").filter(Boolean) || [],
    caliberIds: [],
    opticIds: searchParams.get("opticIds")?.split(",").filter(Boolean) || [],
    distanceMin: searchParams.get("distanceMin") || "",
    distanceMax: searchParams.get("distanceMax") || "",
    minShots: parseInt(searchParams.get("minShots") || "10"),
    positionOnly: searchParams.get("positionOnly") === "true",
    allowSynthetic: searchParams.get("allowSynthetic") === "true",
  });

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchAnalytics();
    updateURL();
  }, [filters]);

  const fetchReferenceData = async () => {
    try {
      const [firearmsRes, calibersRes, opticsRes, sheetsRes] = await Promise.all([
        fetch("/api/firearms"),
        fetch("/api/calibers"),
        fetch("/api/optics"),
        fetch("/api/sheets"),
      ]);

      if (sheetsRes.ok) {
        const sheets = await sheetsRes.json();
        
        // Extract unique IDs from sheets and convert to strings
        const usedFirearmIds = new Set(
          sheets.map((s: any) => typeof s.firearmId === 'string' ? s.firearmId : s.firearmId?._id || s.firearmId?.toString()).filter(Boolean)
        );
        const usedCaliberIds = new Set(
          sheets.map((s: any) => typeof s.caliberId === 'string' ? s.caliberId : s.caliberId?._id || s.caliberId?.toString()).filter(Boolean)
        );
        const usedOpticIds = new Set(
          sheets.map((s: any) => typeof s.opticId === 'string' ? s.opticId : s.opticId?._id || s.opticId?.toString()).filter(Boolean)
        );

        // Filter to only show items that have been used
        if (firearmsRes.ok) {
          const allFirearms = await firearmsRes.json();
          setFirearms(allFirearms.filter((f: any) => usedFirearmIds.has(f._id)));
        }
        if (calibersRes.ok) {
          const allCalibers = await calibersRes.json();
          setCalibers(allCalibers.filter((c: any) => usedCaliberIds.has(c._id)));
        }
        if (opticsRes.ok) {
          const allOptics = await opticsRes.json();
          setOptics(allOptics.filter((o: any) => usedOpticIds.has(o._id)));
        }
      }
    } catch (error) {
      toast.error("Failed to load reference data");
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.firearmIds.length > 0) params.append("firearmIds", filters.firearmIds.join(","));
      if (filters.opticIds.length > 0) params.append("opticIds", filters.opticIds.join(","));
      if (filters.distanceMin) params.append("distanceMin", filters.distanceMin);
      if (filters.distanceMax) params.append("distanceMax", filters.distanceMax);
      params.append("minShots", filters.minShots.toString());
      params.append("positionOnly", filters.positionOnly.toString());

      const res = await fetch(`/api/analytics/calibers?${params}`);
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
      } else {
        toast.error("Failed to load caliber analytics");
      }
    } catch (error) {
      toast.error("Failed to load caliber analytics");
    } finally {
      setLoading(false);
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (filters.firearmIds.length > 0) params.set("firearmIds", filters.firearmIds.join(","));
    if (filters.opticIds.length > 0) params.set("opticIds", filters.opticIds.join(","));
    if (filters.distanceMin) params.set("distanceMin", filters.distanceMin);
    if (filters.distanceMax) params.set("distanceMax", filters.distanceMax);
    if (filters.minShots !== 10) params.set("minShots", filters.minShots.toString());
    if (filters.positionOnly) params.set("positionOnly", "true");
    if (filters.allowSynthetic) params.set("allowSynthetic", "true");

    router.replace(`/analytics/calibers?${params.toString()}`, { scroll: false });
  };

  if (loading && !data) {
    return (
      <div>
        <AnalyticsHeader
          title="Calibers Analytics"
          icon={Crosshair}
          description="Performance leaderboard and trends by caliber"
        />
        <LoadingCard />
      </div>
    );
  }

  if (!data || data.leaderboard.length === 0) {
    return (
      <div>
        <AnalyticsHeader
          title="Calibers Analytics"
          icon={Crosshair}
          description="Performance leaderboard and trends by caliber"
        />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          firearms={firearms}
          calibers={calibers}
          optics={optics}
        />
        <EmptyState
          title="No caliber data available"
          description="No sessions match your current filters."
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

    const series = data.leaderboard.map((caliber, index) => {
      const caliberCurve = data.distanceCurves[caliber.caliberId] || [];
      const dataMap = new Map(caliberCurve.map((point: any) => [point.distance, point.avgScorePerShot]));
      
      const color = caliber.firearmColor || defaultColors[index % defaultColors.length];
      
      return {
        name: caliber.caliberName,
        type: "line" as const,
        data: sortedDistances.map(d => dataMap.get(d) || null),
        smooth: true,
        connectNulls: true,
        lineStyle: {
          width: 3,
          color: color,
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
        data: data.leaderboard.map((c) => c.caliberName),
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

  // Create combined performance over time chart
  const performanceOverTimeOption: EChartsOption | null = (() => {
    if (!data.trends || Object.keys(data.trends).length === 0) return null;

    // Find the maximum number of sessions across all calibers
    const maxSessions = Math.max(
      ...Object.values(data.trends).map((trend: any) => trend.length)
    );

    const xAxisLabels = Array.from({ length: maxSessions }, (_, i) => `Session ${i + 1}`);

    // Create a series for each caliber
    const series = data.leaderboard.map((caliber, index) => {
      const caliberTrend = data.trends[caliber.caliberId] || [];
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
      const color = caliber.firearmColor || defaultColors[index % defaultColors.length];

      return {
        name: caliber.caliberName,
        type: "line" as const,
        data: caliberTrend.map((s: any) => s.avgScorePerShot),
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
      };
    });

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: {
          type: "cross" as const,
        },
      },
      legend: {
        data: data.leaderboard.map((c) => c.caliberName),
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
        name: "Session",
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
        title="Calibers Analytics"
        icon={Crosshair}
        description="Performance leaderboard and trends by caliber"
      >
        <Link href="/analytics/compare?type=caliber">
          <Button variant="outline" className="dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20">
            <BarChart3 className="mr-2 h-4 w-4" />
            Compare Calibers
          </Button>
        </Link>
      </AnalyticsHeader>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        firearms={firearms}
        calibers={calibers}
        optics={optics}
      />

      {performanceOverTimeOption && (
        <ChartCard title="Caliber Performance Over Time" icon={TrendingUp}>
          <EChart option={performanceOverTimeOption} height={500} />
        </ChartCard>
      )}

      {distancePerformanceOption && (
        <div className="mt-6">
          <ChartCard title="Performance by Distance" icon={Ruler}>
            <EChart option={distancePerformanceOption} height={400} />
          </ChartCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Caliber Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.leaderboard.map((caliber, index) => {
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
              const caliberColor = caliber.firearmColor || defaultColors[index % defaultColors.length];
              
              return (
                <div
                  key={caliber.caliberId}
                  className="relative p-4 rounded-lg border bg-card transition-all hover:shadow-md"
                >
                  {/* Rank Badge */}
                  <div 
                    className="absolute -left-2 -top-2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg"
                    style={{ backgroundColor: caliberColor }}
                  >
                    #{index + 1}
                  </div>
                  
                  {/* Color indicator bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                    style={{ backgroundColor: caliberColor }}
                  />
                  
                  <div className="flex items-center justify-between mb-3 ml-6">
                    <div className="flex items-center gap-3">
                      <Crosshair className="h-5 w-5 text-muted-foreground" />
                      <span className="text-lg font-bold">{caliber.caliberName}</span>
                      {index === 0 && (
                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                          <Award className="h-3 w-3 mr-1" />
                          Top
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: caliberColor }}>
                        {caliber.avgScorePerShot.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-6">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Bull Rate</div>
                        <div className="font-semibold text-sm">{(caliber.bullRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Crosshair className="h-4 w-4 text-red-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Miss Rate</div>
                        <div className="font-semibold text-sm">{(caliber.missRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    {caliber.meanRadius !== undefined && caliber.meanRadius !== null && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-muted-foreground">Mean Radius</div>
                          <div className="font-semibold text-sm">{caliber.meanRadius.toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Total Shots</div>
                        <div className="font-semibold text-sm">{caliber.totalShots}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

        {/* Ammo Usage Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Ammo Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EChart option={(() => {
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

              return {
                tooltip: {
                  trigger: "item" as const,
                  formatter: "{b}: {c} rounds ({d}%)",
                },
                series: [
                  {
                    name: "Ammo Usage",
                    type: "pie" as const,
                    radius: ["40%", "70%"],
                    center: ["50%", "50%"],
                    avoidLabelOverlap: false,
                    itemStyle: {
                      borderRadius: 10,
                      borderColor: "#000",
                      borderWidth: 2,
                    },
                    label: {
                      show: false,
                    },
                    emphasis: {
                      label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: "bold",
                      },
                    },
                    labelLine: {
                      show: false,
                    },
                    data: data.leaderboard.map((caliber, index) => ({
                      value: caliber.totalShots,
                      name: caliber.caliberName,
                      itemStyle: {
                        color: caliber.firearmColor || defaultColors[index % defaultColors.length],
                      },
                    })),
                  },
                ],
              };
            })()} height={400} />
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground text-center">
                <strong className="text-foreground text-lg">
                  {data.leaderboard.reduce((sum, c) => sum + c.totalShots, 0).toLocaleString()}
                </strong>
                <div className="text-xs mt-1">Total Rounds Fired</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sequence Analysis by Caliber */}
        <SequenceAnalysisCard
          filters={{
            caliberIds: filters.caliberIds,
            firearmIds: filters.firearmIds,
            opticIds: filters.opticIds,
            distanceMin: filters.distanceMin,
            distanceMax: filters.distanceMax,
            minShots: filters.minShots,
            positionOnly: filters.positionOnly,
          }}
          title="Fatigue Analysis by Caliber"
          description="How performance changes throughout sessions for different calibers"
        />
      </div>
    </div>
  );
}

