"use client";

import { Card } from "@/components/ui/card";
import { KpiCard } from "./KpiCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface ComparisonItem {
  id: string;
  name: string;
  color?: string;
  metrics: {
    avgScorePerShot: number;
    bullRate: number;
    missRate: number;
    goodHitRate: number;
    meanRadius?: number;
    totalShots: number;
    totalSessions: number;
  };
  trend?: Array<{
    x: string | number;
    value: number;
    label?: string;
  }>;
}

interface SplitViewPanelProps {
  items: ComparisonItem[];
  className?: string;
}

const ITEM_COLORS = ["#3B82F6", "#F97316", "#A855F7"]; // Blue, Orange, Purple

export function SplitViewPanel({ items, className }: SplitViewPanelProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        items.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {items.map((item, index) => {
        const itemColor = item.color || ITEM_COLORS[index];

        return (
          <Card
            key={item.id}
            className="p-6 dark:bg-zinc-900 dark:border-white/10"
            style={{
              borderTop: `3px solid ${itemColor}`,
            }}
          >
            {/* Item Header */}
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: itemColor }}
              />
              <h3 className="font-semibold text-lg truncate">{item.name}</h3>
            </div>

            {/* Key Metrics */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground dark:text-white/60">
                  Avg Score
                </span>
                <span className="text-2xl font-bold">
                  {item.metrics.avgScorePerShot.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground dark:text-white/60">
                  Bull Rate
                </span>
                <span className="text-lg font-semibold text-green-500">
                  {(item.metrics.bullRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground dark:text-white/60">
                  Miss Rate
                </span>
                <span className="text-lg font-semibold text-red-500">
                  {(item.metrics.missRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground dark:text-white/60">
                  Good Hits (4-5)
                </span>
                <span className="text-lg font-semibold">
                  {(item.metrics.goodHitRate * 100).toFixed(1)}%
                </span>
              </div>
              {item.metrics.meanRadius !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground dark:text-white/60">
                    Mean Radius
                  </span>
                  <span className="text-lg font-semibold">
                    {item.metrics.meanRadius.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Mini Trend Chart */}
            {item.trend && item.trend.length > 0 && (
              <div className="mt-4 pt-4 border-t dark:border-white/10">
                <h4 className="text-xs font-medium text-muted-foreground dark:text-white/60 mb-2">
                  Performance Trend
                </h4>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={item.trend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-white/10"
                    />
                    <XAxis
                      dataKey="x"
                      tick={{ fontSize: 10 }}
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
                      tick={{ fontSize: 10 }}
                      className="text-white/60"
                      domain={[0, 5]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.9)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={itemColor}
                      strokeWidth={2}
                      dot={{ fill: itemColor, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Data Volume Indicator */}
            <div className="mt-4 pt-4 border-t dark:border-white/10 text-xs text-muted-foreground dark:text-white/50">
              <div className="flex justify-between">
                <span>{item.metrics.totalSessions} sessions</span>
                <span>{item.metrics.totalShots} shots</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
