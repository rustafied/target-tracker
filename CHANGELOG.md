# Changelog

## January 4, 2026 - UI Polish & Mobile Improvements

### 🎨 Visual Improvements

#### Favicon Update
- New bullseye target favicon (black and white, simple design)
- White circle outline with center dot on transparent background
- Matches the app's target/crosshair icon style

#### Mobile Header Enhancement
- Added backdrop blur to mobile header for better visibility
- Semi-transparent background prevents content showing through on scroll
- Improved z-index layering

### 📱 Mobile UX Enhancements

#### Interactive Bullseye Visualizations
- Added click-to-toggle functionality for bullseye targets on mobile
- Desktop: Hover to zoom (unchanged)
- Mobile: Tap to expand/collapse with tooltip
- Smooth transitions and state management

#### Session Heatmap Modal
- **Click to open**: Session heatmap now opens detailed modal on click
- **Large visualization**: Full-size heatmap for better detail
- **Statistics panel**: Comprehensive stats with icons
  - Total Shots, Average Score, Total Score, Bull Hit Rate
  - Score distribution with progress bars
  - Color-coded rings matching target
- **Responsive design**: 
  - Desktop: 80% width, two-column layout
  - Mobile: 99% width, single-column stacked layout
- **Solid background**: Fixed transparency issues with inline styles
- **Dark overlay**: 80% black backdrop for better focus

### 🖥️ Desktop Navigation

#### Sidebar Improvements
- Setup menu now expands by default on desktop view
- Firearms, Optics, and Calibers immediately visible
- Mobile behavior unchanged (collapsed unless on setup page)
- Better discoverability for new users

### 🗄️ Database Updates

#### MongoDB Atlas Upgrade
- Upgraded from M0 (free) to M2 ($9/month)
- No sleep/wake delays - always-on cluster
- Better performance and reliability
- Updated connection strings across all environments

### 🔧 Technical Fixes

#### Production Deployment
- Fixed IP whitelist configuration for new M2 cluster
- Updated environment variables in Vercel
- Improved error logging in session API route
- Resolved cold start connection issues

#### Component Updates
- `SingleBullVisualization`: Added mobile click state management
- `SessionHeatmap`: Complete modal redesign with statistics
- `AppShell`: Desktop-specific setup menu expansion
- `dialog.tsx`: Darker overlay (50% → 80%) and solid backgrounds

### 📝 Documentation Updates
- Deployment guide with MongoDB Atlas setup
- Environment variable management
- Database migration instructions
- Complete step-by-step Vercel CLI guide

## January 4, 2026 - Production Deployment

### 🚀 Deployment & Infrastructure

#### Vercel Deployment
- Deployed to production on Vercel: https://target-tracker-rho.vercel.app
- Configured automatic GitHub integration for continuous deployment
- Set up environment variables for Production, Preview, and Development environments
- Push to `main` branch automatically triggers production deployment
- Feature branches create preview deployments

#### MongoDB Atlas Migration
- Migrated from local MongoDB to MongoDB Atlas (M0 free tier)
- Cluster: `targettracker.vefulmi.mongodb.net`
- Successfully migrated all data:
  - 3 range sessions
  - 9 target sheets
  - 54 bull records
  - 9 firearms
  - 9 optics
  - 8 calibers
- Connection string configured across all Vercel environments

#### Build Fixes
- Fixed TypeScript errors in `app/api/sessions/route.ts` (duplicate `$ne` operator)
- Fixed null safety checks in `app/sheets/[sheetId]/page.tsx`
- Fixed Mongoose pre-save hook type annotations in `RangeSession.ts` and `TargetSheet.ts`
- All builds now pass TypeScript strict mode checks

### 🔧 Technical Improvements
- Environment variable management via Vercel CLI
- Database connection pooling optimized for serverless functions
- Build process tested and validated for production

## January 4-5, 2026

### 🎨 UI/UX Improvements

#### Tailwind CSS v4 Migration
- Fixed globals.css for Tailwind v4 syntax
- Changed from `@tailwind` directives to `@import "tailwindcss"`
- Updated CSS variables to use `--color-*` prefix
- Removed `@apply` directives in favor of plain CSS

#### Form Improvements
- **Progressive Sheet Creation**: Firearm selection now shows first, then dynamically reveals filtered caliber/optic options
- **Location Autocomplete**: Fixed background styling for proper theme support
- **Default Values**: Session location defaults to "Reloaderz"
- **Session Edit Form**: Improved spacing and added icons for consistency

### 🔗 URL Slugs

#### Session Slugs
- Format: `YYYY-MM-DD-location` (e.g., `2026-01-04-reloaderz`)
- Auto-generated from date and location with collision detection
- Updates when date or location changes

#### Sheet Slugs  
- Format: `YYYY-MM-DD-firearm-caliber-distanceyd` (e.g., `2026-01-04-ddm4-5-56-nato-20yd`)
- Auto-generated from session date, firearm, caliber, and distance
- Numbered suffixes for duplicates (e.g., `-1`, `-2`)

#### Implementation
- All APIs support both slug and ObjectID lookups for backward compatibility
- Migration scripts in `/scripts` directory:
  - `add-slugs-to-sessions.mjs`
  - `add-slugs-to-sheets.mjs`

### 📸 OCR Feature

#### Image Upload & Processing
- Client-side OCR using Tesseract.js
- Image preprocessing: grayscale + high-contrast threshold
- Paste support (Cmd/Ctrl+V) in addition to file upload
- Real-time progress indicator during OCR

#### Data Parsing
- Extracts distance from patterns like "20 yds" or "100 yards"
- Parses bull data: bull index followed by 6 score counts (5,4,3,2,1,0)
- Character whitelist for better digit recognition
- Fallback parsing strategies for varied handwriting

#### Review Interface
- "View Raw OCR Text" button for debugging
- Editable table showing all parsed bull data
- Add/remove bulls before creating sheet
- Auto-populates distance field when detected

#### Location
- "Upload Range Notes" button on session detail page
- Opens dialog with OCR uploader and sheet configuration form
- Creates sheet with bull records in one action

### 📊 Analytics Enhancements

#### Session-over-Session Tracking
- New "Improvement" column in analytics table
- Calculates percentage change from previous session
- Color-coded indicators:
  - 🟢 Green with ↑ icon for improvements
  - 🔴 Red with ↓ icon for declines
  - ⚪ Gray with — icon for no change or first session

#### Overall Trend
- Compares first half vs second half of data
- Displays on average score summary card
- Same color-coding as individual improvements

### 🔧 Technical Improvements

#### Equipment Relationships
- Fixed firearm type definitions to include `caliberIds` and `opticIds`
- Proper filtering of compatible equipment on sheet creation
- No auto-selection - user explicitly chooses firearm first

#### Database Schema Updates
- Added `slug` field to RangeSession model with unique index
- Added `slug` field to TargetSheet model
- Pre-save hooks for automatic slug generation
- Collision detection with counter suffixes

#### Component Updates
- `LocationAutocomplete`: Fixed background colors for theme consistency
- `OCRUploader`: New component with paste support and preprocessing
- `TagSelector`: Improved for equipment selection workflow

### 📝 Documentation

#### New Documentation
- `/readme/07-ocr-feature.md` - OCR implementation guide
- `/readme/08-session-url-slugs.md` - URL slug system documentation

#### Updated Documentation
- Main README with all new features
- Feature list expanded
- Tech stack updated to include Tesseract.js
- Current implementation status updated with recent changes

### 🗄️ Migrations Performed
- Updated 2 sessions with location-based slugs
- Updated 9 sheets with descriptive slugs
- All data backward compatible with ID-based lookups

## Tips & Best Practices

### OCR Usage
- Write clearly with good spacing between numbers
- Use dark pen on white paper for high contrast
- Take photos straight-on with good lighting
- Expected format: `Bull# 5 4 3 2 1 0`
- Always review parsed data before creating sheet

### URL Structure
- Sessions: Clean, readable URLs with location context
- Sheets: Descriptive enough to understand content from URL alone
- All routes support both slugs and IDs for flexibility

