"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Filter, X, Target, Crosshair, Ruler, Telescope, Check } from "lucide-react";

export interface AnalyticsFilters {
  firearmIds: string[];
  caliberIds: string[];
  opticIds: string[];
  distanceMin: number;
  distanceMax: number;
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeFilterCount =
    filters.firearmIds.length +
    filters.caliberIds.length +
    filters.opticIds.length +
    (filters.distanceMin > 0 ? 1 : 0) +
    (filters.distanceMax < 100 ? 1 : 0);

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
      distanceMin: 0,
      distanceMax: 100,
    });
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Filter Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20"
      >
        <Filter className="mr-2 h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {activeFilterCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[600px] max-w-[90vw] bg-black dark:bg-black border border-white/20 rounded-lg shadow-2xl z-[100] max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-black dark:bg-black border-b border-white/20 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <span className="font-semibold">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black dark:bg-black">
            {/* Firearms and Calibers - 2 Column Layout */}
            {(firearms.length > 0 || calibers.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Distance Range Slider */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Ruler className="h-4 w-4" />
                Distance Range (yards)
              </Label>
              <div className="space-y-3">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[filters.distanceMin, filters.distanceMax]}
                  onValueChange={([min, max]) => onChange({ ...filters, distanceMin: min, distanceMax: max })}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{filters.distanceMin} yds</span>
                  <span>{filters.distanceMax} yds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

