# Ammo Efficiency Metrics

## Overview
The Ammo Efficiency Metrics feature enhances the Target Tracker app by introducing "performance per round" analytics that normalize shooting metrics by ammo usage and costs. This helps users make data-driven decisions on ammo purchases and usage, identifying cost-effective calibers for training vs. competition.

## Key Features
- **Performance Normalization**: Analyze metrics like avg score per shot, bull rate per 100 rounds, cost per point scored
- **Value Rankings**: Composite "value score" that factors in performance, usage, and cost
- **Cost Tracking**: Optional per-round or bulk cost entry for each caliber
- **Visualizations**: Bar charts for efficiency comparisons, pie charts for value distribution, scatter plots for performance vs. cost
- **Insights**: Auto-generated recommendations like "Switch to .22 LR for practice—3x more efficient than 5.56 NATO"
- **Filters**: By caliber, date range, firearm/optic setups, minimum shots threshold

## User Value
- **Optimize Spending**: Identify which calibers give the best bang for buck
- **Training Decisions**: Find most efficient calibers for practice vs. competition
- **Inventory Planning**: Make informed decisions on what to stock up on
- **Performance Context**: Understand efficiency beyond raw scores

## Core Metrics

### 1. Performance per Round
- **Formula**: `avgScore / totalShots`
- **Meaning**: Average score achieved per shot fired
- **Use Case**: Identify calibers where you shoot most accurately

### 2. Bulls per 100 Rounds
- **Formula**: `(bullCount / totalShots) * 100`
- **Meaning**: How many bullseyes you get per 100 rounds
- **Use Case**: Measure consistency and precision

### 3. Cost per Point (if costs provided)
- **Formula**: `totalCost / totalScore`
- **Meaning**: How much money spent per point scored
- **Use Case**: Financial efficiency of each caliber

### 4. Cost per Bull (if costs provided)
- **Formula**: `totalCost / bullCount`
- **Meaning**: Cost to achieve each bullseye
- **Use Case**: Optimize for maximum performance

### 5. Value Score (Composite)
- **Formula**: `(avgScore * bullRate) / (1 + costFactor)`
- **Meaning**: Weighted score combining performance and cost
- **Use Case**: Overall ranking of "best value" calibers

## Data Model Changes

### Caliber Schema Updates
Added optional cost tracking fields:

```typescript
interface ICaliber {
  // ... existing fields
  costPerRound?: number;      // Direct cost per round
  bulkCost?: number;          // Cost of bulk purchase
  bulkQuantity?: number;      // Quantity in bulk purchase
  // Effective cost computed as: bulkCost / bulkQuantity
}
```

## API Endpoints

### GET `/api/analytics/ammo-efficiency`

Query parameters:
- `caliberIds` (optional): Comma-separated caliber IDs to analyze
- `startDate` (optional): ISO date string for filtering
- `endDate` (optional): ISO date string for filtering
- `firearmIds` (optional): Filter by specific firearms
- `opticIds` (optional): Filter by specific optics
- `minShots` (default: 50): Minimum shots to include caliber in analysis
- `includeCosts` (default: true): Whether to compute cost metrics

Response:
```typescript
{
  calibers: Array<{
    caliberId: string;
    caliberName: string;
    totalShots: number;
    totalScore: number;
    bullCount: number;
    avgScore: number;
    bullRate: number;
    
    // Efficiency metrics
    scorePerRound: number;
    bullsPer100: number;
    
    // Cost metrics (if available)
    costPerRound?: number;
    totalCost?: number;
    costPerPoint?: number;
    costPerBull?: number;
    
    // Composite
    valueScore: number;
  }>;
  insights: string[];  // Auto-generated recommendations
}
```

### POST `/api/calibers/:id/cost`

Update cost information for a caliber.

Body:
```typescript
{
  costPerRound?: number;
  bulkCost?: number;
  bulkQuantity?: number;
}
```

## UI Components

### AmmoEfficiency Component
Located at `/components/analytics/AmmoEfficiency.tsx`

Features:
- **Cost Entry Form**: Update per-round or bulk costs for each caliber
- **Efficiency Bar Chart**: Compare metrics across calibers
- **Value Pie Chart**: Distribution of value scores
- **Performance vs. Cost Scatter**: Bubble chart showing relationships
- **Insights Panel**: Auto-generated recommendations
- **Export**: CSV download of all metrics

### Integration Points
1. **Ammo Page** (`/app/ammo/page.tsx`): New "Efficiency Metrics" section
2. **Analytics Overview** (`/app/analytics/page.tsx`): Summary widget showing top efficient caliber
3. **Caliber Detail** (`/app/ammo/[id]/page.tsx`): Individual efficiency stats

## Calculations & Aggregation

The backend aggregation pipeline:

1. **Unwind sheets** from sessions
2. **Group by caliber** to sum shots, scores, bulls
3. **Lookup caliber** details including cost data
4. **Project efficiency metrics**:
   - `scorePerRound = avgScore / totalShots`
   - `bullsPer100 = (bullCount / totalShots) * 100`
   - `costPerPoint = (costPerRound * totalShots) / totalScore`
   - `costPerBull = (costPerRound * totalShots) / bullCount`
   - `valueScore = (avgScore * bullRate) / (1 + costPerRound)`
5. **Sort by valueScore** descending

## Edge Cases & Handling

1. **No Cost Data**: Fall back to usage-only metrics, prompt user to add costs
2. **Low Shot Count**: Filter out calibers with < minShots threshold
3. **Division by Zero**: Handle cases where bullCount or totalScore is 0
4. **Missing Sessions**: Show empty state with guidance
5. **Multiple Cost Updates**: Use most recent cost data
6. **Negative Values**: Validate inputs to prevent negative costs

## Usage Examples

### Example Insight Output
```
📊 Efficiency Insights:
• 9mm is your most efficient caliber - 4.2 score/round at $0.18/round
• .22 LR delivers 3x more bulls per dollar than 5.56 NATO
• Consider switching to .308 for precision - highest bulls per 100 rounds (42)
• 5.56 NATO has high cost ($0.50/round) for 3.4 avg score - consider alternatives for practice
```

### Example Use Case
**Scenario**: User shoots multiple calibers and wants to optimize practice ammo spending.

1. User enters costs for each caliber (e.g., 9mm @ $0.18/rd, .22 LR @ $0.08/rd, 5.56 @ $0.50/rd)
2. System aggregates all shooting data across sessions
3. Efficiency metrics reveal:
   - .22 LR: 3.8 score/round, $0.02/point, value score: 47.5
   - 9mm: 4.2 score/round, $0.04/point, value score: 23.3
   - 5.56: 3.4 score/round, $0.15/point, value score: 6.8
4. Insight: "Use .22 LR for practice - 7x more cost-efficient than 5.56"
5. User adjusts training to use .22 LR more, saves money while maintaining skills

## Testing Strategy

### Unit Tests
- Efficiency calculation functions
- Cost normalization logic
- Value score computations
- Edge case handling (zero divisions, missing data)

### Integration Tests
- API route responses with various filters
- Cost update persistence
- Data aggregation accuracy

### E2E Tests
- Cost form entry and save
- Chart rendering with live data
- Filter interactions
- Export functionality

## Performance Considerations

- **Indexing**: Ensure caliberId indexed in sessions/sheets
- **Aggregation**: Server-side only, avoid client-side aggregations
- **Caching**: Consider caching efficiency calculations (5min TTL)
- **Query Optimization**: Use projection to limit field loading
- **Target**: < 500ms for 10k+ shots with 10+ calibers

## Future Enhancements

Potential additions beyond initial scope:
- **Historical Cost Tracking**: Track price changes over time
- **Budget Goals**: Set spending limits per caliber/month
- **Reorder Alerts**: Notify when stock low on efficient calibers
- **External Price API**: Auto-fetch current ammo prices
- **Comparative Analysis**: "Your 9mm efficiency vs. community average"
- **Currency Support**: Multi-currency for international users
- **Inflation Adjustment**: Track real vs. nominal costs

## Implementation Checklist

- [x] Create feature documentation
- [ ] Update Caliber model with cost fields
- [ ] Create efficiency API route with aggregation pipeline
- [ ] Build AmmoEfficiency component
- [ ] Add cost entry form to caliber setup
- [ ] Integrate into ammo page
- [ ] Add overview widget to analytics
- [ ] Write unit tests for calculations
- [ ] Add E2E tests for user flows
- [ ] Performance test with large datasets
- [ ] Update user documentation

## Success Metrics

- Feature completeness: All 5 core metrics implemented
- Performance: Aggregation queries < 500ms
- User adoption: Cost data entered for >50% of calibers
- Insights quality: Generate 3-5 actionable insights per view
- Export usage: CSV download functionality working

## References

- Main spec document: Feature Scope in user query
- Related docs: 
  - `19-ammo-tracking.md` - Base ammo feature
  - `20-ammo-quick-start.md` - User guide
  - `11-analytics-upgrade-spec.md` - Analytics framework
