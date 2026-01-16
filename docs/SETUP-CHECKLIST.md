# Setup Checklist - Authentication & Multi-User Prep

Complete these steps to enable authentication and prepare for multi-user support.

## ✅ Phase 1: Discord Authentication Setup

### 1. Create Discord Application
- [ ] Go to https://discord.com/developers/applications
- [ ] Click "New Application" and name it "Target Tracker"
- [ ] Go to OAuth2 → General
- [ ] Copy the Client ID
- [ ] Reset and copy the Client Secret
- [ ] Add redirect URL: `http://localhost:3000/api/auth/callback/discord`
- [ ] Save changes

### 2. Get Your Discord User ID
- [ ] Open Discord
- [ ] Go to User Settings → Advanced
- [ ] Enable "Developer Mode"
- [ ] Right-click your username → "Copy User ID"
- [ ] Save this ID for the next step

### 3. Configure Environment Variables
Create or update `.env.local` with:

```bash
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/target-tracker

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Discord OAuth
DISCORD_CLIENT_ID=<from Discord Developer Portal>
DISCORD_CLIENT_SECRET=<from Discord Developer Portal>

# Master Admin (your Discord user ID)
MASTER_DISCORD_ID=<your Discord user ID>
```

- [ ] Set `MONGODB_URI`
- [ ] Generate and set `NEXTAUTH_SECRET` (run: `openssl rand -base64 32`)
- [ ] Set `DISCORD_CLIENT_ID` from Discord app
- [ ] Set `DISCORD_CLIENT_SECRET` from Discord app
- [ ] Set `MASTER_DISCORD_ID` with your Discord user ID

## ✅ Phase 2: Migrate Existing Data

### 4. Run Migration Script
This attaches all your existing data to your user account:

```bash
node scripts/attach-data-to-user.mjs
```

Expected output:
```
🚀 Starting data migration...
✅ Connected to MongoDB
✅ Found master admin user: [your user id]
📝 Updating collections...
   rangesessions: Updated X records
   targetsheets: Updated X records
   firearms: Updated X records
   optics: Updated X records
   calibers: Updated X records
   bullrecords: Updated X records
✅ Migration complete!
```

- [ ] Migration script ran successfully
- [ ] All collections were updated

## ✅ Phase 3: Test Authentication

### 5. Start Development Server
```bash
npm run dev
```

### 6. Test Login Flow
- [ ] Visit `http://localhost:3000`
- [ ] Should redirect to `/login`
- [ ] Click "Continue with Discord"
- [ ] Authorize the application
- [ ] Should redirect back and show the app
- [ ] Your avatar should appear in the user menu (top right on mobile, bottom of sidebar on desktop)

### 7. Test Sign Out
- [ ] Click your avatar/username
- [ ] Click "Sign out"
- [ ] Should return to `/login`
- [ ] Trying to visit any page should redirect to `/login`

### 8. Verify Data Access
- [ ] All your existing sessions should be visible
- [ ] All your firearms, optics, calibers should be there
- [ ] Can create new sessions/sheets/equipment
- [ ] Everything works as before

## ✅ Phase 4: Verify Database

### 9. Check User Record
Connect to MongoDB and verify your user was created:

```bash
mongosh
use target-tracker
db.users.find({ discordId: "YOUR_DISCORD_ID" }).pretty()
```

Should show:
- `isApproved: true`
- `role: "admin"`
- `lastLoginAt` timestamp
- Your Discord username/avatar

- [ ] User record exists
- [ ] User is approved and admin

### 10. Check Data Ownership
Verify all records have your userId:

```javascript
// In mongosh
db.rangesessions.findOne({}, { userId: 1 })
db.targetsheets.findOne({}, { userId: 1 })
db.firearms.findOne({}, { userId: 1 })
```

All should have a `userId` field.

- [ ] All existing records have `userId`
- [ ] New records automatically get `userId`

## 🎉 Setup Complete!

Your app now has:
- ✅ Discord authentication
- ✅ Site-wide route protection
- ✅ Master admin access control
- ✅ All existing data owned by your user
- ✅ Database ready for multi-user expansion

## 📚 Additional Documentation

- **Full Auth Guide**: `readme/17-authentication-setup.md`
- **Multi-User Prep**: `MULTI-USER-PREP.md`
- **Auth Implementation**: `AUTHENTICATION.md`
- **Environment Setup**: `ENV_SETUP.md`

## 🚨 Troubleshooting

### "Access denied" error
- Verify `MASTER_DISCORD_ID` matches your Discord user ID exactly
- Check Developer Mode is enabled in Discord

### Migration script fails
- Make sure MongoDB is running
- Verify `MONGODB_URI` is correct
- Check `MASTER_DISCORD_ID` is set in `.env.local`

### Redirect loop
- Ensure `NEXTAUTH_URL` matches your current URL
- Check middleware is not blocking auth routes

### Can't see data after login
- Run the migration script: `node scripts/attach-data-to-user.mjs`
- Check API routes are using auth-helpers correctly

## 🔮 Future: Enable Multi-User

When ready to allow other users:

1. **Update `lib/auth.ts`** - Remove master-only restriction
2. **Create Admin UI** - Add user approval interface at `/admin/users`
3. **Enable Filtering** - Uncomment userId filters in API routes
4. **Test** - Create test accounts and verify data isolation

See `MULTI-USER-PREP.md` for detailed instructions.

---

**Need Help?** Check the troubleshooting sections in:
- `readme/17-authentication-setup.md`
- `ENV_SETUP.md`
