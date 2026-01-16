"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Delta {
  metric: string;
  items: Array<{
    id: string;
    value: number;
  }>;
  best: {
    id: string;
    value: number;
  };
  worst: {
    id: string;
    value: number;
  };
  range: number;
  percentDiff: number;
}

interface ComparisonItem {
  id: string;
  name: string;
  color?: string;
}

interface DeltaTableProps {
  deltas: Delta[];
  items: ComparisonItem[];
  className?: string;
}

const METRIC_LABELS: Record<string, string> = {
  avgScorePerShot: "Avg Score",
  bullRate: "Bull Rate",
  missRate: "Miss Rate",
  goodHitRate: "Good Hits (4-5)",
  meanRadius: "Mean Radius",
};

const METRIC_DESCRIPTIONS: Record<string, string> = {
  avgScorePerShot: "Average score per shot (0-5)",
  bullRate: "Percentage of shots hitting bullseye",
  missRate: "Percentage of shots missing target",
  goodHitRate: "Percentage of 4s and 5s",
  meanRadius: "Average distance from center",
};

export function DeltaTable({ deltas, items, className }: DeltaTableProps) {
  const getItemName = (id: string) => {
    return items.find((item) => item.id === id)?.name || "Unknown";
  };

  const getItemColor = (id: string) => {
    return items.find((item) => item.id === id)?.color;
  };

  const formatValue = (metric: string, value: number) => {
    if (metric === "bullRate" || metric === "missRate" || metric === "goodHitRate") {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  const isLowerBetter = (metric: string) => {
    return metric === "missRate" || metric === "meanRadius";
  };

  return (
    <Card className={cn("p-4 sm:p-6 dark:bg-zinc-900 dark:border-white/10", className)}>
      <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="dark:border-white/10">
              <TableHead className="dark:text-white/80 sticky left-0 bg-background dark:bg-zinc-900 z-10">Metric</TableHead>
              {items.map((item) => (
                <TableHead key={item.id} className="text-center dark:text-white/80 min-w-[100px]">
                  <div className="flex items-center justify-center gap-2">
                    {item.color && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{item.name}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center dark:text-white/80 min-w-[80px]">Winner</TableHead>
              <TableHead className="text-center dark:text-white/80 min-w-[60px]">Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deltas.map((delta) => {
              const lowerBetter = isLowerBetter(delta.metric);
              const bestId = delta.best.id;

              return (
                <TableRow key={delta.metric} className="dark:border-white/10">
                  <TableCell className="font-medium sticky left-0 bg-background dark:bg-zinc-900 z-10">
                    <div>
                      <div className="dark:text-white text-sm sm:text-base">
                        {METRIC_LABELS[delta.metric] || delta.metric}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-white/50 hidden sm:block">
                        {METRIC_DESCRIPTIONS[delta.metric]}
                      </div>
                    </div>
                  </TableCell>

                  {items.map((item) => {
                    const itemValue = delta.items.find((i) => i.id === item.id);
                    const value = itemValue?.value ?? 0;
                    const isBest = item.id === bestId;
                    const isWorst = item.id === delta.worst.id;

                    return (
                      <TableCell
                        key={item.id}
                        className={cn(
                          "text-center font-semibold",
                          isBest && "dark:text-green-400",
                          isWorst && items.length > 2 && "dark:text-red-400"
                        )}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {isBest && <Trophy className="h-3 w-3" />}
                          <span>{formatValue(delta.metric, value)}</span>
                        </div>
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-center">
                    <span className="font-medium dark:text-green-400">
                      {getItemName(bestId)}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    {delta.percentDiff > 0 ? (
                      <div className="flex items-center justify-center gap-1 text-sm">
                        {lowerBetter ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-semibold">
                          {delta.percentDiff.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <Minus className="h-4 w-4" />
                        <span>—</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-xs text-muted-foreground dark:text-white/50">
        <p>
          <Trophy className="h-3 w-3 inline mr-1" />
          Trophy indicates best performer for each metric
        </p>
        <p className="mt-1">Δ shows percentage difference between best and worst</p>
      </div>
    </Card>
  );
}
