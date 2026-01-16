"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  Eye,
  TrendingUp,
  Target,
  Crosshair,
  Activity,
  Ruler,
  Award,
  Trophy,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { Button } from "@/components/ui/button";
import { FilterBar, AnalyticsFilters } from "@/components/analytics/FilterBar";
import { ChartCard } from "@/components/analytics/ChartCard";
import { EmptyState } from "@/components/analytics/EmptyState";
import { SequenceAnalysisCard } from "@/components/analytics/SequenceAnalysisCard";
import { EChart } from "@/components/analytics/EChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/spinner";
import { TableSkeleton, ChartCardSkeleton } from "@/components/analytics/SkeletonLoader";
import { FadeIn } from "@/components/ui/fade-in";
import type { EChartsOption } from "echarts";

interface OpticMetrics {
  opticId: string;
  opticName: string;
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

interface OpticsData {
  leaderboard: OpticMetrics[];
  trends: Record<string, any[]>;
  distanceCurves: Record<string, any[]>;
}

export default function OpticsAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<OpticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firearms, setFirearms] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [optics, setOptics] = useState<{ _id: string; name: string }[]>([]);

  const [filters, setFilters] = useState<AnalyticsFilters>({
    firearmIds: searchParams.get("firearmIds")?.split(",").filter(Boolean) || [],
    caliberIds: searchParams.get("caliberIds")?.split(",").filter(Boolean) || [],
    opticIds: [],
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
      if (filters.caliberIds.length > 0) params.append("caliberIds", filters.caliberIds.join(","));
      if (filters.distanceMin) params.append("distanceMin", filters.distanceMin);
      if (filters.distanceMax) params.append("distanceMax", filters.distanceMax);
      params.append("minShots", filters.minShots.toString());
      params.append("positionOnly", filters.positionOnly.toString());

      const res = await fetch(`/api/analytics/optics?${params}`);
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
      } else {
        toast.error("Failed to load optic analytics");
      }
    } catch (error) {
      toast.error("Failed to load optic analytics");
    } finally {
      setLoading(false);
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (filters.firearmIds.length > 0) params.set("firearmIds", filters.firearmIds.join(","));
    if (filters.caliberIds.length > 0) params.set("caliberIds", filters.caliberIds.join(","));
    if (filters.distanceMin) params.set("distanceMin", filters.distanceMin);
    if (filters.distanceMax) params.set("distanceMax", filters.distanceMax);
    if (filters.minShots !== 10) params.set("minShots", filters.minShots.toString());
    if (filters.positionOnly) params.set("positionOnly", "true");
    if (filters.allowSynthetic) params.set("allowSynthetic", "true");

    router.replace(`/analytics/optics?${params.toString()}`, { scroll: false });
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <AnalyticsHeader
          title="Optics Analytics"
          icon={Eye}
          description="Performance leaderboard and trends by optic"
        />
        <div className="h-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl animate-pulse"></div>
        <ChartCardSkeleton height="500px" />
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
        <ChartCardSkeleton height="400px" />
        <ChartCardSkeleton height="400px" />
      </div>
    );
  }

  if (!data || data.leaderboard.length === 0) {
    return (
      <div>
        <AnalyticsHeader
          title="Optics Analytics"
          icon={Eye}
          description="Performance leaderboard and trends by optic"
        />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          firearms={firearms}
          calibers={calibers}
          optics={optics}
        />
        <EmptyState title="No optic data available" description="No sessions match your current filters." />
      </div>
    );
  }

  // Create combined performance over time chart
  const performanceOverTimeOption: EChartsOption | null = (() => {
    if (!data.trends || Object.keys(data.trends).length === 0) return null;

    const maxSessions = Math.max(
      ...Object.values(data.trends).map((trend: any) => trend.length)
    );

    const xAxisLabels = Array.from({ length: maxSessions }, (_, i) => `Session ${i + 1}`);

    const defaultColors = [
      "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
      "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
    ];

    const series = data.leaderboard.map((optic, index) => {
      const opticTrend = data.trends[optic.opticId] || [];
      const color = defaultColors[index % defaultColors.length];

      return {
        name: optic.opticName,
        type: "line" as const,
        data: opticTrend.map((s: any) => s.avgScorePerShot),
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
        data: data.leaderboard.map((o) => o.opticName),
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

  // Score & Bull Rate combined chart
  const scoreBullRateOption: EChartsOption | null = (() => {
    if (!data.trends || Object.keys(data.trends).length === 0) return null;

    const maxSessions = Math.max(
      ...Object.values(data.trends).map((trend: any) => trend.length)
    );

    const xAxisLabels = Array.from({ length: maxSessions }, (_, i) => `Session ${i + 1}`);

    const defaultColors = [
      "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
      "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
    ];

    const scoreSeries = data.leaderboard.map((optic, index) => {
      const opticTrend = data.trends[optic.opticId] || [];
      return {
        name: `${optic.opticName} - Score`,
        type: "line" as const,
        data: opticTrend.map((s: any) => s.avgScorePerShot),
        smooth: true,
        yAxisIndex: 0,
        lineStyle: { width: 2, color: defaultColors[index % defaultColors.length] },
      };
    });

    const bullRateSeries = data.leaderboard.map((optic, index) => {
      const opticTrend = data.trends[optic.opticId] || [];
      return {
        name: `${optic.opticName} - Bull Rate`,
        type: "line" as const,
        data: opticTrend.map((s: any) => s.bullRate),
        smooth: true,
        yAxisIndex: 1,
        lineStyle: { width: 2, type: "dashed" as const, color: defaultColors[index % defaultColors.length] },
      };
    });

    return {
      tooltip: {
        trigger: "axis" as const,
      },
      legend: {
        data: [...scoreSeries.map(s => s.name), ...bullRateSeries.map(s => s.name)],
        top: 10,
      },
      grid: {
        left: 60,
        right: 60,
        top: 60,
        bottom: 60,
        containLabel: true,
      },
      xAxis: {
        type: "category" as const,
        data: xAxisLabels,
      },
      yAxis: [
        {
          type: "value" as const,
          name: "Avg Score",
          min: 0,
          max: 5,
        },
        {
          type: "value" as const,
          name: "Bull Rate",
          min: 0,
          max: 1,
        },
      ],
      series: [...scoreSeries, ...bullRateSeries],
    };
  })();

  // Performance by distance for all optics
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

    const series = data.leaderboard.map((optic, index) => {
      const opticCurve = data.distanceCurves[optic.opticId] || [];
      const dataMap = new Map(opticCurve.map((point: any) => [point.distance, point.avgScorePerShot]));
      
      return {
        name: optic.opticName,
        type: "line" as const,
        data: sortedDistances.map(d => dataMap.get(d) || null),
        smooth: true,
        connectNulls: true,
        lineStyle: {
          width: 3,
          color: defaultColors[index % defaultColors.length],
        },
      };
    });

    return {
      tooltip: {
        trigger: "axis" as const,
      },
      legend: {
        data: data.leaderboard.map((o) => o.opticName),
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
        name: "Distance (yards)",
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
      <FadeIn duration={200}>
        <AnalyticsHeader
          title="Optics Analytics"
          icon={Eye}
          description="Performance leaderboard and trends by optic"
        >
          <Link href="/analytics/compare?type=optic">
            <Button variant="outline" className="dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20">
              <BarChart3 className="mr-2 h-4 w-4" />
              Compare Optics
            </Button>
          </Link>
        </AnalyticsHeader>
      </FadeIn>

      <FadeIn delay={50} duration={200}>
        <FilterBar
          filters={filters}
          onChange={setFilters}
          firearms={firearms}
          calibers={calibers}
          optics={optics}
        />
      </FadeIn>

      {performanceOverTimeOption && (
        <FadeIn delay={100} duration={300}>
          <ChartCard title="Optic Performance Over Time" icon={TrendingUp}>
            <EChart option={performanceOverTimeOption} height={500} />
          </ChartCard>
        </FadeIn>
      )}

      <FadeIn delay={200} duration={300}>
        <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Optic Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.leaderboard.map((optic, index) => {
              const defaultColors = [
                "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
                "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
              ];
              const opticColor = defaultColors[index % defaultColors.length];
              
              return (
                <div
                  key={optic.opticId}
                  className="relative p-4 rounded-lg border bg-card transition-all hover:shadow-md"
                >
                  <div 
                    className="absolute -left-2 -top-2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg"
                    style={{ backgroundColor: opticColor }}
                  >
                    #{index + 1}
                  </div>
                  
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                    style={{ backgroundColor: opticColor }}
                  />
                  
                  <div className="flex items-center justify-between mb-3 ml-6">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      <span className="text-lg font-bold">{optic.opticName}</span>
                      {index === 0 && (
                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                          <Award className="h-3 w-3 mr-1" />
                          Top
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: opticColor }}>
                        {optic.avgScorePerShot.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-6">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Bull Rate</div>
                        <div className="font-semibold text-sm">{(optic.bullRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Crosshair className="h-4 w-4 text-red-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Miss Rate</div>
                        <div className="font-semibold text-sm">{(optic.missRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    {optic.meanRadius !== undefined && optic.meanRadius !== null && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-muted-foreground">Mean Radius</div>
                          <div className="font-semibold text-sm">{optic.meanRadius.toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Total Shots</div>
                        <div className="font-semibold text-sm">{optic.totalShots}</div>
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

      <div className="space-y-6 mt-6">
        {scoreBullRateOption && (
          <FadeIn delay={300} duration={300}>
            <ChartCard title="Score & Bull Rate Over Sessions" icon={TrendingUp}>
              <EChart option={scoreBullRateOption} height={400} />
            </ChartCard>
          </FadeIn>
        )}

        {distancePerformanceOption && (
          <FadeIn delay={400} duration={300}>
            <ChartCard title="Performance by Distance" icon={Ruler}>
              <EChart option={distancePerformanceOption} height={400} />
            </ChartCard>
          </FadeIn>
        )}

        {/* Sequence Analysis by Optic */}
        <FadeIn delay={500} duration={300}>
          <SequenceAnalysisCard
          filters={{
            opticIds: filters.opticIds,
            firearmIds: filters.firearmIds,
            caliberIds: filters.caliberIds,
            distanceMin: filters.distanceMin,
            distanceMax: filters.distanceMax,
            minShots: filters.minShots,
            positionOnly: filters.positionOnly,
          }}
          title="Fatigue Analysis by Optic"
          description="How performance changes throughout sessions for different optics"
        />
        </FadeIn>
      </div>
    </div>
  );
}

