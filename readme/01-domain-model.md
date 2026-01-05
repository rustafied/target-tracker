# Domain Model

The data model is designed for future expansion while keeping the MVP simple. All entities support filtering and graphing by firearm, caliber, distance, and session date without modifications.

## Core Entities

### 1. Firearm
Represents a specific gun.

**Fields:**
* `_id` - MongoDB ObjectId
* `name` (string, required) - Friendly name (e.g. "DDM4 16in")
* `manufacturer` (string, optional)
* `model` (string, optional)
* `defaultCaliberId` (ObjectId → Caliber, optional)
* `defaultDistanceYards` (number, optional) - Default distance for this firearm when creating sheets
* `caliberIds` (ObjectId[] → Caliber) - List of compatible calibers (many-to-many relationship)
* `opticIds` (ObjectId[] → Optic) - List of compatible optics (many-to-many relationship)
* `sortOrder` (number, default 0) - User-defined display order
* `notes` (string, optional)
* `isActive` (boolean, default true)
* `createdAt`, `updatedAt` (dates)

---

### 2. Optic
Sighting system used with firearms.

**Fields:**
* `_id` - MongoDB ObjectId
* `name` (string, required) - e.g. "Vortex Razor AMG UH-1 Gen II"
* `type` (string, optional) - red dot, LPVO, irons, etc.
* `magnification` (string, optional) - e.g. "1–6x"
* `sortOrder` (number, default 0) - User-defined display order
* `notes` (string, optional)
* `isActive` (boolean, default true)
* `createdAt`, `updatedAt` (dates)

---

### 3. Caliber
Ammunition type.

**Fields:**
* `_id` - MongoDB ObjectId
* `name` (string, required) - Display name (e.g. "5.56 NATO")
* `shortCode` (string, optional) - e.g. "5.56", "9 mm"
* `category` (string, optional) - rifle, pistol, etc.
* `sortOrder` (number, default 0) - User-defined display order
* `notes` (string, optional)
* `isActive` (boolean, default true)
* `createdAt`, `updatedAt` (dates)

---

### 4. RangeSession
One "range day" or range visit.

**Fields:**
* `_id` - MongoDB ObjectId
* `slug` (string, unique) - URL-friendly identifier (auto-generated from date)
* `date` (date, required)
* `location` (string, optional)
* `notes` (string, optional) - Weather, drills, etc.
* `createdAt`, `updatedAt` (dates)

---

### 5. TargetSheet
One physical sheet of paper (flexible 1-6 bulls) associated with a single firearm/optic/caliber/distance combination.

**Fields:**
* `_id` - MongoDB ObjectId
* `slug` (string, unique) - URL-friendly identifier (auto-generated)
* `rangeSessionId` (ObjectId → RangeSession, required)
* `firearmId` (ObjectId → Firearm, required)
* `caliberId` (ObjectId → Caliber, required)
* `opticId` (ObjectId → Optic, required)
* `distanceYards` (number, required)
* `sheetLabel` (string, optional) - e.g. "Sheet 1", "Zeroing", etc.
* `notes` (string, optional)
* `photoUrl` (string, optional) - For future target photos
* `createdAt`, `updatedAt` (dates)

**Note**: Bulls are only created/saved if they contain non-zero score data. Not all sheets require 6 bulls.

---

### 6. BullRecord
One bullseye on a sheet with aggregated scores.

**Fields:**
* `_id` - MongoDB ObjectId
* `targetSheetId` (ObjectId → TargetSheet, required)
* `bullIndex` (number, required, 1–6)
* `score5Count` (number, default 0) - Center hits
* `score4Count` (number, default 0)
* `score3Count` (number, default 0)
* `score2Count` (number, default 0)
* `score1Count` (number, default 0)
* `score0Count` (number, default 0) - Misses
* `shotPositions` (array of {x, y, score}, optional) - Exact XY coordinates of shots on target
  * `x` (number, 0-200) - X coordinate in SVG viewBox
  * `y` (number, 0-200) - Y coordinate in SVG viewBox
  * `score` (number, 0-5) - Point value of the shot
* `totalShots` (number, optional) - Can be derived

**Shot Position Data:**
When using the interactive target input, exact shot positions are recorded. This enables:
* Precise visualization of shot groups
* True heatmap generation (vs. randomized placement)
* Potential future analysis (group size, drift patterns, etc.)

If shot positions are not recorded, the system falls back to displaying randomized positions within the appropriate scoring rings for visualization purposes.

**Derived Metrics (computed in code, not stored):**
* `totalScore` = 5×score5 + 4×score4 + 3×score3 + 2×score2 + 1×score1 + 0×score0
* `averagePerShot` = totalScore / totalShots
* `bullHitRate` = score5Count / totalShots

---

## Data Relationships

```
RangeSession (1) ──→ (many) TargetSheet
TargetSheet (1) ──→ (many) BullRecord
TargetSheet (1) ──→ (1) Firearm
TargetSheet (1) ──→ (1) Caliber
TargetSheet (1) ──→ (1) Optic

Firearm (1) ──→ (many) Caliber [via compatibleCaliberIds]
Firearm (1) ──→ (many) Optic [via compatibleOpticIds]
```

**Equipment Filtering:**
When creating a target sheet:
1. Select firearm first
2. Available calibers are filtered based on the firearm's `caliberIds` array
3. Available optics are filtered based on the firearm's `opticIds` array
4. First compatible caliber and optic are auto-selected
5. If the firearm has a `defaultDistanceYards` value, it pre-populates the distance field

## Validation Rules

* All numeric counts must be non-negative integers (0–10 for MVP)
* Score counts should not exceed 10 (catches input mistakes, keeps UI simple)
* At least one count > 0 for a bull to be considered "used"
* Distance must be positive; round to nearest yard
* Date defaults to today when creating a session but is editable

