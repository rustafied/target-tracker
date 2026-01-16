# Expanded Insights Engine

## Overview
The Expanded Insights Engine provides auto-generated text summaries and actionable observations across all analytics contexts. It transforms raw metrics into personalized advice through rule-based analysis.

## Feature Scope

### In Scope
- 15+ rule-based insight types across three contexts
- Per-session diagnostics and comparisons
- Global overview trends and recommendations
- Multi-item (up to 3) comparison insights
- User-configurable verbosity and thresholds
- Performance optimized (<300ms latency)

### Out of Scope
- AI/ML-driven predictions
- User-custom insight rules
- External data correlations (weather, etc.)

## Insight Types

### Per-Session Insights (5 types)
1. **Vs. Historical Average**: Compare session to personal baselines
2. **Setup Performance Milestone**: Highlight records for firearm/optic/caliber
3. **Distance-Specific Diagnostic**: Performance tied to distance ranges
4. **Efficiency Snapshot**: Score per round rankings
5. **Bias Pattern Recognition**: Cluster detection for alignment issues

### Overview Insights (5 types)
1. **Trend Summary**: Overall progress/regression over time
2. **Top/Bottom Performers**: Item rankings by metrics
3. **Usage Recommendations**: Under/over-utilized items
4. **Inventory-Linked Alerts**: Stock warnings based on usage
5. **Composite Risk/Opportunity**: Multi-metric holistic flags

### Comparison Insights (5 types)
1. **Pairwise Winner Analysis**: Head-to-head metric deltas
2. **Group Ranking**: Overall ranks in multi-item sets
3. **Contextual Differences**: Performance by distance/condition
4. **Crossover Points**: Where one item outperforms another
5. **Composite Recommendation**: Use-case based suggestions

## Architecture

### Core Components
- `lib/insights-engine.ts` - Core rule logic and generators
- `lib/insights-rules.ts` - Individual insight rule definitions
- `components/InsightsPanel.tsx` - Display component
- `app/api/insights/*` - API endpoints

### Data Flow
```
Request → API Endpoint → Insights Engine → Rule Evaluators → Confidence Filter → UI Panel
```

## Implementation Status

- [x] Documentation created
- [ ] Core engine library
- [ ] Per-session generators
- [ ] Overview generators
- [ ] Comparison generators
- [ ] UI components
- [ ] API endpoints
- [ ] Integration complete
- [ ] User settings
- [ ] Testing complete

## Usage Examples

### Per-Session
```typescript
const insights = await generateSessionInsights(sessionId);
// Returns: [
//   { type: 'vs-average', text: 'Avg score 3.8—12% below...', confidence: 0.85 },
//   { type: 'bias-pattern', text: 'Shots clustered low-left...', confidence: 0.92 }
// ]
```

### Overview
```typescript
const insights = await generateOverviewInsights(userId);
// Returns top global trends and recommendations
```

### Comparison
```typescript
const insights = await generateComparisonInsights([id1, id2, id3], 'firearms');
// Returns pairwise and group insights
```

## Configuration

Users can configure:
- Insight types enabled/disabled
- Confidence threshold (default: 70%)
- Verbosity (short/long)
- Max insights shown per context (default: 5)

## Performance Targets

- Generation: <300ms
- Use cached aggregates where possible
- Lazy load in UI
- Batch processing for overview insights

## Testing Strategy

- Unit tests for each rule
- Integration tests for API endpoints
- E2E tests for UI display
- Performance benchmarks
