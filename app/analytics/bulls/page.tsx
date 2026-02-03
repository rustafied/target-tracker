"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

import { Target, Trophy, Crosshair, MapPin, Ruler, Eye } from "lucide-react";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { EmptyState } from "@/components/analytics/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { SingleBullVisualization } from "@/components/SingleBullVisualization";

interface TopBull {
  bullId: string;
  score: number;
  totalShots: number;
  avgScorePerShot: number;
  bullIndex?: number;
  aimPointId?: string;
  targetSheetId: string;
  sessionId: string;
  sessionSlug: string;
  sessionDate: string;
  sessionLocation?: string;
  firearmId: string;
  firearmName: string;
  firearmColor?: string;
  caliberId: string;
  caliberName: string;
  opticId: string;
  opticName: string;
  distanceYards: number;
  sheetLabel?: string;
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
  shotPositions?: Array<{ x: number; y: number; score: number }>;
}

interface BullsData {
  bulls: TopBull[];
  totalBulls: number;
}

export default function BullsAnalyticsPage() {
  const [data, setData] = useState<BullsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/bulls?limit=20`);
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
      } else {
        toast.error("Failed to load bulls analytics");
      }
    } catch (error) {
      toast.error("Failed to load bulls analytics");
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (index: number) => {
    if (index === 0) return "bg-yellow-500";
    if (index === 1) return "bg-gray-400";
    if (index === 2) return "bg-amber-700";
    return "bg-zinc-600";
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <AnalyticsHeader
          title="Best Bulls"
          icon={Trophy}
          description="Your top performing bulls across all sessions"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border bg-card animate-pulse">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-[#2a2a2a] rounded-full mb-3"></div>
                <div className="h-4 w-24 bg-[#2a2a2a] rounded mb-2"></div>
                <div className="h-3 w-32 bg-[#2a2a2a] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.bulls.length === 0) {
    return (
      <div>
        <AnalyticsHeader
          title="Best Bulls"
          icon={Trophy}
          description="Your top performing bulls across all sessions"
        />
        <EmptyState
          title="No bull data available"
          description="Record some shooting sessions with bull scores to see your best performances."
        />
      </div>
    );
  }

  return (
    <div className="pt-4 sm:pt-0">
      <FadeIn duration={200}>
        <AnalyticsHeader
          title="Best Bulls"
          icon={Trophy}
          description="Your top performing bulls across all sessions"
        />
      </FadeIn>

      <FadeIn delay={100} duration={300}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.bulls.map((bull, index) => {
            const defaultColors = [
              "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
              "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
            ];
            const firearmColor = bull.firearmColor || defaultColors[index % defaultColors.length];
            
            return (
              <div
                key={bull.bullId}
                className="relative p-4 rounded-lg border bg-card transition-all hover:shadow-md hover:border-white/20"
              >
                {/* Rank badge */}
                <div 
                  className={`absolute -left-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg z-10 ${getRankColor(index)}`}
                >
                  {index + 1}
                </div>

                {/* Bull visualization */}
                <div className="flex justify-center mb-3">
                  <SingleBullVisualization
                    bull={{
                      bullIndex: bull.bullIndex || 1,
                      aimPointId: bull.aimPointId,
                      score5Count: bull.score5Count,
                      score4Count: bull.score4Count,
                      score3Count: bull.score3Count,
                      score2Count: bull.score2Count,
                      score1Count: bull.score1Count,
                      score0Count: bull.score0Count,
                      shotPositions: bull.shotPositions,
                    }}
                    size={140}
                  />
                </div>

                {/* Score display */}
                <div className="text-center mb-3">
                  <div className="text-2xl font-bold" style={{ color: firearmColor }}>
                    {bull.score} pts
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bull.avgScorePerShot.toFixed(2)} avg • {bull.totalShots} shots
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-3">
                  <div className="flex items-center gap-1.5 truncate">
                    <Target className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate" title={bull.firearmName}>{bull.firearmName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Crosshair className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate" title={bull.caliberName}>{bull.caliberName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate" title={bull.opticName}>{bull.opticName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Ruler className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span>{bull.distanceYards}yd</span>
                  </div>
                </div>

                {/* Session link */}
                <Link 
                  href={`/sessions/${bull.sessionSlug}`}
                  className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-xs text-muted-foreground hover:text-blue-400 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {format(new Date(bull.sessionDate), "MMM d, yyyy")}
                    {bull.sessionLocation && ` • ${bull.sessionLocation}`}
                  </span>
                  <span className="text-blue-400">View →</span>
                </Link>
              </div>
            );
          })}
        </div>
      </FadeIn>
    </div>
  );
}
