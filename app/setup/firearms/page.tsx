"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Target, Building2, Package, FileText, GripVertical, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFirearmIcon } from "@/lib/firearm-icons";
import Image from "next/image";
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

interface Firearm {
  _id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  defaultDistanceYards?: number;
  color?: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  caliberIds?: string[];
  opticIds?: string[];
}

interface Caliber {
  _id: string;
  name: string;
}

interface Optic {
  _id: string;
  name: string;
}

function SortableFirearmCard({
  firearm,
  calibers,
  optics,
  onEdit,
  onDelete,
}: {
  firearm: Firearm;
  calibers: Caliber[];
  optics: Optic[];
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

  const firearmCalibers = calibers.filter((c) => 
    firearm.caliberIds?.map(String).includes(String(c._id))
  );
  const firearmOptics = optics.filter((o) => 
    firearm.opticIds?.map(String).includes(String(o._id))
  );

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors ${
        isDragging ? "z-50 shadow-lg" : ""
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Firearm Icon */}
      <div className="flex-shrink-0 flex items-center">
        <Image
          src={getFirearmIcon(firearm.name)}
          alt={firearm.name}
          width={72}
          height={48}
          className="opacity-90"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h3 className="font-semibold text-lg">{firearm.name}</h3>
            {(firearm.manufacturer || firearm.model) && (
              <p className="text-sm text-muted-foreground">
                {[firearm.manufacturer, firearm.model].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap gap-2 mt-2">
          {firearmCalibers.map((caliber) => (
            <Badge key={caliber._id} variant="secondary" className="text-xs">
              {caliber.name}
            </Badge>
          ))}
          {firearmOptics.map((optic) => (
            <Badge key={optic._id} variant="outline" className="text-xs">
              {optic.name}
            </Badge>
          ))}
          {firearm.defaultDistanceYards && (
            <Badge variant="outline" className="text-xs">
              {firearm.defaultDistanceYards}yd
            </Badge>
          )}
        </div>

        {firearm.notes && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{firearm.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
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
    </div>
  );
}

export default function FirearmsPage() {
  const [firearms, setFirearms] = useState<Firearm[]>([]);
  const [calibers, setCalibers] = useState<Caliber[]>([]);
  const [optics, setOptics] = useState<Optic[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFirearm, setEditingFirearm] = useState<Firearm | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",
    model: "",
    defaultDistanceYards: "",
    color: "#3b82f6",
    notes: "",
    caliberIds: [] as string[],
    opticIds: [] as string[],
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchFirearms();
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      const [calibersRes, opticsRes] = await Promise.all([
        fetch("/api/calibers"),
        fetch("/api/optics"),
      ]);

      if (calibersRes.ok) setCalibers(await calibersRes.json());
      if (opticsRes.ok) setOptics(await opticsRes.json());
    } catch (error) {
      // Silent fail
    }
  };

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

      const payload = {
        ...formData,
        defaultDistanceYards: formData.defaultDistanceYards && formData.defaultDistanceYards.trim() !== "" 
          ? parseInt(formData.defaultDistanceYards, 10) 
          : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    
    // Convert ObjectIds to strings for comparison
    const caliberIds = (firearm.caliberIds || []).map(id => String(id));
    const opticIds = (firearm.opticIds || []).map(id => String(id));
    
    setFormData({
      name: firearm.name,
      manufacturer: firearm.manufacturer || "",
      model: firearm.model || "",
      defaultDistanceYards: firearm.defaultDistanceYards?.toString() || "",
      color: firearm.color || "#3b82f6",
      notes: firearm.notes || "",
      caliberIds,
      opticIds,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingFirearm(null);
    setFormData({ 
      name: "", 
      manufacturer: "", 
      model: "",
      defaultDistanceYards: "",
      color: "#3b82f6",
      notes: "",
      caliberIds: [],
      opticIds: [],
    });
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-9 w-48 bg-[#2a2a2a] rounded animate-pulse mb-2"></div>
            <div className="h-5 w-80 bg-[#2a2a2a] rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-[#2a2a2a] rounded animate-pulse"></div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg bg-card animate-pulse">
              <div className="h-5 w-5 bg-[#2a2a2a] rounded"></div>
              <div className="w-[72px] h-12 bg-[#2a2a2a] rounded"></div>
              <div className="flex-1 min-w-0">
                <div className="h-6 w-48 bg-[#2a2a2a] rounded mb-2"></div>
                <div className="h-4 w-32 bg-[#2a2a2a] rounded mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-[#2a2a2a] rounded"></div>
                  <div className="h-5 w-16 bg-[#2a2a2a] rounded"></div>
                  <div className="h-5 w-12 bg-[#2a2a2a] rounded"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-[#2a2a2a] rounded"></div>
                <div className="h-8 w-8 bg-[#2a2a2a] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Add Firearm</span>
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
            <div className="space-y-2">
              {firearms.map((firearm) => (
                <SortableFirearmCard
                  key={firearm._id}
                  firearm={firearm}
                  calibers={calibers}
                  optics={optics}
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
                <Label htmlFor="defaultDistanceYards" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Default Distance (yards)
                </Label>
                <Input
                  id="defaultDistanceYards"
                  type="number"
                  min="1"
                  value={formData.defaultDistanceYards}
                  onChange={(e) => setFormData({ ...formData, defaultDistanceYards: e.target.value })}
                  placeholder="e.g., 25"
                />
              </div>
              <div>
                <Label>Chart Color</Label>
                <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md">
                  {[
                    { name: "Blue", value: "#3b82f6" },
                    { name: "Green", value: "#22c55e" },
                    { name: "Amber", value: "#f59e0b" },
                    { name: "Red", value: "#ef4444" },
                    { name: "Violet", value: "#8b5cf6" },
                    { name: "Cyan", value: "#06b6d4" },
                    { name: "Pink", value: "#ec4899" },
                    { name: "Teal", value: "#14b8a6" },
                  ].map((color) => {
                    const isSelected = formData.color === color.value;
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData({ ...formData, color: color.value });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                          isSelected
                            ? "ring-2 ring-white/50 bg-white/10"
                            : "hover:bg-white/5"
                        }`}
                        title={color.name}
                      >
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white/20" 
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="font-medium">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Compatible Calibers</Label>
                <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md min-h-[60px]">
                  {calibers.map((caliber) => {
                    const caliberId = String(caliber._id);
                    const isSelected = formData.caliberIds.includes(caliberId);
                    return (
                      <button
                        key={caliber._id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newCaliberIds = isSelected
                            ? formData.caliberIds.filter((id) => id !== caliberId)
                            : [...formData.caliberIds, caliberId];
                          setFormData((prev) => ({
                            ...prev,
                            caliberIds: newCaliberIds,
                          }));
                        }}
                        className={`px-3 py-2 rounded-md text-sm transition-colors font-medium ${
                          isSelected
                            ? "bg-blue-600 text-white ring-2 ring-blue-400"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {caliber.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Compatible Optics</Label>
                <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md min-h-[60px]">
                  {optics.map((optic) => {
                    const opticId = String(optic._id);
                    const isSelected = formData.opticIds.includes(opticId);
                    return (
                      <button
                        key={optic._id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newOpticIds = isSelected
                            ? formData.opticIds.filter((id) => id !== opticId)
                            : [...formData.opticIds, opticId];
                          setFormData((prev) => ({
                            ...prev,
                            opticIds: newOpticIds,
                          }));
                        }}
                        className={`px-3 py-2 rounded-md text-sm transition-colors font-medium ${
                          isSelected
                            ? "bg-blue-600 text-white ring-2 ring-blue-400"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {optic.name}
                      </button>
                    );
                  })}
                </div>
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
