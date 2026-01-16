"use client";

import { Card } from "@/components/ui/card";
import { Lightbulb, AlertCircle, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonInsightsProps {
  insights: string[];
  className?: string;
}

export function ComparisonInsights({
  insights,
  className,
}: ComparisonInsightsProps) {
  if (insights.length === 0) {
    return null;
  }

  // Categorize insights by type
  const categorizeInsight = (insight: string) => {
    if (insight.toLowerCase().includes("note:") || insight.toLowerCase().includes("limited data")) {
      return "warning";
    }
    if (insight.toLowerCase().includes("trend") || insight.toLowerCase().includes("improving") || insight.toLowerCase().includes("declining")) {
      return "trend";
    }
    if (insight.toLowerCase().includes("leads") || insight.toLowerCase().includes("outperform")) {
      return "highlight";
    }
    return "info";
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />;
      case "trend":
        return <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />;
      case "highlight":
        return <Lightbulb className="h-5 w-5 text-green-500 shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-white/60 shrink-0" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "warning":
        return "dark:bg-yellow-500/10 dark:border-yellow-500/20";
      case "trend":
        return "dark:bg-blue-500/10 dark:border-blue-500/20";
      case "highlight":
        return "dark:bg-green-500/10 dark:border-green-500/20";
      default:
        return "dark:bg-white/5 dark:border-white/10";
    }
  };

  return (
    <Card className={cn("p-6 dark:bg-zinc-900 dark:border-white/10", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Key Insights</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => {
          const type = categorizeInsight(insight);
          const icon = getIcon(type);
          const bgColor = getBackgroundColor(type);

          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                bgColor
              )}
            >
              {icon}
              <p className="text-sm leading-relaxed dark:text-white/90">
                {insight}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t dark:border-white/10">
        <p className="text-xs text-muted-foreground dark:text-white/50">
          Insights are auto-generated based on performance metrics. Use these to identify
          strengths and areas for improvement across your equipment and sessions.
        </p>
      </div>
    </Card>
  );
}
