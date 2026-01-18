# Distance Multiplier Feature

## Overview
The distance multiplier feature rewards shooting accuracy at longer distances by applying a **bonus-only** multiplier to scores based on how far you're shooting compared to **your own baseline** with that firearm.

## How It Works

### Per-Firearm Baseline
- Each firearm has its own average distance calculated from all your sessions with it
- **Example**: If you typically shoot your Glock at 15 yards and your AR at 50 yards, those are their respective baselines

### Bonus-Only System
- **Shooting at or below your baseline** → No penalty, raw score is used
- **Shooting farther than your baseline** → Bonus applied to reward the increased difficulty
- This means the distance-adjusted score can **only go UP**, never down

### Calculation
- **Multiplier Formula**: Uses a logarithmic scale for realistic difficulty scaling
  - Shooting at 2x baseline distance → ~15% score bonus (1.15x multiplier)
  - Shooting at 3x baseline distance → ~32% score bonus (1.32x multiplier)
  - The multiplier is capped to keep scores within the 0-5 range

### Why Logarithmic?
A logarithmic multiplier ensures that:
- Distance difficulty scales realistically (doubling distance is hard but doesn't double the difficulty)
- The bonus is meaningful but not overpowering
- Accuracy remains the primary factor in scoring

## Example Scenarios

### Scenario 1: Pushing Your Limits
You normally shoot your pistol at 15 yards (baseline). Today you shoot at 25 yards:
- **Distance ratio**: 25/15 = 1.67x
- **Multiplier**: ~1.11x (11% bonus)
- **Raw score**: 3.5
- **Adjusted score**: 3.89
- **Result**: You get credit for maintaining accuracy at increased distance

### Scenario 2: Shooting Closer
You normally shoot your rifle at 100 yards. Today you shoot at 50 yards:
- **Distance ratio**: 50/100 = 0.5x (closer)
- **Multiplier**: 1.0x (no penalty!)
- **Raw score**: 4.2
- **Adjusted score**: 4.2 (unchanged)
- **Result**: Your score isn't penalized for shooting closer

### Scenario 3: Consistency
You shoot your AR at 50 yards every time:
- **Distance ratio**: 50/50 = 1.0x
- **Multiplier**: 1.0x (no change)
- **Raw score**: 4.0
- **Adjusted score**: 4.0
- **Result**: No adjustment needed, you're at your baseline

### Visual Representation

### Firearms Analytics Page
On the **Firearms Analytics** page (`/analytics/firearms`), you'll see:
- **Solid lines**: Raw scores (no adjustment)
- **Dotted lines**: Distance-adjusted scores (with multiplier)
- **Same color per firearm**: Both lines use the firearm's assigned color

### Session Detail Page
On each **Session Detail** page (`/sessions/[id]`), the top performance chart also shows:
- **Solid lines**: Raw scores for each firearm in that session
- **Dotted lines**: Distance-adjusted scores factoring in shot distances
- **Per-session baseline**: Distance multiplier is calculated based on average distance within that session
- **Real-time comparison**: See how each gun's performance changes when accounting for distance difficulty

### Tooltip Information
Hover over any data point to see:
- Raw score
- Distance-adjusted score
- Distance for that session (in yards)
- **Baseline distance** for that firearm (in yards)

This shows you exactly how much farther (or closer) you're shooting compared to your norm.

## Example Scenarios Continued

### Scenario 4: Cross-Firearm Comparison (Why Per-Firearm Baselines Matter)
Without per-firearm baselines, pistols would be unfairly penalized:
- **Old way** (global baseline = 40yd): Pistol at 15yd gets penalized, rifle at 50yd gets bonus
- **New way** (per-firearm): Pistol baseline = 15yd, rifle baseline = 50yd
  - Pistol at 15yd: No adjustment (at baseline)
  - Pistol at 25yd: Gets bonus for pushing limits
  - Rifle at 50yd: No adjustment (at baseline)
  - Rifle at 100yd: Gets bonus for pushing limits

Each gun is judged against **its own potential**, not against other gun types.

## Use Cases

### Training Progression
Track whether you're truly improving **at distance**:
- Raw score might plateau as you increase distance
- Distance-adjusted score shows you're maintaining accuracy despite difficulty increase

### Pushing Yourself
See rewards for stepping outside your comfort zone:
- Take your pistol to 25 yards instead of 15 yards
- Watch the adjusted score acknowledge the challenge

### Fair Firearm Comparison
Compare different firearms fairly:
- Each gun is measured against its own baseline
- A pistol at 20 yards can score as well (adjusted) as a rifle at 100 yards

## Implementation Details

### Backend
- `lib/analytics-utils.ts`: `applyDistanceMultiplier()` function
- `app/api/analytics/firearms/route.ts`: Calculates baseline and applies multiplier per session
- Returns both `avgScorePerShot` and `distanceAdjustedScore` for each trend point

### Frontend
- `app/analytics/firearms/page.tsx`: Renders dual-line chart across all sessions
- `app/sessions/[id]/page.tsx`: Renders dual-line chart within a single session
- Each firearm gets two series: raw (solid) and adjusted (dashed)
- Legend shows both lines for filtering
- Tooltips display raw, adjusted, and distance information

## Configuration

The multiplier strength is controlled by a constant in `analytics-utils.ts`:
```typescript
// Only applies when shooting FARTHER than baseline
const multiplier = 1 + (Math.log2(distanceRatio) * 0.20);
```

To adjust the multiplier strength:
- Increase `0.20` → stronger distance bonuses
- Decrease `0.20` → gentler distance bonuses
- Current value (0.20) provides ~15% bonus at 2x distance, ~32% bonus at 3x distance

**Important**: The multiplier only applies when `distance > baseline`. Shooting closer never penalizes your score.

## Future Enhancements

Potential improvements:
- Allow user-configurable multiplier strength
- Apply to other analytics views (calibers, optics)
- Add distance multiplier to leaderboard sorting
- Show multiplier value in UI (e.g., "1.15x @ 50yd")
- Historical analysis: "Your 50yd performance improved by X% this month"
