"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon: Icon = AlertTriangle,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export interface WarningBadgeProps {
  message: string;
}

export function WarningBadge({ message }: WarningBadgeProps) {
  return (
    <Badge variant="outline" className="border-yellow-600 text-yellow-600 gap-1">
      <AlertTriangle className="h-3 w-3" />
      {message}
    </Badge>
  );
}

