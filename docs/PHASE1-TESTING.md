# Phase 1 Testing Guide

## Pre-Migration Checklist

Before running the migration, verify:

- [ ] Database backup created
- [ ] `.env.local` has valid `MONGODB_URI`
- [ ] Node.js is installed (v18+)
- [ ] All dependencies are installed (`npm install`)

## Running the Migration

### Option 1: Run All Steps Together (Recommended)

```bash
node scripts/migrate-phase1.mjs
```

This will:
1. Create the default "Six Bull" template and scoring model
2. Update all TargetSheets to reference the template
3. Convert all BullRecords to include new fields

### Option 2: Run Steps Individually

```bash
# Step 1: Initialize default template
node scripts/init-default-template.mjs

# Step 2: Migrate TargetSheets
node scripts/migrate-target-sheets.mjs

# Step 3: Migrate BullRecords
node scripts/migrate-bull-records.mjs
```

## Post-Migration Testing

### 1. Database Verification

Check that migration completed successfully:

```javascript
// Connect to MongoDB and run these queries

// Check template exists
db.targettemplates.findOne({ name: "Six Bull (Default)", isSystem: true })

// Check sheets have template
db.targetsheets.findOne({ targetTemplateId: { $exists: true } })

// Check bulls have aimPointId
db.bullrecords.findOne({ aimPointId: { $exists: true } })

// Count migrated records
db.targetsheets.countDocuments({ targetTemplateId: { $exists: true } })
db.bullrecords.countDocuments({ aimPointId: { $exists: true } })
```

### 2. Application Testing

Test these workflows to ensure backward compatibility:

#### A. View Existing Sessions
- [ ] Navigate to `/sessions`
- [ ] Open an existing session
- [ ] Verify sheets display correctly
- [ ] Check that bull data shows properly

#### B. View Existing Sheets
- [ ] Navigate to `/sessions/[sessionId]/sheets/[sheetId]`
- [ ] Verify sheet details load
- [ ] Check that all 6 bulls display
- [ ] Verify scores show correctly

#### C. Edit Sheet Data
- [ ] Click "Edit" on a sheet
- [ ] Change count values for a bull
- [ ] Save changes
- [ ] Verify data persists correctly

#### D. Interactive Target Input
- [ ] Open sheet edit page
- [ ] Click on a bull to add shot positions
- [ ] Verify shots appear on target
- [ ] Verify scores calculate correctly

#### E. Analytics
- [ ] Navigate to `/analytics`
- [ ] Check overview stats
- [ ] Navigate to `/analytics/firearms`
- [ ] Verify charts display correctly
- [ ] Navigate to `/analytics/calibers`
- [ ] Check that data shows properly

#### F. Create New Sheet
- [ ] Create a new range session
- [ ] Add a new sheet to the session
- [ ] Enter shot data (counts or clicks)
- [ ] Verify it saves and displays correctly

### 3. API Endpoint Testing

Test API endpoints directly:

```bash
# Get a sheet (replace with actual ID)
curl http://localhost:3000/api/sheets/[sheetId]

# Create a new bull record
curl -X POST http://localhost:3000/api/bulls \
  -H "Content-Type: application/json" \
  -d '{
    "targetSheetId": "[sheetId]",
    "bullIndex": 1,
    "score5Count": 2,
    "score4Count": 3,
    "score3Count": 1,
    "score2Count": 0,
    "score1Count": 0,
    "score0Count": 0
  }'
```

### 4. Console Error Checking

Monitor the browser console and server logs for:
- [ ] No TypeScript errors
- [ ] No database connection errors
- [ ] No missing field warnings
- [ ] No failed API requests

### Expected Behavior

After migration:
- All existing data continues to work unchanged
- Sheet viewing works normally
- Sheet editing works normally
- Interactive target clicking works normally
- Analytics show same results
- New sheets can be created
- Both old and new field formats are supported

### Rollback Plan

If issues occur:

1. Restore database from backup
2. Remove new model files
3. Revert changes to TargetSheet model
4. Report issues

## Known Limitations

Phase 1 limitations:
- Only default "Six Bull" template available
- Cannot create custom templates yet
- Template selection not yet in UI
- All sheets use the same template

These will be addressed in Phase 2 and beyond.

## Success Criteria

Migration is successful if:
- ✓ All existing sheets load and display correctly
- ✓ All existing analytics work unchanged
- ✓ Sheet editing and data entry work normally
- ✓ No regression in any existing functionality
- ✓ New template fields are populated in database

## Next Steps After Phase 1

Once Phase 1 testing passes:
1. Commit changes to version control
2. Deploy to staging environment
3. Run migration on staging database
4. Test in staging
5. Prepare for Phase 2: Template-Driven UI
