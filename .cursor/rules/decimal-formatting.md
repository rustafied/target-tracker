# Decimal Formatting Standards

## Rule: Always use 2 decimal places for display values

When displaying numeric metrics in the UI, always format to 2 decimal places using the `formatDecimal()` utility function from `@/lib/utils`.

### Import
```typescript
import { formatDecimal, formatCurrency } from "@/lib/utils";
```

### Usage

**DO:**
```typescript
// For regular metrics
{formatDecimal(caliber.valueScore)}
{formatDecimal(session.avgScore)}
{formatDecimal(firearm.bullsPer100)}

// For currency values
{formatCurrency(caliber.costPerRound)}
```

**DON'T:**
```typescript
// Avoid raw toFixed() calls with varying precision
{caliber.valueScore.toFixed(0)}  // ❌ Inconsistent precision
{session.avgScore.toFixed(3)}     // ❌ Too many decimals
{firearm.bullsPer100.toFixed(1)}  // ❌ Not standardized
```

### Applies to:
- Value scores
- Average scores
- Bulls per 100 rounds
- Cost per round
- Cost per point
- Score per round
- Bull rates (as percentages)
- Miss rates (as percentages)
- Mean radius values
- Distance-adjusted scores
- Any other numeric metrics shown to users

### Why 2 decimals?
- Provides sufficient precision for shooting metrics
- Keeps the UI clean and consistent
- Avoids floating-point display issues (like 61.161300699675562)
- Makes comparisons easier for users

### Exceptions
- Whole numbers that should be integers (shot counts, inventory quantities) - use `.toLocaleString()` instead
- Percentages in tooltips can use 1 decimal if specifically needed for space
- Internal calculations can use higher precision, but must be formatted when displayed
