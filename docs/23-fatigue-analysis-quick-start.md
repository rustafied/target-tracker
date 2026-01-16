# Fatigue and Sequence Analysis - Quick Start Guide

## What Is It?

The Fatigue and Sequence Analysis feature helps you understand how your shooting performance changes as you progress through a session. It answers questions like:

- Do my shots get worse after the first 30 rounds?
- Am I warming up or wearing out?
- Does my aim drift in a particular direction as I get tired?
- Which firearm/caliber combo holds up best for long sessions?

## Where to Find It

### Analytics Overview (`/analytics`)
The main analytics dashboard includes a "Fatigue & Sequence Analysis" card showing aggregate patterns across all your sessions.

### Per-Session View (`/sessions/[id]`)
Individual session pages show "Shot-by-Shot Performance (This Session)" for sessions with 20+ shots, letting you analyze fatigue within that specific session.

### Equipment Analytics
- **Firearms** (`/analytics/firearms`): Compare fatigue patterns across different firearms
- **Calibers** (`/analytics/calibers`): See which calibers maintain consistency longest
- **Optics** (`/analytics/optics`): Analyze if certain optics help maintain performance

## How to Use It

### Basic Usage

1. **Select a Metric**: Choose what to analyze
   - **Average Score**: Overall accuracy per bucket
   - **Bull Rate**: Percentage of bullseyes (score 5)
   - **Miss Rate**: Percentage of misses (score 0)
   - **Mean Radius**: Shot dispersion (requires position data)
   - **Bias**: Horizontal/vertical drift (requires position data)

2. **Choose Bucket Type**:
   - **Fixed Size**: Analyze by shot count (e.g., shots 1-10, 11-20, 21-30)
   - **By Thirds**: Normalize sessions of different lengths (early/middle/late)

3. **Adjust Bucket Size** (for fixed buckets):
   - Smaller buckets (5-10 shots): More granular, may be noisy
   - Larger buckets (20-30 shots): Smoother trends, less detail

### Reading the Chart

- **Line Trend**: Shows performance across shot buckets
- **Dashed Line**: Trend line showing overall direction
- **Color Coding**:
  - Green (🔺 improving): Performance gets better
  - Red (🔻 declining): Performance degrades
  - Gray (➖ stable): Consistent throughout

### Understanding Insights

The insights panel auto-generates observations like:

- **"Average score declines from 3.2 to 2.8 (12.5% drop)"**  
  → Your accuracy fades—consider stamina training

- **"Miss rate increases in later shots"**  
  → You're losing consistency—check form/fatigue

- **"Performance remains consistent across all shot buckets—excellent stamina"**  
  → Great endurance!

- **"Horizontal bias shifts right by 4.2 units"**  
  → Your aim drifts—check grip, stance, or muscle fatigue

## Common Use Cases

### 1. Diagnosing Fatigue Issues

**Problem**: Your overall scores are good, but sessions feel inconsistent.

**Solution**:
1. Go to **Analytics Overview**
2. Set metric to **Average Score**
3. Use **Fixed Size** with **10 shots** per bucket
4. Look for declining trend—if score drops >10% in later buckets, fatigue is likely

### 2. Comparing Firearms for Endurance

**Problem**: Deciding which firearm to use for long-range competitions.

**Solution**:
1. Go to **Analytics → Firearms**
2. Scroll to "Fatigue Analysis by Firearm"
3. Use **By Thirds** to normalize across sessions
4. Compare trend lines—the firearm with the flattest line has best endurance

### 3. Analyzing a Specific Session

**Problem**: You had a bad session and want to know why.

**Solution**:
1. Open the session detail page (`/sessions/[id]`)
2. Scroll to "Shot-by-Shot Performance (This Session)"
3. Check if miss rate spiked in middle/late shots
4. If bias shifted, review form consistency for that session

### 4. Testing Ammo/Caliber Consistency

**Problem**: New ammo—does it hold up over long strings?

**Solution**:
1. Go to **Analytics → Calibers**
2. Filter to the specific caliber
3. Set metric to **Mean Radius** (if you have position data)
4. Look for increasing radius in later buckets—sign of inconsistent ammo or recoil fatigue

## Tips for Better Analysis

### Data Quality
- **Position Data**: For Mean Radius and Bias metrics, use the interactive target input or photo recognition to capture shot positions
- **Session Length**: Analysis requires 20+ shots per session; longer sessions (50-100+ shots) provide better fatigue insights
- **Consistency**: Shoot similar session lengths for "By Thirds" to be most meaningful

### Filtering
- Use **Distance filters** to isolate fatigue at specific ranges (e.g., 25yd vs 100yd)
- Apply **Firearm/Caliber/Optic** filters to reduce variables
- Set **Min Shots** higher (30-50) for cleaner trends with less noise

### Interpretation
- Small variations (<5%) in early buckets are normal warm-up
- Focus on mid-to-late bucket trends for true fatigue
- Compare **Bull Rate** and **Miss Rate** together—if bulls stay flat but misses rise, you're staying on target but losing precision
- Bias shifts >5 units indicate form breakdown

## Limitations

1. **No Position Data**: If you only track scores (not shot positions), Mean Radius and Bias metrics won't be available. Use Average Score, Bull Rate, and Miss Rate instead.

2. **Short Sessions**: Sessions under 20 shots are excluded to ensure statistical validity.

3. **Sequence Assumptions**: The system assumes shots are logged in order. If you enter bulls out of sequence, analysis may be inaccurate.

4. **Aggregate vs Individual**: The overview page aggregates across all sessions—individual session variability (weather, time of day) isn't isolated.

## Advanced Features

### Trend Confidence
- Displayed in insights (e.g., "confidence: 85%")
- Based on R² value—higher confidence means stronger trend
- <50% confidence = trend is weak, may be noise

### Multi-Metric Analysis
- Compare metrics side-by-side by toggling between them
- If Miss Rate rises but Bull Rate stays flat, you're getting less misses but not more bulls → consistency issue
- If Mean Radius grows but Avg Score stable → tighter groups needed, but still on target

## Future Enhancements

Planned features:
- **Time-Based Analysis**: Fatigue over session duration (minutes) instead of just shot count
- **Break Detection**: Identify pauses and analyze pre/post-break performance
- **Goal Tracking**: Set targets like "Maintain >3.0 avg in final third"
- **ML Predictions**: Predict likely late-session performance from early shots

## Troubleshooting

### "No sequence data available"
- You need sessions with 20+ shots
- Check that you've recorded shooting sessions with individual bulls/shots

### "Not enough shots for analysis"
- Lower the **Min Shots** filter from default 20 to 10
- Record longer sessions (50+ shots recommended)

### Metrics show "null" or no data
- **Mean Radius/Bias**: Require position data—use interactive target input or photo recognition
- **Old sessions**: If migrated from legacy system, shot positions may not exist

### Chart looks noisy
- Increase bucket size (20-30 shots)
- Use **By Thirds** instead of Fixed Size
- Raise **Min Shots** filter to 30-50 for cleaner sessions

## Related Documentation

- [Analytics Overview](./00-overview.md) - Main feature overview
- [Shot Visualization](./03-ui-design.md) - Using interactive targets for position data
- [Target Recognition](./16-recognition-user-guide.md) - Auto-capture shot positions from photos
- [Analytics Upgrade Spec](./11-analytics-upgrade-spec.md) - Technical details

---

**Need Help?** The insights panel provides context-specific guidance. If you see unexpected patterns, check your shooting logs for notes on conditions (wind, fatigue, breaks) that might explain variance.
