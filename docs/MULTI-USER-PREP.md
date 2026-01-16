# Multi-User Preparation Complete

All existing data has been prepared for multi-user support. A `userId` field has been added to all data models, and a migration script is ready to attach your existing data to your user account.

## What Was Done

### 1. Updated Data Models
Added `userId` field to all collections:
- ✅ `RangeSession`
- ✅ `TargetSheet`
- ✅ `Firearm`
- ✅ `Optic`
- ✅ `Caliber`
- ✅ `BullRecord`

All new records created will automatically be associated with the logged-in user.

### 2. Updated API Routes
All creation endpoints now set `userId` when creating records:
- ✅ `POST /api/sessions` - Attaches userId to new sessions
- ✅ `POST /api/firearms` - Attaches userId to new firearms
- ✅ `POST /api/optics` - Attaches userId to new optics
- ✅ `POST /api/calibers` - Attaches userId to new calibers
- ✅ `POST /api/sheets` - Attaches userId to new sheets
- ✅ `POST /api/bulls` - Attaches userId to new bull records

All GET endpoints verify authentication but currently return all records (since only master admin can access the app).

### 3. Created Migration Script
`scripts/attach-data-to-user.mjs` will:
- Find or create your master admin User record
- Update all existing records to have your `userId`
- Prepare the database for future multi-user support

## Next Steps

### Step 1: Set Up Authentication
Follow the setup guide in `readme/17-authentication-setup.md` or `ENV_SETUP.md` to:
1. Create a Discord application
2. Get your Discord user ID
3. Set all required environment variables in `.env.local`

Make sure you have these set:
```bash
MASTER_DISCORD_ID=your-discord-user-id
NEXTAUTH_SECRET=your-secret
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
```

### Step 2: Run the Migration Script
Once your environment variables are set, run:

```bash
node scripts/attach-data-to-user.mjs
```

This will:
- Create or find your User record based on `MASTER_DISCORD_ID`
- Update all existing data to be owned by you
- Show a summary of what was updated

Example output:
```
🚀 Starting data migration...
📡 Connecting to MongoDB...
✅ Connected to MongoDB

👤 Getting master admin user...
✅ Found master admin user: 677abc123def456789012345
   Discord ID: 123456789012345678
   Username: YourUsername

📝 Updating collections...
   rangesessions: Updated 15 records
   targetsheets: Updated 42 records
   firearms: Updated 5 records
   optics: Updated 3 records
   calibers: Updated 4 records
   bullrecords: Updated 126 records

✅ Migration complete! Updated 195 total records
```

### Step 3: Test Everything
After migration:
1. Start your dev server: `npm run dev`
2. Log in with Discord
3. Verify all your existing data is still there
4. Create new records and verify they have `userId` set

## Future Multi-User Support

When you're ready to allow other users, you'll need to:

### Phase 1: Enable Multi-User Login
In `lib/auth.ts`, update the `signIn` callback:
```typescript
// Remove or comment out the master-only check:
// if (discordId !== masterDiscordId) {
//   return "/login?error=not_allowed";
// }

// Instead, allow all users to create accounts:
// (They won't see any data yet until approved)
```

### Phase 2: Add Admin Approval UI
Create an admin panel at `/admin/users`:
- List all pending users (`isApproved: false`)
- Approve/reject functionality
- User management

### Phase 3: Add Data Filtering
In API routes, uncomment and enable the `userId` filtering:
```typescript
// In GET endpoints, change from:
const sessions = await RangeSession.find().sort({ date: -1 });

// To:
const sessions = await RangeSession.find({ userId }).sort({ date: -1 });
```

This ensures users only see their own data.

### Phase 4: Shared Equipment (Optional)
You may want to make Firearms, Optics, and Calibers shared across all users:
- Remove userId filtering for equipment
- Or add a `isShared` flag
- Or add team/organization support

## Database Schema Ready

Your MongoDB is now fully prepared for multi-user support. All the plumbing is in place:

- ✅ User model with roles and approval status
- ✅ All data models have userId fields
- ✅ API routes set userId on creation
- ✅ Authentication system in place
- ✅ Master admin backdoor preserved

The transition to multi-user is now a configuration change rather than a database migration!

## Security Notes

- The `MASTER_DISCORD_ID` will always remain as a super-admin backdoor
- Even with multi-user enabled, this Discord ID bypasses all approval checks
- Use this for recovery if something goes wrong with user management

## Testing the Migration

You can check if the migration worked by running:

```bash
# Connect to MongoDB
mongosh

# Use your database
use target-tracker

# Check if any records are missing userId
db.rangesessions.countDocuments({ userId: { $exists: false } })
db.targetsheets.countDocuments({ userId: { $exists: false } })
db.firearms.countDocuments({ userId: { $exists: false } })
db.optics.countDocuments({ userId: { $exists: false } })
db.calibers.countDocuments({ userId: { $exists: false } })
db.bullrecords.countDocuments({ userId: { $exists: false } })

# All counts should be 0 after migration
```

## Rollback (If Needed)

If you need to remove userId fields for any reason:

```javascript
// In mongosh
use target-tracker
db.rangesessions.updateMany({}, { $unset: { userId: "" } })
db.targetsheets.updateMany({}, { $unset: { userId: "" } })
db.firearms.updateMany({}, { $unset: { userId: "" } })
db.optics.updateMany({}, { $unset: { userId: "" } })
db.calibers.updateMany({}, { $unset: { userId: "" } })
db.bullrecords.updateMany({}, { $unset: { userId: "" } })
```

But this is not recommended if you plan to add more users in the future!
