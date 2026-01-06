"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Target, Hash, Layers, FileText, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingCard } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Caliber {
  _id: string;
  name: string;
  shortCode?: string;
  category?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
}

function SortableCaliberCard({
  caliber,
  onEdit,
  onDelete,
}: {
  caliber: Caliber;
  onEdit: (caliber: Caliber) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: caliber._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? "z-50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-lg">{caliber.name}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(caliber)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(caliber._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {caliber.shortCode && (
          <p className="text-sm text-muted-foreground">
            <strong>Short Code:</strong> {caliber.shortCode}
          </p>
        )}
        {caliber.category && (
          <p className="text-sm text-muted-foreground">
            <strong>Category:</strong> {caliber.category}
          </p>
        )}
        {caliber.notes && <p className="text-sm text-muted-foreground mt-2">{caliber.notes}</p>}
      </CardContent>
    </Card>
  );
}

export default function CalibersPage() {
  const [calibers, setCalibers] = useState<Caliber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCaliber, setEditingCaliber] = useState<Caliber | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    shortCode: "",
    category: "",
    notes: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCalibers();
  }, []);

  const fetchCalibers = async () => {
    try {
      const res = await fetch("/api/calibers");
      if (res.ok) {
        const data = await res.json();
        setCalibers(data);
      }
    } catch (error) {
      toast.error("Failed to load calibers");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = calibers.findIndex((c) => c._id === active.id);
      const newIndex = calibers.findIndex((c) => c._id === over.id);

      const newOrder = arrayMove(calibers, oldIndex, newIndex);
      setCalibers(newOrder);

      try {
        const items = newOrder.map((c, index) => ({ _id: c._id, sortOrder: index }));
        await fetch("/api/calibers/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        toast.success("Order updated");
      } catch (error) {
        toast.error("Failed to save order");
        fetchCalibers();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCaliber ? `/api/calibers/${editingCaliber._id}` : "/api/calibers";
      const method = editingCaliber ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingCaliber ? "Caliber updated" : "Caliber created");
        setDialogOpen(false);
        resetForm();
        fetchCalibers();
      } else {
        toast.error("Failed to save caliber");
      }
    } catch (error) {
      toast.error("Failed to save caliber");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Archive this caliber?")) return;

    try {
      const res = await fetch(`/api/calibers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Caliber archived");
        fetchCalibers();
      } else {
        toast.error("Failed to archive caliber");
      }
    } catch (error) {
      toast.error("Failed to archive caliber");
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (caliber: Caliber) => {
    setEditingCaliber(caliber);
    setFormData({
      name: caliber.name,
      shortCode: caliber.shortCode || "",
      category: caliber.category || "",
      notes: caliber.notes || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCaliber(null);
    setFormData({ name: "", shortCode: "", category: "", notes: "" });
  };

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calibers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your calibers collection - drag to reorder
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Caliber
        </Button>
      </div>

      {calibers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No calibers yet. Click "Add Caliber" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={calibers.map((c) => c._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {calibers.map((caliber) => (
                <SortableCaliberCard
                  key={caliber._id}
                  caliber={caliber}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCaliber ? "Edit Caliber" : "Add Caliber"}</DialogTitle>
            <DialogDescription>
              {editingCaliber ? "Update caliber details" : "Add a new caliber to your collection"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., 5.56 NATO"
                />
              </div>
              <div>
                <Label htmlFor="shortCode" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Short Code
                </Label>
                <Input
                  id="shortCode"
                  value={formData.shortCode}
                  onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                  placeholder="e.g., 5.56"
                />
              </div>
              <div>
                <Label htmlFor="category" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Category
                </Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Rifle, Pistol"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingCaliber ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
