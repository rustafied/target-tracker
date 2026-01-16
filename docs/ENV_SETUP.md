# Environment Variables Setup

Copy this template to your `.env.local` file and fill in the values.

```bash
# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/target-tracker

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Discord OAuth
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Master Admin User (only this Discord ID can access the app)
MASTER_DISCORD_ID=
```

## Quick Setup Steps

### 1. Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output and paste it as your `NEXTAUTH_SECRET`.

### 2. Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "Target Tracker" (or whatever you prefer)
4. Go to "OAuth2" → "General"
5. Copy the **Client ID** → paste as `DISCORD_CLIENT_ID`
6. Click "Reset Secret" → Copy it → paste as `DISCORD_CLIENT_SECRET`
7. Add Redirect URL: `http://localhost:3000/api/auth/callback/discord`
8. Save changes

### 3. Get Your Discord User ID

1. Open Discord
2. User Settings → Advanced → Enable "Developer Mode"
3. Right-click your username → "Copy User ID"
4. Paste as `MASTER_DISCORD_ID`

### 4. Verify MongoDB

Make sure MongoDB is running locally:

```bash
# Check if MongoDB is running
mongosh --eval "db.version()"
```

If not installed, install MongoDB Community Edition from https://www.mongodb.com/try/download/community

## Production Environment Variables

For production deployment (Vercel, etc.), set these same variables but update:

- `NEXTAUTH_URL` → Your production domain (e.g., `https://target-tracker.vercel.app`)
- `MONGODB_URI` → Your MongoDB Atlas connection string (if using Atlas)
- Generate a **new** `NEXTAUTH_SECRET` for production (don't reuse dev secret)
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` → Same values (or create a separate Discord app for production)
- Add production callback URL to Discord: `https://yourdomain.com/api/auth/callback/discord`
- `MASTER_DISCORD_ID` → Same value (your Discord user ID)

## Troubleshooting

**"Configuration error" or "Invalid client"**
- Double-check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Make sure there are no extra spaces or quotes

**"Access denied"**
- Verify `MASTER_DISCORD_ID` matches your Discord user ID exactly
- Make sure you enabled Developer Mode and copied the correct ID

**"Redirect URI mismatch"**
- Ensure the redirect URL in Discord matches exactly: `http://localhost:3000/api/auth/callback/discord`
- Check that `NEXTAUTH_URL` is set correctly

**MongoDB connection errors**
- Verify MongoDB is running: `mongosh`
- Check `MONGODB_URI` format is correct

## Security Notes

- **Never commit `.env.local`** to git (it's already in `.gitignore`)
- Keep your `NEXTAUTH_SECRET` secure and unique per environment
- Don't share your Discord client secret
- Use different secrets for dev/staging/production
