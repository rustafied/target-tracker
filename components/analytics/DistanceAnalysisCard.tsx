"use client";

import { useState, useEffect } from "react";
import { ChartCard } from "./ChartCard";
import { EChart, CHART_COLORS } from "./EChart";
import { Ruler, TrendingDown, Info } from "lucide-react";
import type { EChartsOption } from "echarts";
import { meanRadiusToMOA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export interface DistanceAnalysisCardProps {
  groupBy: "firearm" | "caliber" | "optic";
  filters?: {
    firearmIds?: string[];
    caliberIds?: string[];
    opticIds?: string[];
    distanceMin?: string;
    distanceMax?: string;
    minShots?: number;
    positionOnly?: boolean;
  };
  targetDiameterInches?: number;
  showMOA?: boolean;
  title?: string;
}

interface DistanceData {
  groupBy: string;
  leaderboard: any[];
  distanceCurves: Record<string, any[]>;
  insights: string[];
}

type MetricType = "avgScorePerShot" | "bullRate" | "missRate" | "meanRadius" | "moa";

export function DistanceAnalysisCard({
  groupBy,
  filters = {},
  targetDiameterInches = 10.5,
  showMOA = false,
  title,
}: DistanceAnalysisCardProps) {
  const [data, setData] = useState<DistanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("avgScorePerShot");
  const [showInsights, setShowInsights] = useState(true);

  useEffect(() => {
    fetchData();
  }, [groupBy, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        groupBy,
        minShots: (filters.minShots || 10).toString(),
        positionOnly: (filters.positionOnly || false).toString(),
      });

      if (filters.firearmIds?.length) params.set("firearmIds", filters.firearmIds.join(","));
      if (filters.caliberIds?.length) params.set("caliberIds", filters.caliberIds.join(","));
      if (filters.opticIds?.length) params.set("opticIds", filters.opticIds.join(","));
      if (filters.distanceMin) params.set("distanceMin", filters.distanceMin);
      if (filters.distanceMax) params.set("distanceMax", filters.distanceMax);

      const response = await fetch(`/api/analytics/distance?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch distance data");

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching distance analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartOption: EChartsOption | null = (() => {
    if (!data || !data.distanceCurves || Object.keys(data.distanceCurves).length === 0) {
      return null;
    }

    // Collect all unique distances
    const allDistances = new Set<number>();
    Object.values(data.distanceCurves).forEach((curve: any) => {
      curve.forEach((point: any) => allDistances.add(point.distance));
    });

    const sortedDistances = Array.from(allDistances).sort((a, b) => a - b);
    const xAxisLabels = sortedDistances.map((d) => `${d}yd`);

    const defaultColors = [
      CHART_COLORS.primary,
      CHART_COLORS.success,
      CHART_COLORS.warning,
      CHART_COLORS.danger,
      CHART_COLORS.info,
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
    ];

    // Get entity name field based on groupBy
    const entityNameField = `${groupBy}Name`;

    const series = data.leaderboard.map((entity, index) => {
      const entityId = entity[`${groupBy}Id`];
      const curve = data.distanceCurves[entityId] || [];
      const dataMap = new Map();

      curve.forEach((point: any) => {
        let value: number | null = null;

        // Calculate the selected metric value
        switch (selectedMetric) {
          case "avgScorePerShot":
            value = point.avgScorePerShot;
            break;
          case "bullRate":
            value = point.bullRate * 100; // Convert to percentage
            break;
          case "missRate":
            value = point.missRate * 100; // Convert to percentage
            break;
          case "meanRadius":
            value = point.meanRadius || null;
            break;
          case "moa":
            if (point.meanRadius !== undefined) {
              value = meanRadiusToMOA(point.meanRadius, point.distance, targetDiameterInches);
            }
            break;
        }

        dataMap.set(point.distance, value);
      });

      return {
        name: entity[entityNameField],
        type: "line" as const,
        data: sortedDistances.map((d) => dataMap.get(d) || null),
        smooth: true,
        connectNulls: true,
        lineStyle: {
          width: 3,
          color: defaultColors[index % defaultColors.length],
        },
        symbol: "circle",
        symbolSize: 8,
      };
    });

    // Configure y-axis based on selected metric
    let yAxisConfig: any = {
      type: "value" as const,
      name: "Score",
      nameLocation: "middle" as const,
      nameGap: 50,
    };

    switch (selectedMetric) {
      case "avgScorePerShot":
        yAxisConfig = {
          ...yAxisConfig,
          name: "Average Score",
          min: 0,
          max: 5,
        };
        break;
      case "bullRate":
        yAxisConfig = {
          ...yAxisConfig,
          name: "Bull Rate (%)",
          min: 0,
          max: 100,
        };
        break;
      case "missRate":
        yAxisConfig = {
          ...yAxisConfig,
          name: "Miss Rate (%)",
          min: 0,
          max: 100,
        };
        break;
      case "meanRadius":
        yAxisConfig = {
          ...yAxisConfig,
          name: "Mean Radius (target units)",
          min: 0,
        };
        break;
      case "moa":
        yAxisConfig = {
          ...yAxisConfig,
          name: "MOA",
          min: 0,
        };
        break;
    }

    return {
      tooltip: {
        trigger: "axis" as const,
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          let tooltip = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach((param: any) => {
            if (param.value !== null && param.value !== undefined) {
              const valueStr =
                selectedMetric === "bullRate" || selectedMetric === "missRate"
                  ? `${param.value.toFixed(1)}%`
                  : param.value.toFixed(2);
              tooltip += `${param.marker} ${param.seriesName}: ${valueStr}<br/>`;
            }
          });
          return tooltip;
        },
      },
      legend: {
        data: data.leaderboard.map((e) => e[entityNameField]),
        top: 10,
        textStyle: {
          color: "#e5e7eb",
        },
      },
      grid: {
        left: 70,
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
        nameGap: 35,
      },
      yAxis: yAxisConfig,
      series,
    };
  })();

  const displayTitle = title || `Performance by Distance (${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)})`;

  return (
    <ChartCard
      title={displayTitle}
      icon={Ruler}
      action={
        <div className="flex gap-2">
          <Select
            value={selectedMetric}
            onValueChange={(value) => setSelectedMetric(value as MetricType)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="avgScorePerShot">Average Score</SelectItem>
              <SelectItem value="bullRate">Bull Rate</SelectItem>
              <SelectItem value="missRate">Miss Rate</SelectItem>
              <SelectItem value="meanRadius">Mean Radius</SelectItem>
              {showMOA && <SelectItem value="moa">MOA</SelectItem>}
            </SelectContent>
          </Select>
          {data?.insights && data.insights.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInsights(!showInsights)}
            >
              <Info className="h-4 w-4" />
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : chartOption ? (
        <div className="space-y-4">
          <EChart option={chartOption} height={400} />
          
          {/* Insights Panel - now inside the same card */}
          {showInsights && data?.insights && data.insights.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium">Key Insights</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.insights.map((insight, index) => (
                    <li key={index}>• {insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground text-center">
            <TrendingDown className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No distance data available</p>
            <p className="text-sm mt-1">Log sessions at different distances to see trends</p>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
