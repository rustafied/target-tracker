# Insights Quadrant Calculation Bug Fix

## Issue
The bias pattern insight was incorrectly reporting shot clustering. For example:
- Reported: "Shots clustered low-right (100% of 632 tracked rounds)"
- Reality: Shots were NOT all clustered in one quadrant

## Root Cause
Multiple functions in the insights system had a critical coordinate system bug:

1. **Missing coordinate centering in quadrant calculation**: The `calculateQuadrantBias` function in `lib/insights-engine.ts` was treating positions as if they were already centered at (0, 0).

2. **Missing coordinate centering in mean radius calculations**: Three functions in `lib/insights-rules.ts` were calculating mean radius without centering coordinates first:
   - `generateSetupMilestoneInsight` (2 calculations)
   - `generateCompositeRecommendationInsight` (1 calculation)

3. **Incorrect quadrant mapping**: The quadrant names in `lib/insights-rules.ts` had the y-axis inverted (mixing up "high" and "low").

### Technical Details

**SVG Coordinate System:**
- Positions are in range 0-200
- Center is at (100, 100)
- Y-axis increases downward (SVG convention)
- So: y < 100 = high (above center), y > 100 = low (below center)

**Original Bug:**
```typescript
positions.forEach(pos => {
  if (pos.x < 0 && pos.y > 0) quadrants.topLeft++;
  // ... etc
});
```

Problem: All positions are in 0-200 range, so all x and y values are positive. This caused all shots to incorrectly fall into only 2 quadrants (topRight and bottomRight), regardless of their actual positions.

## Fix Applied

### 1. Fixed `calculateQuadrantBias` in `lib/insights-engine.ts`
- Now centers coordinates before quadrant calculation: `cx = pos.x - 100`, `cy = pos.y - 100`
- Correctly maps centered coordinates to quadrants:
  - `topLeft` (x < 0, y < 0) = high-left
  - `topRight` (x >= 0, y < 0) = high-right
  - `bottomLeft` (x < 0, y >= 0) = low-left
  - `bottomRight` (x >= 0, y >= 0) = low-right

### 2. Fixed mean radius calculations in `lib/insights-rules.ts`
- Fixed `generateSetupMilestoneInsight`: Now centers coordinates before calculating mean radius for both current session and historical data
- Fixed `generateCompositeRecommendationInsight`: Now centers coordinates before calculating mean radius for item comparisons
- These fixes ensure mean radius values are accurate distances from the center of the target

### 3. Fixed quadrant name mapping in `lib/insights-rules.ts`
- Updated `quadrantNames` to match SVG coordinate system
- Updated `quadrantAdvice` to match correct quadrants

### 4. Added better logging
- Added detailed logging in `generateBiasPatternInsight` to help diagnose issues
- Logs bull count, position count, sample positions, and quadrant distribution

## Verification

A verification script has been created at `scripts/verify-insights-fix.mjs` to test the fix with real data:

```bash
MONGODB_URI=your_connection_string node scripts/verify-insights-fix.mjs <sessionId>
```

This will:
- Connect to your database
- Load the session data
- Show position distribution across all 4 quadrants
- Display the calculated bias
- Verify if the insight would trigger

## Impact

These bugs affected:
1. **Bias Pattern Insights**: Incorrectly reporting which quadrant shots were clustered in
2. **Setup Milestone Insights**: Incorrectly calculating mean radius for precision comparisons
3. **Composite Recommendation Insights**: Incorrectly ranking items by precision

All of these calculations now use the correct centered coordinate system matching the implementation in `lib/analytics-utils.ts`.

## Files Modified

1. `lib/insights-engine.ts` - Fixed `calculateQuadrantBias` function
2. `lib/insights-rules.ts` - Fixed 3 mean radius calculations, quadrant name mapping and advice, added logging

## Testing

The fix aligns with the existing correct implementation in `lib/analytics-utils.ts`, which already properly centers coordinates before calculating quadrant distributions.

## Next Steps

1. Deploy the fix
2. Check existing sessions with the verification script
3. Monitor logs to ensure correct quadrant calculations
4. Old incorrect insights are not stored, so they will auto-correct on next page load
