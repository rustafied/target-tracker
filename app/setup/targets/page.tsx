"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, GripVertical } from "lucide-react";
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

interface AimPoint {
  id: string;
  name: string;
  order: number;
  centerX: number;
  centerY: number;
  interactiveRadius?: number;
  tags?: string[];
}

interface CoordinateSystem {
  type: "svg" | "image";
  width: number;
  height: number;
  origin: "top-left";
}

interface Render {
  type: "svg" | "image";
  svgMarkup?: string;
  imageUrl?: string;
}

interface TargetTemplate {
  _id: string;
  name: string;
  description?: string;
  version: number;
  coordinateSystem: CoordinateSystem;
  render: Render;
  defaultScoringModelId?: string;
  aimPoints: AimPoint[];
  isSystem: boolean;
  createdBy?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function SortableTemplateCard({ template }: { template: TargetTemplate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: template._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing pt-2"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1">
          {/* Template Preview */}
          <div className="mb-4 bg-white dark:bg-zinc-900 rounded-lg border dark:border-white/10 p-4 aspect-square flex items-center justify-center">
            {template.render.type === "svg" && template.render.svgMarkup ? (
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: template.render.svgMarkup }}
              />
            ) : template.render.imageUrl ? (
              <img
                src={template.render.imageUrl}
                alt={template.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground">No preview</div>
            )}
          </div>

          {/* Template Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{template.name}</h3>
              {template.isSystem && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {template.description || "No description available"}
            </p>
            <p className="text-xs text-muted-foreground">
              {template.aimPoints.length} aim point{template.aimPoints.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function TargetsSetupPage() {
  const [templates, setTemplates] = useState<TargetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      console.log("Fetched templates from API:", data.map((t: TargetTemplate) => ({ name: t.name, sortOrder: t.sortOrder })));
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = templates.findIndex((t) => t._id === active.id);
    const newIndex = templates.findIndex((t) => t._id === over.id);

    const newOrder = arrayMove(templates, oldIndex, newIndex);
    setTemplates(newOrder);

    // Update sortOrder in database
    try {
      const items = newOrder.map((template, index) => ({
        _id: template._id,
        sortOrder: index,
      }));

      console.log("Sending reorder request:", items);

      const res = await fetch("/api/templates/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) throw new Error("Failed to update order");
      console.log("Reorder successful");
      toast.success("Template order updated");
    } catch (err) {
      console.error("Reorder failed:", err);
      toast.error("Failed to update template order");
      fetchTemplates(); // Revert on error
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Target Templates</h1>
        <p className="text-muted-foreground">
          Choose a target template for your shooting sessions. Drag to reorder.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={templates.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <SortableTemplateCard key={template._id} template={template} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No templates available</p>
          <Button asChild>
            <Link href="/setup">Back to Setup</Link>
          </Button>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/setup">Back to Setup</Link>
        </Button>
      </div>
    </div>
  );
}
