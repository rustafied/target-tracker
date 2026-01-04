"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Target, Building2, Package, FileText, GripVertical } from "lucide-react";
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

interface Firearm {
  _id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
}

function SortableFirearmCard({
  firearm,
  onEdit,
  onDelete,
}: {
  firearm: Firearm;
  onEdit: (firearm: Firearm) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: firearm._id,
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
            <span className="text-lg">{firearm.name}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(firearm)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(firearm._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {firearm.manufacturer && (
          <p className="text-sm text-muted-foreground">
            <strong>Manufacturer:</strong> {firearm.manufacturer}
          </p>
        )}
        {firearm.model && (
          <p className="text-sm text-muted-foreground">
            <strong>Model:</strong> {firearm.model}
          </p>
        )}
        {firearm.notes && <p className="text-sm text-muted-foreground mt-2">{firearm.notes}</p>}
      </CardContent>
    </Card>
  );
}

export default function FirearmsPage() {
  const [firearms, setFirearms] = useState<Firearm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFirearm, setEditingFirearm] = useState<Firearm | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",
    model: "",
    notes: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchFirearms();
  }, []);

  const fetchFirearms = async () => {
    try {
      const res = await fetch("/api/firearms");
      if (res.ok) {
        const data = await res.json();
        setFirearms(data);
      }
    } catch (error) {
      toast.error("Failed to load firearms");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = firearms.findIndex((f) => f._id === active.id);
      const newIndex = firearms.findIndex((f) => f._id === over.id);

      const newOrder = arrayMove(firearms, oldIndex, newIndex);
      setFirearms(newOrder);

      // Update sort order in database
      try {
        const items = newOrder.map((f, index) => ({ _id: f._id, sortOrder: index }));
        await fetch("/api/firearms/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        toast.success("Order updated");
      } catch (error) {
        toast.error("Failed to save order");
        fetchFirearms(); // Revert on error
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingFirearm ? `/api/firearms/${editingFirearm._id}` : "/api/firearms";
      const method = editingFirearm ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingFirearm ? "Firearm updated" : "Firearm created");
        setDialogOpen(false);
        resetForm();
        fetchFirearms();
      } else {
        toast.error("Failed to save firearm");
      }
    } catch (error) {
      toast.error("Failed to save firearm");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Archive this firearm?")) return;

    try {
      const res = await fetch(`/api/firearms/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Firearm archived");
        fetchFirearms();
      } else {
        toast.error("Failed to archive firearm");
      }
    } catch (error) {
      toast.error("Failed to archive firearm");
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (firearm: Firearm) => {
    setEditingFirearm(firearm);
    setFormData({
      name: firearm.name,
      manufacturer: firearm.manufacturer || "",
      model: firearm.model || "",
      notes: firearm.notes || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingFirearm(null);
    setFormData({ name: "", manufacturer: "", model: "", notes: "" });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Firearms</h1>
          <p className="text-muted-foreground mt-1">
            Manage your firearms collection - drag to reorder
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Firearm
        </Button>
      </div>

      {firearms.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No firearms yet. Click "Add Firearm" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={firearms.map((f) => f._id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {firearms.map((firearm) => (
                <SortableFirearmCard
                  key={firearm._id}
                  firearm={firearm}
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
            <DialogTitle>{editingFirearm ? "Edit Firearm" : "Add Firearm"}</DialogTitle>
            <DialogDescription>
              {editingFirearm ? "Update firearm details" : "Add a new firearm to your collection"}
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
                  placeholder="e.g., DDM4 16in"
                />
              </div>
              <div>
                <Label htmlFor="manufacturer" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Manufacturer
                </Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., Daniel Defense"
                />
              </div>
              <div>
                <Label htmlFor="model" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Model
                </Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., DDM4 V7"
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
              <Button type="submit">{editingFirearm ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
