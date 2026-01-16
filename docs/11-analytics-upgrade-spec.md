# Analytics Suite Upgrade Specification

## Overview

This document describes the comprehensive upgrade to the Target Tracker analytics system, expanding from basic score tracking to include advanced shot-position analytics, precision metrics, and bias detection.

## Key Features

### 1. Shot Position Analytics
- **Heatmap visualization** - Density plots showing shot clustering
- **Shot plots with ring overlays** - Scatter plots colored by score or session
- **Group size metrics** - Extreme spread, bounding box, mean radius
- **Bias detection** - Directional tendencies (left/right, up/down)
- **Centroid tracking** - Point of aim vs point of impact analysis

### 2. Backward Compatibility
- Count-based metrics always available (score distribution, bull rate, miss rate)
- Position-based metrics computed only when `shotPositions` data exists
- Optional synthetic shot generation for visualization (clearly labeled)
- Graceful degradation when position data is missing

### 3. Session-Over-Session Progress
- No time windows - pure session index based comparison
- Last vs previous session deltas
- Last 3 vs previous 3 session trends (when enough data exists)
- Consistency and improvement tracking

### 4. Multi-Dimensional Breakdowns
- By firearm, caliber, optic, distance
- Leaderboards with drill-down detail views
- Distance curves showing performance degradation
- Comparison mode (up to 3 entities)

## Data Model

### BullRecord (existing, with shotPositions)
```typescript
interface IShotPosition {
  x: number;        // 0-200 SVG viewBox
  y: number;        // 0-200 SVG viewBox
  score: number;    // 0-5
}

interface IBullRecord {
  targetSheetId: ObjectId;
  bullIndex: number;        // 1-6
  score5Count: number;
  score4Count: number;
  score3Count: number;
  score2Count: number;
  score1Count: number;
  score0Count: number;
  shotPositions?: IShotPosition[];  // Optional position tracking
}
```

### Derived Metrics

#### Count-Based (Always Available)
- `totalShots` = sum of all counts
- `totalScore` = 5×c5 + 4×c4 + 3×c3 + 2×c2 + 1×c1
- `avgScorePerShot` = totalScore / totalShots
- `bullRate` = c5 / totalShots
- `missRate` = c0 / totalShots
- `goodHitRate` = (c5 + c4) / totalShots
- `ringDistribution` = percentage breakdown of 5,4,3,2,1,0

#### Position-Based (When shotPositions exists)
Per shot:
- `dx` = x - 100, `dy` = y - 100
- `r` = √(dx² + dy²)
- `angle` = atan2(dy, dx)

Per bull:
- `meanRadius` = avg(r) - average distance from center
- `medianRadius` = median(r)
- `radialStdDev` = standard deviation of radii
- `extremeSpread` = max pairwise distance (group size proxy)
- `boundingBox` = {minX, maxX, minY, maxY, width, height, diagonal}
- `centroid` = {meanX, meanY, offsetX, offsetY, centroidDistance}
- `quadrantDistribution` = shot counts in Q1/Q2/Q3/Q4

Aggregated metrics:
- `sheetMeanRadius`, `sheetCentroidDistance`, `sheetBias`
- `sessionMeanRadius`, `sessionCentroidDistance`, `sessionTightnessScore`
- `shotCoverage` = % of bulls/shots with position data

## Architecture

### Routes
- `/analytics` - Overview dashboard with KPIs, trends, filters
- `/analytics/targets` - Shot-level visualizations hub
- `/analytics/firearms` - Firearm leaderboard and details
- `/analytics/calibers` - Caliber leaderboard and details
- `/analytics/optics` - Optic leaderboard and details
- `/analytics/distances` - Distance performance matrix

### API Endpoints
- `GET /api/analytics/overview` - KPIs, session series, distributions
- `GET /api/analytics/shots` - Heatmap bins, scatter points, group metrics
- `GET /api/analytics/firearms` - Firearm leaderboard and trends
- `GET /api/analytics/calibers` - Caliber leaderboard and trends
- `GET /api/analytics/optics` - Optic leaderboard and trends
- `GET /api/analytics/distances` - Distance matrix data

### Global Filters (URL query params)
- Firearm IDs (multi-select)
- Caliber IDs (multi-select)
- Optic IDs (multi-select)
- Distance range (min/max yards)
- Minimum shots threshold (default: 10)
- Position-only mode (exclude count-only bulls)
- Synthetic visualization mode (allow estimated points for viz)

### Charting Library
**Apache ECharts** via `echarts-for-react` for:
- Premium dark theme aesthetics
- Heatmap support (essential for shot density)
- Scatter plots with overlays
- Touch-friendly mobile interaction
- Consistent theming across all charts

Fallback to Recharts for simple charts if needed, but ECharts preferred for shot visualizations.

## UI/UX Requirements

### Mobile-First Design
- Single-column stacking on phones
- 2-up KPI cards on mobile, 3-4-up on desktop
- Touch-friendly chart interactions
- Collapsible filter accordions to save space
- Full-width heatmaps with adequate touch targets

### Dark Theme
- Use shadcn/ui components and Tailwind CSS variables
- Muted, tasteful scoring colors (avoid garish primaries)
- High contrast for readability
- Smooth tooltips with proper theming

### Icons & Scanability
- Lucide React icons for every metric and section
- Clear visual hierarchy
- Badge indicators for active filters
- Warning badges for synthetic data

### Empty States
- Guidance: "Add shot positions by clicking on targets to unlock precision analytics"
- Suggestions to adjust filters if no data
- Loading skeletons for perceived performance

## Implementation Phases

### Phase 1: Core Analytics Infrastructure
1. Install ECharts dependency
2. Create analytics utilities library:
   - Position metrics computation
   - Weighted aggregation
   - Heatmap binning
   - Synthetic shot generation (visualization only)
3. Build reusable UI components:
   - `AnalyticsHeader`, `FilterBar`, `KpiCard`, `ChartCard`
   - `EChart` wrapper with dark theme
4. Implement `/api/analytics/overview` endpoint
5. Rebuild `/analytics` page with:
   - Expanded KPI cards (score + position metrics)
   - Session trend charts (score, bull rate, mean radius)
   - Ring distribution chart
   - Shot-weighted aggregations

### Phase 2: Shot Visualization Hub
1. Implement `/api/analytics/shots` endpoint:
   - Server-side heatmap binning
   - Shot point downsampling
   - Group metrics computation
   - Bias/centroid calculation
2. Build `/analytics/targets` page:
   - Heatmap card with bins
   - Shot plot with ring overlay
   - Bias compass with directional arrow
   - Group metrics display
   - Bull-by-bull degradation chart

### Phase 3: Firearm Analytics
1. Implement `/api/analytics/firearms` endpoint
2. Build `/analytics/firearms` page:
   - Leaderboard with position metrics
   - Detail view per firearm
   - Trend charts (score, mean radius, centroid)
   - Distance performance curves
   - Compare mode (overlay up to 3)

### Phase 4: Caliber, Optic, Distance Analytics
1. Clone firearm pattern for calibers and optics
2. Implement distance matrix:
   - Heatmap matrix (distance × firearm/caliber)
   - Metric toggle (score vs mean radius)
   - Touch-friendly on mobile

### Phase 5: Polish & Testing
1. Mobile responsive testing
2. Filter persistence in URL
3. Performance optimization (aggregation queries)
4. Loading states and error handling
5. Tooltip consistency
6. Chart theming consistency

## Testing Strategy

### Test as You Go
1. After each endpoint, test with curl/Postman
2. After each page section, test in browser:
   - Mobile viewport (375px)
   - Tablet (768px)
   - Desktop (1440px)
3. Test filter combinations
4. Test with/without position data
5. Test empty states
6. Test synthetic mode toggle

### Key Test Scenarios
- Session with all position data
- Session with mixed position/count-only bulls
- Session with no position data (backward compat)
- Large dataset (1000+ shots) - performance
- Filtered to zero results - empty state
- Single session - delta handling
- Position-only mode with low coverage

## Future Extensibility

### Calibration to Real Units (Post-MVP)
Current metrics are in SVG coordinate space (0-200). Future upgrade can add:
- Target profile definitions (ring radii in inches)
- Photo calibration markers
- Conversion to MOA/inches for true group size
- Keep utilities modular for easy conversion layer

### OCR Integration (Post-MVP)
- Import shot positions from target photos
- Validate against manual entry
- Batch processing

## Success Criteria

✅ `/analytics` includes KPIs, trends, distributions, position metrics when available
✅ `/analytics/targets` includes heatmap, shot plot, bias compass, group metrics
✅ Filters persist in URL and apply to all endpoints
✅ Position-only mode works correctly
✅ Synthetic visualization mode clearly labeled
✅ Mobile-first responsive on all pages
✅ Dark theme with premium polish
✅ Shot-weighted aggregations throughout
✅ Backward compatible with count-only data
✅ Fast performance (< 2s page loads)

## Dependencies

New packages to install:
```bash
npm install echarts echarts-for-react
```

Existing packages leveraged:
- `recharts` (fallback for simple charts)
- `lucide-react` (icons)
- `shadcn/ui` (components)
- `date-fns` (date formatting)
- `mongoose` (aggregation pipelines)

