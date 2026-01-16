"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Plus, Minus, Package, TrendingDown, Target, Calendar, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, isValid } from "date-fns";
import { getBulletIcon } from "@/lib/bullet-icons";
import Image from "next/image";
import { EChart } from "@/components/analytics/EChart";
import type { EChartsOption } from "echarts";

interface Caliber {
  _id: string;
  name: string;
  shortCode?: string;
  category?: string;
  notes?: string;
}

interface Inventory {
  onHand: number;
  reserved: number;
  updatedAt: string;
}

interface Transaction {
  _id: string;
  delta: number;
  reason: string;
  note?: string;
  createdAt: string;
  sessionId?: { _id: string; slug?: string; date: string; location?: string };
  sheetId?: { _id: string; slug?: string; sheetLabel?: string };
}

interface UsageDataPoint {
  date: string;
  rounds: number;
}

interface SessionEfficiency {
  sessionId: string;
  sessionSlug?: string;
  date: string;
  location?: string;
  totalShots: number;
  avgScore: number;
  bullsPer100: number;
  costPerRound?: number;
  costPerBull?: number;
  valueScore: number;
}

export default function AmmoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [caliber, setCaliber] = useState<Caliber | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<SessionEfficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      const [caliberRes, inventoryRes, transactionsRes, usageRes, efficiencyRes] = await Promise.all([
        fetch(`/api/calibers/${id}`),
        fetch(`/api/ammo/inventory`),
        fetch(`/api/ammo/transactions?caliberId=${id}&limit=50`),
        fetch(`/api/ammo/usage-over-time`),
        fetch(`/api/ammo/efficiency/${id}`),
      ]);

      if (caliberRes.ok) {
        const data = await caliberRes.json();
        setCaliber(data);
      } else {
        console.error("Failed to fetch caliber:", await caliberRes.text());
      }

      // Always set inventory, even if it's 0
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        // Match by ID or slug
        const inv = data.find((i: any) => i.caliber._id === id || i.caliber.slug === id);
        if (inv) {
          setInventory({
            onHand: inv.onHand,
            reserved: inv.reserved,
            updatedAt: inv.updatedAt,
          });
        } else {
          // No inventory yet - default to 0
          setInventory({ onHand: 0, reserved: 0, updatedAt: new Date().toISOString() });
        }
      } else {
        // If inventory fetch fails, still set default
        setInventory({ onHand: 0, reserved: 0, updatedAt: new Date().toISOString() });
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }

      // Load usage data for this specific caliber
      if (usageRes.ok) {
        const data = await usageRes.json();
        // Match by ID or slug
        const caliberUsage = data.calibers.find((c: any) => c._id === id || c.slug === id);
        if (caliberUsage) {
          setUsageData(caliberUsage.usage);
        } else {
          setUsageData([]);
        }
      } else {
        setUsageData([]);
      }

      // Load efficiency data
      if (efficiencyRes.ok) {
        const data = await efficiencyRes.json();
        setEfficiencyData(data.sessions || []);
      } else {
        setEfficiencyData([]);
      }
    } catch (error) {
      toast.error("Failed to load ammo details");
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjust(delta: number, note?: string) {
    try {
      // Use the actual caliber ID from state if available (handles slug URLs)
      const caliberIdToUse = caliber?._id || id;
      const res = await fetch("/api/ammo/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caliberId: caliberIdToUse, delta, note }),
      });

      if (res.ok) {
        toast.success(delta > 0 ? "Stock added" : "Stock removed");
        setAdjustDialogOpen(false);
        setAdjustAmount("");
        setAdjustNote("");
        loadData();
      } else {
        toast.error("Failed to adjust inventory");
      }
    } catch (error) {
      toast.error("Failed to adjust inventory");
      console.error(error);
    }
  }

  function handleCustomAdjust() {
    const delta = parseInt(adjustAmount);
    if (isNaN(delta) || delta === 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    handleAdjust(delta, adjustNote ? adjustNote : undefined);
  }

  const reasonLabels: Record<string, string> = {
    manual_add: "Manual Add",
    manual_subtract: "Manual Subtract",
    session_deduct: "Session Used",
    session_adjust: "Session Adjusted",
    session_reversal: "Session Deleted",
    inventory_set: "Initial Inventory",
  };

  // Group transactions by session
  const groupedTransactions: Array<{ session: any; transactions: Transaction[]; displayDate: Date }> = [];
  const sessionMap = new Map<string, Transaction[]>();
  const standaloneTransactions: Transaction[] = [];

  transactions.forEach((tx) => {
    if (tx.sessionId) {
      const sessionKey = typeof tx.sessionId === 'object' ? tx.sessionId._id : tx.sessionId;
      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, []);
      }
      sessionMap.get(sessionKey)!.push(tx);
    } else {
      standaloneTransactions.push(tx);
    }
  });

  // Convert session groups to display format
  sessionMap.forEach((txs) => {
    const sessionDate = txs[0].sessionId?.date ? new Date(txs[0].sessionId.date) : new Date(txs[0].createdAt);
    groupedTransactions.push({
      session: txs[0].sessionId,
      transactions: txs,
      displayDate: sessionDate,
    });
  });

  // Add standalone transactions as individual groups
  standaloneTransactions.forEach((tx) => {
    groupedTransactions.push({
      session: null,
      transactions: [tx],
      displayDate: new Date(tx.createdAt),
    });
  });

  // Sort all groups by date (newest first)
  groupedTransactions.sort((a, b) => b.displayDate.getTime() - a.displayDate.getTime());

  // Generate chart for usage over time
  const getUsageChartOption = (): EChartsOption | null => {
    if (usageData.length === 0) return null;

    const sortedData = [...usageData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const dates = sortedData.map((d) => format(new Date(d.date), "MMM d"));
    const values = sortedData.map((d) => d.rounds);

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        textStyle: { color: "#fff" },
        formatter: (params: any) => {
          const date = sortedData[params[0].dataIndex].date;
          const rounds = params[0].value;
          return `<strong>${format(new Date(date), "MMM d, yyyy")}</strong><br/>${rounds} rounds used`;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: 40,
        containLabel: true,
      },
      xAxis: {
        type: "category" as const,
        data: dates,
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
        axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
      },
      yAxis: {
        type: "value" as const,
        name: "Rounds",
        nameTextStyle: { color: "rgba(255, 255, 255, 0.6)" },
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
        axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
        splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.05)" } },
      },
      series: [
        {
          name: caliber?.name || "Usage",
          type: "line" as const,
          data: values,
          smooth: true,
          symbol: "circle" as const,
          symbolSize: 6,
          color: "#3b82f6",
          lineStyle: {
            width: 3,
          },
          areaStyle: {
            opacity: 0.2,
            color: "#3b82f6",
          },
        },
      ],
    };
  };

  const usageChartOption = getUsageChartOption();

  // Generate efficiency chart - Value Score & Performance over time
  const getEfficiencyChartOption = (): EChartsOption | null => {
    if (efficiencyData.length === 0) return null;

    const hasCostData = efficiencyData.some((d) => d.costPerRound !== undefined);

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        textStyle: { color: "#fff" },
        formatter: (params: any) => {
          const session = efficiencyData[params[0].dataIndex];
          let tooltip = `<strong>${format(new Date(session.date), "MMM d, yyyy")}</strong><br/>`;
          if (session.location) tooltip += `${session.location}<br/>`;
          tooltip += `<br/>Value Score: <strong>${session.valueScore.toFixed(1)}</strong><br/>`;
          tooltip += `Avg Score: ${session.avgScore.toFixed(2)}<br/>`;
          tooltip += `Bulls/100: ${session.bullsPer100.toFixed(1)}<br/>`;
          tooltip += `Shots: ${session.totalShots}<br/>`;
          if (hasCostData && session.costPerBull) {
            tooltip += `<br/>Cost/Bull: $${session.costPerBull.toFixed(2)}`;
          }
          return tooltip;
        },
      },
      legend: {
        data: hasCostData ? ["Value Score", "Cost per Bull ($)"] : ["Value Score", "Bulls per 100"],
        textStyle: { color: "rgba(255, 255, 255, 0.6)" },
        top: 10,
      },
      grid: {
        left: "3%",
        right: hasCostData ? "6%" : "4%",
        bottom: "3%",
        top: 60,
        containLabel: true,
      },
      xAxis: {
        type: "category" as const,
        data: efficiencyData.map((d) => format(new Date(d.date), "MMM d")),
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
        axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
      },
      yAxis: [
        {
          type: "value" as const,
          name: "Value Score",
          nameTextStyle: { color: "rgba(255, 255, 255, 0.6)" },
          axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
          axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
          splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.05)" } },
        },
        {
          type: "value" as const,
          name: hasCostData ? "Cost per Bull ($)" : "Bulls per 100",
          nameTextStyle: { color: "rgba(255, 255, 255, 0.6)" },
          axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
          axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
          splitLine: { show: false },
          inverse: hasCostData, // Invert cost axis so lower is better (visually up)
        },
      ],
      series: [
        {
          name: "Value Score",
          type: "line" as const,
          data: efficiencyData.map((d) => d.valueScore),
          smooth: true,
          symbol: "circle" as const,
          symbolSize: 8,
          color: "#22c55e",
          lineStyle: {
            width: 3,
          },
          areaStyle: {
            opacity: 0.15,
            color: "#22c55e",
          },
        },
        {
          name: hasCostData ? "Cost per Bull ($)" : "Bulls per 100",
          type: "line" as const,
          yAxisIndex: 1,
          data: hasCostData
            ? efficiencyData.map((d) => d.costPerBull || null)
            : efficiencyData.map((d) => d.bullsPer100),
          smooth: true,
          symbol: "diamond" as const,
          symbolSize: 8,
          color: hasCostData ? "#f59e0b" : "#3b82f6",
          lineStyle: {
            width: 2,
            type: hasCostData ? "dashed" as const : "solid" as const,
          },
        },
      ],
    };
  };

  const efficiencyChartOption = getEfficiencyChartOption();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!caliber || !inventory) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <p>Caliber not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/ammo")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inventory
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Image
              src={getBulletIcon(caliber.name, caliber.category)}
              alt={caliber.name}
              width={32}
              height={85}
              className="opacity-70 mt-1"
            />
            <div>
              <h1 className="text-3xl font-bold mb-2">{caliber.name}</h1>
              <div className="flex flex-wrap gap-2 text-sm text-white/60">
                {caliber.shortCode && <span>{caliber.shortCode}</span>}
                {caliber.category && (
                  <Badge variant="outline" className="capitalize border-white/10">
                    {caliber.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={() => setAdjustDialogOpen(true)}
            className="dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Adjust Stock
          </Button>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-white/40" />
            <span className="text-sm text-white/60">On Hand</span>
          </div>
          <div className="text-3xl font-bold">
            {inventory.onHand.toLocaleString()}
          </div>
          {inventory.onHand < 0 && (
            <Badge
              variant="outline"
              className="mt-2 border-red-500/50 text-red-400"
            >
              Negative
            </Badge>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-white/40" />
            <span className="text-sm text-white/60">Total Used</span>
          </div>
          <div className="text-3xl font-bold">
            {Math.abs(
              transactions
                .filter((t) => t.delta < 0)
                .reduce((sum, t) => sum + t.delta, 0)
            ).toLocaleString()}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-white/60">Last Updated</span>
          </div>
          <div className="text-lg">
            {(() => {
              // Try inventory.updatedAt first
              if (inventory.updatedAt && isValid(new Date(inventory.updatedAt))) {
                return formatDistanceToNow(new Date(inventory.updatedAt), {
                  addSuffix: true,
                });
              }
              // Fall back to most recent transaction
              if (transactions.length > 0 && transactions[0].createdAt && isValid(new Date(transactions[0].createdAt))) {
                return formatDistanceToNow(new Date(transactions[0].createdAt), {
                  addSuffix: true,
                });
              }
              return "No activity yet";
            })()}
          </div>
        </Card>
      </div>

      {/* Charts - Side by Side */}
      {(efficiencyChartOption || usageChartOption) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Efficiency Chart */}
          {efficiencyChartOption && (
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Efficiency Over Time</h2>
                <p className="text-sm text-white/60 mt-1">
                  {efficiencyData.some((d) => d.costPerRound !== undefined)
                    ? "Value score and cost per bullseye"
                    : "Value score and accuracy"}
                </p>
              </div>
              <EChart option={efficiencyChartOption} height={300} />
            </Card>
          )}

          {/* Usage Chart */}
          {usageChartOption && (
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Usage Over Time</h2>
                <p className="text-sm text-white/60 mt-1">Rounds fired per session</p>
              </div>
              <EChart option={usageChartOption} height={300} />
            </Card>
          )}
        </div>
      )}

      {/* Notes */}
      {caliber.notes && (
        <Card className="p-4 mb-8">
          <h3 className="text-sm font-semibold text-white/60 mb-2">Notes</h3>
          <p className="text-white/80">{caliber.notes}</p>
        </Card>
      )}

      {/* Transaction History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Transaction History</h2>

        {groupedTransactions.length === 0 ? (
          <p className="text-white/60 text-center py-8">
            No transactions yet
          </p>
        ) : (
          <div className="space-y-2">
            {groupedTransactions.map((group, groupIdx) => {
              const { session, transactions: groupTxs, displayDate } = group;
              const totalDelta = groupTxs.reduce((sum, tx) => sum + tx.delta, 0);
              const hasMultiple = groupTxs.length > 1;

              // If single transaction or no session, render normally
              if (!hasMultiple) {
                const item = groupTxs[0];
                const displayDelta = item.delta;
                const hasValidDate = displayDate && !isNaN(displayDate.getTime());
                
                return (
                  <div
                    key={item._id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      displayDelta > 0 
                        ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10" 
                        : "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                    }`}
                  >
                    <div className={`flex-shrink-0 mt-1 ${
                      displayDelta > 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {item.sessionId ? <Target className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {reasonLabels[item.reason] || item.reason}
                        </span>
                        {item.sessionId && (
                          <Badge variant="secondary" className="text-xs">Session</Badge>
                        )}
                      </div>

                      {item.sessionId && (() => {
                        const sessionDate = item.sessionId?.date;
                        const hasValidSessionDate = sessionDate && !isNaN(new Date(sessionDate).getTime());
                        
                        return (
                          <button
                            onClick={() => router.push(`/sessions/${item.sessionId?.slug || item.sessionId?._id}`)}
                            className="text-sm text-white/80 hover:text-white hover:underline flex items-center gap-2 mb-1"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {hasValidSessionDate ? format(new Date(sessionDate), "MMM d, yyyy") : "Session"}
                            {item.sessionId?.location && (
                              <span className="text-white/60">@ {item.sessionId.location}</span>
                            )}
                          </button>
                        );
                      })()}

                      {item.sheetId && (
                        <button
                          onClick={() => router.push(`/sheets/${item.sheetId?.slug || item.sheetId?._id}`)}
                          className="text-xs text-white/70 hover:text-white hover:underline flex items-center gap-1.5 mb-1"
                        >
                          <Target className="w-3 h-3" />
                          {item.sheetId.sheetLabel || "Sheet"}
                        </button>
                      )}

                      {item.note && <p className="text-sm text-white/70 italic">{item.note}</p>}

                      {hasValidDate && (
                        <p className="text-xs text-white/40 mt-2">
                          {format(displayDate, "MMM d, yyyy 'at' h:mm a")} 
                          <span className="text-white/30"> • </span>
                          {formatDistanceToNow(displayDate, { addSuffix: true })}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className={`text-2xl font-bold ${
                        displayDelta > 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {displayDelta > 0 ? "+" : ""}
                        {displayDelta.toLocaleString()}
                      </div>
                      {caliber && (
                        <Image
                          src={getBulletIcon(caliber.category || "rifle")}
                          alt=""
                          width={14}
                          height={14}
                          className="opacity-60"
                        />
                      )}
                    </div>
                  </div>
                );
              }

              // Multiple transactions from same session - render as accordion
              const sessionDate = session?.date;
              const hasValidSessionDate = sessionDate && !isNaN(new Date(sessionDate).getTime());
              
              return (
                <Accordion key={`session-${groupIdx}`} type="single" collapsible>
                  <AccordionItem value={`session-${groupIdx}`} className={`group border rounded-lg ${
                    totalDelta > 0 
                      ? "border-green-500/20 bg-green-500/5" 
                      : "border-red-500/20 bg-red-500/5"
                  }`}>
                    <AccordionTrigger className="px-4 py-3 pb-0 hover:no-underline w-full [&>svg]:hidden flex-col items-stretch">
                      <div className="flex items-start gap-4 w-full pb-3">
                        <div className={`flex-shrink-0 mt-1 ${
                          totalDelta > 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          <Target className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">Session Used</span>
                            <Badge variant="secondary" className="text-xs">
                              {groupTxs.length} sheets
                            </Badge>
                          </div>

                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/sessions/${session.slug || session._id}`);
                            }}
                            className="text-sm text-white/80 hover:text-white hover:underline flex items-center gap-2 mb-1 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {hasValidSessionDate ? format(new Date(sessionDate), "MMM d, yyyy") : "Session"}
                            {session?.location && (
                              <span className="text-white/60">@ {session.location}</span>
                            )}
                          </span>

                          <p className="text-xs text-white/40 mt-1">
                            {hasValidSessionDate && format(new Date(sessionDate), "MMM d, yyyy")}
                            <span className="text-white/30"> • </span>
                            {hasValidSessionDate && formatDistanceToNow(new Date(sessionDate), { addSuffix: true })}
                          </p>
                        </div>

                        <div className="flex-shrink-0 flex items-center gap-2">
                          <div className={`text-2xl font-bold ${
                            totalDelta > 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {totalDelta > 0 ? "+" : ""}
                            {totalDelta.toLocaleString()}
                          </div>
                          {caliber && (
                            <Image
                              src={getBulletIcon(caliber.category || "rifle")}
                              alt=""
                              width={14}
                              height={14}
                              className="opacity-60"
                            />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-center py-2 border-t border-white/10">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180 ${
                          totalDelta > 0 ? "text-green-400" : "text-red-400"
                        }`} />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-2 mt-2 border-t border-white/10 pt-3">
                        {groupTxs.map((item, sheetIdx) => (
                          <button
                            key={item._id}
                            onClick={() => {
                              if (item.sheetId) {
                                router.push(`/sheets/${item.sheetId.slug || item.sheetId._id}`);
                              }
                            }}
                            className="w-full flex items-start gap-3 py-2 px-3 rounded bg-black/20 hover:bg-black/30 transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white/80 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5" />
                                {item.sheetId?.sheetLabel || `Sheet ${sheetIdx + 1}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`text-lg font-semibold ${
                                item.delta > 0 ? "text-green-400" : "text-red-400"
                              }`}>
                                {item.delta > 0 ? "+" : ""}
                                {item.delta.toLocaleString()}
                              </div>
                              {caliber && (
                                <Image
                                  src={getBulletIcon(caliber.category || "rifle")}
                                  alt=""
                                  width={11}
                                  height={11}
                                  className="opacity-60"
                                />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })}
          </div>
        )}
      </Card>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory - {caliber.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quick buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleAdjust(100, "Quick add 100")}
                className="dark:bg-white/5 dark:border-white/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add 100
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAdjust(-100, "Quick subtract 100")}
                className="dark:bg-white/5 dark:border-white/20"
              >
                <Minus className="w-4 h-4 mr-2" />
                Remove 100
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0a0a0a] px-2 text-white/60">
                  Or custom amount
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">
                Amount (positive to add, negative to remove)
              </Label>
              <Input
                id="amount"
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g., 250 or -75"
              />
            </div>

            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="e.g., Purchased from LGS"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              className="dark:bg-white/5 dark:border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCustomAdjust}
              className="dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
