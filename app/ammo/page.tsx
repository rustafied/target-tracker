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

export default function AmmoPage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<AmmoInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, string>>({});
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCaliber, setEditingCaliber] = useState<AmmoInventoryItem | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Fetch both user's calibers and existing inventory
      const [calibersRes, inventoryRes] = await Promise.all([
        fetch("/api/calibers"),
        fetch("/api/ammo/inventory"),
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
    // Initialize quantities to empty
    const initialQuantities: Record<string, string> = {};
    inventory.forEach(item => {
      initialQuantities[item.caliber._id] = "";
    });
    setOrderQuantities(initialQuantities);
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
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.caliber.name.toLowerCase().includes(search) ||
      item.caliber.shortCode?.toLowerCase().includes(search) ||
      item.caliber.category?.toLowerCase().includes(search)
    );
  });

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => (
            <Card
              key={item._id}
              className="p-5 hover:bg-white/[0.02] transition-colors relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/ammo/${item.caliber._id}`)}
                >
                  <h3 className="font-semibold text-lg truncate mb-1">
                    {item.caliber.name}
                  </h3>
                  {item.caliber.shortCode && (
                    <p className="text-sm text-white/60">{item.caliber.shortCode}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 dark:hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(item);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
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
              </div>

              {/* Metadata */}
              {item.caliber.category && (
                <div className="mb-4">
                  <Badge
                    variant="outline"
                    className="text-xs capitalize border-white/10"
                  >
                    {item.caliber.category}
                  </Badge>
                </div>
              )}

              {/* On Hand */}
              <div 
                className="mb-4 cursor-pointer"
                onClick={() => router.push(`/ammo/${item.caliber._id}`)}
              >
                <div className="text-3xl font-bold">
                  {item.onHand.toLocaleString()}
                </div>
                <div className="text-sm text-white/60">rounds on hand</div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 dark:bg-white/5 dark:border-white/20 dark:hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjust(item.caliber._id, 50);
                  }}
                >
                  +50
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 dark:bg-white/5 dark:border-white/20 dark:hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjust(item.caliber._id, -50);
                  }}
                  disabled={item.onHand < 50}
                >
                  -50
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Ammo Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-white/60">
              Enter quantities for each caliber in your order. Leave blank to skip.
            </p>

            <div className="space-y-3">
              {inventory.map((item) => (
                <div key={item.caliber._id} className="flex items-center gap-3">
                  <Label
                    htmlFor={`qty-${item.caliber._id}`}
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
                    id={`qty-${item.caliber._id}`}
                    type="number"
                    min="0"
                    step="1"
                    value={orderQuantities[item.caliber._id] || ""}
                    onChange={(e) =>
                      setOrderQuantities({
                        ...orderQuantities,
                        [item.caliber._id]: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="w-32"
                  />
                </div>
              ))}
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
