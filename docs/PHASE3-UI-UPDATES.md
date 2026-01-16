# Phase 3 UI Updates - Template Display

## Summary
Updated sheet and session views to display template information instead of hardcoded "Bull 1-6" labels.

## Changes Made

### 1. Sheet Detail Page (`app/sheets/[sheetId]/page.tsx`)

**Display Template Aim Point Names:**
- Changed bull titles from "Bull {index}" to use actual template aim point names
- Example: "Bull 1" → "Center" (for Single Bullseye) or "Head" (for Silhouette)

**Added Template Info to Header:**
- Added "Target Type" field showing template name
- Shows "Six Bull (Default)" for sheets without explicit template
- Updated grid from `md:grid-cols-4` to `md:grid-cols-3 lg:grid-cols-4` to accommodate new field

**What You'll See:**
```
Date: Jan 6, 2026
Firearm: DDM4 V7
Caliber: 5.56 NATO
Optic: Vortex Strike Eagle
Distance: 20 yards
Target Type: Single Bullseye  ← NEW!
Total Shots: 15
Total Score: 68
Average: 4.53
```

### 2. Session Detail Page (`app/sessions/[id]/page.tsx`)

**Added Template Field to Sheet Cards:**
- Each sheet card now shows target template used
- Displays template name or "Six Bull" as fallback
- Helps identify which sheets used which templates

**Updated Sheet Interface:**
- Added `targetTemplateId` with name to Sheet interface
- Supports displaying template info in session overview

**What You'll See:**
Each sheet card now shows:
```
Firearm: DDM4 V7
Caliber: 5.56 NATO
Optic: Vortex Strike Eagle  
Distance: 20 yards
Target: Single Bullseye  ← NEW!
```

### 3. Session API (`app/api/sessions/[id]/route.ts`)

**Populate Template Data:**
- Added `.populate("targetTemplateId", "name aimPoints")` to query
- Ensures template data is loaded with sheets
- Only fetches name and aimPoints fields (efficient)

### 4. UI Component Fixes

**Fixed Dropdown Backgrounds:**
Updated all dropdown/popover components to have solid backgrounds:
- **SelectContent**: White/dark solid background with stronger shadow
- **DropdownMenuContent**: Same treatment
- **PopoverContent**: Same treatment  
- **Command**: Same treatment

Changed from `bg-popover` (translucent) to `bg-white dark:bg-zinc-950` (solid).

## User Experience

### Before:
- All sheets showed "Bull 1", "Bull 2", etc.
- No way to see which template was used
- Confusing when mixing different target types

### After:
- Bulls show meaningful names: "Center", "Head", "Torso", "Top", "Bottom"
- Template name clearly displayed on sheets
- Easy to see at a glance what target type each sheet used
- Dropdowns have solid backgrounds (no bleed-through)

## Examples by Template

**Six Bull (Default):**
- Bull 1, Bull 2, Bull 3, Bull 4, Bull 5, Bull 6

**Single Bullseye:**
- Center

**Sight-In Grid:**
- Center, Top, Left, Right, Bottom

**Silhouette:**
- Head, Torso

## Backward Compatibility

- Sheets without `targetTemplateId` show "Six Bull (Default)" or "Six Bull"
- Legacy aim point names fall back to "Bull {index}"
- All existing data continues to work

## Testing

To verify:
1. Create a new sheet with "Single Bullseye" template
2. View the sheet - should show "Center" instead of "Bull 1"
3. Check sheet header shows "Target Type: Single Bullseye"
4. View session - sheet card should show "Target: Single Bullseye"
5. Try different templates - each should show correct names

## Future Enhancements

- Render actual template SVG in InteractiveTargetInput (currently uses default 6-ring visual)
- Support region-based scoring models (not just ring-based)
- Display template thumbnails in session view
- Filter sessions by template type

---

**Status:** ✓ Complete
**Date:** January 2026
