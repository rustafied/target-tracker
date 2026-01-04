"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface TagSelectorProps {
  items: { _id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  required?: boolean;
}

export function TagSelector({ items, selectedId, onSelect, label, required }: TagSelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Label>
        {label} {required && "*"}
      </Label>
      {items.length > 5 && (
        <Input
          placeholder={`Search ${label.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 mt-1"
        />
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {filtered.map((item) => (
          <Badge
            key={item._id}
            variant={selectedId === item._id ? "default" : "outline"}
            className="cursor-pointer text-sm px-3 py-2 hover:bg-accent transition-colors min-h-[44px] flex items-center"
            onClick={() => onSelect(item._id)}
          >
            {item.name}
          </Badge>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground mt-2">
          No {label.toLowerCase()} found. {search && "Try a different search term."}
        </p>
      )}
    </div>
  );
}

