"use client";

import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";

interface ComparisonItem {
  id: string;
  name: string;
  color?: string;
  trend?: Array<{
    x: string | number;
    value: number;
    label?: string;
  }>;
}

interface OverlaidChartProps {
  items: ComparisonItem[];
  metric: "avgScore" | "bullRate" | "missRate";
  chartType?: "line" | "bar";
  title?: string;
  className?: string;
}

const ITEM_COLORS = ["#3B82F6", "#F97316", "#A855F7"]; // Blue, Orange, Purple

export function OverlaidChart({
  items,
  metric,
  chartType = "line",
  title,
  className,
}: OverlaidChartProps) {
  // Merge all trend data into a single dataset
  const mergedData = mergeTrendData(items);

  if (mergedData.length === 0) {
    return (
      <Card className={cn("p-6 dark:bg-zinc-900 dark:border-white/10", className)}>
        <h3 className="text-lg font-semibold mb-4">
          {title || "Performance Comparison"}
        </h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground dark:text-white/50">
          No trend data available for comparison
        </div>
      </Card>
    );
  }

  const metricLabel = {
    avgScore: "Average Score",
    bullRate: "Bull Rate (%)",
    missRate: "Miss Rate (%)",
  }[metric];

  const formatYAxis = (value: number) => {
    if (metric === "bullRate" || metric === "missRate") {
      return `${(value * 100).toFixed(0)}%`;
    }
    return value.toFixed(1);
  };

  const formatTooltipValue = (value: number) => {
    if (metric === "bullRate" || metric === "missRate") {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  const ChartComponent = chartType === "bar" ? BarChart : LineChart;

  return (
    <Card className={cn("p-6 dark:bg-zinc-900 dark:border-white/10", className)}>
      <h3 className="text-lg font-semibold mb-4">
        {title || `${metricLabel} Comparison`}
      </h3>

      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={mergedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-white/10" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 12 }}
            className="text-white/60"
            tickFormatter={(value) => {
              if (typeof value === "string" && value.includes("-")) {
                return new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }
              return value.toString();
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-white/60"
            tickFormatter={formatYAxis}
            domain={metric === "avgScore" ? [0, 5] : [0, 1]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#fff" }}
            formatter={(value: any) => formatTooltipValue(value)}
          />
          <Legend
            wrapperStyle={{
              paddingTop: "20px",
            }}
          />

          {items.map((item, index) => {
            const itemColor = item.color || ITEM_COLORS[index];
            const dataKey = `item_${item.id}`;

            if (chartType === "bar") {
              return (
                <Bar
                  key={item.id}
                  dataKey={dataKey}
                  fill={itemColor}
                  name={item.name}
                  radius={[4, 4, 0, 0]}
                />
              );
            }

            return (
              <Line
                key={item.id}
                type="monotone"
                dataKey={dataKey}
                stroke={itemColor}
                strokeWidth={3}
                dot={{ fill: itemColor, r: 4 }}
                name={item.name}
                connectNulls
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </Card>
  );
}

// Helper function to merge trend data from multiple items
function mergeTrendData(items: ComparisonItem[]) {
  const xValues = new Set<string | number>();

  // Collect all unique x values
  items.forEach((item) => {
    item.trend?.forEach((point) => {
      xValues.add(point.x);
    });
  });

  // Sort x values
  const sortedXValues = Array.from(xValues).sort((a, b) => {
    if (typeof a === "string" && typeof b === "string") {
      return a.localeCompare(b);
    }
    return Number(a) - Number(b);
  });

  // Build merged dataset
  const mergedData = sortedXValues.map((x) => {
    const dataPoint: any = { x };

    items.forEach((item) => {
      const point = item.trend?.find((p) => p.x === x);
      dataPoint[`item_${item.id}`] = point?.value || null;
    });

    return dataPoint;
  });

  return mergedData;
}
