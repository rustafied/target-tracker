# Quick Start Guide - Analytics Testing

## Start the App

```bash
cd /Users/aaron/Documents/dev/target-tracker
npm run dev
```

Visit: http://localhost:3000/analytics

---

## What to Test

### 1. Overview Dashboard (`/analytics`)
- KPI cards showing score metrics
- If you have shot position data: meanRadius, centroidDistance, tightnessScore cards
- Score trend line chart
- Bull rate & miss rate chart
- Ring distribution stacked chart
- Insights panel with improvement detection

### 2. Shot Visualizations (`/analytics/targets`)
- Heatmap of shot density
- Shot plot with ring overlays
- Group metrics (mean radius, extreme spread)
- Bias compass showing directional tendencies
- Bull-by-bull fatigue analysis

### 3. Firearm Analytics (`/analytics/firearms`)
- Leaderboard ranked by performance
- Click any firearm to see detailed trends
- Distance performance curves

### 4. Caliber Analytics (`/analytics/calibers`)
- Same as firearms, grouped by caliber

### 5. Optic Analytics (`/analytics/optics`)
- Same as firearms, grouped by optic

---

## Test Filters

Open the filter panel and try:
- Select specific firearms/calibers/optics
- Set distance range (e.g., 25-100 yards)
- Adjust minimum shots threshold
- Toggle "Position data only" mode
- Toggle "Allow synthetic shots" for visualization

**Filters persist in URL** - you can bookmark filtered views.

---

## Mobile Testing

Resize browser to 375px width and verify:
- KPI cards stack 2-up on mobile
- Charts remain touch-friendly
- Filter panel collapses
- Navigation menu works

---

## What You'll See

### If You Have Shot Position Data
- Full suite of precision metrics
- Heatmaps and shot plots
- Bias detection
- Group size analysis

### If You Only Have Count Data
- Score-based metrics (bull rate, miss rate, avg score)
- Ring distribution charts
- Session trends
- Enable "Allow synthetic" to see estimated visualizations (labeled)

---

## Expected Behavior

✅ **Fast loading** - pages should load in < 2 seconds
✅ **Smooth charts** - ECharts animations
✅ **Empty states** - guidance when no data matches filters
✅ **Delta indicators** - green/red arrows showing improvement
✅ **Responsive layout** - works on mobile and desktop
✅ **Dark theme** - consistent styling throughout

---

## Common Scenarios

### "I don't see position metrics"
- You need sessions with `shotPositions` data
- Click on targets during data entry to record x/y coordinates
- Or enable "Allow synthetic" filter for estimated visualizations

### "Heatmap is empty"
- Apply fewer filters (reset button)
- Check if you have enough sessions
- Enable "Allow synthetic" mode

### "Leaderboard shows nothing"
- Increase firearm/caliber/optic usage
- Lower minimum shots threshold
- Remove distance filters

---

## Browser Console

If anything seems wrong, open browser console (F12) and check for:
- Network errors (failed API calls)
- JavaScript errors
- Slow API responses

---

## Next Steps After Testing

1. Record more sessions with shot positions
2. Test all filter combinations
3. Try on mobile device
4. Check performance with larger datasets
5. Report any issues or desired improvements

---

## Quick Navigation

From any analytics page:
- Sidebar: Analytics > Overview/Targets/Firearms/Calibers/Optics
- Mobile: Menu icon (top left) > Analytics submenu

---

Enjoy exploring your shooting performance data! 🎯

