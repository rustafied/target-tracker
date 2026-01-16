"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { Card, CardContent } from "./ui/card";
import { LoadingSpinner } from "./ui/loading-spinner";

interface LazyLoadProps {
  children: ReactNode;
  height?: string;
  threshold?: number;
  rootMargin?: string;
  placeholder?: ReactNode;
  loadingText?: string;
}

export function LazyLoad({
  children,
  height = "400px",
  threshold = 0.1,
  rootMargin = "200px",
  placeholder,
  loadingText = "Loading...",
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} style={{ minHeight: isVisible ? 'auto' : height }}>
      {isVisible ? (
        children
      ) : (
        placeholder || (
          <Card>
            <CardContent className="flex items-center justify-center" style={{ height }}>
              <LoadingSpinner size="md" text={loadingText} />
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
