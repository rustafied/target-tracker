# Custom Target Types and User-Defined Scoring

## Overview

This feature enables support for multiple target types beyond the current "6 bull" sheet, including grid-based, silhouette, bullseye, and qualification targets. Each target type can define its own scoring system with flexible point values while maintaining backward compatibility with existing data.

## Goals

- Support multiple target types with custom layouts and aim points
- Allow flexible scoring systems (rings, zones, regions with different point values)
- Keep current workflows intact (count-based input, shot-position clicking, analytics)
- Migrate all existing data to use a "default target template" representing the current 6-bull sheet
- Maintain backward compatibility with existing sessions and analytics

## Core Concepts

### 1. TargetTemplate

A reusable definition of a target type that includes:
- Coordinate system (SVG or image-based)
- Visual rendering (SVG markup or image URL)
- Aim points (areas to shoot at)
- Default scoring model

Examples:
- Six-bull sheet (current default)
- Sight-in grid with multiple squares
- Silhouette with zoned head/torso
- Single large bullseye
- Qualification silhouette with regions

### 2. AimPoint

A logical "area you aim at" within a template, such as:
- Bulls 1-6 on current sheet
- Head/torso zones on silhouette
- Grid squares on sight-in target
- Single center on bullseye

### 3. ScoringModel

Defines how shots are scored, supporting:
- **Ring-based**: Distance from center with thresholds (e.g., X-ring=10, 9-ring=9)
- **Region-based**: Polygons/shapes with different scores (e.g., head zone=10, torso=7)

## Data Models

### TargetTemplate
```typescript
{
  _id: ObjectId
  name: string
  description?: string
  version: number
  coordinateSystem: {
    type: "svg" | "image"
    width: number
    height: number
    origin: "top-left"
  }
  render: {
    type: "svg" | "image"
    svgMarkup?: string
    imageUrl?: string
  }
  defaultScoringModelId?: ObjectId
  aimPoints: AimPoint[]
  isSystem: boolean
  createdBy?: ObjectId
  createdAt: Date
  updatedAt: Date
}
```

### AimPoint (embedded in TargetTemplate)
```typescript
{
  id: string
  name: string
  order: number
  centerX: number
  centerY: number
  interactiveRadius?: number
  scoringModelId?: ObjectId
  tags?: string[]
}
```

### ScoringModel
```typescript
{
  _id: ObjectId
  name: string
  type: "rings" | "regions"
  maxScore: number
  allowMissScore: boolean
  anchorX?: number
  anchorY?: number
  rings?: {
    thresholds: Array<{ radius: number, score: number }>
    missScore: number
  }
  regions?: {
    regions: Array<{
      id: string
      label: string
      score: number
      shapeType: "polygon" | "circle" | "rect"
      shapeData: any
    }>
    missScore: number
  }
}
```

### TargetSheet (updated)
```typescript
{
  // ... existing fields ...
  targetTemplateId: ObjectId  // NEW
  targetTemplateVersion: number  // NEW
  aimPointCountSnapshot?: number  // NEW
}
```

### AimPointRecord (evolved from BullRecord)
```typescript
{
  _id: ObjectId
  targetSheetId: ObjectId
  aimPointId: string  // NEW: replaces bullIndex
  countsByScore: { [score: string]: number }  // NEW: flexible scoring
  shotPositions?: Array<{ x: number, y: number, score: number }>
  totalShots: number
  // Legacy fields kept for migration:
  bullIndex?: number
  score10Count?: number
  score9Count?: number
  // ... etc
}
```

## Implementation Phases

### Phase 1: Models and Migration ✓
**Goal**: Establish data models and migrate existing data without breaking anything

Tasks:
1. Create TargetTemplate model
2. Create ScoringModel model
3. Add AimPointRecord model (aliased as BullRecord for compatibility)
4. Create default "Six Bull" template with current scoring
5. Create default scoring model (ring-based, 0-5 scoring)
6. Write migration script to:
   - Update all TargetSheets with targetTemplateId
   - Convert BullRecords to use aimPointId and countsByScore
7. Update API routes to handle both old and new field formats

**Acceptance Criteria**:
- All existing data works unchanged
- Analytics continue to function normally
- No breaking changes to existing workflows

### Phase 2: Template-Driven UI
**Goal**: Make the shooting data entry UI template-aware

Tasks:
1. Update sheet creation to store template reference
2. Update sheet edit page to load aim points from template
3. Make interactive target render dynamically from template
4. Update count input to work with any aim point
5. Update shot position click handler to use template scoring
6. Ensure mobile responsiveness for touch input

**Acceptance Criteria**:
- Can view/edit sheets with default template
- Shot clicking works as before
- Count entry works as before

### Phase 3: New Built-In Templates
**Goal**: Add predefined templates from common target types

Tasks:
1. Create setup/targets page to list templates
2. Add 4 starter templates (see below)
3. Allow template selection on sheet creation
4. Update analytics to filter by template
5. Add normalized scoring comparison (% of max)

**Acceptance Criteria**:
- Can create sheets with different templates
- Each template scores correctly
- Analytics show cross-template comparisons

### Phase 4: Custom Template Editor
**Goal**: Allow users to create custom templates

Tasks:
1. Create template editor page
2. Support image upload (validation, S3 storage)
3. Add aim point placement UI
4. Add scoring model builder (rings + regions)
5. Add preview/test mode
6. Implement template versioning

**Acceptance Criteria**:
- Can upload custom target image
- Can define aim points and scoring
- Custom templates work in sheet creation

### Phase 5: Enhanced Analytics
**Goal**: Full analytics support for all template types

Tasks:
1. Add template/aim point filters
2. Show region-specific metrics
3. Add per-aim-point heatmaps
4. Support geometry metrics where applicable
5. Add template comparison view

**Acceptance Criteria**:
- Can analyze any template type
- Cross-template comparisons work
- Region-based targets show zone hit rates

## Starter Templates

### 1. Six Bull (Default) - Current System
- **Type**: SVG
- **Aim Points**: 6 bulls in 2x3 grid
- **Scoring**: Ring-based (0-5 per ring)
- **Use**: General precision practice

### 2. Sight-In Grid (Splatterburst)
- **Type**: Image
- **Aim Points**: 5 red squares
- **Scoring**: Region-based (hit=1, miss=0)
- **Use**: Zeroing, group analysis

### 3. Armed Silhouette (BakerTargets)
- **Type**: SVG/Image
- **Aim Points**: Head, Torso
- **Scoring**: Ring-based per zone (X=10, 9-6)
- **Use**: Defensive training

### 4. Single Bullseye (Crooked Bend)
- **Type**: SVG
- **Aim Points**: Single center
- **Scoring**: Ring-based (9-5)
- **Use**: Precision shooting

### 5. Qualification Silhouette (B-27)
- **Type**: Image
- **Aim Points**: Torso oval
- **Scoring**: Region-based (X=10, 9-7 zones, silhouette=5)
- **Use**: Law enforcement qualification

## Migration Strategy

### Backward Compatibility

1. **Data Versioning**: Sheets pin to template version
2. **Field Aliasing**: BullRecord remains available as alias
3. **Graceful Degradation**: Analytics handle missing shotPositions
4. **Legacy Support**: Old API fields continue to work

### Migration Script Steps

1. Create default template and scoring model
2. Update all TargetSheets:
   ```javascript
   db.targetSheets.updateMany(
     { targetTemplateId: { $exists: false } },
     { 
       $set: { 
         targetTemplateId: defaultTemplateId,
         targetTemplateVersion: 1,
         aimPointCountSnapshot: 6
       }
     }
   )
   ```
3. Convert BullRecords:
   ```javascript
   // For each record, map bullIndex to aimPointId
   // and derive countsByScore from legacy fields
   ```

## Security Considerations

- Validate uploaded images (type, size, dimensions)
- Store images in secure S3 bucket with access controls
- Sanitize SVG markup to prevent XSS
- Rate limit template creation
- Implement user quotas for storage

## Future Enhancements (Out of Scope)

- Automatic target recognition from photos
- Automatic bullet-hole detection
- Complex ballistics (MOA, inches) with calibration
- Non-numeric scoring systems
- Template sharing between users
- Template marketplace

## Testing Checklist

### Phase 1
- [ ] Migration completes without errors
- [ ] All existing sheets display correctly
- [ ] All existing bull records display correctly
- [ ] Analytics show same results as before
- [ ] No regression in count entry
- [ ] No regression in shot clicking

### Phase 2
- [ ] Template loading works
- [ ] Dynamic aim points render
- [ ] Shot scoring uses template model

### Phase 3
- [ ] All starter templates load
- [ ] Each template scores correctly
- [ ] Cross-template analytics work

### Phase 4
- [ ] Image upload and validation work
- [ ] Editor saves templates correctly
- [ ] Custom templates render properly

### Phase 5
- [ ] Template filters work
- [ ] Normalized comparisons accurate
- [ ] Region metrics calculate correctly

## References

- `/lib/models/TargetSheet.ts` - Current sheet model
- `/lib/models/BullRecord.ts` - Current bull model
- `/lib/metrics.ts` - Analytics calculations
- `/components/InteractiveTargetInput.tsx` - Shot clicking UI
- `/app/analytics/` - Analytics pages

---

**Status**: Phase 1 In Progress
**Last Updated**: January 2026
