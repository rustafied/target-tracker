"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  Target,
  TrendingUp,
  Crosshair,
  Radius,
  Focus,
  Activity,
  Ruler,
  Sparkles,
} from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { FilterBar, AnalyticsFilters } from "@/components/analytics/FilterBar";
import { ChartCard } from "@/components/analytics/ChartCard";
import { EmptyState } from "@/components/analytics/EmptyState";
import { EChart, CHART_COLORS } from "@/components/analytics/EChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/spinner";
import type { EChartsOption } from "echarts";

interface FirearmMetrics {
  firearmId: string;
  firearmName: string;
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<FirearmsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firearms, setFirearms] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [optics, setOptics] = useState<{ _id: string; name: string }[]>([]);
  const [selectedFirearm, setSelectedFirearm] = useState<string | null>(null);

  const [filters, setFilters] = useState<AnalyticsFilters>({
    firearmIds: [],
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
      if (filters.caliberIds.length > 0) params.append("caliberIds", filters.caliberIds.join(","));
      if (filters.opticIds.length > 0) params.append("opticIds", filters.opticIds.join(","));
      if (filters.distanceMin) params.append("distanceMin", filters.distanceMin);
      if (filters.distanceMax) params.append("distanceMax", filters.distanceMax);
      params.append("minShots", filters.minShots.toString());
      params.append("positionOnly", filters.positionOnly.toString());

      const res = await fetch(`/api/analytics/firearms?${params}`);
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
        if (fetchedData.leaderboard.length > 0 && !selectedFirearm) {
          setSelectedFirearm(fetchedData.leaderboard[0].firearmId);
        }
      } else {
        toast.error("Failed to load firearm analytics");
      }
    } catch (error) {
      toast.error("Failed to load firearm analytics");
    } finally {
      setLoading(false);
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (filters.caliberIds.length > 0) params.set("caliberIds", filters.caliberIds.join(","));
    if (filters.opticIds.length > 0) params.set("opticIds", filters.opticIds.join(","));
    if (filters.distanceMin) params.set("distanceMin", filters.distanceMin);
    if (filters.distanceMax) params.set("distanceMax", filters.distanceMax);
    if (filters.minShots !== 10) params.set("minShots", filters.minShots.toString());
    if (filters.positionOnly) params.set("positionOnly", "true");
    if (filters.allowSynthetic) params.set("allowSynthetic", "true");

    router.replace(`/analytics/firearms?${params.toString()}`, { scroll: false });
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
        <FilterBar
          filters={filters}
          onChange={setFilters}
          firearms={firearms}
          calibers={calibers}
          optics={optics}
        />
        <EmptyState
          title="No firearm data available"
          description="No sessions match your current filters. Try adjusting your filters or record some shooting sessions."
        />
      </div>
    );
  }

  const selectedData = data.leaderboard.find((f) => f.firearmId === selectedFirearm);
  const selectedTrend = selectedFirearm ? data.trends[selectedFirearm] : null;
  const selectedDistanceCurve = selectedFirearm ? data.distanceCurves[selectedFirearm] : null;

  // Trend chart for selected firearm
  const trendChartOption: EChartsOption | null = selectedTrend
    ? {
        tooltip: {
          trigger: "axis",
          formatter: (params: any) => {
            const session = selectedTrend[params[0].dataIndex];
            return `
              <strong>Session ${session.sessionIndex + 1}</strong><br/>
              Avg Score: ${session.avgScorePerShot.toFixed(2)}<br/>
              Bull Rate: ${(session.bullRate * 100).toFixed(1)}%<br/>
              Shots: ${session.totalShots}
            `;
          },
        },
        legend: {
          data: ["Avg Score", "Bull Rate"],
          textStyle: { color: "hsl(var(--foreground))" },
        },
        xAxis: {
          type: "category",
          data: selectedTrend.map((s: any, i: number) => `S${i + 1}`),
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
            name: "Bull Rate",
            min: 0,
            max: 1,
            axisLabel: {
              formatter: (val: number) => `${(val * 100).toFixed(0)}%`,
            },
          },
        ],
        series: [
          {
            name: "Avg Score",
            data: selectedTrend.map((s: any) => s.avgScorePerShot),
            type: "line",
            smooth: true,
            lineStyle: { color: CHART_COLORS.primary, width: 3 },
            itemStyle: { color: CHART_COLORS.primary },
          },
          {
            name: "Bull Rate",
            data: selectedTrend.map((s: any) => s.bullRate),
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            lineStyle: { color: CHART_COLORS.success, width: 3 },
            itemStyle: { color: CHART_COLORS.success },
          },
        ],
      }
    : null;

  // Mean radius trend (if available)
  const hasMeanRadiusData = selectedTrend?.some((s: any) => s.meanRadius !== undefined);
  const meanRadiusTrendOption: EChartsOption | null =
    hasMeanRadiusData && selectedTrend
      ? {
          tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
              const session = selectedTrend[params[0].dataIndex];
              return `
                <strong>Session ${session.sessionIndex + 1}</strong><br/>
                Mean Radius: ${session.meanRadius?.toFixed(2) || "N/A"}<br/>
                Centroid Distance: ${session.centroidDistance?.toFixed(2) || "N/A"}
              `;
            },
          },
          legend: {
            data: ["Mean Radius", "Centroid Distance"],
            textStyle: { color: "hsl(var(--foreground))" },
          },
          xAxis: {
            type: "category",
            data: selectedTrend.map((s: any, i: number) => `S${i + 1}`),
          },
          yAxis: {
            type: "value",
            name: "Target Units",
          },
          series: [
            {
              name: "Mean Radius",
              data: selectedTrend.map((s: any) => s.meanRadius || null),
              type: "line",
              smooth: true,
              lineStyle: { color: CHART_COLORS.info, width: 3 },
              itemStyle: { color: CHART_COLORS.info },
            },
            {
              name: "Centroid Distance",
              data: selectedTrend.map((s: any) => s.centroidDistance || null),
              type: "line",
              smooth: true,
              lineStyle: { color: CHART_COLORS.warning, width: 3 },
              itemStyle: { color: CHART_COLORS.warning },
            },
          ],
        }
      : null;

  // Distance curve
  const distanceCurveOption: EChartsOption | null = selectedDistanceCurve
    ? {
        tooltip: {
          trigger: "axis",
          formatter: (params: any) => {
            const point = selectedDistanceCurve[params[0].dataIndex];
            return `
              <strong>${point.distance} yards</strong><br/>
              Avg Score: ${point.avgScorePerShot.toFixed(2)}<br/>
              Bull Rate: ${(point.bullRate * 100).toFixed(1)}%<br/>
              Shots: ${point.totalShots}
            `;
          },
        },
        xAxis: {
          type: "category",
          data: selectedDistanceCurve.map((d: any) => `${d.distance}yd`),
          name: "Distance",
        },
        yAxis: {
          type: "value",
          name: "Avg Score",
          min: 0,
          max: 5,
        },
        series: [
          {
            data: selectedDistanceCurve.map((d: any) => d.avgScorePerShot),
            type: "line",
            smooth: true,
            lineStyle: { color: CHART_COLORS.primary, width: 3 },
            itemStyle: { color: CHART_COLORS.primary },
            areaStyle: { color: CHART_COLORS.primary, opacity: 0.1 },
          },
        ],
      }
    : null;

  return (
    <div>
      <AnalyticsHeader
        title="Firearms Analytics"
        icon={Target}
        description="Performance leaderboard and trends by firearm"
      />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        firearms={firearms}
        calibers={calibers}
        optics={optics}
      />

      {/* Leaderboard */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Firearm Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.leaderboard.map((firearm, index) => (
              <button
                key={firearm.firearmId}
                onClick={() => setSelectedFirearm(firearm.firearmId)}
                className={`w-full text-left p-4 rounded-lg transition-colors ${
                  selectedFirearm === firearm.firearmId
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">#{index + 1}</span>
                    <span className="text-lg font-semibold">{firearm.firearmName}</span>
                  </div>
                  <span className="text-2xl font-bold">{firearm.avgScorePerShot.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="opacity-70">Bull Rate</div>
                    <div className="font-semibold">{(firearm.bullRate * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="opacity-70">Miss Rate</div>
                    <div className="font-semibold">{(firearm.missRate * 100).toFixed(1)}%</div>
                  </div>
                  {firearm.meanRadius !== undefined && firearm.meanRadius !== null && (
                    <div>
                      <div className="opacity-70">Mean Radius</div>
                      <div className="font-semibold">{firearm.meanRadius.toFixed(2)}</div>
                    </div>
                  )}
                  <div>
                    <div className="opacity-70">Shots</div>
                    <div className="font-semibold">{firearm.totalShots}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail View for Selected Firearm */}
      {selectedData && (
        <>
          <h2 className="text-2xl font-bold mb-4">{selectedData.firearmName} - Detailed Analysis</h2>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Avg Score/Shot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{selectedData.avgScorePerShot.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Bull Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{(selectedData.bullRate * 100).toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Crosshair className="h-4 w-4" />
                  Miss Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{(selectedData.missRate * 100).toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total Shots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{selectedData.totalShots}</p>
              </CardContent>
            </Card>
          </div>

          {/* Position Metrics */}
          {selectedData.meanRadius !== undefined && selectedData.meanRadius !== null && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Radius className="h-4 w-4" />
                    Mean Radius
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{selectedData.meanRadius.toFixed(2)}</p>
                </CardContent>
              </Card>

              {selectedData.centroidDistance !== undefined && selectedData.centroidDistance !== null && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Focus className="h-4 w-4" />
                      Centroid Distance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{selectedData.centroidDistance.toFixed(2)}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Tightness Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{selectedData.tightnessScore}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="space-y-6 mb-6">
            {trendChartOption && (
              <ChartCard title="Score & Bull Rate Over Sessions" icon={TrendingUp}>
                <EChart option={trendChartOption} height={300} />
              </ChartCard>
            )}

            {meanRadiusTrendOption && (
              <ChartCard title="Precision Metrics Over Sessions" icon={Radius}>
                <EChart option={meanRadiusTrendOption} height={300} />
              </ChartCard>
            )}

            {distanceCurveOption && (
              <ChartCard title="Performance by Distance" icon={Ruler}>
                <EChart option={distanceCurveOption} height={300} />
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

