"use client";

import { useMemo, useState } from "react";
import { Target, TrendingUp } from "lucide-react";

interface SingleBullVisualizationProps {
  bull: {
    bullIndex: number;
    score5Count: number;
    score4Count: number;
    score3Count: number;
    score2Count: number;
    score1Count: number;
    score0Count: number;
  };
  size?: number;
}

interface Shot {
  x: number;
  y: number;
  ring: number;
}

export function SingleBullVisualization({ bull, size = 120 }: SingleBullVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Generate random shot positions within each ring
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

    return allShots;
  }, [bull]);

  const totalShots = bull.score5Count + bull.score4Count + bull.score3Count + 
                     bull.score2Count + bull.score1Count + bull.score0Count;

  const totalScore = bull.score5Count * 5 + bull.score4Count * 4 + bull.score3Count * 3 +
                     bull.score2Count * 2 + bull.score1Count * 1;
  
  const avgScore = totalShots > 0 ? (totalScore / totalShots).toFixed(2) : "0.00";

  return (
    <div 
      className="text-center group cursor-pointer relative"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div 
        className={`relative mx-auto transition-all duration-300 ease-in-out ${
          isExpanded ? 'scale-200 z-50' : 'group-hover:scale-200 group-hover:z-50'
        }`}
        style={{ width: size, height: size }}
      >
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
          
          {/* Shot markers (red dots, white in bullseye) */}
          {shots.map((shot, index) => (
            <circle
              key={index}
              cx={shot.x}
              cy={shot.y}
              r="4"
              fill={shot.ring === 0 ? "#ffffff" : "#ef4444"}
              stroke={shot.ring === 0 ? "#333333" : "#7f1d1d"}
              strokeWidth="0.8"
              opacity="0.9"
            />
          ))}
        </svg>
      </div>
      
      {/* Tooltip - shows on hover (desktop) or click (mobile) */}
      <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 transition-opacity duration-300 pointer-events-none z-50 ${
        isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <div className="bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl min-w-[180px]">
          {/* Average Score at top */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs text-gray-400">Average</span>
            </div>
            <span className="text-lg font-bold text-white">{avgScore}</span>
          </div>

          {/* Score breakdown grid */}
          <div className="space-y-1.5">
            {[
              { score: 5, count: bull.score5Count, color: "bg-red-600", label: "5pt" },
              { score: 4, count: bull.score4Count, color: "bg-gray-900", label: "4pt" },
              { score: 3, count: bull.score3Count, color: "bg-gray-800", label: "3pt" },
              { score: 2, count: bull.score2Count, color: "bg-gray-600", label: "2pt" },
              { score: 1, count: bull.score1Count, color: "bg-gray-400", label: "1pt" },
              { score: 0, count: bull.score0Count, color: "bg-white", label: "0pt" },
            ].map(({ score, count, color, label }) => (
              <div key={score} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color} ${color === 'bg-white' ? 'border border-gray-400' : ''}`}></div>
                  <span className="text-gray-300 font-medium">{label}</span>
                </div>
                <span className="text-white font-semibold tabular-nums">{count}</span>
              </div>
            ))}
          </div>

          {/* Total at bottom */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <span className="text-sm font-bold text-white">{totalShots}</span>
          </div>
        </div>
      </div>

      <p className={`text-xs text-muted-foreground mt-1 transition-opacity duration-300 ${
        isExpanded ? 'opacity-0' : 'group-hover:opacity-0'
      }`}>
        Bull {bull.bullIndex}
      </p>
      {totalShots > 0 && (
        <p className={`text-xs font-medium transition-opacity duration-300 ${
          isExpanded ? 'opacity-0' : 'group-hover:opacity-0'
        }`}>
          {totalShots} shots
        </p>
      )}
    </div>
  );
}
