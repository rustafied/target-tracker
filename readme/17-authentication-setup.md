# Authentication Setup Guide

This guide explains how to set up Discord authentication for Target Tracker.

## Overview

Target Tracker uses NextAuth.js with Discord OAuth to authenticate users. Currently, only a single master admin user (specified by Discord ID) can access the application. The system is designed to support multiple users in the future without requiring major changes.

## Prerequisites

1. A Discord account
2. A Discord application for OAuth

## Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Target Tracker")
4. Go to the "OAuth2" section
5. Add a redirect URL:
   - For local development: `http://localhost:3000/api/auth/callback/discord`
   - For production: `https://yourdomain.com/api/auth/callback/discord`
6. Copy your **Client ID** and **Client Secret**

## Step 2: Get Your Discord User ID

1. Open Discord
2. Go to User Settings → Advanced
3. Enable "Developer Mode"
4. Right-click your username and select "Copy User ID"
5. Save this ID - this will be your `MASTER_DISCORD_ID`

## Step 3: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/target-tracker

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Master Admin User
MASTER_DISCORD_ID=your-discord-user-id
```

### Generating NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

## Step 4: Test Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. You should be redirected to `/login`
4. Click "Continue with Discord"
5. Authorize the application
6. You should be redirected back and logged in

## Security Notes

- **Never commit `.env.local`** to version control
- The `NEXTAUTH_SECRET` should be different for each environment
- Only the Discord user with ID matching `MASTER_DISCORD_ID` can access the app
- All other users will see "This account is not authorized"

## Data Model

When the master admin logs in, a `User` record is created in MongoDB with:

- `discordId`: Your Discord user ID
- `username`: Your Discord username
- `avatar`: Your Discord avatar URL
- `isApproved`: `true` (automatically set for master admin)
- `role`: `"admin"`
- `lastLoginAt`: Timestamp of last login

## Future Multi-User Support

The authentication system is designed to support multiple users in the future:

1. Additional users can create accounts (currently blocked)
2. An admin panel will allow approving/rejecting users
3. User roles and permissions can be expanded
4. Data ownership (sessions, sheets) can be tied to users

The `MASTER_DISCORD_ID` will always remain a super-admin backdoor for recovery purposes.

## Troubleshooting

### "Access denied" error
- Verify your Discord User ID matches `MASTER_DISCORD_ID` exactly
- Check that all environment variables are set correctly

### Redirect loop
- Ensure `NEXTAUTH_URL` matches your current URL
- Check that middleware is not blocking auth routes

### "Configuration error"
- Verify Discord Client ID and Secret are correct
- Ensure redirect URL in Discord matches your NextAuth callback URL

## Production Deployment

For production:

1. Update `NEXTAUTH_URL` to your production domain
2. Add production redirect URL to Discord application
3. Generate a new `NEXTAUTH_SECRET` for production
4. Ensure all environment variables are set in your hosting platform
5. Keep `MASTER_DISCORD_ID` the same (your Discord user ID)
