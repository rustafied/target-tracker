"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  TrendingUp,
  Target,
  Crosshair,
  Radius,
  Focus,
  Activity,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { FilterBar, AnalyticsFilters } from "@/components/analytics/FilterBar";
import { KpiCard } from "@/components/analytics/KpiCard";
import { ChartCard } from "@/components/analytics/ChartCard";
import { EmptyState } from "@/components/analytics/EmptyState";
import { EChart, CHART_COLORS } from "@/components/analytics/EChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EChartsOption } from "echarts";

interface OverviewData {
  kpis: {
    avgScore: number;
    bullRate: number;
    missRate: number;
    meanRadius: number | null;
    centroidDistance: number | null;
    tightnessScore: number;
    totalShots: number;
    sessionsCount: number;
    shotCoverage: number;
    goodHitRate: number;
  };
  deltas: {
    lastVsPrev: any;
    last3VsPrev3: any;
  };
  sessions: any[];
  ringDistributions: any[];
  shotsPerSession: any[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firearms, setFirearms] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [optics, setOptics] = useState<{ _id: string; name: string }[]>([]);

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

      const res = await fetch(`/api/analytics/overview?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load analytics");
      }
    } catch (error) {
      toast.error("Failed to load analytics");
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

    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  if (loading && !data) {
    return (
      <div>
        <AnalyticsHeader title="Analytics" icon={BarChart3} description="Track your shooting performance over time" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading analytics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <div>
        <AnalyticsHeader title="Analytics" icon={BarChart3} description="Track your shooting performance over time" />
        <FilterBar filters={filters} onChange={setFilters} firearms={firearms} calibers={calibers} optics={optics} />
        <EmptyState
          title="No data available"
          description="No sessions match your current filters. Try adjusting your filters or record some shooting sessions to see analytics."
        />
      </div>
    );
  }

  const { kpis, deltas, sessions, ringDistributions, shotsPerSession } = data;

  // Debug logging
  console.log("Analytics data:", { sessions, ringDistributions, shotsPerSession });

  // Chart: Average Score Per Shot Over Sessions
  const avgScoreChartOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const session = sessions[params[0].dataIndex];
        return `
          <strong>Session ${session.sessionIndex + 1}</strong><br/>
          ${format(new Date(session.date), "MMM d, yyyy")}<br/>
          Avg Score: ${session.avgScorePerShot.toFixed(2)}<br/>
          Bull Rate: ${(session.bullRate * 100).toFixed(1)}%<br/>
          Shots: ${session.totalShots}
        `;
      },
    },
    xAxis: {
      type: "category",
      data: sessions.map((s, i) => `S${i + 1}`),
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 5,
      name: "Score",
    },
    series: [
      {
        data: sessions.map((s) => s.avgScorePerShot),
        type: "line",
        smooth: true,
        lineStyle: { color: CHART_COLORS.primary, width: 3 },
        itemStyle: { color: CHART_COLORS.primary },
        areaStyle: { color: CHART_COLORS.primary, opacity: 0.1 },
      },
    ],
  };

  // Chart: Bull Rate and Miss Rate Over Sessions
  const bullMissChartOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const session = sessions[params[0].dataIndex];
        return `
          <strong>Session ${session.sessionIndex + 1}</strong><br/>
          Bull Rate: ${(session.bullRate * 100).toFixed(1)}%<br/>
          Miss Rate: ${(session.missRate * 100).toFixed(1)}%
        `;
      },
    },
    legend: {
      data: ["Bull Rate", "Miss Rate"],
      textStyle: { color: "hsl(var(--foreground))" },
    },
    xAxis: {
      type: "category",
      data: sessions.map((s, i) => `S${i + 1}`),
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      name: "Rate",
      axisLabel: {
        formatter: (val: number) => `${(val * 100).toFixed(0)}%`,
      },
    },
    series: [
      {
        name: "Bull Rate",
        data: sessions.map((s) => s.bullRate),
        type: "line",
        smooth: true,
        lineStyle: { color: CHART_COLORS.success },
        itemStyle: { color: CHART_COLORS.success },
      },
      {
        name: "Miss Rate",
        data: sessions.map((s) => s.missRate),
        type: "line",
        smooth: true,
        lineStyle: { color: CHART_COLORS.danger },
        itemStyle: { color: CHART_COLORS.danger },
      },
    ],
  };

  // Chart: Mean Radius Over Sessions (if available)
  const hasMeanRadiusData = sessions.some((s) => s.meanRadius !== undefined);
  const meanRadiusChartOption: EChartsOption | null = hasMeanRadiusData
    ? {
        tooltip: {
          trigger: "axis",
          formatter: (params: any) => {
            const session = sessions[params[0].dataIndex];
            return `
              <strong>Session ${session.sessionIndex + 1}</strong><br/>
              Mean Radius: ${session.meanRadius?.toFixed(2) || "N/A"}
            `;
          },
        },
        xAxis: {
          type: "category",
          data: sessions.map((s, i) => `S${i + 1}`),
        },
        yAxis: {
          type: "value",
          name: "Mean Radius",
        },
        series: [
          {
            data: sessions.map((s) => s.meanRadius || null),
            type: "line",
            smooth: true,
            lineStyle: { color: CHART_COLORS.info, width: 3 },
            itemStyle: { color: CHART_COLORS.info },
          },
        ],
      }
    : null;

  // Chart: Shots Per Session (Bar)
  const shotCountChartOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      data: shotsPerSession.map((s, i) => `S${i + 1}`),
    },
    yAxis: {
      type: "value",
      name: "Shots",
    },
    series: [
      {
        data: shotsPerSession.map((s) => s.shots),
        type: "bar",
        itemStyle: { color: CHART_COLORS.primary },
      },
    ],
  };

  // Chart: Ring Distribution Stacked
  const ringDistChartOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        let result = `<strong>Session ${params[0].axisValue}</strong><br/>`;
        params.forEach((p: any) => {
          result += `${p.seriesName}: ${(p.value * 100).toFixed(1)}%<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ["5", "4", "3", "2", "1", "0"],
      textStyle: { color: "hsl(var(--foreground))" },
    },
    xAxis: {
      type: "category",
      data: ringDistributions.map((r, i) => `S${i + 1}`),
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      axisLabel: {
        formatter: (val: number) => `${(val * 100).toFixed(0)}%`,
      },
    },
    series: [
      {
        name: "5",
        data: ringDistributions.map((r) => r.p5),
        type: "bar",
        stack: "rings",
        itemStyle: { color: CHART_COLORS.score5 },
      },
      {
        name: "4",
        data: ringDistributions.map((r) => r.p4),
        type: "bar",
        stack: "rings",
        itemStyle: { color: CHART_COLORS.score4 },
      },
      {
        name: "3",
        data: ringDistributions.map((r) => r.p3),
        type: "bar",
        stack: "rings",
        itemStyle: { color: CHART_COLORS.score3 },
      },
      {
        name: "2",
        data: ringDistributions.map((r) => r.p2),
        type: "bar",
        stack: "rings",
        itemStyle: { color: CHART_COLORS.score2 },
      },
      {
        name: "1",
        data: ringDistributions.map((r) => r.p1),
        type: "bar",
        stack: "rings",
        itemStyle: { color: CHART_COLORS.score1 },
      },
      {
        name: "0",
        data: ringDistributions.map((r) => r.p0),
        type: "bar",
        stack: "rings",
        itemStyle: { color: CHART_COLORS.score0 },
      },
    ],
  };

  return (
    <div>
      <AnalyticsHeader
        title="Analytics"
        icon={BarChart3}
        description="Track your shooting performance over time"
      />

      <FilterBar filters={filters} onChange={setFilters} firearms={firearms} calibers={calibers} optics={optics} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard
          title="Avg Score/Shot"
          value={kpis.avgScore.toFixed(2)}
          icon={TrendingUp}
          delta={deltas.lastVsPrev?.avgScore.delta}
          higherIsBetter={true}
          subtitle="Last session"
        />
        <KpiCard
          title="Bull Rate"
          value={`${(kpis.bullRate * 100).toFixed(1)}%`}
          icon={Target}
          delta={deltas.lastVsPrev?.bullRate.delta}
          higherIsBetter={true}
          subtitle="Last session"
        />
        <KpiCard
          title="Miss Rate"
          value={`${(kpis.missRate * 100).toFixed(1)}%`}
          icon={Crosshair}
          delta={deltas.lastVsPrev?.missRate.delta}
          higherIsBetter={false}
          subtitle="Last session"
        />
        <KpiCard
          title="Total Shots"
          value={kpis.totalShots}
          icon={Activity}
          subtitle={`${kpis.sessionsCount} sessions`}
        />
      </div>

      {/* Position-based KPIs (if available) */}
      {kpis.shotCoverage > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {kpis.meanRadius !== null && (
            <KpiCard
              title="Mean Radius"
              value={kpis.meanRadius.toFixed(2)}
              icon={Radius}
              delta={deltas.lastVsPrev?.meanRadius?.delta}
              higherIsBetter={false}
              subtitle="Target units"
            />
          )}
          {kpis.centroidDistance !== null && (
            <KpiCard
              title="Centroid Distance"
              value={kpis.centroidDistance.toFixed(2)}
              icon={Focus}
              delta={deltas.lastVsPrev?.centroidDistance?.delta}
              higherIsBetter={false}
              subtitle="Bias from center"
            />
          )}
          <KpiCard
            title="Tightness Score"
            value={kpis.tightnessScore}
            icon={Sparkles}
            delta={deltas.lastVsPrev?.tightnessScore.delta}
            higherIsBetter={true}
            subtitle="0-100 scale"
          />
          <KpiCard
            title="Shot Coverage"
            value={`${(kpis.shotCoverage * 100).toFixed(1)}%`}
            icon={PieChart}
            subtitle="With position data"
          />
        </div>
      )}

      {/* Charts */}
      <div className="space-y-6 mb-6">
        <ChartCard title="Average Score Over Sessions" icon={LineChart}>
          <EChart option={avgScoreChartOption} height={300} />
        </ChartCard>

        <ChartCard title="Bull Rate & Miss Rate" icon={TrendingUp}>
          <EChart option={bullMissChartOption} height={300} />
        </ChartCard>

        {meanRadiusChartOption && (
          <ChartCard title="Mean Radius (Precision)" icon={Radius}>
            <EChart option={meanRadiusChartOption} height={300} />
          </ChartCard>
        )}

        <ChartCard title="Shots Per Session" icon={Activity}>
          <EChart option={shotCountChartOption} height={250} />
        </ChartCard>

        <ChartCard title="Ring Distribution" icon={PieChart}>
          <EChart option={ringDistChartOption} height={300} />
        </ChartCard>
      </div>

      {/* Drilldown Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Link href="/analytics/targets">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Shot Visualizations
                </span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Heatmaps, shot plots, bias analysis, and group metrics
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/firearms">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Firearms
                </span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Performance leaderboard and trends by firearm
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics/calibers">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Crosshair className="h-5 w-5" />
                  Calibers
                </span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Performance leaderboard and trends by caliber
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Insights */}
      {deltas.lastVsPrev && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Recent Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {deltas.lastVsPrev.avgScore.delta !== null && Math.abs(deltas.lastVsPrev.avgScore.delta) > 0.1 && (
                <li>
                  Average score{" "}
                  <strong className={deltas.lastVsPrev.avgScore.isImprovement ? "text-green-500" : "text-red-500"}>
                    {deltas.lastVsPrev.avgScore.delta > 0 ? "increased" : "decreased"} by{" "}
                    {Math.abs(deltas.lastVsPrev.avgScore.delta).toFixed(1)}%
                  </strong>{" "}
                  in your last session.
                </li>
              )}
              {deltas.lastVsPrev.bullRate.delta !== null && Math.abs(deltas.lastVsPrev.bullRate.delta) > 0.1 && (
                <li>
                  Bull rate{" "}
                  <strong className={deltas.lastVsPrev.bullRate.isImprovement ? "text-green-500" : "text-red-500"}>
                    {deltas.lastVsPrev.bullRate.delta > 0 ? "improved" : "declined"} by{" "}
                    {Math.abs(deltas.lastVsPrev.bullRate.delta).toFixed(1)}%
                  </strong>
                  .
                </li>
              )}
              {deltas.lastVsPrev.meanRadius && deltas.lastVsPrev.meanRadius.delta !== null && (
                <li>
                  Mean radius{" "}
                  <strong className={deltas.lastVsPrev.meanRadius.isImprovement ? "text-green-500" : "text-red-500"}>
                    {deltas.lastVsPrev.meanRadius.delta > 0 ? "increased" : "decreased"} by{" "}
                    {Math.abs(deltas.lastVsPrev.meanRadius.delta).toFixed(1)}%
                  </strong>
                  {" - "}tighter grouping!
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
