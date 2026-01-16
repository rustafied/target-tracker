# Comparative Dashboards - Quick Start Guide

## Overview

The Comparative Dashboards feature allows you to compare 2-3 items (firearms, optics, calibers, or sessions) side-by-side to make data-driven decisions about your equipment and performance.

## Accessing Comparisons

### From Analytics Overview
1. Navigate to `/analytics`
2. Click the **"Compare Items"** button in the top-right
3. Select the type of comparison from the URL or dropdown

### From Specific Analytics Pages
- **Firearms**: `/analytics/firearms` → Click **"Compare Firearms"**
- **Optics**: `/analytics/optics` → Click **"Compare Optics"**
- **Calibers**: `/analytics/calibers` → Click **"Compare Calibers"**

### Direct URL Access
Navigate directly to:
- `/analytics/compare?type=firearm`
- `/analytics/compare?type=optic`
- `/analytics/compare?type=caliber`
- `/analytics/compare?type=session`

## Using the Comparison Dashboard

### Step 1: Select Items
1. Open the dropdown selector at the top
2. Choose 2-3 items to compare (minimum 2, maximum 3)
3. Selected items appear as badges below the dropdown
4. Click the X on any badge to remove an item

### Step 2: Apply Filters (Optional)
Configure filters to refine your comparison:
- **Date Range**: Start and end dates
- **Distance Range**: Min/max yards
- **Minimum Shots**: Filter out low-data items
- **Group By**: 
  - `date` - Compare performance over time
  - `distance` - Compare performance at different ranges
  - `sequence` - Compare fatigue patterns
  - `none` - Overall metrics only

### Step 3: Generate Comparison
Click **"Generate Comparison"** to fetch and visualize the data.

## Understanding the Results

### View Modes

**Split View** (Default)
- Side-by-side panels for each item
- Individual stat cards with key metrics
- Mini trend charts for each item
- Best for detailed item-by-item analysis

**Overlaid View**
- Multiple charts with overlaid data series
- Direct visual comparison on same axes
- Color-coded lines/bars for each item
- Best for spotting trends and patterns

Toggle between views using the buttons at the top of the results.

### Metrics Displayed

| Metric | Description | Higher is Better? |
|--------|-------------|-------------------|
| **Avg Score** | Average score per shot (0-5) | ✅ Yes |
| **Bull Rate** | % of shots hitting bullseye | ✅ Yes |
| **Miss Rate** | % of shots off-target | ❌ No |
| **Good Hits** | % of 4s and 5s | ✅ Yes |
| **Mean Radius** | Average distance from center | ❌ No |
| **Total Shots** | Number of shots recorded | - |
| **Sessions** | Number of sessions included | - |

### Delta Table

The performance comparison table shows:
- **Trophy Icon** (🏆): Best performer for each metric
- **Winner Column**: Name of the best item
- **Δ Column**: Percentage difference between best and worst
- **Color Coding**:
  - Green: Best performer
  - Red: Worst performer (when 3+ items)

### Insights Panel

Auto-generated insights highlight:
- **Performance Leaders**: Which item performs best overall
- **Specific Strengths**: Areas where each item excels
- **Data Quality Notes**: Warnings about limited data
- **Trends**: Improving or declining patterns

## Export Options

### Export CSV
- Downloads a spreadsheet with all metrics
- Includes all selected items and their values
- Filename: `comparison-{type}-{timestamp}.csv`

### Export PNG
- Captures the entire comparison view as an image
- Includes charts, tables, and insights
- Filename: `comparison-{type}-{timestamp}.png`
- Uses dark theme background

## Example Use Cases

### 1. Equipment Testing
**Scenario**: You want to know which optic improves your accuracy most.

**Steps**:
1. Go to `/analytics/compare?type=optic`
2. Select your Vortex AMG and Trijicon RMR
3. Set distance range to 7-25 yards (defensive range)
4. Click "Generate Comparison"

**Look For**:
- Bull rate difference
- Mean radius (tighter grouping)
- Consistency across sessions

### 2. Ammunition Selection
**Scenario**: Comparing 9mm vs .38 Special efficiency.

**Steps**:
1. Go to `/analytics/compare?type=caliber`
2. Select 9mm and .38 Special
3. Group by "distance" to see performance curves
4. Check insights for cost-per-bull data

**Look For**:
- Bull rate at different distances
- Miss rate (reliability)
- Efficiency metrics (if ammo tracking enabled)

### 3. Session Analysis
**Scenario**: Morning vs evening performance.

**Steps**:
1. Go to `/analytics/compare?type=session`
2. Select 2-3 sessions from different times of day
3. Group by "sequence" to see fatigue patterns
4. Compare avg score trends

**Look For**:
- Fatigue patterns (declining sequence performance)
- Overall consistency
- Time-of-day impact

### 4. Distance Performance
**Scenario**: Which firearm maintains accuracy at long range?

**Steps**:
1. Go to `/analytics/compare?type=firearm`
2. Select your DDM4 PDW and Henry X
3. Set distance minimum to 50 yards
4. Group by "distance"

**Look For**:
- Distance curve (how performance degrades)
- Mean radius at long range
- Good hit rate consistency

## Tips for Better Comparisons

### Data Quality
- **Minimum Shots**: Set to at least 20-30 for reliable comparisons
- **Session Count**: More sessions = more reliable trends
- **Date Range**: Use similar time periods for fair comparison

### Interpretation
- **Small Differences** (<5%): May be within normal variation
- **Large Differences** (>15%): Likely significant performance gap
- **Limited Data Warning**: Take results with caution

### Mobile Usage
- Tables scroll horizontally on small screens
- Split view stacks vertically on mobile
- Export buttons show abbreviated labels
- Swipe to navigate between items

## API Reference

For developers integrating with the comparison API:

```typescript
GET /api/analytics/compare

Query Parameters:
- type: "firearm" | "optic" | "caliber" | "session" (required)
- ids: comma-separated IDs (required, 2-3 items)
- groupBy: "date" | "distance" | "sequence" | "none" (optional)
- startDate: ISO date string (optional)
- endDate: ISO date string (optional)
- distanceMin: number (optional)
- distanceMax: number (optional)
- minShots: number (default: 10)
- positionOnly: boolean (default: false)

Response:
{
  items: ComparisonItem[],
  deltas: Delta[],
  insights: string[],
  meta: { type, groupBy, filters }
}
```

## Troubleshooting

### "Not enough data for selected items"
- Ensure each item has at least the minimum shots configured
- Check that items have been used in sessions
- Adjust date range filters if too restrictive

### "Please select at least 2 items to compare"
- Select 2-3 items from the dropdown
- Verify items are properly selected (badges should appear)

### Charts not displaying
- Check browser console for errors
- Ensure JavaScript is enabled
- Try refreshing the page

### Export not working
- Check browser permissions for downloads
- Ensure popup blocker isn't interfering
- Try a different browser if issues persist

## Next Steps

After comparing items, you might want to:
1. **Drill Down**: Click through to individual item analytics pages
2. **Adjust Filters**: Try different date ranges or distances
3. **Track Changes**: Compare again after more sessions
4. **Share Results**: Export PNG to share with training partners

## Related Features

- **[Analytics Overview](./00-overview.md)**: Main analytics documentation
- **[Distance Analysis](./21-distance-impact-analysis.md)**: MOA and distance curves
- **[Sequence Analysis](./22-fatigue-sequence-analysis.md)**: Fatigue patterns
- **[Anomaly Detection](./26-anomaly-detection.md)**: Unusual performance detection

## Feedback

Found an issue or have a suggestion? The comparison feature is designed to be extensible. Future enhancements may include:
- Comparing more than 3 items
- Custom metric creation
- Shareable comparison links
- PDF report generation
- Historical comparison snapshots
