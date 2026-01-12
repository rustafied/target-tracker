# Ammo Tracking (Inventory + Usage Deductions)

## Overview

Ammo tracking allows users to manage ammunition inventory and automatically deduct rounds used when sessions are logged. This feature integrates with the authenticated user model (Discord auth) and provides complete inventory management with audit trails.

## Goals

- Track ammo inventory per user (caliber, brand, load details)
- Store current on-hand quantity
- Automatically deduct ammo based on recorded shots in sessions/sheets
- Allow manual adjustments for purchases, transfers, corrections
- Provide clear audit trail of inventory changes
- Maintain minimal, dark theme, mobile-first UX

## Non-Goals (First Iteration)

- Price-per-round cost accounting
- Barcode scanning
- Distributor integrations
- Complex lot-level tracking

---

## Data Models

All models include `userId` (ObjectId -> User) for ownership.

### AmmoType

Represents a distinct ammo SKU/configuration.

```typescript
{
  _id: ObjectId
  userId: ObjectId (required, indexed)
  name: string (required) // e.g., "Federal AE 5.56 55gr FMJ"
  caliberId: ObjectId (required) // -> Caliber
  manufacturer?: string
  loadLabel?: string // e.g., "55gr FMJ", "124gr FMJ"
  casing?: 'brass' | 'steel' | 'aluminum' | 'other'
  isReload: boolean (default false)
  notes?: string
  isActive: boolean (default true)
  createdAt: Date
  updatedAt: Date
}
```

**Constraint**: `name` should be unique per user (warn on duplicates).

### AmmoInventory

Stores current on-hand count per ammo type.

```typescript
{
  _id: ObjectId
  userId: ObjectId (required, indexed)
  ammoTypeId: ObjectId (required, unique per user) // -> AmmoType
  onHand: number (required, default 0)
  reserved?: number (default 0) // future: reserved for planned sessions
  updatedAt: Date
}
```

### AmmoTransaction

Append-only log of all ammo changes.

```typescript
{
  _id: ObjectId
  userId: ObjectId (required, indexed)
  ammoTypeId: ObjectId (required, indexed) // -> AmmoType
  delta: number (required) // positive = add, negative = deduct
  reason: 'manual_add' | 'manual_subtract' | 'session_deduct' | 'session_adjust' | 'session_reversal' | 'inventory_set'
  sessionId?: ObjectId // -> RangeSession
  sheetId?: ObjectId // -> TargetSheet
  note?: string
  createdAt: Date
}
```

**Constraints**:
- Session-linked transactions must include `sessionId` and/or `sheetId`
- Do not edit transactions; prefer reversal transactions

### TargetSheet Updates

Add field:
- `ammoTypeId?: ObjectId` (-> AmmoType, optional initially)

**Behavior**:
- If `ammoTypeId` is missing, deduction logic skips but UI warns
- Can enforce required later once feature is adopted

---

## Deduction Logic

Ammo deductions must be accurate under create/edit/delete operations using difference-based reconciliation.

### Shot Count Source

For a TargetSheet: `shotsUsed = sum of Bull/AimPoint totalShots`

- `totalShots` derived from counts and/or `shotPositions` lengths
- Treat `shotPositions` as canonical when present, else counts sum
- Always compute `shotsUsed` server-side for integrity

### Transaction Strategy (Option A - Recommended)

Maintain exactly one "net" transaction per sheet:
- `reason: session_deduct`
- `delta: -shotsUsed`
- `sheetId`, `sessionId`, `ammoTypeId` present

**On Edit**:
1. Compute `newShotsUsed` and `previousShotsUsed`
2. Update existing transaction delta to `-newShotsUsed`
3. Apply deltaChange to inventory

**On AmmoType Change**:
1. Reverse old transaction on old `ammoTypeId`
2. Create new transaction on new `ammoTypeId`

**On Delete**:
- Create reversal transaction (`session_reversal`) with `+shotsUsed`
- Prefer reversal transactions for audit clarity

### Inventory Update Rules

After each transaction change, update `AmmoInventory.onHand` atomically using `$inc`.

**Idempotency**:
- Use unique constraints on `(sheetId, ammoTypeId, reason=session_deduct)`
- Compute deltaChange and apply

### Negative Inventory Behavior

Allow `onHand` to go negative (do not block saving sessions), but show warnings:
- UI badge "Negative" in red
- Suggest "Add stock" action

---

## UI/UX Specification

### Navigation

Add "Ammo" under Sessions:
- Sessions
  - Range Sessions
  - Ammo

### Pages

#### `/ammo` - Inventory List

**Layout**:
- Header: "Ammo"
- Primary actions:
  - Add Ammo Type
  - Add Stock (quick action)
- List of ammo types (cards on mobile / table on desktop)

**Each Card Shows**:
- Name
- Caliber
- On-hand (prominent)
- Optional tags: brass/steel, reload
- Quick actions: +/- buttons, View transactions
- Warning badge if onHand <= threshold or negative

**Filters**:
- Caliber
- Text search
- Show inactive

#### `/ammo/new` - Create Ammo Type

**Form Fields**:
- Name (required)
- Caliber (select, required)
- Manufacturer (optional)
- Load Label (optional)
- Casing (optional)
- Is Reload (checkbox)
- Notes (optional)
- Initial On-Hand (number)

**On Submit**:
- Create `AmmoType`
- Create `AmmoInventory` with `onHand = initial`
- Create `AmmoTransaction` with `reason=inventory_set`

#### `/ammo/[ammoTypeId]` - Ammo Detail

**Sections**:
- Summary card: current onHand, caliber, details
- Quick adjust buttons (Add/Subtract)
- Transaction list (paginated, newest first)
- Chart: onHand over time, shots deducted per session

#### Session/Sheet Integration

**Update Sheet Create/Edit UI**:
- Add field: "Ammo Used" (select ammo type)
  - Filtered by caliber
  - Allow "show all ammo" toggle
- Display computed shots for the sheet
- Show predicted inventory after save: "On hand after save: X"
- Warning if negative

---

## API Endpoints

All endpoints user-scoped (using session userId).

### Ammo Types

- `GET /api/ammo/types` - List all user's ammo types
- `POST /api/ammo/types` - Create new ammo type
- `GET /api/ammo/types/[id]` - Get ammo type details
- `PUT /api/ammo/types/[id]` - Update ammo type
- `DELETE /api/ammo/types/[id]` - Soft delete ammo type

### Inventory

- `GET /api/ammo/inventory` - List with ammo type + onHand
- `POST /api/ammo/inventory/adjust` - Manual adjustment
  - Body: `{ ammoTypeId, delta, note }`
  - Creates `AmmoTransaction` (manual_add/manual_subtract)
  - Updates inventory atomically

### Transactions

- `GET /api/ammo/transactions?ammoTypeId=&limit=&cursor=` - Transaction log
- `GET /api/ammo/summary` - Aggregates for charts (optional)

### Session Reconciliation

Update existing sheet save endpoint to reconcile ammo on create/update/delete.

---

## Authorization and Ownership

- Every `AmmoType`, `AmmoInventory`, `AmmoTransaction` must include `userId`
- All queries must filter by `userId`
- Middleware ensures valid session before API access

---

## Backward Compatibility

Existing sessions/sheets do not have `ammoTypeId`.

**Plan**:
- Add `ammoTypeId` as optional
- Update UI to encourage selection
- Analytics treat ammo usage as unknown for older sheets

**Optional Migration Tool**:
- "Assign ammo to existing sheets" feature
- Filter by caliber/date
- Bulk assign ammo type
- Run reconciliation in batch

---

## Analytics Additions

### Ammo-Aware Metrics

- Ammo consumption per session
- Consumption by firearm/caliber/distance
- Remaining inventory by caliber
- Projected sessions left (based on recent average)

### Charts

- Bar: shots consumed per session (stacked by ammo type)
- Pie/Donut: consumption by ammo type
- Line: onHand over sessions
- Table: top consumed ammo types

---

## Implementation Phases

### Phase 1: Core ✅ COMPLETED
- MongoDB models: AmmoType, AmmoInventory, AmmoTransaction
- API endpoints for CRUD operations
- `/ammo` list page + create ammo type
- Manual adjust endpoints and UI
- `/ammo/new` page for creating ammo types
- `/ammo/[id]` detail page with transaction log

### Phase 2: Session Integration ✅ COMPLETED
- Add `ammoTypeId` to TargetSheet schema
- Update sheet create/edit UI
- Add reconciliation logic on sheet save/edit/delete
- Show "after save inventory" preview (via transaction log)
- Ammo nav item added to AppShell

### Phase 3: Analytics (Future Enhancement)
- Add ammo consumption charts to analytics pages
- Add detail page charting (inventory over time)
- Projected sessions left feature
- Consumption by firearm/caliber/distance
- Top consumed ammo types table

---

## Implementation Status

**Status**: Phase 1 & 2 Complete, Phase 3 deferred

**Completed**:
- ✅ All MongoDB models created
- ✅ Full CRUD API endpoints for ammo types
- ✅ Inventory adjustment API
- ✅ Transaction log API
- ✅ Ammo inventory list page with filters and quick actions
- ✅ Create ammo type form with initial inventory
- ✅ Ammo detail page with transaction history
- ✅ Ammo navigation item in AppShell
- ✅ Sheet create/edit UI includes ammo type selector
- ✅ Reconciliation logic implemented for create/edit/delete
- ✅ Automatic inventory deduction on shot recording
- ✅ Difference-based updates on sheet edits
- ✅ Reversal transactions on sheet deletion or ammo type change

**Deferred to Phase 3**:
- ⏳ Ammo consumption charts in analytics
- ⏳ Inventory over time charting
- ⏳ Projected sessions left calculator
- ⏳ Advanced consumption metrics

The core ammo tracking feature is fully functional. Users can now:
1. Create and manage ammo types
2. Track inventory with automatic deductions
3. View complete transaction history
4. Have inventory automatically reconciled when sheets are created, edited, or deleted

---

## Acceptance Criteria

- ✅ Ammo nav item exists and is gated behind login
- ✅ User can create ammo types and set onHand
- ✅ User can adjust inventory with add/subtract and see transaction log
- ✅ When saving sheet with ammoType selected:
  - Inventory is deducted by computed shots
  - Editing sheet adjusts inventory by difference
  - Deleting sheet reverses deduction
- ✅ All ammo data is scoped to logged-in user
- ✅ UI is minimal, dark, mobile-first, consistent with existing app

---

## Technical Notes

### Reconciliation Algorithm

```typescript
async function reconcileAmmo(sheetId: string, ammoTypeId: string, shotsUsed: number) {
  // Find existing transaction for this sheet
  const existingTx = await AmmoTransaction.findOne({ sheetId, reason: 'session_deduct' });
  
  if (existingTx) {
    // Calculate the difference
    const oldShots = Math.abs(existingTx.delta);
    const deltaChange = -(shotsUsed - oldShots);
    
    // Update transaction
    existingTx.delta = -shotsUsed;
    await existingTx.save();
    
    // Update inventory
    await AmmoInventory.updateOne(
      { ammoTypeId },
      { $inc: { onHand: deltaChange } }
    );
  } else {
    // Create new transaction
    await AmmoTransaction.create({
      userId,
      ammoTypeId,
      delta: -shotsUsed,
      reason: 'session_deduct',
      sheetId,
      sessionId
    });
    
    // Update inventory
    await AmmoInventory.updateOne(
      { ammoTypeId },
      { $inc: { onHand: -shotsUsed } }
    );
  }
}
```

### Negative Inventory Handling

Do not prevent saves when inventory goes negative. Instead:
1. Display warning in UI
2. Highlight in red
3. Suggest "Add Stock" action
4. Include in inventory health checks
