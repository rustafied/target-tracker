"use client";

import { useMemo, useState } from "react";
import { MouseEvent } from "react";

interface ShotPosition {
  x: number;
  y: number;
  score: number;
}

interface InteractiveTargetInputProps {
  shots: ShotPosition[];
  onShotsChange: (shots: ShotPosition[]) => void;
  bullIndex: number;
}

export function InteractiveTargetInput({ shots, onShotsChange, bullIndex }: InteractiveTargetInputProps) {
  const [hoveredRing, setHoveredRing] = useState<number | null>(null);

  // Ring definitions matching SessionHeatmap
  const rings = [
    { inner: 0, outer: 15, score: 5, label: "5pts" },      // Red center (5)
    { inner: 15, outer: 30, score: 4, label: "4pts" },     // Black ring (4)
    { inner: 30, outer: 50, score: 3, label: "3pts" },     // Black ring (3)
    { inner: 50, outer: 70, score: 2, label: "2pts" },     // Dark gray (2)
    { inner: 70, outer: 85, score: 1, label: "1pt" },      // Light gray (1)
    { inner: 85, outer: 100, score: 0, label: "0pts" },    // White (0/miss)
  ];

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Get click position relative to SVG
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 200;
    
    // Calculate distance from center
    const centerX = 100;
    const centerY = 100;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    // Determine which ring was hit
    let score = 0;
    for (const ring of rings) {
      if (distance >= ring.inner && distance <= ring.outer) {
        score = ring.score;
        break;
      }
    }
    
    // Add the shot
    const newShots = [...shots, { x, y, score }];
    onShotsChange(newShots);
  };

  const handleRightClick = (e: MouseEvent<SVGCircleElement>, index: number) => {
    e.preventDefault();
    // Remove the clicked shot
    const newShots = shots.filter((_, i) => i !== index);
    onShotsChange(newShots);
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 200;
    
    const centerX = 100;
    const centerY = 100;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    let ring = null;
    for (let i = 0; i < rings.length; i++) {
      if (distance >= rings[i].inner && distance <= rings[i].outer) {
        ring = i;
        break;
      }
    }
    
    setHoveredRing(ring);
  };

  const handleMouseLeave = () => {
    setHoveredRing(null);
  };

  const clearAllShots = () => {
    onShotsChange([]);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Bull {bullIndex}</h3>
          <p className="text-xs text-muted-foreground">{shots.length} shots</p>
        </div>
        {shots.length > 0 && (
          <button
            onClick={clearAllShots}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="relative w-full aspect-square max-w-full p-4">
        <svg 
          viewBox="0 0 200 200" 
          className="w-full h-full cursor-crosshair"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Target rings (from outside to inside) */}
          
          {/* 0 - White (miss) */}
          <circle 
            cx="100" 
            cy="100" 
            r="100" 
            fill="white" 
            stroke="#333" 
            strokeWidth="1"
            opacity={hoveredRing === 5 ? 0.8 : 1}
          />
          
          {/* 1 - Light gray */}
          <circle 
            cx="100" 
            cy="100" 
            r="85" 
            fill="#d4d4d4" 
            stroke="#333" 
            strokeWidth="1"
            opacity={hoveredRing === 4 ? 0.8 : 1}
          />
          
          {/* 2 - Dark gray */}
          <circle 
            cx="100" 
            cy="100" 
            r="70" 
            fill="#737373" 
            stroke="#333" 
            strokeWidth="1"
            opacity={hoveredRing === 3 ? 0.8 : 1}
          />
          
          {/* 3 - Black */}
          <circle 
            cx="100" 
            cy="100" 
            r="50" 
            fill="#1a1a1a" 
            stroke="#333" 
            strokeWidth="1"
            opacity={hoveredRing === 2 ? 0.8 : 1}
          />
          
          {/* 4 - Black */}
          <circle 
            cx="100" 
            cy="100" 
            r="30" 
            fill="#0a0a0a" 
            stroke="#333" 
            strokeWidth="1"
            opacity={hoveredRing === 1 ? 0.8 : 1}
          />
          
          {/* 5 - Red center (bullseye) */}
          <circle 
            cx="100" 
            cy="100" 
            r="15" 
            fill="#dc2626" 
            stroke="#333" 
            strokeWidth="1"
            opacity={hoveredRing === 0 ? 0.8 : 1}
          />
          
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
              fill={shot.score === 5 ? "#ffffff" : "#ef4444"}
              stroke={shot.score === 5 ? "#333333" : "#7f1d1d"}
              strokeWidth="0.8"
              opacity="0.9"
              className="cursor-pointer hover:opacity-100 hover:r-4"
              onContextMenu={(e) => handleRightClick(e, index)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          
          {/* Hover indicator */}
          {hoveredRing !== null && (
            <text
              x="100"
              y="10"
              textAnchor="middle"
              fill="#333"
              fontSize="8"
              fontWeight="bold"
            >
              {rings[hoveredRing].label}
            </text>
          )}
        </svg>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Click to add shots · Right-click to remove
      </p>
    </div>
  );
}

