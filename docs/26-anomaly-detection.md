# Session Anomaly Detection

## Overview

The Session Anomaly Detection feature automatically identifies outlier sessions where key performance metrics deviate significantly from your historical averages. This helps you quickly spot exceptional or problematic performances and understand what caused them.

## Features

### 1. Automated Anomaly Detection
- **Deviation Analysis**: Compares each session's metrics against historical averages
- **Configurable Thresholds**: Default 20% deviation, adjustable from 10-50%
- **Multiple Metrics**: Tracks avg score, miss rate, bull rate, and distance
- **Severity Levels**: High (>50%), Medium (30-50%), Low (<30%)

### 2. Root Cause Attribution
The system uses rule-based logic to suggest likely causes:

- **Distance Variations**: Extended or shortened range vs. typical
- **New Equipment**: First use of a firearm or optic
- **Fatigue**: High shot volume correlated with performance drop
- **Equipment Changes**: Multiple firearms/optics in one session
- **Sample Size**: Limited data warnings
- **Accuracy Issues**: High miss rate correlations

### 3. Visual Indicators
- **Anomaly Flags**: Color-coded badges on session cards
  - Red: High severity
  - Yellow: Medium severity
  - Blue: Low severity
- **Tooltips**: Quick preview of deviation count
- **Click-through**: Opens detailed insights panel

### 4. Insights Panel
Detailed drill-down for each anomaly:
- **Deviations Tab**: Shows all metrics with % deviation
- **Causes Tab**: Lists likely causes with confidence levels
- **Comparison Chart**: Visual comparison of session vs. averages

## Usage

### Viewing Anomalies in Sessions List

1. Navigate to **Sessions** page
2. Look for colored anomaly flags next to session dates
3. Click any flag to view detailed insights
4. Click session card to view full session details

### Analytics Dashboard Widget

The analytics page includes an **Anomaly Summary Widget**:
- Shows count of anomalies by severity
- Displays top insights
- Lists recent anomalies with quick links
- Updates automatically based on your data

### Dedicated Anomalies Page

Visit `/analytics/anomalies` for full control:

#### Detection Settings
- **Deviation Threshold**: Adjust sensitivity (10-50%)
- **Minimum Sessions**: Set baseline requirement (default 5)
- **Severity Filter**: View all, high, medium, or low only

#### Historical Baselines
View your global averages:
- Average score per shot
- Bull rate and miss rate
- Average distance
- Based on all qualifying sessions

#### Anomaly List
- Sortable list of all detected anomalies
- Shows top deviations and causes inline
- Click "View Details" for full insights panel
- Direct links to session pages

## Technical Details

### API Endpoint
```
GET /api/analytics/anomalies
```

**Query Parameters:**
- `threshold` (number): Deviation % threshold (default: 20)
- `minSessions` (number): Minimum sessions required (default: 5)
- `statistical` (boolean): Use z-scores instead of % (default: false)
- `startDate` (string): Filter by date range
- `endDate` (string): Filter by date range

**Response:**
```json
{
  "anomalies": [
    {
      "sessionId": "...",
      "slug": "...",
      "date": "2024-01-15",
      "location": "Range Name",
      "severity": "high",
      "deviations": [
        {
          "metric": "Average Score",
          "value": 3.2,
          "average": 4.5,
          "percentDeviation": -28.9,
          "isAnomaly": true
        }
      ],
      "causes": [
        {
          "type": "distance",
          "description": "Extended range: 50yd vs. typical 25yd",
          "confidence": "high"
        }
      ]
    }
  ],
  "globalAverages": {
    "avgScore": 4.5,
    "missRate": 0.08,
    "bullRate": 0.35,
    "avgDistance": 25,
    "totalShots": 60,
    "sessionCount": 15
  },
  "insights": [
    "Detected 3 anomalies out of 15 sessions (20%)",
    "Most common anomaly cause: distance variations (2 sessions)"
  ],
  "sessionCount": 15,
  "threshold": 20
}
```

### Performance Optimization

**Database Indexes:**
Run the index creation script for optimal performance:
```bash
node scripts/create-anomaly-indexes.mjs
```

Creates indexes on:
- `rangesessions.date` (descending)
- `rangesessions.userId + date` (compound)
- `targetsheets.rangeSessionId + distanceYards`
- `targetsheets.firearmId + opticId + caliberId`
- `bullrecords.targetSheetId`

**Expected Performance:**
- <500ms for 100+ sessions
- <1s for 500+ sessions
- Scales linearly with session count

### Components

**Frontend Components:**
- `AnomalyFlag.tsx`: Badge with tooltip
- `AnomalyBadge.tsx`: Simple badge (mobile)
- `InsightsPanel.tsx`: Modal with tabs and charts
- `AnomalySummaryWidget.tsx`: Dashboard widget

**Pages:**
- `/sessions`: Integrated flags
- `/analytics`: Summary widget
- `/analytics/anomalies`: Full anomaly management

## Examples

### Example 1: Extended Distance Anomaly
**Session:** Jan 15, 2024
**Severity:** High
**Deviations:**
- Avg Score: 3.2 vs 4.5 (-28.9%)
- Miss Rate: 18% vs 8% (+125%)

**Causes:**
- Extended range: 50yd vs. typical 25yd (high confidence)
- High miss rate: 18% vs. typical 8% (high confidence)

**Insight:** Performance drop expected at longer distances. Consider more practice at 50yd or adjust zero.

### Example 2: New Equipment Anomaly
**Session:** Jan 10, 2024
**Severity:** Medium
**Deviations:**
- Bull Rate: 15% vs 35% (-57%)

**Causes:**
- First use of new optic (high confidence)
- New firearm in dataset (high confidence)

**Insight:** Initial learning curve with new equipment. Track next few sessions to see improvement.

### Example 3: Fatigue Anomaly
**Session:** Jan 5, 2024
**Severity:** Medium
**Deviations:**
- Avg Score: 3.8 vs 4.5 (-15.6%)

**Causes:**
- High shot volume: 120 shots vs. typical 60 (medium confidence)

**Insight:** Performance degraded in high-volume session. Consider breaks or shorter sessions.

## Best Practices

1. **Minimum Data**: Wait for 5+ sessions before relying on anomaly detection
2. **Threshold Tuning**: Start at 20%, adjust based on your consistency
3. **Review Regularly**: Check anomalies weekly to spot patterns
4. **Track Improvements**: Use anomalies to validate training adjustments
5. **Context Matters**: Always review causes—not all anomalies are problems
6. **Positive Anomalies**: High scores can also be anomalies—celebrate them!

## Future Enhancements

Potential additions (not yet implemented):
- Machine learning clustering for pattern detection
- Real-time alerts during session logging
- User-defined anomaly rules
- Anomaly trends over time
- Integration with training goals
- Weather/environmental factors (via API)
- Comparison with peer benchmarks

## Troubleshooting

**"Need at least 5 sessions"**
- Record more sessions to build baseline
- Lower `minSessions` in settings (not recommended)

**"No anomalies detected"**
- Your performance is very consistent (good!)
- Try lowering threshold if you want more sensitivity
- Check that sessions have varied conditions

**Anomalies seem wrong**
- Verify session data is accurate
- Check if global averages make sense
- Adjust threshold or use statistical mode
- Report issues with specific session IDs

**Slow performance**
- Run index creation script
- Check MongoDB Atlas performance advisor
- Consider caching for very large datasets (500+ sessions)

## Testing

**Unit Tests:**
```bash
npm test lib/__tests__/anomaly-detection.test.ts
```

Tests cover:
- Deviation calculations
- Cause attribution logic
- Insight generation
- Edge cases (zero averages, etc.)

**Manual Testing:**
1. Create sessions with varied performance
2. Check flags appear on sessions list
3. Click flags to open insights panel
4. Verify deviations and causes are accurate
5. Test settings adjustments
6. Verify mobile responsiveness

## Related Documentation

- [Analytics Overview](./11-analytics-upgrade-spec.md)
- [Distance Impact Analysis](./21-distance-impact-analysis.md)
- [Fatigue/Sequence Analysis](./22-fatigue-sequence-analysis.md)
- [Ammo Efficiency Metrics](./24-ammo-efficiency-metrics.md)
