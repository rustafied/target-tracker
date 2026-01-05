"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number | null;
  higherIsBetter?: boolean;
  subtitle?: string;
  tooltip?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  delta,
  higherIsBetter = true,
  subtitle,
  tooltip,
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

  const deltaDisplay = getDeltaDisplay();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
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
      </CardContent>
    </Card>
  );
}

