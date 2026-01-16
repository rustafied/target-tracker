"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export interface AnalyticsHeaderProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  children?: ReactNode;
}

export function AnalyticsHeader({ title, icon: Icon, description, children }: AnalyticsHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {Icon && <Icon className="h-8 w-8" />}
            {title}
          </h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

