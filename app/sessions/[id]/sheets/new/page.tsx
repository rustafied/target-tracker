"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "@/components/TagSelector";
import { LoadingScreen } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ArrowLeft, Plus, Minus, Ruler, Tag as TagIcon, FileText, LayoutGrid } from "lucide-react";

interface TargetTemplate {
  _id: string;
  name: string;
  description?: string;
  aimPoints: any[];
  render?: {
    type: string;
    svgMarkup?: string;
    imageUrl?: string;
  };
}

export default function NewSheetPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [firearms, setFirearms] = useState<{ _id: string; name: string; defaultDistanceYards?: number; caliberIds?: string[]; opticIds?: string[] }[]>([]);
  const [optics, setOptics] = useState<{ _id: string; name: string }[]>([]);
  const [calibers, setCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [allOptics, setAllOptics] = useState<{ _id: string; name: string }[]>([]);
  const [allCalibers, setAllCalibers] = useState<{ _id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<TargetTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    firearmId: "",
    caliberId: "",
    opticId: "",
    distanceYards: "25",
    sheetLabel: "",
    notes: "",
    targetTemplateId: "",
  });

  const presetDistances = [5, 7, 10, 15, 20, 25];
  const [isCustomDistance, setIsCustomDistance] = useState(false);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      const [firearmsRes, opticsRes, calibersRes, templatesRes] = await Promise.all([
        fetch("/api/firearms"),
        fetch("/api/optics"),
        fetch("/api/calibers"),
        fetch("/api/templates"),
      ]);

      let firearmsData: { _id: string; name: string; defaultDistanceYards?: number; caliberIds?: string[]; opticIds?: string[] }[] = [];
      let opticsData: { _id: string; name: string }[] = [];
      let calibersData: { _id: string; name: string }[] = [];
      let templatesData: TargetTemplate[] = [];

      if (firearmsRes.ok) {
        firearmsData = await firearmsRes.json();
        setFirearms(firearmsData);
      }
      if (opticsRes.ok) {
        opticsData = await opticsRes.json();
        setAllOptics(opticsData);
      }
      if (calibersRes.ok) {
        calibersData = await calibersRes.json();
        setAllCalibers(calibersData);
      }
      if (templatesRes.ok) {
        templatesData = await templatesRes.json();
        console.log('Loaded templates:', templatesData);
        setTemplates(templatesData);
        // Auto-select default template if available
        const defaultTemplate = templatesData.find(t => t.name === "Six Bull (Default)");
        if (defaultTemplate) {
          setFormData(prev => ({ ...prev, targetTemplateId: defaultTemplate._id }));
        }
      } else {
        console.error('Failed to fetch templates:', templatesRes.status);
      }

      // Don't auto-select - let user choose firearm first
      // This will trigger filterByFirearm when they select
    } catch (error) {
      console.error('Error loading reference data:', error);
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
        router.push(`/sheets/${sheet.slug || sheet._id}`);
      } else {
        toast.error("Failed to create sheet");
      }
    } catch (error) {
      toast.error("Failed to create sheet");
    }
  };

  const filterByFirearm = (
    firearmId: string, 
    firearmsData = firearms,
    opticsData = allOptics,
    calibersData = allCalibers
  ) => {
    const selectedFirearm = firearmsData.find((f) => f._id === firearmId);
    if (selectedFirearm) {
      // Filter optics
      const filteredOptics = selectedFirearm.opticIds && selectedFirearm.opticIds.length > 0
        ? opticsData.filter((o) => selectedFirearm.opticIds!.includes(o._id))
        : opticsData;
      
      // Filter calibers
      const filteredCalibers = selectedFirearm.caliberIds && selectedFirearm.caliberIds.length > 0
        ? calibersData.filter((c) => selectedFirearm.caliberIds!.includes(c._id))
        : calibersData;

      // Batch all state updates together to prevent scroll jumps
      setOptics(filteredOptics);
      setCalibers(filteredCalibers);
      
      setFormData((prev) => {
        const defaultDistance = selectedFirearm.defaultDistanceYards?.toString() || prev.distanceYards;
        const isPreset = presetDistances.includes(parseInt(defaultDistance));
        
        setIsCustomDistance(!isPreset);
        
        return {
          ...prev,
          firearmId,
          opticId: filteredOptics.length > 0 ? filteredOptics[0]._id : "",
          caliberId: filteredCalibers.length > 0 ? filteredCalibers[0]._id : "",
          distanceYards: defaultDistance,
        };
      });
    }
  };

  const handleFirearmChange = (firearmId: string) => {
    filterByFirearm(firearmId);
  };

  const adjustDistance = (delta: number) => {
    const current = parseInt(formData.distanceYards) || 0;
    const newValue = Math.max(1, current + delta);
    setFormData({ ...formData, distanceYards: newValue.toString() });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (firearms.length === 0 || allOptics.length === 0 || allCalibers.length === 0) {
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
    <div className="pb-20 pt-4 sm:pt-0">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Equipment Selection */}
              <div className="space-y-6">
                <TagSelector
                  items={firearms}
                  selectedId={formData.firearmId}
                  onSelect={handleFirearmChange}
                  label="Firearm"
                  required
                  hideSearch
                />

                <div className={!formData.firearmId ? "opacity-50 pointer-events-none" : ""}>
                  <TagSelector
                    items={calibers}
                    selectedId={formData.caliberId}
                    onSelect={(id) => setFormData({ ...formData, caliberId: id })}
                    label="Caliber"
                    required
                    hideSearch
                  />
                </div>

                <div className={!formData.firearmId ? "opacity-50 pointer-events-none" : ""}>
                  <TagSelector
                    items={optics}
                    selectedId={formData.opticId}
                    onSelect={(id) => setFormData({ ...formData, opticId: id })}
                    label="Optic"
                    required
                    hideSearch
                  />
                </div>
              </div>

              {/* Right Column - Distance, Label, Notes */}
              <div className={`space-y-6 ${!formData.firearmId ? "opacity-50 pointer-events-none" : ""}`}>
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Ruler className="h-4 w-4" />
                    Distance (yards) *
                  </Label>
                  
                  {/* Preset Distance Buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {presetDistances.map((distance) => {
                      const isSelected = !isCustomDistance && formData.distanceYards === distance.toString();
                      return (
                        <Button
                          key={distance}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => {
                            setIsCustomDistance(false);
                            setFormData({ ...formData, distanceYards: distance.toString() });
                          }}
                          className="flex-1 min-w-[60px]"
                        >
                          {distance}
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      variant={isCustomDistance ? "default" : "outline"}
                      onClick={() => setIsCustomDistance(true)}
                      className="flex-1 min-w-[80px]"
                    >
                      Custom
                    </Button>
                  </div>

                  {/* Custom Distance Input - Slides down when Custom is selected */}
                  {isCustomDistance && (
                    <div className="flex items-center gap-2 mt-2">
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
                  )}
                </div>

                <div>
                  <Label htmlFor="sheetLabel" className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Sheet Label
                  </Label>
                  <Input
                    id="sheetLabel"
                    value={formData.sheetLabel}
                    onChange={(e) => setFormData({ ...formData, sheetLabel: e.target.value })}
                    placeholder="e.g., Zeroing, Group Practice"
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
                    placeholder="Additional notes about this sheet..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Template Selection */}
            <div className={!formData.firearmId ? "opacity-50 pointer-events-none" : ""}>
              <Label className="flex items-center gap-2 mb-3">
                <LayoutGrid className="h-4 w-4" />
                Target Template * ({templates.length} available)
              </Label>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {templates.map((template) => {
                  const isSelected = formData.targetTemplateId === template._id;
                  return (
                    <button
                      key={template._id}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetTemplateId: template._id })}
                      style={{
                        borderWidth: isSelected ? '3px' : '2px',
                        borderColor: isSelected ? 'rgb(59, 130, 246)' : 'rgb(39, 39, 42)',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
                      }}
                      className="relative flex flex-col items-center p-3 rounded-lg transition-all hover:border-primary/50 hover:bg-accent"
                    >
                      {/* Template Preview */}
                      <div className="w-full aspect-square bg-white dark:bg-zinc-900 rounded border dark:border-white/10 p-2 mb-2">
                        {template.render?.svgMarkup ? (
                          <div
                            className="w-full h-full"
                            dangerouslySetInnerHTML={{ __html: template.render.svgMarkup }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <LayoutGrid className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      
                      {/* Template Info */}
                      <div className="text-center">
                        <p className={`text-xs font-medium ${isSelected ? "text-primary font-bold" : ""}`}>
                          {template.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.aimPoints.length} aim point{template.aimPoints.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  );
                  })}
                </div>
              )}
              {templates.find(t => t._id === formData.targetTemplateId)?.description && (
                <p className="text-xs text-muted-foreground mt-2">
                  {templates.find(t => t._id === formData.targetTemplateId)?.description}
                </p>
              )}
            </div>

            <div className={`flex gap-2 justify-end pt-4 border-t ${!formData.firearmId ? "opacity-50 pointer-events-none" : ""}`}>
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

