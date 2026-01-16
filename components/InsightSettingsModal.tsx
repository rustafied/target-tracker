"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InsightPreferences {
  minConfidence: number;
  maxInsights: number;
  verbosity: "short" | "long";
  enabledTypes: string[];
}

interface InsightSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INSIGHT_TYPE_LABELS: Record<string, { label: string; category: string }> = {
  // Per-Session
  "vs-average": { label: "Vs. Historical Average", category: "Session" },
  "setup-milestone": { label: "Setup Performance Milestone", category: "Session" },
  "distance-diagnostic": { label: "Distance-Specific Diagnostic", category: "Session" },
  "efficiency-snapshot": { label: "Efficiency Snapshot", category: "Session" },
  "bias-pattern": { label: "Bias Pattern Recognition", category: "Session" },
  // Overview
  "trend-summary": { label: "Trend Summary", category: "Overview" },
  "top-performers": { label: "Top/Bottom Performers", category: "Overview" },
  "usage-recommendation": { label: "Usage Recommendations", category: "Overview" },
  "inventory-alert": { label: "Inventory Alerts", category: "Overview" },
  "composite-flag": { label: "Composite Risk/Opportunity", category: "Overview" },
  // Comparison
  "pairwise-winner": { label: "Pairwise Winner Analysis", category: "Comparison" },
  "group-ranking": { label: "Group Ranking", category: "Comparison" },
  "contextual-difference": { label: "Contextual Differences", category: "Comparison" },
  "crossover-point": { label: "Crossover Points", category: "Comparison" },
  "composite-recommendation": { label: "Composite Recommendations", category: "Comparison" },
};

export function InsightSettingsModal({ open, onOpenChange }: InsightSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<InsightPreferences>({
    minConfidence: 0.7,
    maxInsights: 5,
    verbosity: "short",
    enabledTypes: Object.keys(INSIGHT_TYPE_LABELS),
  });

  useEffect(() => {
    if (open) {
      fetchPreferences();
    }
  }, [open]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/insights/preferences");
      if (res.ok) {
        const data = await res.json();
        setPreferences({
          minConfidence: data.minConfidence,
          maxInsights: data.maxInsights,
          verbosity: data.verbosity,
          enabledTypes: data.enabledTypes,
        });
      }
    } catch (error) {
      toast.error("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/insights/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        toast.success("Insight preferences saved");
        onOpenChange(false);
      } else {
        toast.error("Failed to save preferences");
      }
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggleInsightType = (type: string) => {
    setPreferences((prev) => ({
      ...prev,
      enabledTypes: prev.enabledTypes.includes(type)
        ? prev.enabledTypes.filter((t) => t !== type)
        : [...prev.enabledTypes, type],
    }));
  };

  const groupedTypes = Object.entries(INSIGHT_TYPE_LABELS).reduce(
    (acc, [type, { label, category }]) => {
      if (!acc[category]) acc[category] = [];
      acc[category].push({ type, label });
      return acc;
    },
    {} as Record<string, Array<{ type: string; label: string }>>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Insight Preferences</DialogTitle>
          <DialogDescription>
            Customize how insights are generated and displayed across the app
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto pr-2">
            {/* Confidence Threshold */}
            <div className="space-y-3 p-4 rounded-lg border border-white/10 bg-white/5">
              <Label htmlFor="confidence" className="text-base font-semibold text-white">
                Minimum Confidence: {Math.round(preferences.minConfidence * 100)}%
              </Label>
              <Slider
                id="confidence"
                min={0}
                max={100}
                step={5}
                value={[preferences.minConfidence * 100]}
                onValueChange={([value]) =>
                  setPreferences({ ...preferences, minConfidence: value / 100 })
                }
                className="w-full"
              />
              <p className="text-xs text-white/60">
                Only show insights with at least this confidence level
              </p>
            </div>

            {/* Max Insights */}
            <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5">
              <Label htmlFor="maxInsights" className="text-base font-semibold text-white">Maximum Insights Per View</Label>
              <Input
                id="maxInsights"
                type="number"
                min={1}
                max={20}
                value={preferences.maxInsights}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    maxInsights: parseInt(e.target.value) || 5,
                  })
                }
                className="bg-white/5 border-white/20 text-white"
              />
              <p className="text-xs text-white/60">
                Limit the number of insights shown (1-20)
              </p>
            </div>

            {/* Verbosity */}
            <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5">
              <Label htmlFor="verbosity" className="text-base font-semibold text-white">Detail Level</Label>
              <Select
                value={preferences.verbosity}
                onValueChange={(value: "short" | "long") =>
                  setPreferences({ ...preferences, verbosity: value })
                }
              >
                <SelectTrigger id="verbosity" className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (concise summaries)</SelectItem>
                  <SelectItem value="long">Long (detailed explanations)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Insight Types */}
            <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
              <Label className="text-base font-semibold text-white">Enabled Insight Types</Label>
              {Object.entries(groupedTypes).map(([category, types]) => (
                <div key={category} className="space-y-3 mt-4">
                  <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wide">
                    {category} Insights
                  </h4>
                  <div className="space-y-3 pl-2 border-l-2 border-white/20">
                    {types.map(({ type, label }) => (
                      <div key={type} className="flex items-center justify-between gap-4 py-1.5 pl-3">
                        <label
                          htmlFor={type}
                          className="text-sm cursor-pointer flex-1 text-white/90 hover:text-white transition-colors"
                        >
                          {label}
                        </label>
                        <Switch
                          id={type}
                          checked={preferences.enabledTypes.includes(type)}
                          onCheckedChange={() => toggleInsightType(type)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
