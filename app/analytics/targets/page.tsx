"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Target,
  Compass,
  Maximize2,
  TrendingDown,
  Sparkles,
  PieChart,
} from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { FilterBar, AnalyticsFilters } from "@/components/analytics/FilterBar";
import { ChartCard } from "@/components/analytics/ChartCard";
import { EmptyState, WarningBadge } from "@/components/analytics/EmptyState";
import { EChart, CHART_COLORS } from "@/components/analytics/EChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EChartsOption } from "echarts";

interface ShotsData {
  meta: {
    shotsIncluded: number;
    sessionsIncluded: number;
    shotCoverage: number;
    usesSynthetic: boolean;
  };
  centroid: {
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    centroidDistance: number;
  } | null;
  group: {
    meanRadius: number;
    medianRadius: number;
    extremeSpread: number;
    bbox: { w: number; h: number; diag: number };
    tightnessScore: number;
  } | null;
  heatmap: {
    bins: { x: number; y: number; value: number }[];
  };
  scatter: {
    points: { x: number; y: number; score: number }[];
  };
  quadrant: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  bullAnalysis: {
    bullIndex: number;
    shotsCount: number;
    avgScore: number;
    meanRadius: number | null;
    centroidDistance: number | null;
  }[];
}

export default function TargetsAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ShotsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firearms, setFirearms] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [optics, setOptics] = useState<{ _id: string; name: string }[]>([]);
  const [scatterColorBy, setScatterColorBy] = useState<"score" | "bull">("score");

  const [filters, setFilters] = useState<AnalyticsFilters>({
    firearmIds: searchParams.get("firearmIds")?.split(",").filter(Boolean) || [],
    caliberIds: searchParams.get("caliberIds")?.split(",").filter(Boolean) || [],
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
      const [firearmsRes, calibersRes, opticsRes] = await Promise.all([
        fetch("/api/firearms"),
        fetch("/api/calibers"),
        fetch("/api/optics"),
      ]);

      if (firearmsRes.ok) setFirearms(await firearmsRes.json());
      if (calibersRes.ok) setCalibers(await calibersRes.json());
      if (opticsRes.ok) setOptics(await opticsRes.json());
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
      if (filters.opticIds.length > 0) params.append("opticIds", filters.opticIds.join(","));
      if (filters.distanceMin) params.append("distanceMin", filters.distanceMin);
      if (filters.distanceMax) params.append("distanceMax", filters.distanceMax);
      params.append("minShots", filters.minShots.toString());
      params.append("positionOnly", filters.positionOnly.toString());
      params.append("allowSynthetic", filters.allowSynthetic.toString());

      const res = await fetch(`/api/analytics/shots?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load shot analytics");
      }
    } catch (error) {
      toast.error("Failed to load shot analytics");
    } finally {
      setLoading(false);
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (filters.firearmIds.length > 0) params.set("firearmIds", filters.firearmIds.join(","));
    if (filters.caliberIds.length > 0) params.set("caliberIds", filters.caliberIds.join(","));
    if (filters.opticIds.length > 0) params.set("opticIds", filters.opticIds.join(","));
    if (filters.distanceMin) params.set("distanceMin", filters.distanceMin);
    if (filters.distanceMax) params.set("distanceMax", filters.distanceMax);
    if (filters.minShots !== 10) params.set("minShots", filters.minShots.toString());
    if (filters.positionOnly) params.set("positionOnly", "true");
    if (filters.allowSynthetic) params.set("allowSynthetic", "true");

    router.replace(`/analytics/targets?${params.toString()}`, { scroll: false });
  };

  if (loading && !data) {
    return (
      <div>
        <AnalyticsHeader
          title="Shot Visualizations"
          icon={Target}
          description="Heatmaps, shot plots, and precision analytics"
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading shot data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.meta.shotsIncluded === 0) {
    return (
      <div>
        <AnalyticsHeader
          title="Shot Visualizations"
          icon={Target}
          description="Heatmaps, shot plots, and precision analytics"
        />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          firearms={firearms}
          calibers={calibers}
          optics={optics}
        />
        <EmptyState
          title="No shot position data available"
          description="Add shot positions by clicking on targets to unlock heatmaps and group metrics. Enable 'Allow synthetic shots' filter to generate estimated visualizations from score data."
        />
      </div>
    );
  }

  // Heatmap
  const heatmapData = data.heatmap.bins.map((bin) => [bin.x, bin.y, bin.value]);
  const maxValue = Math.max(...data.heatmap.bins.map((b) => b.value), 1);

  const heatmapOption: EChartsOption = {
    tooltip: {
      position: "top",
      formatter: (params: any) => {
        return `Shots: ${params.value[2]}`;
      },
    },
    grid: {
      left: 50,
      right: 20,
      top: 40,
      bottom: 50,
    },
    xAxis: {
      type: "category",
      data: Array.from({ length: 40 }, (_, i) => i),
      splitArea: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: "category",
      data: Array.from({ length: 40 }, (_, i) => i),
      splitArea: { show: false },
      axisLabel: { show: false },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: {
        color: ["#0f172a", "#1e40af", "#3b82f6", "#60a5fa", "#fbbf24", "#f59e0b"],
      },
    },
    series: [
      {
        name: "Shot Density",
        type: "heatmap",
        data: heatmapData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  // Shot Plot (Scatter with rings)
  const scatterOption: EChartsOption = {
    tooltip: {
      formatter: (params: any) => {
        // Skip tooltip for ring overlay (custom series)
        if (!params.value || params.seriesType === 'custom') return '';
        
        const x = params.value[0];
        const y = params.value[1];
        const score = params.value[2];
        
        if (x === undefined || y === undefined || score === undefined) return '';
        
        return `Score: ${score}<br/>X: ${x.toFixed(1)}<br/>Y: ${y.toFixed(1)}`;
      },
    },
    grid: {
      left: 50,
      right: 20,
      top: 40,
      bottom: 50,
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 200,
      name: "X",
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 200,
      name: "Y",
      inverse: true,
    },
    series: [
      // Ring overlays
      {
        type: "custom",
        renderItem: (params: any, api: any) => {
          const rings = [
            { r: 15, color: CHART_COLORS.score5 },
            { r: 30, color: CHART_COLORS.score4 },
            { r: 50, color: CHART_COLORS.score3 },
            { r: 70, color: CHART_COLORS.score2 },
            { r: 85, color: CHART_COLORS.score1 },
          ];
          const cx = api.coord([100, 100])[0];
          const cy = api.coord([100, 100])[1];
          const scale = api.size([1, 0])[0];

          return {
            type: "group",
            children: rings.map((ring) => ({
              type: "circle",
              shape: {
                cx,
                cy,
                r: ring.r * scale,
              },
              style: {
                stroke: ring.color,
                fill: "none",
                lineWidth: 1,
                opacity: 0.3,
              },
            })),
          };
        },
        data: [[0]],
      },
      // Shots
      {
        type: "scatter",
        data: data.scatter.points.map((p) => [p.x, p.y, p.score]),
        symbolSize: 6,
        itemStyle: {
          color: (params: any) => {
            const score = params.value[2];
            return [
              CHART_COLORS.score0,
              CHART_COLORS.score1,
              CHART_COLORS.score2,
              CHART_COLORS.score3,
              CHART_COLORS.score4,
              CHART_COLORS.score5,
            ][score];
          },
        },
      },
    ],
  };

  // Quadrant Donut
  const quadrantTotal = data.quadrant.q1 + data.quadrant.q2 + data.quadrant.q3 + data.quadrant.q4;
  const quadrantOption: EChartsOption = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        label: {
          color: "#ffffff",
          fontSize: 14,
          fontWeight: "normal",
          textBorderWidth: 0,
        },
        labelLine: {
          lineStyle: {
            color: "#ffffff",
          },
        },
        data: [
          { value: data.quadrant.q1, name: "Q1 (Right-Down)", itemStyle: { color: "#3b82f6" } },
          { value: data.quadrant.q2, name: "Q2 (Left-Down)", itemStyle: { color: "#06b6d4" } },
          { value: data.quadrant.q3, name: "Q3 (Left-Up)", itemStyle: { color: "#8b5cf6" } },
          { value: data.quadrant.q4, name: "Q4 (Right-Up)", itemStyle: { color: "#ec4899" } },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  // Bull Analysis
  const bullAnalysisOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const bull = data.bullAnalysis[params[0].dataIndex];
        return `
          <strong>Bull ${bull.bullIndex}</strong><br/>
          Avg Score: ${bull.avgScore.toFixed(2)}<br/>
          Mean Radius: ${bull.meanRadius?.toFixed(2) || "N/A"}
        `;
      },
    },
    legend: {
      data: ["Avg Score", "Mean Radius"],
      textStyle: { color: "hsl(var(--foreground))" },
    },
    xAxis: {
      type: "category",
      data: data.bullAnalysis.map((b) => `Bull ${b.bullIndex}`),
    },
    yAxis: [
      {
        type: "value",
        name: "Avg Score",
        min: 0,
        max: 5,
      },
      {
        type: "value",
        name: "Mean Radius",
      },
    ],
    series: [
      {
        name: "Avg Score",
        data: data.bullAnalysis.map((b) => b.avgScore),
        type: "bar",
        itemStyle: { color: CHART_COLORS.primary },
      },
      {
        name: "Mean Radius",
        data: data.bullAnalysis.map((b) => b.meanRadius),
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { color: CHART_COLORS.danger, width: 3 },
        itemStyle: { color: CHART_COLORS.danger },
      },
    ],
  };

  return (
    <div>
      <AnalyticsHeader
        title="Shot Visualizations"
        icon={Target}
        description="Heatmaps, shot plots, and precision analytics"
      />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        firearms={firearms}
        calibers={calibers}
        optics={optics}
      />

      {data.meta.usesSynthetic && (
        <div className="mb-4">
          <WarningBadge message="Using synthetic shot positions for visualization" />
        </div>
      )}

      {/* Group Metrics */}
      {data.group && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Mean Radius
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.group.meanRadius.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Target units</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Maximize2 className="h-4 w-4" />
                Extreme Spread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.group.extremeSpread.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Max shot distance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Centroid Distance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.centroid?.centroidDistance.toFixed(2) || "N/A"}</p>
              <p className="text-xs text-muted-foreground mt-1">Bias from center</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Tightness Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.group.tightnessScore}</p>
              <p className="text-xs text-muted-foreground mt-1">0-100 scale</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visualizations */}
      <div className="space-y-6 mb-6">
        <ChartCard title="Shot Heatmap" icon={Target}>
          <EChart option={heatmapOption} height={500} />
        </ChartCard>

        <ChartCard
          title="Shot Plot with Rings"
          icon={Target}
          action={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={scatterColorBy === "score" ? "default" : "outline"}
                onClick={() => setScatterColorBy("score")}
              >
                By Score
              </Button>
              <Button
                size="sm"
                variant={scatterColorBy === "bull" ? "default" : "outline"}
                onClick={() => setScatterColorBy("bull")}
              >
                By Bull
              </Button>
            </div>
          }
        >
          <EChart option={scatterOption} height={500} />
        </ChartCard>

        {data.centroid && (
          <ChartCard title="Directional Bias" icon={Compass}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <EChart option={quadrantOption} height={300} />
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Offset Vector</h4>
                  <p className="text-sm text-muted-foreground">
                    X Offset: <strong>{data.centroid.offsetX.toFixed(2)}</strong>{" "}
                    {data.centroid.offsetX > 0 ? "(right)" : "(left)"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Y Offset: <strong>{data.centroid.offsetY.toFixed(2)}</strong>{" "}
                    {data.centroid.offsetY > 0 ? "(down)" : "(up)"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Distance: <strong>{data.centroid.centroidDistance.toFixed(2)}</strong>
                  </p>
                </div>
              </div>
            </div>
          </ChartCard>
        )}

        {data.bullAnalysis.length > 0 && (
          <ChartCard title="Bull-by-Bull Performance" icon={TrendingDown}>
            <EChart option={bullAnalysisOption} height={300} />
            <p className="text-sm text-muted-foreground mt-4">
              Detects fatigue patterns: if later bulls consistently show degraded performance.
            </p>
          </ChartCard>
        )}
      </div>

      {/* Meta Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Data Coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shots Included:</span>
              <strong>{data.meta.shotsIncluded}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shot Coverage:</span>
              <strong>{(data.meta.shotCoverage * 100).toFixed(1)}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Using Synthetic:</span>
              <strong>{data.meta.usesSynthetic ? "Yes" : "No"}</strong>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

