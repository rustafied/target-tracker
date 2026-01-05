"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

export interface EChartProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
}

export function EChart({ option, height = 400, className = "" }: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Initialize chart once
  useEffect(() => {
    if (!chartRef.current || chartInstance.current) return;

    try {
      chartInstance.current = echarts.init(chartRef.current);
      console.log("EChart initialized");
    } catch (error) {
      console.error("Failed to initialize ECharts:", error);
    }

    // Cleanup only on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // Update chart when option changes
  useEffect(() => {
    if (!chartInstance.current) return;

    try {
      // Apply dark theme defaults
      const themedOption: EChartsOption = {
        backgroundColor: "transparent",
        textStyle: {
          color: "#e5e7eb",
          fontSize: 12,
        },
        tooltip: {
          backgroundColor: "rgba(23, 23, 23, 0.95)",
          borderColor: "#374151",
          borderWidth: 1,
          textStyle: {
            color: "#e5e7eb",
          },
          ...((option.tooltip as any) || {}),
        },
        legend: option.legend
          ? {
              ...((option.legend as any) || {}),
              textStyle: {
                color: "#e5e7eb",
                ...((option.legend as any)?.textStyle || {}),
              },
            }
          : undefined,
        grid: {
          borderColor: "#374151",
          left: 50,
          right: 20,
          top: 40,
          bottom: 50,
          containLabel: true,
          ...((option.grid as any) || {}),
        },
        xAxis: option.xAxis
          ? (Array.isArray(option.xAxis) ? option.xAxis : [option.xAxis]).map((axis: any) => ({
              ...axis,
              axisLine: { lineStyle: { color: "#4b5563" }, ...(axis.axisLine || {}) },
              axisLabel: { color: "#9ca3af", ...(axis.axisLabel || {}) },
              splitLine: { lineStyle: { color: "#374151" }, ...(axis.splitLine || {}) },
            }))
          : undefined,
        yAxis: option.yAxis
          ? (Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis]).map((axis: any) => ({
              ...axis,
              axisLine: { lineStyle: { color: "#4b5563" }, ...(axis.axisLine || {}) },
              axisLabel: { color: "#9ca3af", ...(axis.axisLabel || {}) },
              splitLine: { lineStyle: { color: "#374151" }, ...(axis.splitLine || {}) },
            }))
          : undefined,
        ...option,
      };

      chartInstance.current.setOption(themedOption, true);
      console.log("EChart option updated successfully");
    } catch (error) {
      console.error("Failed to set ECharts option:", error, option);
    }
  }, [option]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={chartRef}
      className={className}
      style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%" }}
    />
  );
}

// Dark theme color palette for consistent use across charts
export const CHART_COLORS = {
  primary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  score5: "#22c55e",
  score4: "#84cc16",
  score3: "#eab308",
  score2: "#f97316",
  score1: "#ef4444",
  score0: "#64748b",
};

export const DARK_THEME_OPTIONS = {
  backgroundColor: "transparent",
  textStyle: {
    color: "hsl(var(--foreground))",
  },
  tooltip: {
    backgroundColor: "hsl(var(--popover))",
    borderColor: "hsl(var(--border))",
    textStyle: {
      color: "hsl(var(--popover-foreground))",
    },
  },
  grid: {
    borderColor: "hsl(var(--border))",
  },
};

