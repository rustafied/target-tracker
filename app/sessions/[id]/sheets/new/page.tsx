"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "@/components/TagSelector";
import { toast } from "sonner";
import { ArrowLeft, Plus, Minus } from "lucide-react";

export default function NewSheetPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [firearms, setFirearms] = useState<{ _id: string; name: string }[]>([]);
  const [optics, setOptics] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    firearmId: "",
    caliberId: "",
    opticId: "",
    distanceYards: "25",
    sheetLabel: "",
    notes: "",
  });

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      const [firearmsRes, opticsRes, calibersRes] = await Promise.all([
        fetch("/api/firearms"),
        fetch("/api/optics"),
        fetch("/api/calibers"),
      ]);

      if (firearmsRes.ok) setFirearms(await firearmsRes.json());
      if (opticsRes.ok) setOptics(await opticsRes.json());
      if (calibersRes.ok) setCalibers(await calibersRes.json());
    } catch (error) {
      toast.error("Failed to load reference data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firearmId || !formData.caliberId || !formData.opticId) {
      toast.error("Please select firearm, caliber, and optic");
      return;
    }

    try {
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rangeSessionId: sessionId,
          ...formData,
          distanceYards: parseInt(formData.distanceYards),
        }),
      });

      if (res.ok) {
        const sheet = await res.json();
        toast.success("Sheet created");
        router.push(`/sheets/${sheet._id}`);
      } else {
        toast.error("Failed to create sheet");
      }
    } catch (error) {
      toast.error("Failed to create sheet");
    }
  };

  const adjustDistance = (delta: number) => {
    const current = parseInt(formData.distanceYards) || 0;
    const newValue = Math.max(1, current + delta);
    setFormData({ ...formData, distanceYards: newValue.toString() });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (firearms.length === 0 || optics.length === 0 || calibers.length === 0) {
    return (
      <div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to set up your firearms, optics, and calibers before creating a target sheet.
            </p>
            <Button onClick={() => router.push("/setup")}>
              Go to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Target Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <TagSelector
              items={firearms}
              selectedId={formData.firearmId}
              onSelect={(id) => setFormData({ ...formData, firearmId: id })}
              label="Firearm"
              required
            />

            <TagSelector
              items={calibers}
              selectedId={formData.caliberId}
              onSelect={(id) => setFormData({ ...formData, caliberId: id })}
              label="Caliber"
              required
            />

            <TagSelector
              items={optics}
              selectedId={formData.opticId}
              onSelect={(id) => setFormData({ ...formData, opticId: id })}
              label="Optic"
              required
            />

            <div>
              <Label htmlFor="distance">Distance (yards) *</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustDistance(-5)}
                  className="h-12 w-12"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="distance"
                  type="number"
                  value={formData.distanceYards}
                  onChange={(e) => setFormData({ ...formData, distanceYards: e.target.value })}
                  required
                  min="1"
                  className="text-center text-lg font-semibold h-12"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustDistance(5)}
                  className="h-12 w-12"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="sheetLabel">Sheet Label</Label>
              <Input
                id="sheetLabel"
                value={formData.sheetLabel}
                onChange={(e) => setFormData({ ...formData, sheetLabel: e.target.value })}
                placeholder="e.g., Zeroing, Group Practice"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this sheet..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit">Create Sheet</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

