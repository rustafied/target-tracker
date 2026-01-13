"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Search, Package, AlertCircle, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getBulletIcon } from "@/lib/bullet-icons";
import Image from "next/image";
import { EChart } from "@/components/analytics/EChart";
import type { EChartsOption } from "echarts";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AmmoInventoryItem {
  _id: string;
  onHand: number;
  reserved: number;
  updatedAt: string;
  caliber: {
    _id: string;
    name: string;
    shortCode?: string;
    category?: string;
  };
}

interface UsageData {
  calibers: Array<{
    _id: string;
    caliberName: string;
    usage: Array<{ date: string; rounds: number }>;
  }>;
}

export default function AmmoPage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<AmmoInventoryItem[]>([]);
  const [usageOverTime, setUsageOverTime] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, string>>({});
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCaliber, setEditingCaliber] = useState<AmmoInventoryItem | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [usageData, setUsageData] = useState<Record<string, string>>({});
  const [usageNote, setUsageNote] = useState("");
  const [submittingUsage, setSubmittingUsage] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Fetch user's calibers, inventory, and usage data
      const [calibersRes, inventoryRes, usageRes] = await Promise.all([
        fetch("/api/calibers"),
        fetch("/api/ammo/inventory"),
        fetch("/api/ammo/usage-over-time"),
      ]);

      if (calibersRes.ok) {
        const calibers = await calibersRes.json();
        const existingInventory = inventoryRes.ok ? await inventoryRes.json() : [];
        
        // Create inventory map
        const inventoryMap = new Map(
          existingInventory.map((inv: any) => [inv.caliber._id, inv])
        );
        
        // Build complete inventory list with all calibers
        const completeInventory = calibers.map((cal: any) => {
          const existing = inventoryMap.get(cal._id);
          return existing || {
            _id: `placeholder-${cal._id}`,
            onHand: 0,
            reserved: 0,
            updatedAt: new Date().toISOString(),
            caliber: {
              _id: cal._id,
              name: cal.name,
              shortCode: cal.shortCode,
              category: cal.category,
            },
          };
        });
        
        setInventory(completeInventory);
      } else {
        toast.error("Failed to load calibers");
      }

      // Load usage data
      if (usageRes.ok) {
        const usage = await usageRes.json();
        setUsageOverTime(usage);
      }
    } catch (error) {
      toast.error("Failed to load inventory");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjust(caliberId: string, delta: number, customNote?: string) {
    try {
      const note = customNote || (delta > 0 ? "Quick add" : "Quick subtract");
      const res = await fetch("/api/ammo/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caliberId, delta, note }),
      });

      if (res.ok) {
        toast.success(delta > 0 ? "Stock added" : "Stock removed");
        loadData();
      } else {
        toast.error("Failed to adjust inventory");
      }
    } catch (error) {
      toast.error("Failed to adjust inventory");
      console.error(error);
    }
  }

  function openEditDialog(item: AmmoInventoryItem) {
    setEditingCaliber(item);
    setEditAmount("");
    setEditNote("");
    setEditDialogOpen(true);
  }

  async function handleEditSubmit() {
    if (!editingCaliber) return;

    const delta = parseInt(editAmount);
    if (isNaN(delta) || delta === 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    await handleAdjust(editingCaliber.caliber._id, delta, editNote || undefined);
    setEditDialogOpen(false);
    setEditingCaliber(null);
  }

  function openOrderDialog() {
    // Initialize empty - only selected calibers will have entries
    setOrderQuantities({});
    setOrderDialogOpen(true);
  }

  async function handleSubmitOrder() {
    try {
      setSubmittingOrder(true);

      // Filter out empty quantities and convert to numbers
      const orders = Object.entries(orderQuantities)
        .filter(([_, qty]) => qty.trim() !== "" && parseInt(qty) > 0)
        .map(([caliberId, qty]) => ({
          caliberId,
          delta: parseInt(qty),
        }));

      if (orders.length === 0) {
        toast.error("Please enter at least one quantity");
        return;
      }

      // Submit adjustments one at a time to better handle errors
      let successCount = 0;
      let failedCount = 0;
      
      for (const { caliberId, delta } of orders) {
        try {
          const res = await fetch("/api/ammo/inventory/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caliberId,
              delta,
              note: "Bulk order",
            }),
          });
          
          if (res.ok) {
            successCount++;
          } else {
            failedCount++;
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.error(`Failed ${caliberId}:`, res.status, errorData);
          }
        } catch (err) {
          failedCount++;
          console.error(`Error for ${caliberId}:`, err);
        }
      }
      
      if (failedCount === 0) {
        toast.success(`Added inventory for ${successCount} caliber${successCount > 1 ? 's' : ''}`);
        setOrderDialogOpen(false);
        loadData();
      } else if (successCount > 0) {
        toast.warning(`${successCount} succeeded, ${failedCount} failed`);
        loadData();
      } else {
        toast.error("All adjustments failed");
      }

    } catch (error) {
      toast.error("Failed to submit order");
      console.error("Submit error:", error);
    } finally {
      setSubmittingOrder(false);
    }
  }

  const filteredInventory = inventory.filter((item) => {
    // Hide items with zero inventory
    if (item.onHand === 0) return false;
    
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.caliber.name.toLowerCase().includes(search) ||
      item.caliber.shortCode?.toLowerCase().includes(search) ||
      item.caliber.category?.toLowerCase().includes(search)
    );
  });

  // Generate chart for usage over time
  const getUsageChartOption = (): EChartsOption | null => {
    if (!usageOverTime || usageOverTime.calibers.length === 0) return null;

    const colors = [
      "#3b82f6", // blue
      "#22c55e", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#06b6d4", // cyan
      "#ec4899", // pink
      "#14b8a6", // teal
    ];

    // Create all unique dates across all calibers
    const allDates = new Set<string>();
    usageOverTime.calibers.forEach((cal) => {
      cal.usage.forEach((u) => allDates.add(u.date));
    });
    const sortedDates = Array.from(allDates).sort();

    // Create series for each caliber
    const series = usageOverTime.calibers.map((cal, index) => {
      const dataMap = new Map(cal.usage.map((u) => [u.date, u.rounds]));
      const data = sortedDates.map((date) => dataMap.get(date) || 0);

      return {
        name: cal.caliberName,
        type: "line" as const,
        data,
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 6,
        color: colors[index % colors.length],
        lineStyle: {
          width: 2,
        },
        areaStyle: {
          opacity: 0.1,
        },
      };
    });

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        textStyle: { color: "#fff" },
        formatter: (params: any) => {
          const date = sortedDates[params[0].dataIndex];
          let tooltip = `<strong>${format(new Date(date), "MMM d, yyyy")}</strong><br/>`;
          params.forEach((param: any) => {
            if (param.value > 0) {
              tooltip += `${param.marker} ${param.seriesName}: ${param.value} rounds<br/>`;
            }
          });
          return tooltip;
        },
      },
      legend: {
        data: usageOverTime.calibers.map((c) => c.caliberName),
        textStyle: { color: "rgba(255, 255, 255, 0.6)" },
        top: 10,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: 60,
        containLabel: true,
      },
      xAxis: {
        type: "category" as const,
        data: sortedDates.map((date) => format(new Date(date), "MMM d")),
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
      series,
    };
  };

  const usageChartOption = getUsageChartOption();

  function openUsageDialog() {
    // Initialize empty usage amounts
    const initialUsage: Record<string, string> = {};
    setUsageData(initialUsage);
    setUsageNote("");
    setUsageDialogOpen(true);
  }

  async function handleSubmitUsage() {
    try {
      setSubmittingUsage(true);

      // Filter out empty quantities and convert to numbers
      const usages = Object.entries(usageData)
        .filter(([_, qty]) => qty.trim() !== "" && parseInt(qty) > 0)
        .map(([caliberId, qty]) => ({
          caliberId,
          rounds: parseInt(qty),
        }));

      if (usages.length === 0) {
        toast.error("Please enter at least one usage amount");
        return;
      }

      // Submit adjustments (negative values for deductions)
      let successCount = 0;
      let failedCount = 0;
      
      for (const { caliberId, rounds } of usages) {
        try {
          const res = await fetch("/api/ammo/inventory/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caliberId,
              delta: -rounds, // Negative for usage/deduction
              note: usageNote || "Non-session usage",
            }),
          });
          
          if (res.ok) {
            successCount++;
          } else {
            failedCount++;
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.error(`Failed ${caliberId}:`, res.status, errorData);
          }
        } catch (err) {
          failedCount++;
          console.error(`Error for ${caliberId}:`, err);
        }
      }
      
      if (failedCount === 0) {
        toast.success(`Recorded usage for ${successCount} caliber${successCount > 1 ? 's' : ''}`);
        setUsageDialogOpen(false);
        loadData();
      } else if (successCount > 0) {
        toast.warning(`${successCount} succeeded, ${failedCount} failed`);
        loadData();
      } else {
        toast.error("All adjustments failed");
      }

    } catch (error) {
      toast.error("Failed to record usage");
      console.error("Submit error:", error);
    } finally {
      setSubmittingUsage(false);
    }
  }

  // Generate pie chart for inventory distribution
  const getInventoryPieOption = (): EChartsOption | null => {
    // Only include items with inventory
    const itemsWithInventory = inventory.filter(item => item.onHand > 0);
    
    if (itemsWithInventory.length === 0) return null;

    const colors = [
      "#3b82f6", // blue
      "#22c55e", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#06b6d4", // cyan
      "#ec4899", // pink
      "#14b8a6", // teal
    ];

    const data = itemsWithInventory.map((item, index) => ({
      name: item.caliber.name,
      value: item.onHand,
      itemStyle: {
        color: colors[index % colors.length],
      },
    }));

    return {
      tooltip: {
        trigger: "item" as const,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        textStyle: { color: "#fff" },
        formatter: (params: any) => {
          const percentage = params.percent.toFixed(1);
          return `<strong>${params.name}</strong><br/>${params.value.toLocaleString()} rounds (${percentage}%)`;
        },
      },
      series: [
        {
          type: "pie" as const,
          radius: ["50%", "80%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: false,
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold" as const,
              color: "#fff",
              formatter: (params: any) => {
                return `${params.name}\n${params.value.toLocaleString()}\n${params.percent.toFixed(1)}%`;
              },
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          labelLine: {
            show: false,
          },
          data,
        },
      ],
    };
  };

  const inventoryPieOption = getInventoryPieOption();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Ammo Inventory</h1>
            <p className="text-white/60 text-sm">
              Linked to your calibers from Setup
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={openUsageDialog}
            variant="outline"
            className="dark:bg-white/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Record Usage
          </Button>
          <Button
            onClick={openOrderDialog}
            className="dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Order
          </Button>
          <Button
            onClick={() => router.push("/setup/calibers")}
            variant="outline"
            className="dark:bg-white/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Manage Calibers
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search calibers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Charts */}
      {(usageChartOption || inventoryPieOption) && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Usage Over Time Chart (75% width) */}
          {usageChartOption && (
            <Card className="p-6 lg:col-span-3">
              <h2 className="text-xl font-semibold mb-4">Usage Over Time</h2>
              <EChart option={usageChartOption} height={300} />
            </Card>
          )}

          {/* Inventory Distribution Pie Chart (25% width) */}
          {inventoryPieOption && (
            <Card className="p-6 lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4">Stock</h2>
              <EChart option={inventoryPieOption} height={300} />
            </Card>
          )}
        </div>
      )}

      {/* Inventory Grid */}
      {filteredInventory.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <h3 className="text-lg font-semibold mb-2">No calibers found</h3>
          <p className="text-white/60 mb-6">
            {searchTerm
              ? "No calibers match your search"
              : "Add calibers in Setup to start tracking ammo"}
          </p>
          <Button
            onClick={() => router.push("/setup/calibers")}
            className="dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Go to Setup → Calibers
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredInventory.map((item) => (
            <Card
              key={item._id}
              className="p-5 hover:bg-white/[0.02] transition-colors relative cursor-pointer"
              onClick={() => router.push(`/ammo/${item.caliber._id}`)}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left side: Icon and Caliber Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Image
                    src={getBulletIcon(item.caliber.name, item.caliber.category)}
                    alt={item.caliber.name}
                    width={24}
                    height={64}
                    className="flex-shrink-0 opacity-70"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {item.caliber.name}
                    </h3>
                    {item.caliber.shortCode && (
                      <p className="text-sm text-white/60">{item.caliber.shortCode}</p>
                    )}
                  </div>
                </div>

                {/* Center: Status Badge (if needed) */}
                <div className="flex items-center gap-2">
                  {item.onHand <= 0 && (
                    <Badge
                      variant="outline"
                      className="border-red-500/50 text-red-400"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {item.onHand < 0 ? "Negative" : "Empty"}
                    </Badge>
                  )}
                </div>

                {/* Right side: Inventory and Edit Button */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {item.onHand.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/60">rounds on hand</div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 dark:hover:bg-white/10 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(item);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Ammo Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-white/60">
              Select which calibers you ordered and enter quantities for each.
            </p>

            <div className="space-y-3">
              <Label>Select Calibers in Your Order</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
                {inventory.map((item) => {
                  const caliberId = item.caliber._id;
                  const hasValue = orderQuantities[caliberId] !== undefined;
                  return (
                    <button
                      key={caliberId}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Toggle selection
                        if (hasValue) {
                          const newQuantities = { ...orderQuantities };
                          delete newQuantities[caliberId];
                          setOrderQuantities(newQuantities);
                        } else {
                          setOrderQuantities({ ...orderQuantities, [caliberId]: "" });
                        }
                      }}
                      className={`px-3 py-2 rounded-md text-sm transition-colors font-medium ${
                        hasValue
                          ? "bg-blue-600 text-white ring-2 ring-blue-400"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {item.caliber.name}
                    </button>
                  );
                })}
              </div>

              {/* Input fields for selected calibers */}
              {Object.keys(orderQuantities).length > 0 && (
                <div className="space-y-3 pt-2">
                  {Object.keys(orderQuantities).map((caliberId) => {
                    const item = inventory.find((inv) => inv.caliber._id === caliberId);
                    if (!item) return null;

                    return (
                      <div key={caliberId} className="flex items-center gap-3">
                        <Label
                          htmlFor={`qty-${caliberId}`}
                          className="flex-1 font-normal"
                        >
                          <div className="font-semibold">{item.caliber.name}</div>
                          {item.caliber.shortCode && (
                            <div className="text-xs text-white/50">
                              {item.caliber.shortCode}
                            </div>
                          )}
                          <div className="text-xs text-white/40">
                            Current: {item.onHand} rounds
                          </div>
                        </Label>
                        <Input
                          id={`qty-${caliberId}`}
                          type="number"
                          min="1"
                          step="1"
                          value={orderQuantities[caliberId] || ""}
                          onChange={(e) =>
                            setOrderQuantities({
                              ...orderQuantities,
                              [caliberId]: e.target.value,
                            })
                          }
                          placeholder="Quantity"
                          className="w-32"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOrderDialogOpen(false)}
              disabled={submittingOrder}
              className="dark:bg-white/5 dark:border-white/20"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitOrder}
              disabled={submittingOrder}
              className="dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              {submittingOrder ? "Adding..." : "Add to Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Non-Session Usage Dialog */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Non-Session Usage</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-white/60">
              Select calibers and enter rounds used for shooting that wasn't recorded in a session.
            </p>

            <div>
              <Label htmlFor="usageNote">Note (optional)</Label>
              <Input
                id="usageNote"
                value={usageNote}
                onChange={(e) => setUsageNote(e.target.value)}
                placeholder="e.g., Practice at backyard range"
              />
            </div>

            <div className="space-y-3">
              <Label>Select Calibers and Enter Rounds Used</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
                {inventory.filter(item => item.onHand > 0).map((item) => {
                  const caliberId = item.caliber._id;
                  const hasValue = usageData[caliberId] && usageData[caliberId].trim() !== "";
                  return (
                    <button
                      key={caliberId}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Toggle selection - if has value, clear it, otherwise focus will be set below
                        if (hasValue) {
                          const newUsageData = { ...usageData };
                          delete newUsageData[caliberId];
                          setUsageData(newUsageData);
                        } else {
                          setUsageData({ ...usageData, [caliberId]: "" });
                        }
                      }}
                      className={`px-3 py-2 rounded-md text-sm transition-colors font-medium ${
                        hasValue
                          ? "bg-blue-600 text-white ring-2 ring-blue-400"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {item.caliber.name}
                    </button>
                  );
                })}
              </div>

              {/* Input fields for selected calibers */}
              {Object.keys(usageData).length > 0 && (
                <div className="space-y-3 pt-2">
                  {Object.keys(usageData).map((caliberId) => {
                    const item = inventory.find((inv) => inv.caliber._id === caliberId);
                    if (!item) return null;

                    return (
                      <div key={caliberId} className="flex items-center gap-3">
                        <Label
                          htmlFor={`usage-${caliberId}`}
                          className="flex-1 font-normal"
                        >
                          <div className="font-semibold">{item.caliber.name}</div>
                          <div className="text-xs text-white/40">
                            Available: {item.onHand} rounds
                          </div>
                        </Label>
                        <Input
                          id={`usage-${caliberId}`}
                          type="number"
                          min="1"
                          max={item.onHand}
                          step="1"
                          value={usageData[caliberId] || ""}
                          onChange={(e) =>
                            setUsageData({
                              ...usageData,
                              [caliberId]: e.target.value,
                            })
                          }
                          placeholder="Rounds used"
                          className="w-32"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUsageDialogOpen(false)}
              disabled={submittingUsage}
              className="dark:bg-white/5 dark:border-white/20"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitUsage}
              disabled={submittingUsage}
              className="dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              {submittingUsage ? "Recording..." : "Record Usage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adjust Inventory - {editingCaliber?.caliber.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-white/60">
              Current: {editingCaliber?.onHand.toLocaleString()} rounds
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setEditAmount("50")}
                className="dark:bg-white/5 dark:border-white/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add 50
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditAmount("100")}
                className="dark:bg-white/5 dark:border-white/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add 100
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditAmount("-50")}
                className="dark:bg-white/5 dark:border-white/20"
              >
                <Plus className="w-4 h-4 mr-2 rotate-45" />
                Remove 50
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditAmount("-100")}
                className="dark:bg-white/5 dark:border-white/20"
              >
                <Plus className="w-4 h-4 mr-2 rotate-45" />
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
              <Label htmlFor="editAmount">
                Amount (positive to add, negative to remove)
              </Label>
              <Input
                id="editAmount"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="e.g., 500 or -100"
              />
            </div>

            <div>
              <Label htmlFor="editNote">Note (optional)</Label>
              <Input
                id="editNote"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="e.g., Purchased from LGS"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="dark:bg-white/5 dark:border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
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
