"use client";

import { useMemo, useState } from "react";
import { Target, TrendingUp, Crosshair, Maximize2, Percent, BarChart3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SessionHeatmapProps {
  sheets: Array<{
    bulls?: Array<{
      score5Count: number;
      score4Count: number;
      score3Count: number;
      score2Count: number;
      score1Count: number;
      score0Count: number;
    }>;
  }>;
}

interface Shot {
  x: number;
  y: number;
  ring: number;
}

export function SessionHeatmap({ sheets }: SessionHeatmapProps) {
  const [modalOpen, setModalOpen] = useState(false);
  
  // Generate random shot positions from all bulls on all sheets
  const shots = useMemo(() => {
    const allShots: Shot[] = [];
    const centerX = 100;
    const centerY = 100;
    
    // Ring radii (from center outward)
    const rings = [
      { inner: 0, outer: 15, score: 5 },      // Red center (5)
      { inner: 15, outer: 30, score: 4 },     // Black ring (4)
      { inner: 30, outer: 50, score: 3 },     // Black ring (3)
      { inner: 50, outer: 70, score: 2 },     // Dark gray (2)
      { inner: 70, outer: 85, score: 1 },     // Light gray (1)
      { inner: 85, outer: 100, score: 0 },    // White (0/miss)
    ];

    sheets.forEach((sheet) => {
      sheet.bulls?.forEach((bull) => {
        const counts = [
          { count: bull.score5Count, ring: 0 },
          { count: bull.score4Count, ring: 1 },
          { count: bull.score3Count, ring: 2 },
          { count: bull.score2Count, ring: 3 },
          { count: bull.score1Count, ring: 4 },
          { count: bull.score0Count, ring: 5 },
        ];

        counts.forEach(({ count, ring }) => {
          for (let i = 0; i < count; i++) {
            const { inner, outer } = rings[ring];
            
            // Random angle
            const angle = Math.random() * Math.PI * 2;
            
            // Random radius within the ring (with slight padding)
            const minRadius = inner + 2;
            const maxRadius = outer - 2;
            const radius = minRadius + Math.random() * (maxRadius - minRadius);
            
            // Convert to x,y coordinates
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            allShots.push({ x, y, ring });
          }
        });
      });
    });

    return allShots;
  }, [sheets]);

  const totalShots = shots.length;
  
  // Calculate statistics
  const stats = useMemo(() => {
    const ringCounts = [0, 0, 0, 0, 0, 0]; // rings 0-5
    shots.forEach(shot => {
      ringCounts[shot.ring]++;
    });
    
    const totalScore = ringCounts[0] * 5 + ringCounts[1] * 4 + ringCounts[2] * 3 + 
                       ringCounts[3] * 2 + ringCounts[4] * 1;
    const avgScore = totalShots > 0 ? totalScore / totalShots : 0;
    const bullHitRate = totalShots > 0 ? (ringCounts[0] / totalShots) * 100 : 0;
    
    return {
      ringCounts,
      totalScore,
      avgScore,
      bullHitRate,
    };
  }, [shots, totalShots]);

  return (
    <>
      <div className="text-center cursor-pointer group" onClick={() => setModalOpen(true)}>
        <div className="relative w-full max-w-[300px] mx-auto aspect-square transition-all duration-300 group-hover:scale-105">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Target rings (from outside to inside) */}
            
            {/* 0 - White (miss) */}
            <circle cx="100" cy="100" r="100" fill="white" stroke="#333" strokeWidth="1" />
            
            {/* 1 - Light gray */}
            <circle cx="100" cy="100" r="85" fill="#d4d4d4" stroke="#333" strokeWidth="1" />
            
            {/* 2 - Dark gray */}
            <circle cx="100" cy="100" r="70" fill="#737373" stroke="#333" strokeWidth="1" />
            
            {/* 3 - Black */}
            <circle cx="100" cy="100" r="50" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
            
            {/* 4 - Black */}
            <circle cx="100" cy="100" r="30" fill="#0a0a0a" stroke="#333" strokeWidth="1" />
            
            {/* 5 - Red center (bullseye) */}
            <circle cx="100" cy="100" r="15" fill="#dc2626" stroke="#333" strokeWidth="1" />
            
            {/* Crosshairs */}
            <line x1="0" y1="100" x2="200" y2="100" stroke="#333" strokeWidth="0.5" opacity="0.3" />
            <line x1="100" y1="0" x2="100" y2="200" stroke="#333" strokeWidth="0.5" opacity="0.3" />
            
            {/* Shot markers with transparency for heatmap effect */}
            {shots.map((shot, index) => (
              <circle
                key={index}
                cx={shot.x}
                cy={shot.y}
                r="3.5"
                fill={shot.ring === 0 ? "#ffffff" : "#ef4444"}
                stroke={shot.ring === 0 ? "#333333" : "#7f1d1d"}
                strokeWidth="0.3"
                opacity="0.4"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
            <Maximize2 className="h-8 w-8 text-white" />
          </div>
        </div>
        <p className="text-sm font-medium mt-2">Session Heatmap</p>
        <p className="text-xs text-muted-foreground">{totalShots} total shots</p>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto !bg-background !border-border">
          <div className="absolute inset-0 bg-background -z-10 rounded-lg"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Session Heatmap Analysis
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            {/* Left: Large Heatmap */}
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-[400px] aspect-square">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Target rings */}
                  <circle cx="100" cy="100" r="100" fill="white" stroke="#333" strokeWidth="1" />
                  <circle cx="100" cy="100" r="85" fill="#d4d4d4" stroke="#333" strokeWidth="1" />
                  <circle cx="100" cy="100" r="70" fill="#737373" stroke="#333" strokeWidth="1" />
                  <circle cx="100" cy="100" r="50" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
                  <circle cx="100" cy="100" r="30" fill="#0a0a0a" stroke="#333" strokeWidth="1" />
                  <circle cx="100" cy="100" r="15" fill="#dc2626" stroke="#333" strokeWidth="1" />
                  
                  {/* Crosshairs */}
                  <line x1="0" y1="100" x2="200" y2="100" stroke="#333" strokeWidth="0.5" opacity="0.3" />
                  <line x1="100" y1="0" x2="100" y2="200" stroke="#333" strokeWidth="0.5" opacity="0.3" />
                  
                  {/* Shot markers */}
                  {shots.map((shot, index) => (
                    <circle
                      key={index}
                      cx={shot.x}
                      cy={shot.y}
                      r="3.5"
                      fill={shot.ring === 0 ? "#ffffff" : "#ef4444"}
                      stroke={shot.ring === 0 ? "#333333" : "#7f1d1d"}
                      strokeWidth="0.3"
                      opacity="0.4"
                    />
                  ))}
                </svg>
              </div>
            </div>

            {/* Right: Statistics */}
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-medium">Total Shots</span>
                  </div>
                  <p className="text-2xl font-bold">{totalShots}</p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Avg Score</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.avgScore.toFixed(2)}</p>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-xs font-medium">Total Score</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalScore}</p>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Percent className="h-4 w-4" />
                    <span className="text-xs font-medium">Bull Hit Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.bullHitRate.toFixed(1)}%</p>
                </div>
              </div>

              {/* Score Distribution */}
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Crosshair className="h-4 w-4" />
                  Score Distribution
                </h3>
                <div className="space-y-2">
                  {[
                    { score: 5, label: "Bullseye (5pt)", color: "bg-red-600", count: stats.ringCounts[0] },
                    { score: 4, label: "Inner (4pt)", color: "bg-gray-900", count: stats.ringCounts[1] },
                    { score: 3, label: "Middle (3pt)", color: "bg-gray-700", count: stats.ringCounts[2] },
                    { score: 2, label: "Outer (2pt)", color: "bg-gray-500", count: stats.ringCounts[3] },
                    { score: 1, label: "Edge (1pt)", color: "bg-gray-400", count: stats.ringCounts[4] },
                    { score: 0, label: "Miss (0pt)", color: "bg-white border border-gray-300", count: stats.ringCounts[5] },
                  ].map(({ score, label, color, count }) => {
                    const percentage = totalShots > 0 ? (count / totalShots) * 100 : 0;
                    return (
                      <div key={score} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color}`}></div>
                            <span className="font-medium">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{count}</span>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full ${color.replace('bg-', 'bg-').replace('border', '')}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

