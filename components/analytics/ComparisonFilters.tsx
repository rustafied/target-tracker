"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComparisonFilters {
  startDate: string;
  endDate: string;
  distanceMin: string;
  distanceMax: string;
  minShots: string;
  groupBy: "date" | "distance" | "sequence" | "none";
}

interface ComparisonFiltersProps {
  filters: ComparisonFilters;
  onFiltersChange: (filters: ComparisonFilters) => void;
  showGroupBy?: boolean;
}

export function ComparisonFilters({
  filters,
  onFiltersChange,
  showGroupBy = true,
}: ComparisonFiltersProps) {
  const handleChange = (key: keyof ComparisonFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-sm font-medium">
            Start Date
          </Label>
          <Input
            id="startDate"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
            className="dark:bg-white/5 dark:border-white/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-sm font-medium">
            End Date
          </Label>
          <Input
            id="endDate"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleChange("endDate", e.target.value)}
            className="dark:bg-white/5 dark:border-white/20"
          />
        </div>
      </div>

      {/* Distance Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="distanceMin" className="text-sm font-medium">
            Min Distance (yd)
          </Label>
          <Input
            id="distanceMin"
            type="number"
            placeholder="e.g., 7"
            value={filters.distanceMin}
            onChange={(e) => handleChange("distanceMin", e.target.value)}
            className="dark:bg-white/5 dark:border-white/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="distanceMax" className="text-sm font-medium">
            Max Distance (yd)
          </Label>
          <Input
            id="distanceMax"
            type="number"
            placeholder="e.g., 50"
            value={filters.distanceMax}
            onChange={(e) => handleChange("distanceMax", e.target.value)}
            className="dark:bg-white/5 dark:border-white/20"
          />
        </div>
      </div>

      {/* Min Shots and Group By */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minShots" className="text-sm font-medium">
            Minimum Shots
          </Label>
          <Input
            id="minShots"
            type="number"
            value={filters.minShots}
            onChange={(e) => handleChange("minShots", e.target.value)}
            className="dark:bg-white/5 dark:border-white/20"
          />
        </div>
        {showGroupBy && (
          <div className="space-y-2">
            <Label htmlFor="groupBy" className="text-sm font-medium">
              Group By
            </Label>
            <Select
              value={filters.groupBy}
              onValueChange={(value) =>
                handleChange("groupBy", value as ComparisonFilters["groupBy"])
              }
            >
              <SelectTrigger className="dark:bg-white/5 dark:border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Overall)</SelectItem>
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="distance">By Distance</SelectItem>
                <SelectItem value="sequence">By Sequence</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground dark:text-white/50">
        Filters apply uniformly to all compared items
      </div>
    </div>
  );
}
