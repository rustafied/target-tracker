"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
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

interface Optic {
  _id: string;
  name: string;
  type?: string;
  magnification?: string;
  notes?: string;
  isActive: boolean;
}

export default function OpticsPage() {
  const [optics, setOptics] = useState<Optic[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOptic, setEditingOptic] = useState<Optic | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    magnification: "",
    notes: "",
  });

  useEffect(() => {
    fetchOptics();
  }, []);

  const fetchOptics = async () => {
    try {
      const res = await fetch("/api/optics");
      if (res.ok) {
        const data = await res.json();
        setOptics(data);
      }
    } catch (error) {
      toast.error("Failed to load optics");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingOptic ? `/api/optics/${editingOptic._id}` : "/api/optics";
      const method = editingOptic ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingOptic ? "Optic updated" : "Optic created");
        setDialogOpen(false);
        resetForm();
        fetchOptics();
      } else {
        toast.error("Failed to save optic");
      }
    } catch (error) {
      toast.error("Failed to save optic");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Archive this optic?")) return;

    try {
      const res = await fetch(`/api/optics/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Optic archived");
        fetchOptics();
      } else {
        toast.error("Failed to archive optic");
      }
    } catch (error) {
      toast.error("Failed to archive optic");
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (optic: Optic) => {
    setEditingOptic(optic);
    setFormData({
      name: optic.name,
      type: optic.type || "",
      magnification: optic.magnification || "",
      notes: optic.notes || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingOptic(null);
    setFormData({ name: "", type: "", magnification: "", notes: "" });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Optics</h1>
          <p className="text-muted-foreground mt-1">Manage your optics and sights</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Optic
        </Button>
      </div>

      {optics.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No optics yet. Click "Add Optic" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {optics.map((optic) => (
            <Card key={optic._id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg">{optic.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(optic)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(optic._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optic.type && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Type:</strong> {optic.type}
                  </p>
                )}
                {optic.magnification && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Magnification:</strong> {optic.magnification}
                  </p>
                )}
                {optic.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{optic.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOptic ? "Edit Optic" : "Add Optic"}</DialogTitle>
            <DialogDescription>
              {editingOptic ? "Update optic details" : "Add a new optic to your collection"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Vortex Razor AMG UH-1 Gen II"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g., Red Dot, LPVO, Iron Sights"
                />
              </div>
              <div>
                <Label htmlFor="magnification">Magnification</Label>
                <Input
                  id="magnification"
                  value={formData.magnification}
                  onChange={(e) => setFormData({ ...formData, magnification: e.target.value })}
                  placeholder="e.g., 1-6x, 1x"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
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
              <Button type="submit">{editingOptic ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

