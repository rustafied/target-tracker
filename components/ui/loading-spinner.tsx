import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = "md", text, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-8", className)}>
      <div className="relative">
        <div className={cn("rounded-full border-4 border-muted", sizeClasses[size])} />
        <Loader2 className={cn("absolute inset-0 animate-spin text-primary", sizeClasses[size])} />
      </div>
      {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
    </div>
  );
}

export function PageLoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
