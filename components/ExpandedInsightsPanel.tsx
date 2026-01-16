"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Info,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { InsightSettingsModal } from "./InsightSettingsModal";

export interface Insight {
  id: string;
  type: string;
  category: 'session' | 'overview' | 'comparison';
  text: string;
  confidence: number;
  severity: 'info' | 'warning' | 'success' | 'error';
  metadata?: Record<string, any>;
  relatedLinks?: Array<{ label: string; href: string }>;
}

interface ExpandedInsightsPanelProps {
  insights: Insight[];
  title?: string;
  description?: string;
  collapsible?: boolean;
  maxVisible?: number;
  loading?: boolean;
  showSettings?: boolean;
}

export function ExpandedInsightsPanel({
  insights,
  title = "Insights",
  description,
  collapsible = true,
  maxVisible = 5,
  loading = false,
  showSettings = true,
}: ExpandedInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const visibleInsights = showAll ? insights : insights.slice(0, maxVisible);
  const hasMore = insights.length > maxVisible;

  const getSeverityConfig = (severity: Insight['severity']) => {
    switch (severity) {
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-500 dark:text-red-400',
          bgColor: 'bg-red-500/10 dark:bg-red-500/20',
          borderColor: 'border-red-500/20 dark:border-red-500/30',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500 dark:text-yellow-400',
          bgColor: 'bg-yellow-500/10 dark:bg-yellow-500/20',
          borderColor: 'border-yellow-500/20 dark:border-yellow-500/30',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'text-green-500 dark:text-green-400',
          bgColor: 'bg-green-500/10 dark:bg-green-500/20',
          borderColor: 'border-green-500/20 dark:border-green-500/30',
        };
      default:
        return {
          icon: Info,
          color: 'text-blue-500 dark:text-blue-400',
          bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
          borderColor: 'border-blue-500/20 dark:border-blue-500/30',
        };
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-muted/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No insights available yet. Log more sessions to see personalized recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && <CardDescription className="mt-1">{description}</CardDescription>}
              </div>
              <Badge variant="secondary" className="ml-auto">
                {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 ml-2">
              {showSettings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  title="Insight Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-3">
            {visibleInsights.map((insight) => {
              const config = getSeverityConfig(insight.severity);
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md bg-background/50 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed mb-2">
                        {insight.text}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-xs bg-background/50"
                        >
                          {Math.round(insight.confidence * 100)}% confidence
                        </Badge>

                        {insight.relatedLinks && insight.relatedLinks.length > 0 && (
                          <div className="flex items-center gap-2">
                            {insight.relatedLinks.map((link, idx) => (
                              <Link
                                key={idx}
                                href={link.href}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                {link.label}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && !showAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(true)}
                className="w-full"
              >
                Show {insights.length - maxVisible} more insights
              </Button>
            )}

            {showAll && hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(false)}
                className="w-full"
              >
                Show less
              </Button>
            )}
          </div>
        </CardContent>
      )}
      </Card>

      <InsightSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

/**
 * Compact version for sidebar or small spaces
 */
export function CompactInsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.slice(0, 3).map((insight) => {
        const config = getSeverityConfig(insight.severity);
        const Icon = config.icon;

        return (
          <div
            key={insight.id}
            className="flex items-start gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
            <p className="text-xs leading-relaxed">{insight.text}</p>
          </div>
        );
      })}
      {insights.length > 3 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          +{insights.length - 3} more insights
        </p>
      )}
    </div>
  );
}

function getSeverityConfig(severity: Insight['severity']) {
  switch (severity) {
    case 'error':
      return {
        icon: XCircle,
        color: 'text-red-500 dark:text-red-400',
        bgColor: 'bg-red-500/10 dark:bg-red-500/20',
        borderColor: 'border-red-500/20 dark:border-red-500/30',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-500 dark:text-yellow-400',
        bgColor: 'bg-yellow-500/10 dark:bg-yellow-500/20',
        borderColor: 'border-yellow-500/20 dark:border-yellow-500/30',
      };
    case 'success':
      return {
        icon: CheckCircle2,
        color: 'text-green-500 dark:text-green-400',
        bgColor: 'bg-green-500/10 dark:bg-green-500/20',
        borderColor: 'border-green-500/20 dark:border-green-500/30',
      };
    default:
      return {
        icon: Info,
        color: 'text-blue-500 dark:text-blue-400',
        bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
        borderColor: 'border-blue-500/20 dark:border-blue-500/30',
      };
  }
}
