# Ammo Tracking - Properly Linked to User's Setup Calibers

## ✅ Properly Linked and User-Scoped

The ammo tracking is now **directly linked** to each user's calibers from **Setup → Calibers**. All data is properly scoped by `userId`.

## How It Works

### 1. User Creates Calibers in Setup
- Go to **Setup → Calibers**
- Add calibers like "5.56", "9mm", ".308 Win", etc.
- Each caliber is linked to your user account

### 2. Ammo Inventory Shows Your Calibers
- Navigate to **Ammo** in sidebar
- See **ALL your calibers** from setup
- Even calibers with 0 rounds show up (so you know what you can track)
- Inventory is displayed with current on-hand count for each

### 3. Automatic Tracking
- When you create a sheet, select your **firearm + caliber**
- Record shots
- On save, **that caliber's inventory** automatically decreases

### 4. Manual Adjustments
- Click any caliber to view details
- Use quick buttons or custom amounts to adjust inventory
- Transactions are logged per caliber

## Changes Made for Proper Linking

### ✅ Fixed User Scoping
**Before**: Caliber API returned ALL calibers (not filtered by user)
**After**: Caliber API now properly filters by `userId`

```typescript
// GET /api/calibers
const calibers = await Caliber.find({ userId, isActive: true });
```

### ✅ Show All User Calibers
**Before**: Ammo page only showed calibers with existing inventory
**After**: Ammo page shows ALL user's calibers (even ones with 0 inventory)

This makes it clear that:
- Ammo tracking is directly linked to your caliber setup
- You see your complete caliber collection
- Easy to identify which calibers need restocking

### ✅ Security Improvements
All caliber CRUD operations now filter by `userId`:
- `GET /api/calibers` - Only your calibers
- `GET /api/calibers/[id]` - Only your caliber
- `PUT /api/calibers/[id]` - Only update your caliber
- `DELETE /api/calibers/[id]` - Only archive your caliber

### ✅ UI Clarity
- Header on `/ammo` says: **"Linked to your calibers from Setup"**
- Button to **"Manage Calibers"** goes to setup page
- Empty state directs users to **Setup → Calibers**

## Data Flow

```
Setup → Calibers
  ├─ User creates "5.56"
  ├─ User creates "9mm"
  └─ User creates ".308 Win"

Ammo Page
  ├─ Shows "5.56" (0 rounds)
  ├─ Shows "9mm" (0 rounds)
  └─ Shows ".308 Win" (0 rounds)

User adds 500 rounds to "5.56"
  └─ Manual transaction created

User shoots 50 rounds with 5.56
  └─ Session creates sheet with 5.56 caliber
  └─ Records 50 shots
  └─ Inventory: 5.56 now shows 450 rounds
```

## Multi-User Support

Each user has:
- ✅ Their own calibers (from setup)
- ✅ Their own ammo inventory (per caliber)
- ✅ Their own transaction history
- ✅ Complete data isolation

## Testing Checklist

- [x] User A's calibers only show in their ammo inventory
- [x] User B's calibers are separate
- [x] Ammo page shows all user's calibers (even 0 inventory)
- [x] Manual adjustments create transactions per user
- [x] Sheet creation deducts from user's caliber inventory
- [x] Caliber CRUD operations are user-scoped
- [x] Transaction history is user-specific

## Benefits

1. **No Duplication**: Uses existing caliber setup
2. **Clear Linkage**: Users see their calibers = their inventory
3. **Simple UX**: No need to "create" ammo separately
4. **Multi-User Ready**: Proper data isolation
5. **Automatic**: Just record shots, inventory updates

---

**Status**: ✅ Fully linked and user-scoped
**Date**: January 2026
