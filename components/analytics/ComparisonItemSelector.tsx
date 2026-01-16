"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface SelectableItem {
  id: string;
  name: string;
  color?: string;
}

interface ComparisonItemSelectorProps {
  type: "firearm" | "optic" | "caliber" | "session";
  availableItems: SelectableItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelections?: number;
  placeholder?: string;
}

export function ComparisonItemSelector({
  type,
  availableItems,
  selectedIds,
  onSelectionChange,
  maxSelections = 3,
  placeholder,
}: ComparisonItemSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedItems = availableItems.filter((item) =>
    selectedIds.includes(item.id)
  );

  const filteredItems = availableItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (itemId: string) => {
    console.log('Toggle clicked:', { itemId, currentSelectedIds: selectedIds });
    const isCurrentlySelected = selectedIds.includes(itemId);
    console.log('Is currently selected:', isCurrentlySelected);
    
    if (isCurrentlySelected) {
      // Deselect
      const newIds = selectedIds.filter((id) => id !== itemId);
      console.log('Deselecting, new IDs:', newIds);
      onSelectionChange(newIds);
    } else if (selectedIds.length < maxSelections) {
      // Select
      const newIds = [...selectedIds, itemId];
      console.log('Selecting, new IDs:', newIds);
      onSelectionChange(newIds);
    } else {
      console.log('Max selections reached');
    }
  };

  const handleRemove = (itemId: string) => {
    onSelectionChange(selectedIds.filter((id) => id !== itemId));
  };

  const typeLabel = {
    firearm: "Firearms",
    optic: "Optics",
    caliber: "Calibers",
    session: "Sessions",
  }[type];

  return (
    <div className="space-y-2">
      <Popover 
        open={open} 
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setSearchTerm("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/20"
          >
            <span className="truncate">
              {selectedIds.length === 0
                ? placeholder || `Select ${typeLabel}...`
                : `${selectedIds.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 dark:bg-zinc-900 dark:border-white/20">
          <div className="flex flex-col">
            {/* Search */}
            <div className="p-2 border-b dark:border-white/10">
              <Input
                placeholder={`Search ${typeLabel.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 dark:bg-white/5 dark:border-white/20"
              />
            </div>

            {/* Items List */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-sm text-center text-muted-foreground dark:text-white/50">
                  No {typeLabel.toLowerCase()} found.
                </div>
              ) : (
                <div className="p-1">
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isDisabled = !isSelected && selectedIds.length >= maxSelections;
                    console.log('Rendering item:', { id: item.id, name: item.name, isSelected, selectedIds });

                    return (
                      <div
                        key={`item-${item.id}`}
                        onClick={() => {
                          if (!isDisabled) {
                            handleToggle(item.id);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
                          isDisabled 
                            ? "opacity-50 cursor-not-allowed" 
                            : "hover:bg-white/10",
                          isSelected && "bg-white/5"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={() => {
                            if (!isDisabled) {
                              handleToggle(item.id);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="pointer-events-none"
                        />
                        {item.color && (
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                        <span className="text-sm flex-1 truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedIds.length >= maxSelections && (
              <div className="p-2 border-t dark:border-white/10 text-xs text-center text-muted-foreground dark:text-white/50">
                Maximum {maxSelections} items selected
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected items badges */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="dark:bg-white/10 dark:text-white pr-1"
            >
              <span className="mr-1">{item.name}</span>
              <button
                onClick={() => handleRemove(item.id)}
                className="hover:bg-white/20 rounded-sm p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {selectedIds.length >= maxSelections && (
        <p className="text-xs text-muted-foreground dark:text-white/50">
          Maximum {maxSelections} items selected
        </p>
      )}
    </div>
  );
}
