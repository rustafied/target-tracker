"use client";

import { AlertTriangle, TrendingUp, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnomalyFlagProps {
  severity: "high" | "medium" | "low";
  deviationCount: number;
  onClick?: () => void;
  className?: string;
}

export function AnomalyFlag({ severity, deviationCount, onClick, className = "" }: AnomalyFlagProps) {
  const config = {
    high: {
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      label: "High Severity Anomaly",
      description: "Significant performance deviation detected",
    },
    medium: {
      icon: AlertTriangle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      label: "Medium Severity Anomaly",
      description: "Notable performance variation",
    },
    low: {
      icon: Info,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      label: "Low Severity Anomaly",
      description: "Minor performance variation",
    },
  };

  const { icon: Icon, color, bgColor, borderColor, label, description } = config[severity];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className={`
              inline-flex items-center gap-1.5 px-2 py-1 rounded-md border
              ${bgColor} ${borderColor} ${color}
              hover:opacity-80 transition-opacity
              ${className}
            `}
            aria-label={label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              {deviationCount} {deviationCount === 1 ? "anomaly" : "anomalies"}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-semibold">{label}</p>
            <p className="text-muted-foreground">{description}</p>
            <p className="mt-1 text-xs">Click to view details</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Simple badge version without tooltip (for mobile)
export function AnomalyBadge({ severity, className = "" }: { severity: "high" | "medium" | "low"; className?: string }) {
  const config = {
    high: {
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      dot: "bg-red-500",
    },
    medium: {
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      dot: "bg-yellow-500",
    },
    low: {
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      dot: "bg-blue-500",
    },
  };

  const { color, bgColor, borderColor, dot } = config[severity];

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border
        ${bgColor} ${borderColor} ${color}
        ${className}
      `}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-xs font-medium uppercase tracking-wide">{severity}</span>
    </div>
  );
}
