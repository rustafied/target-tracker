"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

export const dynamic = 'force-dynamic';
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
import { DistanceAnalysisCard } from "@/components/analytics/DistanceAnalysisCard";
import { formatDecimal } from "@/lib/utils";
import { SequenceAnalysisCard } from "@/components/analytics/SequenceAnalysisCard";
import { EfficiencySummary } from "@/components/analytics/EfficiencySummary";
import { AnomalySummaryWidget } from "@/components/analytics/AnomalySummaryWidget";
import { ExpandedInsightsPanel, Insight } from "@/components/ExpandedInsightsPanel";
import { LazyLoad } from "@/components/LazyLoad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/spinner";
import { AnalyticsLoadingSkeleton, KpiCardSkeleton, ChartCardSkeleton } from "@/components/analytics/SkeletonLoader";
import { FadeIn } from "@/components/ui/fade-in";
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
  trends: {
    avgScore: { direction: "improving" | "stable" | "declining"; slope: number; confidence: number };
    bullRate: { direction: "improving" | "stable" | "declining"; slope: number; confidence: number };
    missRate: { direction: "improving" | "stable" | "declining"; slope: number; confidence: number };
    tightnessScore: { direction: "improving" | "stable" | "declining"; slope: number; confidence: number };
    meanRadius: { direction: "improving" | "stable" | "declining"; slope: number; confidence: number } | null;
    centroidDistance: { direction: "improving" | "stable" | "declining"; slope: number; confidence: number } | null;
  } | null;
  sessions: any[];
  ringDistributions: any[];
  shotsPerSession: any[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [firearms, setFirearms] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [optics, setOptics] = useState<{ _id: string; name: string }[]>([]);

  const [filters, setFilters] = useState<AnalyticsFilters>({
    firearmIds: searchParams.get("firearmIds")?.split(",").filter(Boolean) || [],
    caliberIds: searchParams.get("caliberIds")?.split(",").filter(Boolean) || [],
    opticIds: searchParams.get("opticIds")?.split(",").filter(Boolean) || [],
    distanceMin: parseInt(searchParams.get("distanceMin") || "0"),
    distanceMax: parseInt(searchParams.get("distanceMax") || "100"),
  });

  useEffect(() => {
    fetchReferenceData();
    // Defer insights fetching to reduce initial load
    const timer = setTimeout(() => {
      fetchInsights();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchAnalytics();
    updateURL();
  }, [filters]);

  const fetchInsights = async () => {
    try {
      setInsightsLoading(true);
      const res = await fetch('/api/insights/overview');
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setInsightsLoading(false);
    }
  };

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
        
        // Extract unique IDs from sheets - convert everything to string for comparison
        const usedFirearmIds = new Set(
          sheets
            .map((s: any) => {
              if (!s.firearmId) return null;
              return typeof s.firearmId === 'string' ? s.firearmId : String(s.firearmId);
            })
            .filter(Boolean)
        );
        const usedCaliberIds = new Set(
          sheets
            .map((s: any) => {
              if (!s.caliberId) return null;
              return typeof s.caliberId === 'string' ? s.caliberId : String(s.caliberId);
            })
            .filter(Boolean)
        );
        const usedOpticIds = new Set(
          sheets
            .map((s: any) => {
              if (!s.opticId) return null;
              return typeof s.opticId === 'string' ? s.opticId : String(s.opticId);
            })
            .filter(Boolean)
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
      if (filters.opticIds.length > 0) params.append("opticIds", filters.opticIds.join(","));
      if (filters.distanceMin > 0) params.append("distanceMin", filters.distanceMin.toString());
      if (filters.distanceMax < 100) params.append("distanceMax", filters.distanceMax.toString());
      params.append("minShots", "10");
      params.append("positionOnly", "true");

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
    if (filters.distanceMin > 0) params.set("distanceMin", filters.distanceMin.toString());
    if (filters.distanceMax < 100) params.set("distanceMax", filters.distanceMax.toString());

    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <AnalyticsHeader title="Analytics" icon={BarChart3} description="Track your shooting performance over time" />
        <FilterBar filters={filters} onChange={setFilters} firearms={firearms} calibers={calibers} optics={optics} />
        <AnalyticsLoadingSkeleton />
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

  const { kpis, deltas, trends, sessions, ringDistributions, shotsPerSession } = data;

  // Debug logging

  // Chart: Average Score Per Shot Over Sessions
  const avgScoreChartOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const session = sessions[params[0].dataIndex];
        return `
          <strong>Session ${session.sessionIndex + 1}</strong><br/>
          ${format(new Date(session.date), "MMM d, yyyy")}<br/>
          Avg Score: ${formatDecimal(session.avgScorePerShot)}<br/>
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
              Mean Radius: ${session.meanRadius ? formatDecimal(session.meanRadius) : "N/A"}
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
      <FadeIn duration={200}>
        <AnalyticsHeader
          title="Analytics"
          icon={BarChart3}
          description="Track your shooting performance over time"
        >
          <Link href="/analytics/compare?type=firearm">
            <Button variant="outline" className="dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20">
              <BarChart3 className="mr-2 h-4 w-4" />
              Compare Items
            </Button>
          </Link>
        </AnalyticsHeader>
      </FadeIn>

      <FadeIn delay={50} duration={200}>
        <FilterBar filters={filters} onChange={setFilters} firearms={firearms} calibers={calibers} optics={optics} />
      </FadeIn>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FadeIn delay={100} duration={250}>
          <KpiCard
            title="Avg Score/Shot"
            value={formatDecimal(kpis.avgScore)}
            icon={TrendingUp}
            delta={deltas.last3VsPrev3?.avgScore.delta}
            higherIsBetter={true}
            subtitle="Overall average"
            trend={trends?.avgScore.direction}
            trendConfidence={trends?.avgScore.confidence}
          />
        </FadeIn>
        <FadeIn delay={150} duration={250}>
          <KpiCard
            title="Bull Rate"
            value={`${(kpis.bullRate * 100).toFixed(1)}%`}
            icon={Target}
            delta={deltas.last3VsPrev3?.bullRate.delta}
            higherIsBetter={true}
            subtitle="Overall average"
            trend={trends?.bullRate.direction}
            trendConfidence={trends?.bullRate.confidence}
          />
        </FadeIn>
        <FadeIn delay={200} duration={250}>
          <KpiCard
            title="Miss Rate"
            value={`${(kpis.missRate * 100).toFixed(1)}%`}
            icon={Crosshair}
            delta={deltas.last3VsPrev3?.missRate.delta}
            higherIsBetter={false}
            subtitle="Overall average"
            trend={trends?.missRate.direction}
            trendConfidence={trends?.missRate.confidence}
          />
        </FadeIn>
        <FadeIn delay={250} duration={250}>
          <KpiCard
            title="Total Shots"
            value={kpis.totalShots}
            icon={Activity}
            subtitle={`${kpis.sessionsCount} sessions`}
          />
        </FadeIn>
      </div>
      <FadeIn delay={300}>
        <p className="text-xs text-muted-foreground mt-2 mb-6">Last 3 vs prev 3 sessions</p>
      </FadeIn>

      {/* Position-based KPIs (if available) */}
      {kpis.shotCoverage > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.meanRadius !== null && (
              <FadeIn delay={350} duration={250}>
                <KpiCard
                  title="Mean Radius"
                  value={formatDecimal(kpis.meanRadius)}
                  icon={Radius}
                  delta={deltas.last3VsPrev3?.meanRadius?.delta}
                  higherIsBetter={false}
                  subtitle="Target units"
                  trend={trends?.meanRadius?.direction}
                  trendConfidence={trends?.meanRadius?.confidence}
                />
              </FadeIn>
            )}
            {kpis.centroidDistance !== null && (
              <FadeIn delay={400} duration={250}>
                <KpiCard
                  title="Centroid Distance"
                  value={formatDecimal(kpis.centroidDistance)}
                  icon={Focus}
                  delta={deltas.last3VsPrev3?.centroidDistance?.delta}
                  higherIsBetter={false}
                  subtitle="Bias from center"
                  trend={trends?.centroidDistance?.direction}
                  trendConfidence={trends?.centroidDistance?.confidence}
                />
              </FadeIn>
            )}
            <FadeIn delay={450} duration={250}>
              <KpiCard
                title="Tightness Score"
                value={kpis.tightnessScore}
                icon={Sparkles}
                delta={deltas.last3VsPrev3?.tightnessScore?.delta}
                higherIsBetter={true}
                subtitle="0-100 scale"
                trend={trends?.tightnessScore.direction}
                trendConfidence={trends?.tightnessScore.confidence}
              />
            </FadeIn>
            <FadeIn delay={500} duration={250}>
              <KpiCard
                title="Shot Coverage"
                value={`${(kpis.shotCoverage * 100).toFixed(1)}%`}
                icon={PieChart}
                subtitle="With position data"
              />
            </FadeIn>
          </div>
          <FadeIn delay={550}>
            <p className="text-xs text-muted-foreground mt-2 mb-6">Last 3 vs prev 3 sessions</p>
          </FadeIn>
        </>
      )}

      {/* Overview Insights */}
      <FadeIn delay={600} duration={300}>
        <div className="mb-6">
          <LazyLoad height="200px">
            <ExpandedInsightsPanel
              insights={insights}
              title="Overview Insights"
              description="High-level trends and recommendations across all your sessions"
              loading={insightsLoading}
              maxVisible={5}
            />
          </LazyLoad>
        </div>
      </FadeIn>

      {/* Performance Insights */}
      {deltas.last3VsPrev3 && trends && (
        <FadeIn delay={650} duration={300}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {trends.avgScore.direction !== "stable" && (
                  <li>
                    Overall trend shows your average score is{" "}
                    <strong className={trends.avgScore.direction === "improving" ? "text-green-500" : "text-red-500"}>
                      {trends.avgScore.direction}
                    </strong>
                    {" "}across all sessions.
                  </li>
                )}
                {deltas.last3VsPrev3.avgScore.delta !== null && Math.abs(deltas.last3VsPrev3.avgScore.delta) > 2 && (
                  <li>
                    Your last 3 sessions averaged{" "}
                    <strong className={deltas.last3VsPrev3.avgScore.isImprovement ? "text-green-500" : "text-red-500"}>
                      {deltas.last3VsPrev3.avgScore.delta > 0 ? "+" : ""}
                      {deltas.last3VsPrev3.avgScore.delta.toFixed(1)}%
                    </strong>
                    {" "}compared to the previous 3 sessions.
                  </li>
                )}
                {trends.bullRate.direction !== "stable" && (
                  <li>
                    Your bull rate is trending{" "}
                    <strong className={trends.bullRate.direction === "improving" ? "text-green-500" : "text-red-500"}>
                      {trends.bullRate.direction}
                    </strong>
                    {" "}over time.
                  </li>
                )}
                {trends.meanRadius && trends.meanRadius.direction === "improving" && (
                  <li>
                    Great progress! Your shot groupings are getting{" "}
                    <strong className="text-green-500">tighter</strong> over time.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Charts */}
      <div className="space-y-6 mb-6">
        <FadeIn delay={700} duration={300}>
          <ChartCard title="Average Score Over Sessions" icon={LineChart}>
            <EChart option={avgScoreChartOption} height={300} />
          </ChartCard>
        </FadeIn>

        {/* Distance Impact Analysis */}
        <FadeIn delay={750} duration={300}>
          <DistanceAnalysisCard
            groupBy="firearm"
            filters={{
              firearmIds: filters.firearmIds,
              caliberIds: filters.caliberIds,
              opticIds: filters.opticIds,
              distanceMin: filters.distanceMin,
              distanceMax: filters.distanceMax,
              minShots: 10,
              positionOnly: true,
            }}
            targetDiameterInches={10.5}
            showMOA={true}
            title="Distance Impact Analysis"
          />
        </FadeIn>

        <FadeIn delay={800} duration={300}>
          <ChartCard title="Bull Rate & Miss Rate" icon={TrendingUp}>
            <EChart option={bullMissChartOption} height={300} />
          </ChartCard>
        </FadeIn>

        {meanRadiusChartOption && (
          <FadeIn delay={850} duration={300}>
            <ChartCard title="Mean Radius (Precision)" icon={Radius}>
              <EChart option={meanRadiusChartOption} height={300} />
            </ChartCard>
          </FadeIn>
        )}

        <FadeIn delay={900} duration={300}>
          <ChartCard title="Shots Per Session" icon={Activity}>
            <EChart option={shotCountChartOption} height={250} />
          </ChartCard>
        </FadeIn>

        <FadeIn delay={950} duration={300}>
          <ChartCard title="Ring Distribution" icon={PieChart}>
            <EChart option={ringDistChartOption} height={300} />
          </ChartCard>
        </FadeIn>

        {/* Fatigue & Sequence Analysis */}
        <FadeIn delay={1000} duration={300}>
          <LazyLoad height="500px">
            <SequenceAnalysisCard
              filters={{
                firearmIds: filters.firearmIds,
                caliberIds: filters.caliberIds,
                opticIds: filters.opticIds,
                distanceMin: filters.distanceMin,
                distanceMax: filters.distanceMax,
                minShots: 10,
                positionOnly: true,
              }}
            />
          </LazyLoad>
        </FadeIn>
      </div>

      {/* Efficiency Summary */}
      <FadeIn delay={1100} duration={300}>
        <div className="mb-6">
          <LazyLoad height="400px">
            <EfficiencySummary
              filters={{
                firearmIds: filters.firearmIds,
                caliberIds: filters.caliberIds,
                opticIds: filters.opticIds,
              }}
            />
          </LazyLoad>
        </div>
      </FadeIn>

      {/* Anomaly Detection Summary */}
      <FadeIn delay={1150} duration={300}>
        <div className="mb-6">
          <LazyLoad height="300px">
            <AnomalySummaryWidget threshold={20} minSessions={5} maxDisplay={5} />
          </LazyLoad>
        </div>
      </FadeIn>

      {/* Drilldown Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <FadeIn delay={1200} duration={250}>
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
        </FadeIn>

        <FadeIn delay={1250} duration={250}>
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
        </FadeIn>

        <FadeIn delay={1300} duration={250}>
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
        </FadeIn>
      </div>
    </div>
  );
}
