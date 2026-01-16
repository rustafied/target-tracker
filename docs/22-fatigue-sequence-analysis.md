# Fatigue and Sequence Analysis

## Overview

The Fatigue and Sequence Analysis feature examines how shooting performance changes over the course of a session by analyzing shot-by-shot progression. It reveals patterns like score degradation, accuracy fade, bias shifts, and miss rate increases as shooters progress through their shots—helping identify endurance issues and training opportunities.

## Key Features

### Metrics Analyzed

- **Average Score**: Mean bull scores per shot bucket
- **Bull Rate**: Percentage of bullseyes (score 5) per bucket
- **Miss Rate**: Percentage of misses (score 0) per bucket
- **Mean Radius**: Average dispersion from center per bucket (when position data available)
- **Directional Bias Shift**: Changes in average X/Y offset between buckets, revealing drift patterns

### Shot Segmentation

Sessions are divided into sequential buckets for analysis:

- **Fixed Buckets**: First 10 shots, 11-20, 21-30, etc.
- **Percentile Buckets**: First third, middle third, last third (normalizes for session length)
- **Custom Buckets**: User-defined bucket sizes (5, 10, 15, 20, 25, 30 shots)

### Visualizations

1. **Performance Trend Chart**: Line/bar chart showing selected metric over shot sequence
2. **Multi-Metric Comparison**: Overlay multiple metrics to see correlations
3. **Heatmap View**: Visual density map showing how shot placement changes across buckets
4. **Scatter Plot**: Individual shots colored by sequence position (blue → red gradient)

### Filtering Options

- **By Equipment**: Firearm, caliber, optic
- **By Session**: Date range, specific sessions
- **By Distance**: Min/max distance filtering
- **Session Length**: Minimum shot count (e.g., ignore sessions < 20 shots)
- **Position Data**: Require position data for radius/bias metrics

## Data Structure

### Shot Position Data

Shots are stored in the `shotPositions` array of `BullRecord` documents:

```typescript
interface ShotPosition {
  x: number;     // X coordinate in template space (0-200)
  y: number;     // Y coordinate in template space (0-200)
  score: number; // Score value (0-5)
}
```

The array index represents the shot sequence—first element is the first shot, last element is the last shot.

### Aggregation Strategy

The backend aggregates shots across sessions by:
1. Unwinding sheets and bulls from sessions
2. Unwinding shotPositions with array index tracking
3. Computing bucket assignments based on shot index
4. Grouping by bucket and calculating metrics
5. Computing trends and degradation slopes

## User Interface

### Analytics Integration

The feature is accessible in multiple locations:

- **Analytics Overview** (`/analytics`): New "Fatigue Analysis" section showing aggregate patterns
- **Per-Session View** (`/sessions/[id]`): Drill-down showing fatigue within specific sessions
- **Analytics Tabs**: Available in Firearms, Calibers, and Optics analytics pages

### Component Structure

```
SequenceAnalysisCard
├── FilterControls (metric selector, bucket size, item filters)
├── PerformanceTrendChart (primary line/bar chart)
├── BiasHeatmap (directional drift visualization)
└── InsightsPanel (auto-generated insights)
```

### Insights Examples

- "Miss rate increases 12% in the last third of sessions—suggesting endurance training"
- "Average score drops 0.5 points after shot 40—possible fatigue"
- "Bias shifts +0.3 units right in shots 30-40—check form consistency"
- "Performance remains consistent across all buckets—excellent stamina"

## API Endpoints

### `/api/analytics/sequence`

Retrieves fatigue/sequence analysis data.

**Query Parameters:**
- `metric`: Metric to analyze (`avgScore`, `bullRate`, `missRate`, `meanRadius`, `biasX`, `biasY`)
- `bucketType`: `fixed` | `percentile` | `custom`
- `bucketSize`: Number of shots per bucket (for fixed/custom)
- `sessionIds`: Comma-separated session IDs (optional, for drill-down)
- `firearmIds`: Filter by firearms
- `caliberIds`: Filter by calibers
- `opticIds`: Filter by optics
- `distanceMin`: Minimum distance
- `distanceMax`: Maximum distance
- `minShots`: Minimum shots per session (default: 20)
- `positionOnly`: Require position data (default: false for score-based, true for radius/bias)

**Response:**
```json
{
  "buckets": [
    {
      "bucket": 0,
      "label": "Shots 1-10",
      "avgScore": 3.2,
      "bullRate": 0.15,
      "missRate": 0.08,
      "meanRadius": 2.5,
      "biasX": -0.2,
      "biasY": 0.1,
      "shotCount": 120
    }
  ],
  "overall": {
    "avgScore": 3.0,
    "bullRate": 0.12,
    "missRate": 0.11,
    "totalShots": 450
  },
  "trend": {
    "slope": -0.03,
    "direction": "declining",
    "confidence": 0.85
  },
  "insights": [
    "Average score declines from 3.2 to 2.8 (12.5% drop)",
    "Miss rate doubles in final third (8% → 16%)"
  ]
}
```

## Performance Considerations

- **Indexing**: Create index on `targetSheetId` for efficient bull lookups
- **Array Unwinding**: May be expensive for large sessions; consider limiting analysis to recent sessions
- **Caching**: Consider caching results per filter combination
- **Query Limits**: Default to last 50 sessions; allow users to expand

## Implementation Notes

### Handling Variable Session Lengths

For percentile buckets:
- Compute session length first
- Assign each shot to thirds/quarters based on position
- Normalize across sessions of different lengths

### Missing Position Data

- Score-based metrics (avg score, bull rate, miss rate) work without position data
- Radius and bias metrics require position data
- UI shows appropriate metrics based on data availability
- "Position Only" filter restricts to shots with x/y coordinates

### Edge Cases

- **Short Sessions**: Sessions below minShots threshold are excluded
- **No Degradation**: Show positive message when performance is consistent
- **Empty Buckets**: Skip buckets with < 3 shots for statistical validity
- **Single Session**: Still useful for intra-session fatigue analysis

## Future Enhancements

- **Time-Based Analysis**: If shot timestamps are added, analyze shots/minute and fatigue over time (not just sequence)
- **Break Detection**: Identify pauses in shooting and analyze pre/post-break performance
- **Goal Setting**: Set targets like "Maintain >3.0 avg score through final bucket"
- **Per-Shot Notes**: Allow users to annotate specific shot ranges (e.g., "felt tired", "adjusted stance")
- **ML Predictions**: Predict likely performance in later buckets based on early shots
- **Cross-Session Fatigue**: Analyze if performance degrades across consecutive days

## Testing Strategy

### Unit Tests
- Bucket assignment logic (fixed, percentile, custom)
- Metric calculations per bucket
- Trend/slope detection
- Edge cases (empty buckets, single shot sessions)

### Integration Tests
- API endpoint with various filters
- Aggregation pipeline performance
- Data consistency across sessions

### E2E Tests
- Filter interactions
- Chart rendering and interactions
- Tooltip displays
- Mobile responsiveness
- Insights generation

## Deployment Checklist

- [ ] API endpoint implemented and tested
- [ ] Frontend components added to analytics pages
- [ ] Mobile responsive design verified
- [ ] Dark theme compatibility checked
- [ ] Documentation updated
- [ ] Performance tested with large datasets
- [ ] Insights logic validated
- [ ] Export functionality working (PNG/CSV)
