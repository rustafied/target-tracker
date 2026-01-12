# Ammo Tracking Quick Start Guide

## Getting Started

The ammo tracking feature helps you manage ammunition inventory and automatically tracks consumption as you record shooting sessions.

## Step 1: Add Your First Ammo Type

1. Click **"Ammo"** in the left sidebar (under Sessions)
2. Click **"Add Ammo Type"** button
3. Fill in the form:
   - **Name**: e.g., "Federal AE 5.56 55gr FMJ" (required)
   - **Caliber**: Select from your caliber list (required)
   - **Manufacturer**: e.g., "Federal" (optional)
   - **Load Label**: e.g., "55gr FMJ" (optional)
   - **Casing**: brass/steel/aluminum/other (optional)
   - **Is Reload**: Check if this is reloaded ammo (optional)
   - **Initial On-Hand**: How many rounds you currently have (default: 0)
   - **Notes**: Any additional info (optional)
4. Click **"Create Ammo Type"**

Your ammo type is now created with an initial inventory transaction!

## Step 2: Link Ammo to a Shooting Sheet

When creating a new target sheet:

1. Go to a session and click **"New Sheet"**
2. Select your firearm, caliber, and optic as usual
3. **New field**: **"Ammo Type"** - select the ammo you're using
   - This field is filtered by the caliber you selected
   - If no ammo shows up, you haven't created an ammo type for that caliber yet
   - This field is optional (backward compatible)
4. Create the sheet and record your shots as normal

**What happens**: When you save bulls with shot counts, the inventory for that ammo type will automatically be reduced by the total number of shots.

## Step 3: View Your Inventory

On the **`/ammo`** page you can:

- See all your ammo types with current on-hand quantities
- Use **quick buttons** (+50, -50) to adjust inventory
- **Filter by caliber** to narrow down the list
- **Search** by name, manufacturer, or load
- Click any card to see detailed transaction history

### Inventory Status Indicators
- **Normal**: Shows current quantity
- **Empty** badge: On-hand = 0
- **Negative** badge: On-hand < 0 (warning - suggests you need to add stock)

## Step 4: Manual Adjustments

To manually adjust inventory (e.g., after purchasing ammo):

1. Go to `/ammo` and click a card, OR use quick buttons on list page
2. On detail page, click **"Adjust Stock"**
3. Use quick buttons (+50, +100, -50, -100) OR enter custom amount
4. Optionally add a note (e.g., "Purchased from LGS")
5. Click **"Apply"**

The inventory updates immediately and a transaction is created.

## Step 5: View Transaction History

On the **`/ammo/[id]`** detail page:

- See **current on-hand** quantity
- See **total rounds used** across all sessions
- View **complete transaction log**:
  - Manual adds/subtracts
  - Session deductions (linked to specific sheets)
  - Session reversals (when sheets are deleted)
  - Initial inventory sets

Each transaction shows:
- Reason (manual, session, reversal, etc.)
- Delta (+/-)
- Note (if provided)
- Time (relative, e.g., "2 hours ago")

## How Automatic Deductions Work

### When You Create a Sheet
- If you select an ammo type, **no deduction happens yet**
- Deduction only occurs when you record shots in bulls

### When You Record Shots
- Total shots = sum of all aim point shots across all bulls on the sheet
- Inventory is deducted by that total
- A transaction is created: `reason: session_deduct`

### When You Edit a Sheet
- The system calculates the **difference** between old and new shot counts
- Only the **delta** is applied to inventory
- You won't get double-deducted!

### When You Delete a Sheet
- A **reversal transaction** is created
- Inventory is **restored** by the amount that was deducted
- Audit trail preserved (shows session was deleted)

### When You Change Ammo Type on a Sheet
- The old ammo type is reversed (inventory restored)
- The new ammo type is deducted (inventory reduced)
- Both transactions recorded for audit

## Tips and Best Practices

### Naming Convention
Use descriptive names like: `"Brand Caliber Load"` 
- ✅ "Federal AE 5.56 55gr FMJ"
- ✅ "Hornady 9mm 124gr JHP"
- ✅ "Winchester .308 147gr FMJ"

### Initial Inventory
When creating a new ammo type, enter your current on-hand quantity. This creates a clean starting point.

### Negative Inventory
It's OK to go negative temporarily - this means you've shot more than you recorded having. Just add stock when you get more ammo.

### Manual Adjustments
Use manual adjustments for:
- Purchasing new ammo
- Finding ammo you forgot to count
- Correcting mistakes
- Transferring ammo between storage locations

### Searching and Filtering
Use the search box to quickly find ammo by:
- Name
- Manufacturer
- Load label
- Caliber

Use the caliber filter dropdown to see only ammo for a specific caliber.

## FAQ

**Q: Do I have to select an ammo type when creating a sheet?**  
A: No, it's optional. The feature is backward compatible with existing workflows.

**Q: What happens to old sheets created before ammo tracking?**  
A: They continue to work normally. They just don't have an ammo type linked.

**Q: Can I change the ammo type on an existing sheet?**  
A: Yes! When you edit the sheet, the old ammo will be reversed and the new ammo will be deducted.

**Q: Why is my inventory negative?**  
A: You've recorded more shots than you had inventory. Add stock to bring it back to positive.

**Q: Can I delete an ammo type?**  
A: Currently ammo types are soft-deleted (marked inactive). Edit the ammo type to manage it.

**Q: Where do shot counts come from?**  
A: Shot counts are calculated from the `totalShots` field on each aim point record for all bulls on a sheet.

**Q: Can I see charts/analytics for ammo consumption?**  
A: Not yet - this is planned for a future Phase 3 enhancement.

## Support

If you encounter issues:
1. Check the transaction log on `/ammo/[id]` to see what happened
2. Verify your shot counts on the sheet
3. Use manual adjustments to correct any discrepancies
4. All transactions are logged for audit purposes

---

**Pro Tip**: Keep your ammo inventory up to date by adding new purchases immediately. This way, your deductions will always be accurate!
