# Authentication Implementation Summary

## Overview

Discord OAuth authentication has been successfully implemented for Target Tracker. The entire site is now gated behind authentication, with only a single master admin user allowed access.

## What Was Implemented

### 1. Core Authentication
- **NextAuth.js v4** with Discord OAuth provider
- JWT-based session strategy
- MongoDB User model for future multi-user support
- Master admin allowlist via `MASTER_DISCORD_ID` environment variable

### 2. Route Protection
- **Middleware** (`middleware.ts`) protects all routes except:
  - `/login`
  - `/api/auth/*`
  - Static assets (`_next`, images, etc.)
- Redirects unauthenticated users to `/login`
- Blocks non-master users with "not authorized" message

### 3. User Interface
- **Login Page** (`/app/login/page.tsx`)
  - Clean, centered card design
  - Discord branding with icon
  - Error state handling
- **User Menu** (in `AppShell.tsx`)
  - Avatar display in top-right (mobile) and bottom of sidebar (desktop)
  - Sign-out functionality
  - Dropdown menu with user info

### 4. Data Model
- **User Model** (`lib/models/User.ts`)
  - `discordId` (unique identifier)
  - `username`, `discriminator`, `avatar`
  - `isApproved` (boolean)
  - `role` ("admin" | "user")
  - `lastLoginAt` timestamp
  - Future-proofed for multi-user expansion

### 5. Session Management
- **SessionProvider** wrapper for NextAuth context
- Integrated into root layout
- Available throughout the app via `useSession()` hook

## Files Created/Modified

### New Files
- `lib/auth.ts` - NextAuth configuration
- `lib/models/User.ts` - User schema
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API route
- `app/login/page.tsx` - Login page
- `app/login/layout.tsx` - Login layout (no AppShell)
- `middleware.ts` - Route protection
- `components/SessionProvider.tsx` - Client-side session provider
- `types/next-auth.d.ts` - TypeScript declarations
- `readme/17-authentication-setup.md` - Setup documentation

### Modified Files
- `app/layout.tsx` - Added SessionProvider wrapper
- `components/AppShell.tsx` - Added UserMenu component
- `README.md` - Updated features and setup instructions
- `package.json` - Added next-auth and @auth/mongodb-adapter

## Environment Variables Required

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Discord OAuth
DISCORD_CLIENT_ID=<from Discord Developer Portal>
DISCORD_CLIENT_SECRET=<from Discord Developer Portal>

# Master Admin
MASTER_DISCORD_ID=<your Discord user ID>
```

## How It Works

1. **Unauthenticated Access**
   - User visits any page → Middleware checks session
   - No session → Redirect to `/login`

2. **Login Flow**
   - User clicks "Continue with Discord"
   - Redirected to Discord OAuth
   - Discord returns with user profile
   - `signIn` callback checks if `profile.id === MASTER_DISCORD_ID`
   - If not master → Return to `/login?error=not_allowed`
   - If master → Create/update User record, create session

3. **Authenticated Access**
   - Middleware verifies JWT token on every request
   - Token contains `discordId`, `role`, `isApproved`
   - User can access all routes
   - Avatar/username displayed in user menu

4. **Sign Out**
   - User clicks "Sign out" in menu
   - NextAuth destroys session
   - Redirected to `/login`

## Security Features

- ✅ Server-side authorization checks (never trust client)
- ✅ JWT tokens with secure secret
- ✅ Middleware-level route protection
- ✅ Master admin allowlist enforcement
- ✅ No OAuth tokens logged or exposed
- ✅ Environment variables never in client bundles

## Future Multi-User Support

The implementation is designed to support multiple users without major refactoring:

1. **Remove master-only restriction** in `signIn` callback
2. **Add approval workflow**:
   - New users create accounts with `isApproved: false`
   - Admin panel to view pending users
   - Approve/reject functionality
3. **Add data ownership**:
   - Add `userId` to RangeSession, TargetSheet, etc.
   - Filter queries by current user
4. **Expand roles**:
   - Add more granular permissions
   - Role-based access control

The `MASTER_DISCORD_ID` should remain as a super-admin backdoor for recovery.

## Multi-User Preparation

All data models have been updated with `userId` fields to support multi-user access:

### Models Updated
- ✅ RangeSession
- ✅ TargetSheet
- ✅ Firearm
- ✅ Optic
- ✅ Caliber
- ✅ BullRecord

### API Routes Updated
All creation endpoints now attach `userId` to new records:
- ✅ POST /api/sessions
- ✅ POST /api/firearms
- ✅ POST /api/optics
- ✅ POST /api/calibers
- ✅ POST /api/sheets
- ✅ POST /api/bulls

### Migration Script
Run `scripts/attach-data-to-user.mjs` after setting up authentication to attach all existing data to your user account.

See `MULTI-USER-PREP.md` for detailed information on the multi-user preparation and future expansion plans.

## Testing Checklist

- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Visiting any route while logged out redirects to `/login`
- [ ] Logging in with master Discord ID grants access
- [ ] Logging in with non-master Discord ID shows "not authorized"
- [ ] Session persists across page refreshes
- [ ] Sign out returns to `/login` and blocks access
- [ ] User avatar/name displays correctly
- [ ] Mobile and desktop layouts work properly
- [ ] Migration script attaches existing data to user
- [ ] New records automatically get userId set

## Documentation

See `readme/17-authentication-setup.md` for detailed setup instructions including:
- Creating a Discord application
- Getting your Discord user ID
- Configuring environment variables
- Troubleshooting common issues
- Production deployment notes
