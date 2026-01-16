# Ammo Transaction Delete Feature

## Overview
Added ability to delete manual ammo transactions (add/subtract) from the caliber detail page.

## What Was Added

### Backend API
**New Endpoint**: `DELETE /api/ammo/transactions/[id]`

**Location**: `app/api/ammo/transactions/[id]/route.ts`

**Features**:
- Deletes a transaction by ID
- Verifies user ownership
- **Only allows deletion of manual transactions** (manual_add, manual_subtract)
- **Blocks deletion of session-linked transactions** (session_deduct)
- Automatically reverses the inventory change when deleting
- Returns appropriate error messages

**Security**:
- Requires authentication
- Verifies transaction belongs to the user
- Validates transaction ID format

### Frontend UI
**Location**: `app/ammo/[id]/page.tsx`

**Features**:
- Delete button (trash icon) appears next to manual transactions
- Confirmation dialog before deletion
- Shows transaction details in confirmation
- Loading state during deletion
- Success/error toasts
- Automatically reloads data after deletion

**UI Details**:
- Delete button only shows for `manual_add` and `manual_subtract` transactions
- Red trash icon with hover effects
- Confirmation dialog shows:
  - Transaction type
  - Amount (+/- rounds)
  - Note (if any)
  - Date/time
- Delete button in dialog is styled as destructive (red)

## User Flow

1. User navigates to `/ammo/[caliber-slug]`
2. Views transaction history
3. Sees trash icon next to manual transactions (add/subtract)
4. Clicks trash icon
5. Confirmation dialog appears with transaction details
6. User confirms deletion
7. Transaction is deleted
8. Inventory is automatically adjusted (reversed)
9. Page reloads with updated data
10. Success toast appears

## What Can Be Deleted

✅ **Can Delete**:
- Manual Add transactions
- Manual Subtract transactions

❌ **Cannot Delete**:
- Session-linked transactions (session_deduct)
- Transactions from shooting sessions
- These are tied to actual range sessions and should not be deleted independently

## Technical Details

### Inventory Reversal Logic
When deleting a transaction, the inventory change is reversed:
- If transaction was `+500` rounds → inventory decreases by 500
- If transaction was `-100` rounds → inventory increases by 100
- Formula: `$inc: { onHand: -transaction.delta }`

### Error Handling
- Invalid transaction ID → 400 Bad Request
- Transaction not found → 404 Not Found
- Not transaction owner → 403 Forbidden
- Trying to delete session transaction → 400 Bad Request with explanation
- Server error → 500 Internal Server Error

## Files Modified

1. **app/api/ammo/transactions/[id]/route.ts** (NEW)
   - DELETE endpoint for transactions

2. **app/ammo/[id]/page.tsx** (MODIFIED)
   - Added delete button to transaction UI
   - Added confirmation dialog
   - Added delete handler function
   - Added `canDeleteTransaction()` helper
   - Imported Trash2 icon

## Testing

To test:
1. Go to any caliber detail page
2. Add a manual transaction (use the adjust dialog)
3. See the trash icon appear next to it
4. Click the trash icon
5. Confirm deletion
6. Verify:
   - Transaction is removed from list
   - Inventory count is updated correctly
   - Success toast appears

Try to delete a session-linked transaction:
1. Shoot a range session with ammo tracking
2. Go to that caliber's detail page
3. Notice NO trash icon appears next to session transactions
4. This is correct behavior

## Benefits

- Users can fix mistakes in manual inventory adjustments
- Clean up accidental duplicate entries
- Maintain accurate inventory records
- Protects session-linked data integrity
- Clear visual feedback on what can/cannot be deleted
