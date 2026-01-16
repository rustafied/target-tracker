"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, X, ChevronDown, ChevronUp, Target, Crosshair, Ruler, Telescope, Check } from "lucide-react";

export interface AnalyticsFilters {
  firearmIds: string[];
  caliberIds: string[];
  opticIds: string[];
  distanceMin: string;
  distanceMax: string;
  minShots: number;
  positionOnly: boolean;
  allowSynthetic: boolean;
}

export interface FilterBarProps {
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
  firearms: { _id: string; name: string }[];
  calibers: { _id: string; name: string }[];
  optics: { _id: string; name: string }[];
}

export function FilterBar({ filters, onChange, firearms, calibers, optics }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount =
    filters.firearmIds.length +
    filters.caliberIds.length +
    filters.opticIds.length +
    (filters.distanceMin ? 1 : 0) +
    (filters.distanceMax ? 1 : 0) +
    (filters.positionOnly ? 1 : 0) +
    (filters.allowSynthetic ? 1 : 0);

  const toggleFirearm = (id: string) => {
    const newIds = filters.firearmIds.includes(id)
      ? filters.firearmIds.filter((fid) => fid !== id)
      : [...filters.firearmIds, id];
    onChange({ ...filters, firearmIds: newIds });
  };

  const toggleCaliber = (id: string) => {
    const newIds = filters.caliberIds.includes(id)
      ? filters.caliberIds.filter((cid) => cid !== id)
      : [...filters.caliberIds, id];
    onChange({ ...filters, caliberIds: newIds });
  };

  const toggleOptic = (id: string) => {
    const newIds = filters.opticIds.includes(id)
      ? filters.opticIds.filter((oid) => oid !== id)
      : [...filters.opticIds, id];
    onChange({ ...filters, opticIds: newIds });
  };

  const resetFilters = () => {
    onChange({
      firearmIds: [],
      caliberIds: [],
      opticIds: [],
      distanceMin: "",
      distanceMax: "",
      minShots: 10,
      positionOnly: false,
      allowSynthetic: false,
    });
  };

  return (
    <Card className="mb-6">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full text-left hover:bg-accent/50 transition-colors cursor-pointer rounded-lg"
        >
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Click to expand</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
        </button>
      ) : (
        <>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Reset
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="gap-2">
                  Hide <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Firearms */}
            {firearms.length > 0 && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4" />
                  Firearms
                </Label>
                <div className="flex flex-wrap gap-2">
                  {firearms.map((firearm) => {
                    const isActive = filters.firearmIds.includes(firearm._id);
                    return (
                      <button
                        key={firearm._id}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400"
                            : "bg-white/5 text-foreground hover:bg-white/10 border border-white/20 hover:border-white/30"
                        }`}
                        onClick={() => toggleFirearm(firearm._id)}
                      >
                        {isActive && <Check className="h-4 w-4" />}
                        {firearm.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calibers */}
            {calibers.length > 0 && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Crosshair className="h-4 w-4" />
                  Calibers
                </Label>
                <div className="flex flex-wrap gap-2">
                  {calibers.map((caliber) => {
                    const isActive = filters.caliberIds.includes(caliber._id);
                    return (
                      <button
                        key={caliber._id}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400"
                            : "bg-white/5 text-foreground hover:bg-white/10 border border-white/20 hover:border-white/30"
                        }`}
                        onClick={() => toggleCaliber(caliber._id)}
                      >
                        {isActive && <Check className="h-4 w-4" />}
                        {caliber.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optics */}
            {optics.length > 0 && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Telescope className="h-4 w-4" />
                  Optics
                </Label>
                <div className="flex flex-wrap gap-2">
                  {optics.map((optic) => {
                    const isActive = filters.opticIds.includes(optic._id);
                    return (
                      <button
                        key={optic._id}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400"
                            : "bg-white/5 text-foreground hover:bg-white/10 border border-white/20 hover:border-white/30"
                        }`}
                        onClick={() => toggleOptic(optic._id)}
                      >
                        {isActive && <Check className="h-4 w-4" />}
                        {optic.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Distance Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="distanceMin" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Min Distance (yards)
                </Label>
                <Input
                  id="distanceMin"
                  type="number"
                  value={filters.distanceMin}
                  onChange={(e) => onChange({ ...filters, distanceMin: e.target.value })}
                  placeholder="e.g., 25"
                />
              </div>
              <div>
                <Label htmlFor="distanceMax" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Max Distance (yards)
                </Label>
                <Input
                  id="distanceMax"
                  type="number"
                  value={filters.distanceMax}
                  onChange={(e) => onChange({ ...filters, distanceMax: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            {/* Min Shots */}
            <div>
              <Label htmlFor="minShots">Minimum Shots Threshold</Label>
              <Input
                id="minShots"
                type="number"
                value={filters.minShots}
                onChange={(e) => onChange({ ...filters, minShots: parseInt(e.target.value) || 10 })}
                placeholder="10"
              />
            </div>

            {/* Data Mode Toggles */}
            <div className="space-y-3">
              <Label>Data Mode</Label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    id="positionOnly"
                    checked={filters.positionOnly}
                    onCheckedChange={(checked) => 
                      onChange({ ...filters, positionOnly: checked as boolean })
                    }
                  />
                  <span className="text-sm group-hover:text-foreground transition-colors">
                    Position data only (exclude count-only bulls)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    id="allowSynthetic"
                    checked={filters.allowSynthetic}
                    onCheckedChange={(checked) => 
                      onChange({ ...filters, allowSynthetic: checked as boolean })
                    }
                  />
                  <span className="text-sm group-hover:text-foreground transition-colors">
                    Allow synthetic shots for visualizations
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

