"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowRight, ArrowDown } from "lucide-react";

export type TrendDirection = "improving" | "stable" | "declining";

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number | null;
  higherIsBetter?: boolean;
  subtitle?: string;
  tooltip?: string;
  trend?: TrendDirection | null;
  trendConfidence?: number;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  delta,
  higherIsBetter = true,
  subtitle,
  tooltip,
  trend,
  trendConfidence,
}: KpiCardProps) {
  const getDeltaDisplay = () => {
    if (delta === null || delta === undefined) {
      return null;
    }

    if (Math.abs(delta) < 0.1) {
      return {
        text: "No change",
        color: "text-muted-foreground",
        icon: Minus,
      };
    }

    const isPositive = delta > 0;
    const isImprovement = higherIsBetter ? isPositive : !isPositive;

    return {
      text: `${isPositive ? "+" : ""}${delta.toFixed(1)}%`,
      color: isImprovement
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400",
      icon: isPositive ? TrendingUp : TrendingDown,
    };
  };

  const getTrendDisplay = () => {
    if (!trend) return null;

    const trendConfig = {
      improving: {
        icon: ArrowUp,
        color: "text-green-600 dark:text-green-400",
        label: "Improving",
      },
      stable: {
        icon: ArrowRight,
        color: "text-muted-foreground",
        label: "Stable",
      },
      declining: {
        icon: ArrowDown,
        color: "text-red-600 dark:text-red-400",
        label: "Declining",
      },
    };

    return trendConfig[trend];
  };

  const deltaDisplay = getDeltaDisplay();
  const trendDisplay = getTrendDisplay();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </span>
          {trendDisplay && (
            <span 
              className={`flex items-center gap-1 text-xs ${trendDisplay.color}`}
              title={`Overall trend: ${trendDisplay.label}${trendConfidence ? ` (${(trendConfidence * 100).toFixed(0)}% confidence)` : ''}`}
            >
              <trendDisplay.icon className="h-3 w-3" />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold">{value}</p>
          {deltaDisplay && (
            <div className={`flex items-center gap-1 text-sm font-medium ${deltaDisplay.color}`}>
              <deltaDisplay.icon className="h-4 w-4" />
              <span>{deltaDisplay.text}</span>
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {deltaDisplay && (
          <p className="text-xs text-muted-foreground mt-1">Last 3 vs prev 3 sessions</p>
        )}
      </CardContent>
    </Card>
  );
}

