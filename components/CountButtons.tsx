"use client";

import { Button } from "@/components/ui/button";

interface CountButtonsProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

export function CountButtons({ value, onChange, label }: CountButtonsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-lg font-bold min-w-[2ch] text-center">{value}</span>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-11 gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
          <Button
            key={count}
            type="button"
            variant={value === count ? "default" : "outline"}
            size="sm"
            className="h-10 w-full text-sm font-medium"
            onClick={() => onChange(count)}
          >
            {count}
          </Button>
        ))}
      </div>
    </div>
  );
}

