# Ammo Tracking - Simplified Caliber-Based Implementation

## ✅ REFACTORED - Now Tracks at Caliber Level

The ammo tracking feature has been **simplified** to track inventory at the **caliber level only**, not by specific ammo types (brand/load). This provides a cleaner, more streamlined experience.

## How It Works

### Automatic Tracking
- When you create a sheet and select a **caliber**, that's all you need
- When you record shots, inventory for that **caliber** is automatically deducted
- No need to manage specific ammo types (brands, loads, etc.)

### Example
```
You shoot 50 rounds of 5.56
→ Your "5.56" inventory decreases by 50
(Doesn't matter if it was Federal, Hornady, or Winchester)
```

## What's Been Built

### ✅ Core Features
- **Caliber-Based Inventory**: Track rounds on-hand per caliber
- **Automatic Deductions**: Ammo deducted when sheets are saved
- **Manual Adjustments**: Add/subtract inventory with quick buttons or custom amounts
- **Transaction Log**: Complete audit trail of all changes
- **Reconciliation**: Handles create/edit/delete with difference-based updates

### 📁 Files

**Models:**
- `lib/models/AmmoInventory.ts` - Tracks on-hand per caliber per user
- `lib/models/AmmoTransaction.ts` - Audit log of all changes
- `lib/ammo-reconciliation.ts` - Reconciliation logic

**API:**
- `/api/ammo/inventory` - Get inventory list
- `/api/ammo/inventory/adjust` - Manual adjustments
- `/api/ammo/transactions` - Transaction history

**UI:**
- `/ammo` - Inventory list (shows all calibers with on-hand counts)
- `/ammo/[caliberId]` - Detail page with transaction history

**Integration:**
- Sheet creation automatically links to caliber
- Reconciliation happens on save/edit/delete

## User Flow

### 1. View Inventory
Navigate to **Ammo** in sidebar → See all your calibers with current counts

### 2. Adjust Manually
- Click a caliber card
- Use quick buttons (+50, +100, -50, -100) or custom amount
- Add optional note (e.g., "Purchased 500 rounds")

### 3. Automatic Deduction
- Create a sheet and select caliber
- Record shots in bulls
- On save, that caliber's inventory automatically decreases

### 4. View History
- Click any caliber to see complete transaction log
- See manual adjustments, session deductions, and reversals

## Technical Details

### Data Model
```typescript
AmmoInventory {
  userId: ObjectId
  caliberId: ObjectId  // Links to existing Caliber
  onHand: number
  reserved: number
  updatedAt: Date
}

AmmoTransaction {
  userId: ObjectId
  caliberId: ObjectId
  delta: number  // +/- amount
  reason: "manual_add" | "manual_subtract" | "session_deduct" | "session_reversal"
  sessionId?: ObjectId
  sheetId?: ObjectId
  note?: string
  createdAt: Date
}
```

### Reconciliation
- **Create**: Deducts from caliber when sheet saved
- **Edit**: Applies only the difference (no double-counting)
- **Delete**: Creates reversal transaction, restores inventory
- **Shot Calculation**: Sum of all `AimPointRecord.totalShots` for the sheet

### Benefits of Caliber-Level Tracking
1. **Simpler**: No need to create/manage ammo types
2. **Automatic**: Uses existing caliber setup
3. **Flexible**: Track total rounds without brand/load complexity
4. **Cleaner UX**: One less step when creating sheets

## Differences from Original Spec

**Original Plan**: Track specific ammo types (Federal 5.56 55gr, Hornady 5.56 62gr, etc.)

**Implemented**: Track by caliber only (5.56, 9mm, .308, etc.)

**Why**: User requested simpler caliber-level tracking. Existing caliber setup in `/setup/calibers` is reused.

## Next Steps

If you later want brand/load-specific tracking, we can:
1. Add optional fields to Caliber (manufacturer, load)
2. Or create AmmoType as a sub-category of Caliber
3. Keep the same reconciliation logic, just more granular

For now, this provides clean inventory management without extra complexity.

---

**Status**: ✅ Complete and functional
**Date**: January 2026
