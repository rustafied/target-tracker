"use client";

import { useState, useEffect } from "react";
import { Activity, TrendingDown, TrendingUp, Minus, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EChart, CHART_COLORS } from "./EChart";
import { LoadingCard } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { EChartsOption } from "echarts";

interface SequenceBucket {
  bucket: number;
  label: string;
  avgScore: number;
  bullRate: number;
  missRate: number;
  meanRadius: number | null;
  biasX: number | null;
  biasY: number | null;
  shotCount: number;
  sessions: number;
}

interface SequenceData {
  buckets: SequenceBucket[];
  overall: {
    avgScore: number;
    bullRate: number;
    missRate: number;
    totalShots: number;
  };
  trend: {
    slope: number;
    direction: "improving" | "stable" | "declining";
    confidence: number;
  } | null;
  insights: string[];
}

interface SequenceAnalysisCardProps {
  filters: {
    firearmIds?: string[];
    caliberIds?: string[];
    opticIds?: string[];
    distanceMin?: string;
    distanceMax?: string;
    minShots?: number;
    positionOnly?: boolean;
  };
  sessionIds?: string[];
  title?: string;
  description?: string;
}

export function SequenceAnalysisCard({
  filters,
  sessionIds,
  title = "Fatigue & Sequence Analysis",
  description = "How performance changes over the course of shooting sessions"
}: SequenceAnalysisCardProps) {
  const [data, setData] = useState<SequenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<string>("avgScore");
  const [bucketType, setBucketType] = useState<string>("fixed");
  const [bucketSize, setBucketSize] = useState<string>("10");

  useEffect(() => {
    fetchData();
  }, [metric, bucketType, bucketSize, filters, sessionIds]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        metric,
        bucketType,
        bucketSize
      });

      if (sessionIds && sessionIds.length > 0) {
        params.append("sessionIds", sessionIds.join(","));
      }
      if (filters.firearmIds && filters.firearmIds.length > 0) {
        params.append("firearmIds", filters.firearmIds.join(","));
      }
      if (filters.caliberIds && filters.caliberIds.length > 0) {
        params.append("caliberIds", filters.caliberIds.join(","));
      }
      if (filters.opticIds && filters.opticIds.length > 0) {
        params.append("opticIds", filters.opticIds.join(","));
      }
      if (filters.distanceMin) params.append("distanceMin", filters.distanceMin);
      if (filters.distanceMax) params.append("distanceMax", filters.distanceMax);
      if (filters.minShots) params.append("minShots", filters.minShots.toString());
      if (filters.positionOnly) params.append("positionOnly", "true");

      const res = await fetch(`/api/analytics/sequence?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        toast.error("Failed to load sequence analysis");
      }
    } catch (error) {
      console.error("Error fetching sequence data:", error);
      toast.error("Failed to load sequence analysis");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return <LoadingCard />;
  }

  if (!data || data.buckets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {data?.insights[0] || "No sequence data available. Need sessions with at least 20 shots."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { buckets, overall, trend, insights } = data;

  // Determine metric details
  const metricConfig: Record<string, { label: string; color: string; format: (v: number) => string; higherIsBetter: boolean }> = {
    avgScore: {
      label: "Avg Score",
      color: CHART_COLORS.primary,
      format: (v) => v.toFixed(2),
      higherIsBetter: true
    },
    bullRate: {
      label: "Bull Rate",
      color: CHART_COLORS.success,
      format: (v) => `${(v * 100).toFixed(1)}%`,
      higherIsBetter: true
    },
    missRate: {
      label: "Miss Rate",
      color: CHART_COLORS.danger,
      format: (v) => `${(v * 100).toFixed(1)}%`,
      higherIsBetter: false
    },
    meanRadius: {
      label: "Mean Radius",
      color: CHART_COLORS.info,
      format: (v) => v.toFixed(2),
      higherIsBetter: false
    },
    biasX: {
      label: "Horizontal Bias",
      color: CHART_COLORS.warning,
      format: (v) => v.toFixed(1),
      higherIsBetter: false
    },
    biasY: {
      label: "Vertical Bias",
      color: CHART_COLORS.warning,
      format: (v) => v.toFixed(1),
      higherIsBetter: false
    }
  };

  const currentMetric = metricConfig[metric] || metricConfig.avgScore;

  // Build chart data
  const chartOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const bucket = buckets[params[0].dataIndex];
        return `
          <strong>${bucket.label}</strong><br/>
          ${currentMetric.label}: ${currentMetric.format(params[0].value)}<br/>
          Avg Score: ${bucket.avgScore.toFixed(2)}<br/>
          Bull Rate: ${(bucket.bullRate * 100).toFixed(1)}%<br/>
          Miss Rate: ${(bucket.missRate * 100).toFixed(1)}%<br/>
          Shots: ${bucket.shotCount}
        `;
      }
    },
    xAxis: {
      type: "category",
      data: buckets.map(b => b.label),
      axisLabel: {
        rotate: bucketType === "fixed" && buckets.length > 8 ? 45 : 0,
        fontSize: 11
      }
    },
    yAxis: {
      type: "value",
      name: currentMetric.label,
      axisLabel: {
        formatter: (val: number) => {
          if (metric === "bullRate" || metric === "missRate") {
            return `${(val * 100).toFixed(0)}%`;
          }
          return val.toFixed(1);
        }
      }
    },
    series: [
      {
        data: buckets.map(b => {
          switch (metric) {
            case "bullRate": return b.bullRate;
            case "missRate": return b.missRate;
            case "meanRadius": return b.meanRadius;
            case "biasX": return b.biasX;
            case "biasY": return b.biasY;
            default: return b.avgScore;
          }
        }),
        type: "line",
        smooth: true,
        lineStyle: { color: currentMetric.color, width: 3 },
        itemStyle: { color: currentMetric.color },
        areaStyle: { color: currentMetric.color, opacity: 0.1 },
        markLine: trend ? {
          silent: true,
          lineStyle: {
            type: "dashed",
            color: trend.direction === "declining" ? CHART_COLORS.danger : 
                   trend.direction === "improving" ? CHART_COLORS.success : 
                   CHART_COLORS.score0
          },
          data: [[
            { coord: [0, buckets[0][metric as keyof SequenceBucket] as number] },
            { coord: [buckets.length - 1, buckets[buckets.length - 1][metric as keyof SequenceBucket] as number] }
          ]]
        } : undefined
      }
    ],
    grid: {
      bottom: bucketType === "fixed" && buckets.length > 8 ? 80 : 60
    }
  };

  // Check if position-only metrics are available
  const hasPositionData = buckets.some(b => b.meanRadius !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {title}
          {trend && (
            <span className="ml-auto flex items-center gap-1 text-sm font-normal">
              {trend.direction === "improving" && <TrendingUp className="h-4 w-4 text-green-500" />}
              {trend.direction === "declining" && <TrendingDown className="h-4 w-4 text-red-500" />}
              {trend.direction === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className={
                trend.direction === "improving" ? "text-green-500" :
                trend.direction === "declining" ? "text-red-500" :
                "text-muted-foreground"
              }>
                {trend.direction}
              </span>
            </span>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground mb-1 block">Metric</label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avgScore">Average Score</SelectItem>
                <SelectItem value="bullRate">Bull Rate</SelectItem>
                <SelectItem value="missRate">Miss Rate</SelectItem>
                {hasPositionData && (
                  <>
                    <SelectItem value="meanRadius">Mean Radius</SelectItem>
                    <SelectItem value="biasX">Horizontal Bias</SelectItem>
                    <SelectItem value="biasY">Vertical Bias</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground mb-1 block">Bucket Type</label>
            <Select value={bucketType} onValueChange={setBucketType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Size</SelectItem>
                <SelectItem value="percentile">By Thirds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {bucketType === "fixed" && (
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-muted-foreground mb-1 block">Bucket Size</label>
              <Select value={bucketSize} onValueChange={setBucketSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 shots</SelectItem>
                  <SelectItem value="10">10 shots</SelectItem>
                  <SelectItem value="15">15 shots</SelectItem>
                  <SelectItem value="20">20 shots</SelectItem>
                  <SelectItem value="25">25 shots</SelectItem>
                  <SelectItem value="30">30 shots</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="mt-4">
          <EChart option={chartOption} height={300} />
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Overall Avg Score</div>
            <div className="text-lg font-semibold">{overall.avgScore.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bull Rate</div>
            <div className="text-lg font-semibold">{(overall.bullRate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Miss Rate</div>
            <div className="text-lg font-semibold">{(overall.missRate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Shots</div>
            <div className="text-lg font-semibold">{overall.totalShots}</div>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Insights
            </h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
