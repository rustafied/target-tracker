# Loading Animations & Fade-In Design System

**Status:** Active  
**Last Updated:** January 2026

## Overview

This document defines the loading and animation patterns used throughout the application to create smooth, professional user experiences. The system uses a combination of skeleton loaders, fade-in animations, and loading spinners to manage perceived performance and visual polish.

---

## Core Components

### 1. FadeIn Component
**Location:** `components/ui/fade-in.tsx`

#### Purpose
Creates smooth entrance animations for content with optional delays and durations.

#### Technical Details
```typescript
<FadeIn delay={100} duration={250}>
  <YourContent />
</FadeIn>
```

**Animation Flow:**
1. Starts with `opacity: 0` and `translateY(10px)` (invisible, 10px below)
2. After `delay` ms, triggers transition
3. Animates to `opacity: 1` and `translateY(0)` over `duration` ms
4. Creates subtle "fade up" effect

**Props:**
- `delay` (ms) - Time before animation starts (default: 0)
- `duration` (ms) - Animation duration (default: 250)
- `className` - Additional CSS classes
- `children` - Content to animate

#### CSS Transition
Uses native CSS transitions with cubic-bezier easing for GPU-accelerated performance.

---

### 2. Skeleton Loaders
**Location:** `components/ui/skeleton-loader.tsx` (general), `components/analytics/SkeletonLoader.tsx` (analytics-specific)

#### Purpose
Show placeholder shapes that match actual content layout while data loads.

#### Key Principles
- **Match Layout Exactly** - Prevents content shift when real data loads
- **Dark Theme Optimized** - `bg-[#1a1a1a]` cards with `bg-[#2a2a2a]` shapes
- **Pulse Animation** - Tailwind's `animate-pulse` (opacity: 1 ↔ 0.5)
- **Context-Specific** - Different skeletons for different page types

#### Available Skeleton Types

##### General Purpose
```typescript
// Basic ticket/list items
<SkeletonLoader count={5} />

// Stat cards
<CardSkeleton count={4} />

// Generic blocks
<LoadingSkeleton count={3} className="h-32" />
```

##### Analytics Specific
```typescript
// KPI cards
<KpiCardSkeleton />

// Chart cards
<ChartCardSkeleton height="300px" />

// Data tables
<TableSkeleton rows={10} />

// Full analytics page
<AnalyticsLoadingSkeleton />

// Comparison dashboards
<ComparisonLoadingSkeleton />
```

##### Complex Layouts
```typescript
// Ticket detail page (header + comments + sidebar)
<TicketDetailSkeleton />
```

---

### 3. Loading Spinner
**Location:** `components/ui/loading.tsx`

#### Purpose
Traditional rotating spinner for inline loading states.

#### Variants
```typescript
<LoadingSpinner size="sm" />  // 4x4 - buttons, inline
<LoadingSpinner size="md" />  // 8x8 - cards, sections
<LoadingSpinner size="lg" />  // 12x12 - full pages
```

#### Full Page Variant
```typescript
<LoadingPage />  // Centered spinner with "Loading..." text
```

**Color:** Blue (`text-blue-500`) for visibility on dark backgrounds.

---

## Usage Patterns

### Pattern A: Initial Page Load (Skeleton → Fade-In)

**Use Case:** Page navigation, data fetching

```typescript
function MyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  if (loading && !data) {
    return <AnalyticsLoadingSkeleton />;
  }

  return (
    <div>
      <FadeIn delay={0} duration={200}>
        <Header />
      </FadeIn>
      
      <FadeIn delay={100} duration={250}>
        <Content data={data} />
      </FadeIn>
    </div>
  );
}
```

**Why:** Skeleton appears instantly → no blank screen. When data arrives, content fades in smoothly.

---

### Pattern B: Staggered List Reveals

**Use Case:** Lists, grids, repeated items

```typescript
{items.map((item, index) => (
  <FadeIn key={item.id} delay={index * 50} duration={250}>
    <ItemCard item={item} />
  </FadeIn>
))}
```

**Why:** Creates cascading "reveal" effect - feels dynamic, not jarring.

**Timing Guidelines:**
- **50ms delays** - Dense lists (10+ items)
- **100ms delays** - Medium lists (5-10 items)
- **150-200ms delays** - Large cards/sections (3-5 items)

**Max Total Delay:** Keep under 1.5s for last item (users notice delays > 1s)

---

### Pattern C: Layered Page Content

**Use Case:** Complex pages with multiple sections (like Analytics Overview)

```typescript
return (
  <div>
    {/* Header - immediate */}
    <FadeIn duration={200}>
      <PageHeader />
    </FadeIn>

    {/* Filters - slight delay */}
    <FadeIn delay={50} duration={200}>
      <FilterBar />
    </FadeIn>

    {/* KPI Cards - staggered */}
    <div className="grid grid-cols-4 gap-4">
      <FadeIn delay={100} duration={250}>
        <KpiCard {...kpi1} />
      </FadeIn>
      <FadeIn delay={150} duration={250}>
        <KpiCard {...kpi2} />
      </FadeIn>
      <FadeIn delay={200} duration={250}>
        <KpiCard {...kpi3} />
      </FadeIn>
      <FadeIn delay={250} duration={250}>
        <KpiCard {...kpi4} />
      </FadeIn>
    </div>

    {/* Charts - progressive reveals */}
    <FadeIn delay={600} duration={300}>
      <ChartCard />
    </FadeIn>
    <FadeIn delay={700} duration={300}>
      <ChartCard />
    </FadeIn>

    {/* Heavy widgets - later, longer duration */}
    <FadeIn delay={1000} duration={300}>
      <ComplexWidget />
    </FadeIn>
  </div>
);
```

**Delay Strategy:**
1. **0-100ms:** Critical UI (header, nav)
2. **100-500ms:** Primary content (KPIs, key data)
3. **500-1000ms:** Secondary content (charts, insights)
4. **1000-1500ms:** Heavy/lazy-loaded content (complex widgets)

**Duration Strategy:**
- **200ms:** Fast, small elements
- **250ms:** Standard UI components
- **300ms:** Larger cards, complex content

---

### Pattern D: Lazy-Loaded Sections

**Use Case:** Below-the-fold content, expensive components

```typescript
<FadeIn delay={800} duration={300}>
  <LazyLoad height="400px">
    <ExpensiveComponent />
  </LazyLoad>
</FadeIn>
```

**Why:** Double optimization:
1. `LazyLoad` defers render until scrolled into view
2. `FadeIn` animates once loaded

**Note:** `LazyLoad` is already wrapped in fade logic, so only wrap the container if you want entrance animation.

---

## Animation Timing Reference

### Delay Budgets by Page Type

| Page Type | Total Animation Time | Strategy |
|-----------|---------------------|----------|
| Simple List | 0-500ms | Fast reveals, dense delays |
| Dashboard | 0-1200ms | Layered sections, prioritized |
| Complex Analytics | 0-1500ms | Progressive disclosure |
| Detail Page | 0-800ms | Top-to-bottom flow |

### Duration Guidelines

| Element Type | Duration | Rationale |
|--------------|----------|-----------|
| Text/Labels | 150-200ms | Fast, not jarring |
| Buttons/Badges | 200ms | Quick feedback |
| Cards/Panels | 250ms | Standard, polished |
| Charts/Graphs | 300ms | Complex, deserves moment |
| Modals/Overlays | 200ms | Fast response feel |
| Page Transitions | 250ms | Balance speed/smoothness |

---

## Implementation Checklist

When adding loading states to a new page:

- [ ] **Choose skeleton type** - Match layout precisely
- [ ] **Wrap header/nav** - FadeIn with 0-50ms delay
- [ ] **Stagger primary content** - 100-300ms delays
- [ ] **Progressive secondary content** - 500-1000ms delays
- [ ] **LazyLoad heavy components** - Below fold, 1000ms+
- [ ] **Test empty states** - Ensure skeleton shows before data
- [ ] **Test fast loads** - Animations shouldn't block instant data
- [ ] **Test slow loads** - Skeleton shouldn't feel stuck
- [ ] **Check mobile** - Reduced motion preferences

---

## Best Practices

### DO ✅

- **Match skeletons to layout** - Use actual component dimensions
- **Stagger related items** - Lists, grids, cards
- **Fade in after skeleton** - Not both simultaneously
- **Keep delays reasonable** - Under 1.5s max total
- **Use shorter durations** - 200-300ms feels snappy
- **Respect loading states** - Don't show skeleton if data already loaded
- **Test on slow connections** - Verify skeleton appears

### DON'T ❌

- **Mix loading patterns** - Pick skeleton OR spinner, not both
- **Over-animate** - Too many delays feels sluggish
- **Use long durations** - 500ms+ feels slow
- **Animate every element** - Group related items
- **Skip skeletons on fast loads** - Flash of skeleton is better than blank screen
- **Ignore prefers-reduced-motion** - Respect user preferences
- **Animate lazy-loaded content twice** - LazyLoad already handles it

---

## Performance Considerations

### GPU Acceleration
Our animations use `opacity` and `transform`, both GPU-accelerated:
- `opacity: 0 → 1` - Composited layer, no repaint
- `translateY(10px) → 0` - Transform, no reflow

### Reduced Motion
FadeIn component should check `prefers-reduced-motion`:

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  // Skip animation, show immediately
  setIsVisible(true);
} else {
  // Normal animation flow
}
```

**TODO:** Add reduced motion support to FadeIn component.

### Lighthouse Impact
- **LCP (Largest Contentful Paint):** Skeletons improve perceived speed
- **CLS (Cumulative Layout Shift):** Matching layouts prevents shift
- **TBT (Total Blocking Time):** CSS animations don't block main thread

---

## Examples from Codebase

### Analytics Overview Page
See `app/analytics/page.tsx` for complete implementation:
- Skeleton on initial load
- Staggered KPI cards (100-250ms)
- Progressive chart reveals (600-900ms)
- Late-loading widgets (1000ms+)

### Session List
See ticket/session lists for:
- Dense list staggering (50ms intervals)
- Fast initial cards (100-200ms)

### Dashboard Stats
See dashboard for:
- Simultaneous card reveals (same delay, different positions)
- Quick durations (200ms) for snappy feel

---

## Future Enhancements

### Planned Improvements
1. **Shared Animation Provider** - Context for coordinated timing
2. **Reduced Motion Support** - Respect user preferences
3. **Animation Presets** - Named timing sets ("fast", "standard", "complex")
4. **Intersection Observer** - Trigger animations on scroll
5. **Route Transition Animations** - Smooth page changes
6. **Micro-interactions** - Button clicks, hover states

### Under Consideration
- **Spring Physics** - More natural motion (Framer Motion?)
- **Gesture Animations** - Swipe, drag interactions
- **Loading Progress** - Show % complete for long loads
- **Optimistic UI** - Show expected state before API response

---

## Related Documentation

- **LazyLoad Component:** `components/LazyLoad.tsx`
- **Skeleton Components:** `components/ui/skeleton-loader.tsx`, `components/analytics/SkeletonLoader.tsx`
- **Loading Spinners:** `components/ui/loading.tsx`
- **UI Component Library:** `components/ui/`

---

## Migration Guide

### Updating Existing Pages

**Before:**
```typescript
function MyPage() {
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <Header />
      <Content />
    </div>
  );
}
```

**After:**
```typescript
function MyPage() {
  if (loading && !data) {
    return <MyPageSkeleton />;
  }
  
  return (
    <div>
      <FadeIn duration={200}>
        <Header />
      </FadeIn>
      <FadeIn delay={100} duration={250}>
        <Content />
      </FadeIn>
    </div>
  );
}
```

### Creating New Skeletons

1. Copy existing skeleton as template
2. Match exact layout (grid, spacing, sizes)
3. Use consistent colors (`#1a1a1a`, `#2a2a2a`)
4. Add `animate-pulse` to pulsing elements
5. Accept `count` prop for repeatable items

---

## Questions or Issues?

- Review implemented examples in `app/analytics/`
- Check component source code for props/options
- Test on different devices and connection speeds
- Consider user experience over technical perfection
