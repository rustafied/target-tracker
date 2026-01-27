"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EChart } from "@/components/analytics/EChart";
import type { EChartsOption } from "echarts";
import { TrendingUp, Target, Lightbulb, Settings } from "lucide-react";
import { toast } from "sonner";
import { formatDecimal } from "@/lib/utils";

interface EfficiencyMetrics {
  caliberId: string;
  caliberName: string;
  totalShots: number;
  totalScore: number;
  bullCount: number;
  avgScore: number;
  bullRate: number;
  scorePerRound: number;
  bullsPer100: number;
  costPerRound?: number;
  totalCost?: number;
  costPerPoint?: number;
  costPerBull?: number;
  valueScore: number;
}

interface AmmoEfficiencyProps {
  filters?: {
    firearmIds?: string[];
    caliberIds?: string[];
    opticIds?: string[];
    startDate?: string;
    endDate?: string;
    minShots?: number;
  };
  compactMode?: boolean; // If true, only show the value pie chart
  infoOnly?: boolean; // If true, only show the info/insights card
}

export function AmmoEfficiency({ filters = {}, compactMode = false, infoOnly = false }: AmmoEfficiencyProps) {
  const [data, setData] = useState<{
    calibers: EfficiencyMetrics[];
    insights: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [selectedCaliber, setSelectedCaliber] = useState<string | null>(null);
  const [costMode, setCostMode] = useState<"perRound" | "bulk">("perRound");
  const [costPerRound, setCostPerRound] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState("");
  const [savingCost, setSavingCost] = useState(false);
  const [metricView, setMetricView] = useState<"scorePerRound" | "bullsPer100" | "costPerPoint" | "valueScore">("valueScore");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.caliberIds?.join(','),
    filters?.firearmIds?.join(','),
    filters?.opticIds?.join(','),
    filters?.startDate,
    filters?.endDate,
    filters?.minShots,
  ]);

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.caliberIds && filters.caliberIds.length > 0) {
        params.append("caliberIds", filters.caliberIds.join(","));
      }
      if (filters.firearmIds && filters.firearmIds.length > 0) {
        params.append("firearmIds", filters.firearmIds.join(","));
      }
      if (filters.opticIds && filters.opticIds.length > 0) {
        params.append("opticIds", filters.opticIds.join(","));
      }
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.minShots) params.append("minShots", filters.minShots.toString());

      const res = await fetch(`/api/analytics/ammo-efficiency?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load efficiency metrics");
      }
    } catch (error) {
      toast.error("Failed to load efficiency metrics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function openCostDialog(caliberId: string) {
    const caliber = data?.calibers.find((c) => c.caliberId === caliberId);
    if (!caliber) return;

    setSelectedCaliber(caliberId);
    if (caliber.costPerRound) {
      setCostMode("perRound");
      setCostPerRound(caliber.costPerRound.toString());
      setBulkCost("");
      setBulkQuantity("");
    } else {
      setCostMode("perRound");
      setCostPerRound("");
      setBulkCost("");
      setBulkQuantity("");
    }
    setCostDialogOpen(true);
  }

  async function handleSaveCost() {
    if (!selectedCaliber) return;

    try {
      setSavingCost(true);

      const body: any = {};
      if (costMode === "perRound") {
        const value = parseFloat(costPerRound);
        if (isNaN(value) || value < 0) {
          toast.error("Please enter a valid cost per round");
          return;
        }
        body.costPerRound = value;
        body.bulkCost = null;
        body.bulkQuantity = null;
      } else {
        const cost = parseFloat(bulkCost);
        const qty = parseInt(bulkQuantity);
        if (isNaN(cost) || cost < 0 || isNaN(qty) || qty < 1) {
          toast.error("Please enter valid bulk cost and quantity");
          return;
        }
        body.bulkCost = cost;
        body.bulkQuantity = qty;
        body.costPerRound = null;
      }

      const res = await fetch(`/api/calibers/${selectedCaliber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Cost updated successfully");
        setCostDialogOpen(false);
        fetchData(); // Reload data
      } else {
        toast.error("Failed to update cost");
      }
    } catch (error) {
      toast.error("Failed to update cost");
      console.error(error);
    } finally {
      setSavingCost(false);
    }
  }

  // Generate bar chart for selected metric
  const getMetricChartOption = (): EChartsOption | null => {
    if (!data || data.calibers.length === 0) return null;

    const sortedData = [...data.calibers].sort((a, b) => {
      switch (metricView) {
        case "scorePerRound":
          return b.scorePerRound - a.scorePerRound;
        case "bullsPer100":
          return b.bullsPer100 - a.bullsPer100;
        case "costPerPoint":
          return (a.costPerPoint || Infinity) - (b.costPerPoint || Infinity);
        case "valueScore":
        default:
          return b.valueScore - a.valueScore;
      }
    });

    const metricData = sortedData.map((c) => {
      switch (metricView) {
        case "scorePerRound":
          return c.scorePerRound;
        case "bullsPer100":
          return c.bullsPer100;
        case "costPerPoint":
          return c.costPerPoint || null;
        case "valueScore":
        default:
          return c.valueScore;
      }
    });

    const metricLabels = {
      scorePerRound: "Score per Round",
      bullsPer100: "Bulls per 100 Rounds",
      costPerPoint: "Cost per Point ($)",
      valueScore: "Value Score",
    };

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        textStyle: { color: "#fff" },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: sortedData.map((c) => c.caliberName),
        axisLabel: {
          rotate: 45,
          color: "rgba(255, 255, 255, 0.6)",
        },
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
      },
      yAxis: {
        type: "value",
        name: metricLabels[metricView],
        nameTextStyle: { color: "rgba(255, 255, 255, 0.6)" },
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
        axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
        splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.05)" } },
      },
      series: [
        {
          type: "bar",
          data: metricData,
          itemStyle: {
            color: (params: any) => {
              const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
              return colors[params.dataIndex % colors.length];
            },
          },
        },
      ],
    };
  };

  // Generate pie chart for value distribution
  const getValuePieOption = (): EChartsOption | null => {
    if (!data || data.calibers.length === 0) return null;

    const pieData = data.calibers.map((c, index) => ({
      name: c.caliberName,
      value: c.valueScore,
      itemStyle: {
        color: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"][index % 6],
      },
    }));

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        textStyle: { color: "#fff" },
        formatter: (params: any) => {
          const caliber = data.calibers.find((c) => c.caliberName === params.name);
          if (!caliber) return "";
          return `<strong>${params.name}</strong><br/>
            Value Score: ${formatDecimal(params.value)}<br/>
            ${formatDecimal(caliber.scorePerRound)} score/round<br/>
            ${formatDecimal(caliber.bullsPer100)} bulls/100<br/>
            ${caliber.costPerRound ? `$${formatDecimal(caliber.costPerRound)}/round` : "No cost data"}`;
        },
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: "bold",
              color: "#fff",
            },
          },
          data: pieData,
        },
      ],
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {compactMode ? "Efficiency" : "Ammo Efficiency Metrics"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.calibers.length === 0) {
    return compactMode ? null : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ammo Efficiency Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
            <h3 className="text-lg font-semibold mb-2">No efficiency data available</h3>
            <p className="text-muted-foreground">
              Record more shooting sessions to see ammo efficiency metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricChartOption = getMetricChartOption();
  const valuePieOption = getValuePieOption();

  // Compact mode: just show the pie chart
  if (compactMode) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Efficiency</h2>
        {valuePieOption && <EChart option={valuePieOption} height={300} />}
      </Card>
    );
  }

  // Info only mode: just show the info/insights card
  if (infoOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ammo Efficiency Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Analyze performance per round and cost efficiency across calibers. Click on a caliber to update cost data.
          </p>

          {/* Insights */}
          {data.insights.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold">Insights</h3>
              </div>
              <ul className="space-y-2">
                {data.insights.map((insight, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts - 3 equal columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Efficiency</CardTitle>
              <Select value={metricView} onValueChange={(v: any) => setMetricView(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valueScore">Value Score</SelectItem>
                  <SelectItem value="scorePerRound">Score per Round</SelectItem>
                  <SelectItem value="bullsPer100">Bulls per 100</SelectItem>
                  <SelectItem value="costPerPoint">Cost per Point</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {metricChartOption && <EChart option={metricChartOption} height={350} />}
          </CardContent>
        </Card>

        {/* Value Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Value Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {valuePieOption && <EChart option={valuePieOption} height={350} />}
          </CardContent>
        </Card>

        {/* Caliber Details List */}
        <Card>
          <CardHeader>
            <CardTitle>Caliber Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
            {data.calibers.map((caliber, index) => {
              const rankColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
              const rankColor = rankColors[index % rankColors.length];
              
              return (
                <div
                  key={caliber.caliberId}
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent hover:from-white/[0.06] hover:to-white/[0.02] transition-all duration-300 group cursor-pointer"
                  onClick={() => openCostDialog(caliber.caliberId)}
                >
                  {/* Rank indicator bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: rankColor }}
                  />
                  
                  <div className="p-3 pl-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: rankColor }}
                        />
                        <h3 className="font-bold text-sm truncate">{caliber.caliberName}</h3>
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 flex-shrink-0"
                          style={{ borderColor: rankColor, color: rankColor }}
                        >
                          #{index + 1}
                        </Badge>
                      </div>
                      <div 
                        className="text-xl font-black flex-shrink-0"
                        style={{ color: rankColor }}
                      >
                        {formatDecimal(caliber.valueScore)}
                      </div>
                    </div>
                    
                    {/* Compact metrics */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shots</span>
                        <span className="font-semibold">{caliber.totalShots.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Score</span>
                        <span className="font-semibold text-blue-400">{formatDecimal(caliber.avgScore)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bulls/100</span>
                        <span className="font-semibold text-green-400">{formatDecimal(caliber.bullsPer100)}</span>
                      </div>
                      {caliber.costPerRound && (
                        <>
                          <div className="border-t border-white/5 pt-1.5 mt-1.5" />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">$/Round</span>
                            <span className="font-semibold text-amber-400">${formatDecimal(caliber.costPerRound)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">$/Point</span>
                            <span className="font-semibold text-orange-400">${formatDecimal(caliber.costPerPoint)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Cost Entry Dialog */}
      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Cost Data</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Cost Entry Mode</Label>
              <Select value={costMode} onValueChange={(v: any) => setCostMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perRound">Cost per Round</SelectItem>
                  <SelectItem value="bulk">Bulk Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {costMode === "perRound" ? (
              <div>
                <Label htmlFor="costPerRound">Cost per Round ($)</Label>
                <Input
                  id="costPerRound"
                  type="number"
                  step="0.001"
                  min="0"
                  value={costPerRound}
                  onChange={(e) => setCostPerRound(e.target.value)}
                  placeholder="0.18"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="bulkCost">Bulk Purchase Cost ($)</Label>
                  <Input
                    id="bulkCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkCost}
                    onChange={(e) => setBulkCost(e.target.value)}
                    placeholder="180.00"
                  />
                </div>
                <div>
                  <Label htmlFor="bulkQuantity">Quantity (rounds)</Label>
                  <Input
                    id="bulkQuantity"
                    type="number"
                    step="1"
                    min="1"
                    value={bulkQuantity}
                    onChange={(e) => setBulkQuantity(e.target.value)}
                    placeholder="1000"
                  />
                </div>
                {bulkCost && bulkQuantity && parseFloat(bulkCost) > 0 && parseInt(bulkQuantity) > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Effective cost: ${(parseFloat(bulkCost) / parseInt(bulkQuantity)).toFixed(3)}/round
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCostDialogOpen(false)} disabled={savingCost}>
              Cancel
            </Button>
            <Button onClick={handleSaveCost} disabled={savingCost}>
              {savingCost ? "Saving..." : "Save Cost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
