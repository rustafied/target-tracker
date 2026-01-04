# Future Features

These features are **not implemented in the MVP** but the data model and architecture are designed to support them without breaking changes.

---

## 1. Photo OCR for Range Notebook Pages

Import and parse handwritten or printed range notebook pages.

### New Entity: ImportJob
**Fields:**
* `_id`
* `rangeSessionId` (ObjectId → RangeSession)
* `sourceImageUrl` (string) - Stored image path
* `status` (enum) - pending, processing, completed, failed
* `rawText` (string, optional) - Raw OCR output
* `parsedData` (JSON, optional) - Structured data extracted
* `createdAt`, `updatedAt`

### Implementation Approach
* Upload image to storage (local or cloud)
* External service (Python with Tesseract/Paddle OCR, or serverless function)
* Parse structured data and create TargetSheets/BullRecords
* Manual review/correction interface

### UI Flow
1. Upload photo from session detail page
2. Show processing status
3. Display parsed data for confirmation/editing
4. Create sheets and bulls from confirmed data

---

## 2. Direct Target Photo Ingestion

Upload photos of physical targets and automatically extract shot locations.

### Data Model Extensions
* `TargetSheet.photoUrl` (already in model)
* New entity: **ShotRecord**

**ShotRecord Fields:**
* `_id`
* `bullRecordId` (ObjectId → BullRecord)
* `xCoordinate` (number) - Normalized position on target
* `yCoordinate` (number) - Normalized position on target
* `computedRing` (number) - Calculated score ring (0-5)
* `confidence` (number, optional) - Computer vision confidence
* `createdAt`, `updatedAt`

### Implementation Approach
* Computer vision for shot detection
* Target type recognition (different target templates)
* Shot hole identification and coordinate extraction
* Ring calculation based on distance from center
* Aggregate to BullRecord score counts

### UI Flow
1. Upload target photo
2. Automatic shot detection
3. Manual adjustment interface (drag/add/remove shots)
4. Confirm and save to BullRecord

---

## 3. Authentication and Multi-Device Sync

Support multiple users and sync data across devices.

### New Entity: User
**Fields:**
* `_id`
* `email` (string, unique, required)
* `passwordHash` (string)
* `name` (string, optional)
* `createdAt`, `updatedAt`

### Data Model Changes
Add `userId` field to all entities:
* Firearm
* Optic
* Caliber
* RangeSession
* (TargetSheet and BullRecord inherit via RangeSession)

### Implementation Approach
* NextAuth.js for authentication
* JWT or session-based auth
* User registration and login flows
* Cloud MongoDB or MongoDB Atlas for sync
* Conflict resolution strategy for offline changes

### Privacy & Security
* User data isolation
* Encrypted passwords
* Secure session management
* Optional local-only mode (current MVP behavior)

---

## 4. Drill Types and Structured Training

Track specific shooting drills and exercises.

### New Entity: Drill
**Fields:**
* `_id`
* `name` (string, required) - e.g., "Mozambique", "Bill Drill"
* `description` (string, optional)
* `category` (string, optional) - pistol, rifle, shotgun
* `standardPar` (number, optional) - Standard time in seconds
* `notes` (string, optional)
* `isActive` (boolean, default true)
* `createdAt`, `updatedAt`

### Data Model Extensions
Add to **BullRecord** or **TargetSheet**:
* `drillId` (ObjectId → Drill, optional)
* `timeSeconds` (number, optional) - For timed drills

### Implementation Approach
* Drill library (preset and custom drills)
* Associate drills with sheets or bulls
* Track performance metrics specific to drills
* Compare against standard par times
* Drill-specific analytics

---

## 5. Advanced Analytics

Enhanced metrics and visualizations.

### Additional Metrics
* **Group size** - Calculate from shot coordinates (requires ShotRecord)
* **Consistency score** - Standard deviation of scores
* **Hit rate by distance** - Percentage of on-target hits
* **Improvement velocity** - Rate of score improvement
* **Cold bore vs. warm shots** - First shot vs. subsequent performance

### Visualization Enhancements
* **Scatter plots** - Distance vs. score
* **Heat maps** - Shot distribution on target
* **Box plots** - Score distribution by firearm/caliber
* **Regression lines** - Trend analysis
* **Export to CSV** - For external analysis

### Comparison Features
* Compare firearms head-to-head
* Compare optics performance
* Before/after equipment changes
* Historical comparisons

---

## 6. Social & Community Features

Share progress and compare with others (optional, privacy-respecting).

### Features
* Public profile (opt-in)
* Share individual sessions or achievements
* Leaderboards by drill type
* Training groups and shared goals
* Comments and feedback on shared sessions

### Privacy Controls
* All features opt-in
* Granular privacy settings
* Data export and deletion

---

## 7. Equipment Maintenance Tracking

Track maintenance, round counts, and equipment lifecycle.

### Data Model Extensions
Add to **Firearm** and **Optic**:
* `roundCountTotal` (number, derived)
* `lastCleanedDate` (date, optional)
* `maintenanceNotes` (array of strings)
* `purchaseDate` (date, optional)
* `purchasePrice` (number, optional)

### Features
* Maintenance reminders
* Round count tracking per session
* Cost per round calculations
* Equipment lifecycle analytics
* Service history

---

## 8. Mobile App

Native mobile application for iOS and Android.

### Technology Options
* React Native (code sharing with web)
* Expo for rapid development
* Native Swift/Kotlin for performance

### Features
* Full feature parity with web
* Offline mode with sync
* Camera integration for photos
* Push notifications for reminders
* Widget for quick session creation

---

## Implementation Priority

When expanding beyond MVP, suggested priority order:

1. **Authentication** - Foundation for multi-device and social features
2. **Advanced Analytics** - High value, builds on existing data
3. **Drill Types** - Adds structure to training tracking
4. **Target Photo Ingestion** - High automation value
5. **Photo OCR** - Nice-to-have automation
6. **Mobile App** - Depends on user demand
7. **Social Features** - Community building
8. **Equipment Maintenance** - Niche but useful

Each feature should be implemented with:
* Clear user value proposition
* Minimal disruption to existing data
* Optional/opt-in where appropriate
* Thorough testing

