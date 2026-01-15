"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  Eye,
  TrendingUp,
  Target,
  Crosshair,
  Radius,
  Activity,
  Ruler,
} from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { FilterBar, AnalyticsFilters } from "@/components/analytics/FilterBar";
import { ChartCard } from "@/components/analytics/ChartCard";
import { EmptyState } from "@/components/analytics/EmptyState";
import { EChart, CHART_COLORS } from "@/components/analytics/EChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from "@/components/ui/spinner";
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
  const [selectedOptic, setSelectedOptic] = useState<string | null>(null);

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
        if (fetchedData.leaderboard.length > 0 && !selectedOptic) {
          setSelectedOptic(fetchedData.leaderboard[0].opticId);
        }
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
      <div>
        <AnalyticsHeader
          title="Optics Analytics"
          icon={Eye}
          description="Performance leaderboard and trends by optic"
        />
        <LoadingCard />
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

  const selectedData = data.leaderboard.find((o) => o.opticId === selectedOptic);
  const selectedTrend = selectedOptic ? data.trends[selectedOptic] : null;
  const selectedDistanceCurve = selectedOptic ? data.distanceCurves[selectedOptic] : null;

  const trendChartOption: EChartsOption | null = selectedTrend
    ? {
        tooltip: { trigger: "axis" },
        legend: { data: ["Avg Score", "Bull Rate"], textStyle: { color: "hsl(var(--foreground))" } },
        xAxis: { type: "category", data: selectedTrend.map((s: any, i: number) => `S${i + 1}`) },
        yAxis: [
          { type: "value", name: "Avg Score", min: 0, max: 5 },
          { type: "value", name: "Bull Rate", min: 0, max: 1 },
        ],
        series: [
          {
            name: "Avg Score",
            data: selectedTrend.map((s: any) => s.avgScorePerShot),
            type: "line",
            smooth: true,
            lineStyle: { color: CHART_COLORS.primary, width: 3 },
          },
          {
            name: "Bull Rate",
            data: selectedTrend.map((s: any) => s.bullRate),
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            lineStyle: { color: CHART_COLORS.success, width: 3 },
          },
        ],
      }
    : null;

  const distanceCurveOption: EChartsOption | null = selectedDistanceCurve
    ? {
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: selectedDistanceCurve.map((d: any) => `${d.distance}yd`) },
        yAxis: { type: "value", name: "Avg Score", min: 0, max: 5 },
        series: [
          {
            data: selectedDistanceCurve.map((d: any) => d.avgScorePerShot),
            type: "line",
            smooth: true,
            lineStyle: { color: CHART_COLORS.primary, width: 3 },
            areaStyle: { color: CHART_COLORS.primary, opacity: 0.1 },
          },
        ],
      }
    : null;

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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Optic Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.leaderboard.map((optic, index) => (
              <button
                key={optic.opticId}
                onClick={() => setSelectedOptic(optic.opticId)}
                className={`w-full text-left p-4 rounded-lg transition-colors ${
                  selectedOptic === optic.opticId
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">#{index + 1}</span>
                    <span className="text-lg font-semibold">{optic.opticName}</span>
                  </div>
                  <span className="text-2xl font-bold">{optic.avgScorePerShot.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="opacity-70">Bull Rate</div>
                    <div className="font-semibold">{(optic.bullRate * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="opacity-70">Miss Rate</div>
                    <div className="font-semibold">{(optic.missRate * 100).toFixed(1)}%</div>
                  </div>
                  {optic.meanRadius !== undefined && optic.meanRadius !== null && (
                    <div>
                      <div className="opacity-70">Mean Radius</div>
                      <div className="font-semibold">{optic.meanRadius.toFixed(2)}</div>
                    </div>
                  )}
                  <div>
                    <div className="opacity-70">Shots</div>
                    <div className="font-semibold">{optic.totalShots}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedData && (
        <>
          <h2 className="text-2xl font-bold mb-4">{selectedData.opticName} - Detailed Analysis</h2>

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

          <div className="space-y-6 mb-6">
            {trendChartOption && (
              <ChartCard title="Score & Bull Rate Over Sessions" icon={TrendingUp}>
                <EChart option={trendChartOption} height={300} />
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

