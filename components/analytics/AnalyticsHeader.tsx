"use client";

import { LucideIcon } from "lucide-react";

export interface AnalyticsHeaderProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
}

export function AnalyticsHeader({ title, icon: Icon, description }: AnalyticsHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
        {Icon && <Icon className="h-8 w-8" />}
        {title}
      </h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}

