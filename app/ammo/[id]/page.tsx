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
import { ArrowLeft, Plus, Minus, Package, TrendingDown, Target, Calendar } from "lucide-react";
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

      const [caliberRes, inventoryRes, transactionsRes, usageRes] = await Promise.all([
        fetch(`/api/calibers/${id}`),
        fetch(`/api/ammo/inventory`),
        fetch(`/api/ammo/transactions?caliberId=${id}&limit=50`),
        fetch(`/api/ammo/usage-over-time`),
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
        const inv = data.find((i: any) => i.caliber._id === id);
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
        const caliberUsage = data.calibers.find((c: any) => c._id === id);
        if (caliberUsage) {
          setUsageData(caliberUsage.usage);
        } else {
          setUsageData([]);
        }
      } else {
        setUsageData([]);
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
      const res = await fetch("/api/ammo/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caliberId: id, delta, note }),
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
  const groupedTransactions = transactions.reduce((acc, tx) => {
    if (tx.sessionId) {
      const sessionKey = tx.sessionId._id;
      if (!acc[sessionKey]) {
        acc[sessionKey] = {
          sessionId: tx.sessionId,
          transactions: [],
          totalDelta: 0,
          createdAt: tx.createdAt,
          isSession: true,
        };
      }
      acc[sessionKey].transactions.push(tx);
      acc[sessionKey].totalDelta += tx.delta;
      // Use the most recent createdAt from all transactions in this session
      if (tx.createdAt && (!acc[sessionKey].createdAt || new Date(tx.createdAt) > new Date(acc[sessionKey].createdAt))) {
        acc[sessionKey].createdAt = tx.createdAt;
      }
    } else {
      // Non-session transactions get their own entry
      acc[tx._id] = {
        ...tx,
        isSession: false,
      };
    }
    return acc;
  }, {} as Record<string, any>);

  const displayTransactions = Object.values(groupedTransactions).sort(
    (a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Newest first
    }
  );

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

      {/* Usage Chart */}
      {usageChartOption && (
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Usage Over Time</h2>
          <EChart option={usageChartOption} height={300} />
        </Card>
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

        {displayTransactions.length === 0 ? (
          <p className="text-white/60 text-center py-8">
            No transactions yet
          </p>
        ) : (
          <div className="space-y-2">
            {displayTransactions.map((item: any) => {
              const isGrouped = item.isSession;
              const displayDelta = isGrouped ? item.totalDelta : item.delta;
              const displayDate = item.createdAt || new Date().toISOString();
              const hasValidDate = item.createdAt && !isNaN(new Date(item.createdAt).getTime());
              
              return (
                <div
                  key={isGrouped ? item.sessionId._id : item._id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    displayDelta > 0 
                      ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10" 
                      : "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                  }`}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 mt-1 ${
                    displayDelta > 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {isGrouped ? (
                      <Target className="w-5 h-5" />
                    ) : item.sessionId ? (
                      <Target className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {isGrouped ? "Session Used" : (reasonLabels[item.reason] || item.reason)}
                      </span>
                      {(isGrouped || item.sessionId) && (
                        <Badge variant="secondary" className="text-xs">
                          Session
                        </Badge>
                      )}
                    </div>

                    {/* Session Details */}
                    {(isGrouped || item.sessionId) && (() => {
                      const session = isGrouped ? item.sessionId : item.sessionId;
                      const sessionDate = session?.date;
                      const hasValidSessionDate = sessionDate && !isNaN(new Date(sessionDate).getTime());
                      
                      return (
                        <button
                          onClick={() => {
                            router.push(`/sessions/${session.slug || session._id}`);
                          }}
                          className="text-sm text-white/80 hover:text-white hover:underline flex items-center gap-2 mb-1"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {hasValidSessionDate ? format(new Date(sessionDate), "MMM d, yyyy") : "Session"}
                          {session.location && (
                            <span className="text-white/60">@ {session.location}</span>
                          )}
                        </button>
                      );
                    })()}

                    {/* Show sheet count for grouped sessions */}
                    {isGrouped && item.transactions.length > 1 && (
                      <p className="text-xs text-white/60 mb-1">
                        {item.transactions.length} sheets
                      </p>
                    )}

                    {/* Note for non-grouped items */}
                    {!isGrouped && item.note && (
                      <p className="text-sm text-white/70 italic">{item.note}</p>
                    )}

                    {/* Timestamp */}
                    {hasValidDate && (
                      <p className="text-xs text-white/40 mt-2">
                        {format(new Date(displayDate), "MMM d, yyyy 'at' h:mm a")} 
                        <span className="text-white/30"> • </span>
                        {formatDistanceToNow(new Date(displayDate), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {/* Delta */}
                  <div className="flex-shrink-0">
                    <div
                      className={`text-2xl font-bold ${
                        displayDelta > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {displayDelta > 0 ? "+" : ""}
                      {displayDelta.toLocaleString()}
                    </div>
                  </div>
                </div>
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
