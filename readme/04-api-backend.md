# API & Backend

## API Routes Structure

Base: `/api`

### Firearms
* `GET /api/firearms` - List all firearms
* `POST /api/firearms` - Create firearm
* `GET /api/firearms/[id]` - Firearm detail
* `PUT /api/firearms/[id]` - Update firearm
* `DELETE /api/firearms/[id]` - Archive or delete firearm

### Optics
* `GET /api/optics` - List all optics
* `POST /api/optics` - Create optic
* `GET /api/optics/[id]` - Optic detail
* `PUT /api/optics/[id]` - Update optic
* `DELETE /api/optics/[id]` - Archive or delete optic

### Calibers
* `GET /api/calibers` - List all calibers
* `POST /api/calibers` - Create caliber
* `GET /api/calibers/[id]` - Caliber detail
* `PUT /api/calibers/[id]` - Update caliber
* `DELETE /api/calibers/[id]` - Archive or delete caliber

### Range Sessions
* `GET /api/sessions` - List sessions (with pagination/filtering)
* `POST /api/sessions` - Create session
* `GET /api/sessions/[id]` - Session detail (with sheets aggregated)
* `PUT /api/sessions/[id]` - Update session
* `DELETE /api/sessions/[id]` - Delete session

### Target Sheets
* `POST /api/sheets` - Create sheet
* `GET /api/sheets/[id]` - Sheet detail (with bull records)
* `PUT /api/sheets/[id]` - Update sheet metadata
* `DELETE /api/sheets/[id]` - Delete sheet

### Bull Records
* `POST /api/bulls` - Create or batch-save bull records
* `PUT /api/bulls/[id]` - Update bull record
* `DELETE /api/bulls/[id]` - Delete bull record

### Analytics
* `GET /api/analytics/summary` - Aggregated metrics with filters

**Query Parameters:**
* `dateStart` - ISO date string
* `dateEnd` - ISO date string
* `firearmIds` - Array of ObjectId strings
* `caliberIds` - Array of ObjectId strings
* `distanceMin` - Number (yards)
* `distanceMax` - Number (yards)

**Returns:**
* Aggregated metrics: average scores per session, per firearm, etc.
* Data points for graphs: `[{date, averageScore, firearmId, ...}]`

---

## MongoDB Setup

### Local Instance
* Docker container or native install
* Default port: 27017
* Database name: `target-tracker`

### Connection Configuration

**Environment Variable** (`.env.local`):
```
MONGODB_URI=mongodb://localhost:27017/target-tracker
```

### Connection Utility
* Single `connectToDatabase` utility in `lib/db.ts`
* Used by all API routes
* Handles connection pooling and error recovery

### Mongoose Schemas
Defined in `lib/models/`:
* `Firearm.ts`
* `Optic.ts`
* `Caliber.ts`
* `RangeSession.ts`
* `TargetSheet.ts`
* `BullRecord.ts`

---

## Data Validation

### Server-Side Validation
* All API routes use Zod schemas for request validation
* Schemas defined in `lib/validators/`

### Business Rules Enforced
* Non-negative integers for all counts
* Score counts 0–10 (MVP limit)
* Positive distances only
* Valid ObjectId references
* At least one count > 0 for "used" bulls

### Error Responses
Consistent error format:
```json
{
  "error": "Error message",
  "details": { /* validation errors if applicable */ }
}
```

---

## Analytics Logic

### Per-Session Aggregation
For each session, aggregate across all sheets and bulls:
* `totalShots` = sum of all score counts
* `totalScore` = weighted sum (5×score5 + 4×score4 + ...)
* `averageScore` = totalScore / totalShots

### Filtered Views
Query and group by filters (firearm, caliber, distance):
* Compute `totalShots`, `totalScore`, `averageScore`
* Optional: `bullHitRate = sum(score5Count) / totalShots`

### Graph Data Preparation
* One data point per session
* Filter by date range, firearms, calibers, distances
* Sort by session date
* Return as array of objects for Recharts

### Performance Considerations
* Use MongoDB aggregation pipelines for efficiency
* Index on frequently queried fields:
  * `rangeSessionId` on TargetSheet
  * `targetSheetId` on BullRecord
  * `date` on RangeSession
  * `firearmId`, `caliberId`, `opticId` on TargetSheet

---

## Future Backend Considerations

### Photo OCR (Not MVP)
* Add `ImportJob` entity
* External Python/serverless service for OCR
* Async job processing

### Authentication (Not MVP)
* Add `User` entity
* Link all data to user
* JWT or session-based auth

### Multi-Device Sync (Not MVP)
* Consider conflict resolution strategy
* Implement change tracking
* Possible external sync service

