"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonItemSelector } from "./ComparisonItemSelector";
import { SplitViewPanel } from "./SplitViewPanel";
import { OverlaidChart } from "./OverlaidChart";
import { DeltaTable } from "./DeltaTable";
import { ComparisonInsights } from "./ComparisonInsights";
import { ComparisonFilters } from "./ComparisonFilters";
import { ExpandedInsightsPanel, Insight } from "@/components/ExpandedInsightsPanel";
import { Loader2, LayoutGrid, BarChart3, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";

interface SelectableItem {
  id: string;
  name: string;
  color?: string;
}

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

interface ComparativeDashboardProps {
  type: "firearm" | "optic" | "caliber" | "session";
  availableItems: SelectableItem[];
  onClose?: () => void;
}

type ViewMode = "split" | "overlaid";

export function ComparativeDashboard({
  type,
  availableItems,
  onClose,
}: ComparativeDashboardProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comparison data
  const [comparisonData, setComparisonData] = useState<{
    items: ComparisonItem[];
    deltas: Delta[];
    insights: string[];
  } | null>(null);

  // Expanded insights
  const [expandedInsights, setExpandedInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    distanceMin: "",
    distanceMax: "",
    minShots: "10",
    groupBy: "date" as "date" | "distance" | "sequence" | "none",
  });

  const fetchComparison = async () => {
    if (selectedIds.length < 2) {
      setError("Please select at least 2 items to compare");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type,
        ids: selectedIds.join(","),
        minShots: filters.minShots,
      });

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.distanceMin) params.append("distanceMin", filters.distanceMin);
      if (filters.distanceMax) params.append("distanceMax", filters.distanceMax);
      if (filters.groupBy !== "none") params.append("groupBy", filters.groupBy);

      const response = await fetch(`/api/analytics/compare?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch comparison data");
      }

      setComparisonData(data);

      // Fetch expanded insights
      await fetchExpandedInsights();
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching data");
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpandedInsights = async () => {
    if (selectedIds.length < 2) return;

    try {
      setInsightsLoading(true);
      
      // Map type to plural form for API
      const itemType = type === "firearm" ? "firearms" 
        : type === "optic" ? "optics" 
        : type === "caliber" ? "calibers" 
        : "firearms"; // fallback

      const params = new URLSearchParams({
        itemIds: selectedIds.join(","),
        itemType,
      });

      const response = await fetch(`/api/insights/comparison?${params}`);
      if (response.ok) {
        const data = await response.json();
        setExpandedInsights(data.insights || []);
      }
    } catch (err) {
      console.error("Error fetching expanded insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleExportPNG = async () => {
    const element = document.getElementById("comparison-content");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#18181b",
        scale: 2,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `comparison-${type}-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to export PNG:", err);
    }
  };

  const handleExportCSV = () => {
    if (!comparisonData) return;

    const rows = [
      ["Metric", ...comparisonData.items.map((item) => item.name)],
      [
        "Avg Score",
        ...comparisonData.items.map((item) =>
          item.metrics.avgScorePerShot.toFixed(2)
        ),
      ],
      [
        "Bull Rate",
        ...comparisonData.items.map((item) =>
          (item.metrics.bullRate * 100).toFixed(1) + "%"
        ),
      ],
      [
        "Miss Rate",
        ...comparisonData.items.map((item) =>
          (item.metrics.missRate * 100).toFixed(1) + "%"
        ),
      ],
      [
        "Good Hits",
        ...comparisonData.items.map((item) =>
          (item.metrics.goodHitRate * 100).toFixed(1) + "%"
        ),
      ],
      [
        "Total Shots",
        ...comparisonData.items.map((item) => item.metrics.totalShots.toString()),
      ],
      [
        "Sessions",
        ...comparisonData.items.map((item) =>
          item.metrics.totalSessions.toString()
        ),
      ],
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `comparison-${type}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Compare{" "}
            {type === "firearm"
              ? "Firearms"
              : type === "optic"
              ? "Optics"
              : type === "caliber"
              ? "Calibers"
              : "Sessions"}
          </h2>
          <p className="text-sm text-muted-foreground dark:text-white/60 mt-1">
            Select 2-3 items to analyze performance side-by-side
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Selection and Filters */}
      <Card className="p-6 dark:bg-zinc-900 dark:border-white/10">
        <div className="space-y-4">
          <ComparisonItemSelector
            type={type}
            availableItems={availableItems}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            maxSelections={3}
          />

          <ComparisonFilters
            filters={filters}
            onFiltersChange={setFilters}
            showGroupBy
          />

          <Button
            onClick={fetchComparison}
            disabled={selectedIds.length < 2 || loading}
            className="w-full dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Comparison...
              </>
            ) : (
              "Generate Comparison"
            )}
          </Button>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-6 dark:bg-red-500/10 dark:border-red-500/20">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Results */}
      {comparisonData && (
        <div id="comparison-content" className="space-y-6">
          {/* View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant={viewMode === "split" ? "default" : "outline"}
                onClick={() => setViewMode("split")}
                className={cn(
                  viewMode === "split" &&
                    "dark:bg-white dark:text-black dark:hover:bg-white/90",
                  viewMode !== "split" &&
                    "dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20"
                )}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Split View
              </Button>
              <Button
                variant={viewMode === "overlaid" ? "default" : "outline"}
                onClick={() => setViewMode("overlaid")}
                className={cn(
                  viewMode === "overlaid" &&
                    "dark:bg-white dark:text-black dark:hover:bg-white/90",
                  viewMode !== "overlaid" &&
                    "dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20"
                )}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Overlaid View
              </Button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export </span>CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
                className="flex-1 sm:flex-none dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export </span>PNG
              </Button>
            </div>
          </div>

          {/* Visualization */}
          {viewMode === "split" ? (
            <SplitViewPanel items={comparisonData.items} />
          ) : (
            <div className="space-y-4">
              <OverlaidChart
                items={comparisonData.items}
                metric="avgScore"
                title="Average Score Comparison"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OverlaidChart
                  items={comparisonData.items}
                  metric="bullRate"
                  title="Bull Rate Comparison"
                />
                <OverlaidChart
                  items={comparisonData.items}
                  metric="missRate"
                  title="Miss Rate Comparison"
                />
              </div>
            </div>
          )}

          {/* Delta Table */}
          <DeltaTable deltas={comparisonData.deltas} items={comparisonData.items} />

          {/* Expanded Insights */}
          <ExpandedInsightsPanel
            insights={expandedInsights}
            title="Comparison Insights"
            description="Detailed analysis comparing your selected items"
            loading={insightsLoading}
            maxVisible={5}
          />

          {/* Legacy Insights (if any) */}
          {comparisonData.insights && comparisonData.insights.length > 0 && (
            <ComparisonInsights insights={comparisonData.insights} />
          )}
        </div>
      )}

      {/* Empty State */}
      {!comparisonData && !error && !loading && (
        <Card className="p-12 dark:bg-zinc-900 dark:border-white/10">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground dark:text-white/30" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Select items to start comparing
              </h3>
              <p className="text-sm text-muted-foreground dark:text-white/60">
                Choose 2-3 items from the dropdown above and click "Generate
                Comparison" to see detailed performance analysis
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
