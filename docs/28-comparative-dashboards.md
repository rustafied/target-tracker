# Comparative Dashboards

## Overview

The Comparative Dashboards feature enables side-by-side performance analysis of firearms, optics, calibers, or sessions. Users can select 2-3 items to visualize and compare key metrics, helping them make data-driven decisions like "Which optic improves my accuracy?" or "How does my DDM4 perform vs. my Henry X at distance?"

## Key Features

- **Multi-Item Selection**: Compare 2-3 items (firearms, optics, calibers, or sessions)
- **Side-by-Side Views**: Split panel layout showing individual stats
- **Overlaid Charts**: Single charts with multiple data series for direct visual comparison
- **Delta Calculations**: Automatic computation of performance differences with % changes
- **Unified Filtering**: Apply date ranges, distance filters, and session minimums across all compared items
- **Smart Insights**: Auto-generated text highlighting key differences (e.g., "+15% bull rate at 20yd")

## Use Cases

1. **Equipment Testing**: "Vortex AMG vs. Trijicon RMR - which has better close-range accuracy?"
2. **Ammunition Efficiency**: "9mm vs. .38 Special - which gives me better bulls per dollar?"
3. **Session Analysis**: "Morning vs. evening sessions - when do I perform better?"
4. **Distance Performance**: "Which firearm maintains accuracy at 50+ yards?"

## Architecture

### Data Flow

```
User Selection → API /api/analytics/compare → Parallel Aggregations → Delta Computation → Visualization
```

### API Endpoint

**Route**: `/api/analytics/compare`

**Query Parameters**:
- `type`: "firearm" | "optic" | "caliber" | "session"
- `ids`: Comma-separated IDs (2-3 items)
- `metric`: "avgScore" | "bullRate" | "missRate" | "meanRadius"
- `groupBy`: "date" | "distance" | "sequence" (for trend charts)
- `startDate`, `endDate`: Filter range (optional)
- `distances`: Comma-separated distance buckets (optional)

**Response**:
```json
{
  "items": [
    {
      "id": "firearm1",
      "name": "DDM4 PDW",
      "metrics": {
        "avgScore": 7.8,
        "bullRate": 0.45,
        "missRate": 0.12,
        "totalShots": 250
      },
      "trend": [
        { "x": "2026-01-01", "value": 7.5 },
        { "x": "2026-01-08", "value": 8.1 }
      ]
    }
  ],
  "deltas": [
    {
      "metric": "avgScore",
      "diff": 0.5,
      "percentChange": 6.4,
      "winner": "firearm1"
    }
  ],
  "insights": [
    "DDM4 PDW outperforms Henry X by 6.4% in avg score",
    "Henry X shows better consistency at 50+ yards"
  ]
}
```

### Database Queries

No schema changes required. Uses existing collections with optimized aggregations:

```typescript
// Parallel aggregation for each item
const results = await Promise.all(
  ids.map(id => 
    Session.aggregate([
      { $match: { userId, [`sheets.${type}Id`]: id, date: { $gte: startDate } } },
      { $unwind: "$sheets" },
      { $match: { [`sheets.${type}Id`]: id } },
      { $group: {
        _id: null,
        avgScore: { $avg: "$sheets.avgScore" },
        bullRate: { $avg: "$sheets.bullRate" },
        totalShots: { $sum: "$sheets.bulls.length" }
      }}
    ])
  )
);
```

**Indexes Required**:
```javascript
db.sessions.createIndex({ "sheets.firearmId": 1, userId: 1, date: -1 });
db.sessions.createIndex({ "sheets.opticId": 1, userId: 1, date: -1 });
db.sessions.createIndex({ "sheets.caliberId": 1, userId: 1, date: -1 });
```

## UI Components

### Component Structure

```
/components/analytics/
  ComparativeDashboard.tsx       - Main container with selection and filters
  ComparisonItemSelector.tsx     - Multi-select dropdown (2-3 items max)
  SplitViewPanel.tsx            - Side-by-side layout for individual stats
  OverlaidChart.tsx             - Multi-series Recharts component
  DeltaTable.tsx                - Performance differences table
  ComparisonInsights.tsx        - Auto-generated insights text
```

### Layout Modes

**Split View** (default on desktop):
```
┌─────────────────────┬─────────────────────┐
│   Item A Stats      │   Item B Stats      │
│   ┌──────────────┐  │   ┌──────────────┐  │
│   │ Mini Chart   │  │   │ Mini Chart   │  │
│   └──────────────┘  │   └──────────────┘  │
│   • Avg: 7.8       │   • Avg: 7.3       │
│   • Bulls: 45%     │   • Bulls: 38%     │
└─────────────────────┴─────────────────────┘
```

**Overlaid View**:
```
┌───────────────────────────────────────────┐
│   Performance Over Time                   │
│   ┌─────────────────────────────────┐    │
│   │  ──── Item A (Blue)             │    │
│   │  ──── Item B (Orange)           │    │
│   │                                 │    │
│   └─────────────────────────────────┘    │
└───────────────────────────────────────────┘
```

**Mobile** (stacked):
```
┌─────────────────────┐
│   Item A Stats      │
│   [Expand Chart]    │
├─────────────────────┤
│   Item B Stats      │
│   [Expand Chart]    │
└─────────────────────┘
```

### Color Scheme (Dark Mode)

- Item 1: Blue (#3B82F6)
- Item 2: Orange (#F97316)
- Item 3: Purple (#A855F7)
- Winner highlights: Green (#10B981)
- Loser indicators: Red (#EF4444) with opacity

## Integration Points

### Analytics Tabs

Add "Compare" button to each analytics page:
- **Firearms Analytics** → Compare firearms
- **Optics Analytics** → Compare optics
- **Calibers Analytics** → Compare calibers
- **Overview** → Compare any type

### Entry Points

1. **Top-right action button**: Opens comparison modal/page
2. **Leaderboard items**: Checkbox to add to comparison queue
3. **URL deep linking**: `/analytics/compare?type=firearm&ids=x,y`

## Metrics Available

| Metric | Description | Calculation |
|--------|-------------|-------------|
| Avg Score | Mean score across all shots | `$avg: sheets.avgScore` |
| Bull Rate | Percentage of shots hitting bullseye | `bulls / totalShots` |
| Miss Rate | Percentage of shots off-target | `misses / totalShots` |
| Mean Radius | Average distance from center | Uses existing metrics |
| MOA | Accuracy at distance | Requires distance analysis |
| Efficiency | Bulls per $ (if ammo tracked) | From ammo efficiency feature |

## Performance Considerations

### Query Optimization

- **Parallel Execution**: Use `Promise.all()` for independent aggregations
- **Projection**: Only fetch needed fields
- **Limit Lookups**: Avoid $lookup unless necessary for item names
- **Caching**: Consider Redis for frequently compared items

### Target Performance

- **API Response**: < 500ms for 2-3 item comparison
- **Chart Render**: < 200ms for overlaid charts
- **UI Interactions**: < 100ms for toggle/filter changes

### Edge Cases

1. **Uneven Data**: Display "Limited data (3 sessions)" warning
2. **No Common Dates**: Show separate trend lines with date gaps
3. **Single Item Selected**: Show "Select 2-3 items" prompt
4. **Different Date Ranges**: Use union of dates, show null for missing
5. **Zero Divisions**: Handle gracefully (e.g., no shots = N/A)

## Insights Generation

Auto-generated insights based on deltas:

```typescript
function generateInsights(deltas, items) {
  const insights = [];
  
  // Winner in key metric
  const bestScore = deltas.find(d => d.metric === 'avgScore' && Math.abs(d.percentChange) > 5);
  if (bestScore) {
    insights.push(`${items[bestScore.winner].name} leads in avg score by ${bestScore.percentChange.toFixed(1)}%`);
  }
  
  // Distance-specific
  if (distanceData) {
    const longRange = analyzeLongRange(distanceData);
    if (longRange.diff > 0.1) {
      insights.push(`${longRange.winner} maintains better accuracy at 50+ yards`);
    }
  }
  
  return insights;
}
```

## Implementation Phases

### Phase 1: Backend API (Days 1-2)
- [ ] Create `/api/analytics/compare` route
- [ ] Implement parallel aggregations for each item type
- [ ] Add delta calculation logic
- [ ] Test with sample data for 2-3 items
- [ ] Add error handling for invalid selections

### Phase 2: Frontend Components (Days 3-5)
- [ ] Build `ComparisonItemSelector` with multi-select
- [ ] Create `SplitViewPanel` layout component
- [ ] Implement `OverlaidChart` with Recharts multi-series
- [ ] Add `DeltaTable` for metric differences
- [ ] Build `ComparisonInsights` text generator

### Phase 3: Integration (Day 6)
- [ ] Add "Compare" buttons to analytics tabs
- [ ] Wire up API calls to components
- [ ] Implement filters (date, distance, session minimum)
- [ ] Add toggle between split/overlaid views
- [ ] Mobile responsive layout

### Phase 4: Polish & Testing (Day 7)
- [ ] Export functionality (PNG/CSV)
- [ ] Loading states and error boundaries
- [ ] Unit tests for delta calculations
- [ ] E2E tests for selection → visualization flow
- [ ] Accessibility audit (screen readers, keyboard nav)

## Testing Strategy

### Unit Tests

```typescript
describe('Delta Calculations', () => {
  it('computes percentage change correctly', () => {
    const delta = calculateDelta(8.0, 7.5, 'avgScore');
    expect(delta.percentChange).toBeCloseTo(6.67, 2);
  });
  
  it('identifies winner correctly', () => {
    const delta = calculateDelta(0.45, 0.38, 'bullRate');
    expect(delta.winner).toBe('item1');
  });
});
```

### E2E Tests

```typescript
test('compare two firearms', async () => {
  await page.goto('/analytics/firearms');
  await page.click('[data-testid="compare-button"]');
  await page.selectOption('[name="item1"]', 'firearm1');
  await page.selectOption('[name="item2"]', 'firearm2');
  await page.click('[data-testid="generate-comparison"]');
  
  await expect(page.locator('[data-testid="delta-table"]')).toBeVisible();
  await expect(page.locator('[data-testid="overlaid-chart"]')).toBeVisible();
});
```

## Future Enhancements

1. **Drill Comparisons**: Compare performance in specific drill types
2. **Shareable Dashboards**: Generate public links with embedded charts
3. **PDF Export**: Full report with insights and recommendations
4. **Anomaly Integration**: Flag significant differences (e.g., "Item A shows fatigue pattern")
5. **Custom Metrics**: User-defined calculations (e.g., "consistency score")
6. **Historical Snapshots**: Save comparison states for later review
7. **Unlimited Items**: Beyond 3 with virtualized scrolling
8. **Weather Integration**: Compare performance by environmental conditions

## API Reference

### GET /api/analytics/compare

**Request**:
```
GET /api/analytics/compare?type=firearm&ids=abc,def&metric=avgScore&groupBy=date&startDate=2026-01-01
```

**Response**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "deltas": [...],
    "insights": [...]
  }
}
```

**Error Codes**:
- `400`: Invalid parameters (e.g., too many IDs)
- `404`: Item not found
- `500`: Aggregation error

## Accessibility

- **Keyboard Navigation**: Tab through selections, Enter to toggle views
- **Screen Readers**: Announce deltas (e.g., "Item A is 6% better")
- **Color Blindness**: Use patterns + colors for differentiation
- **Focus Management**: Trap focus in modals, return on close

## Mobile Considerations

- **Swipe Gestures**: Horizontal swipe between items in split view
- **Collapsible Stats**: Tap to expand detailed metrics
- **Simplified Charts**: Reduce data points for readability
- **Touch Targets**: Minimum 44px for selectors/toggles

## Documentation for Users

Include in-app help:
- **Tooltip on "Compare" button**: "Select 2-3 items to analyze side-by-side"
- **Empty State**: "Choose items from the dropdowns to start comparing"
- **Delta Explanations**: Hover over % to see "Item A averaged 7.8 vs. Item B at 7.3"

## Monitoring & Analytics

Track usage:
- Most compared item types
- Average comparison session length
- Export rates
- Insight interaction (clicks/reads)

This helps prioritize future metric additions and UX improvements.
