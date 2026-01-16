# Quick Start: Phase 1 Migration

## Prerequisites

✅ Node.js installed (v18+)
✅ MongoDB connection string in `.env.local`
✅ Database backup created (recommended)

## Run Migration

Execute this single command to run all Phase 1 migration steps:

```bash
node scripts/migrate-phase1.mjs
```

This will:
1. Create the default "Six Bull" target template and scoring model
2. Update all TargetSheets to reference the template
3. Migrate all BullRecords to include new fields

**Expected output:**
```
╔═══════════════════════════════════════════════════════╗
║   Phase 1 Migration: Custom Target Types             ║
╚═══════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────┐
│ Step 1: Initialize Default Template                │
└─────────────────────────────────────────────────────┘
Connecting to MongoDB...
Connected to MongoDB

Creating default scoring model...
✓ Created scoring model: [ObjectId]

Creating default target template...
✓ Created target template: [ObjectId]

═══════════════════════════════════════════════════════
✓ Default template initialization complete!
═══════════════════════════════════════════════════════
...
```

## Verify Migration

After migration, test these flows:

1. **View Sessions**: Navigate to `/sessions` - should load normally
2. **View Sheet**: Open an existing sheet - data should display
3. **Edit Sheet**: Modify counts - should save correctly
4. **Analytics**: Check `/analytics` - charts should work
5. **Shot Entry**: Click on target - should register shots

## If Something Goes Wrong

1. Restore database from backup
2. Review error message in console
3. Check MongoDB connection
4. Verify `.env.local` has correct `MONGODB_URI`
5. Report issue with error details

## Individual Steps (Optional)

If you prefer to run steps separately:

```bash
# Step 1: Create template
node scripts/init-default-template.mjs

# Step 2: Migrate sheets
node scripts/migrate-target-sheets.mjs

# Step 3: Migrate bulls
node scripts/migrate-bull-records.mjs
```

## What Changed

After migration:
- All TargetSheets have `targetTemplateId`, `targetTemplateVersion`, and `aimPointCountSnapshot` fields
- All BullRecords have `aimPointId` and `countsByScore` fields
- Legacy fields remain intact for backward compatibility
- App continues to work exactly as before

## Next Actions

Once you confirm everything works:
1. Test thoroughly (see PHASE1-TESTING.md)
2. If all good, commit changes
3. Ready to proceed with Phase 2

## Need Help?

See detailed docs:
- `PHASE1-TESTING.md` - Comprehensive testing checklist
- `PHASE1-COMPLETE.md` - Full implementation summary
- `readme/18-custom-target-types.md` - Feature roadmap
