# Changelog

## January 5, 2026 - Score Entry Redesign

### 🎯 Visual Target Input Focus

#### Removed Legacy Input Methods
- **Quick Entry Card Removed** - Eliminated 6-digit input card at top of sheet page
- **Count Buttons Removed** - Removed 0-10 button grids for each score level
- Visual target input is now the primary and only method for score entry
- Simplified interface reduces cognitive load and focuses on precision

#### Enhanced Interactive Target
- **Expanded View Modal** - New full-screen precision mode
  - Expand button on each bull card opens 90vw × 90vh modal
  - Large target display (80vw × 80vh) for precise shot placement
  - Shot markers scaled to half size (1.75 radius vs 3.5) for accuracy
  - Same click/right-click interactions as normal view
  - Better for detailed shot placement and fine adjustments
- **Reorganized Controls**
  - Clear button moved to card header (next to Expand button)
  - Shot count displayed under bull number in header
  - Instructions centered below target
  - Cleaner, more focused layout

#### Layout Improvements
- **2-Column Grid** - Bulls displayed in responsive grid
  - Desktop/Tablet: 2 columns (3 rows showing 6 bulls)
  - Mobile: Single column stacked layout
  - Each bull card is self-contained with target and metrics
- **Save Behavior** - Page now reloads after save instead of navigating back
  - Allows for iterative editing without navigation
  - Better workflow for making adjustments

### 🔢 Validation Updates
- **Increased Score Limits** - Maximum shots per score level raised from 10 to 100
  - Updated both Zod validation schema and Mongoose model
  - Allows for high-volume training sessions
  - Better accommodates bulk ammunition usage

### 📝 Documentation Updates
- Updated UI design documentation (`03-ui-design.md`)
- Updated implementation status (`09-implementation-status.md`)
- Removed references to Quick Entry and Count Buttons
- Added Expand modal documentation

---

## January 5, 2026 - Major UX Overhaul

### ✂️ Feature Removal
- **OCR Functionality Removed** - Removed Tesseract.js/EasyOCR integration due to poor handwriting detection
  - Deleted `OCRUploader` component, `ocr-parser.ts`, Python OCR service
  - Removed "Upload Range Notes" button and dialog from session view
  - Cleaned up all OCR references from documentation

### 🎯 Target Sheet Improvements

#### Flexible Bull Count
- **Smart Saving** - Only saves bulls with non-zero scores (previously forced 6 bulls per sheet)
- Bulls with all zeros are filtered out before database save
- UI still displays 6 bull forms for data entry
- Sheet cards only show bulls with actual data

#### Quick Entry System
- **Single Input Card** - New card at top of sheet edit page with 6 input fields
- **6-Digit Entry Format** - Enter scores as compact strings (e.g., "543210" or "03")
  - Each position represents count for that score level (5pts, 4pts, 3pts, 2pts, 1pts, 0pts)
  - Supports leading zeros (e.g., "03" = 0 five-pointers, 3 four-pointers)
- **Bidirectional Sync** - Quick entry updates when count buttons clicked, and vice versa
- **Smart Display** - Shows existing scores when viewing/editing, blank for new/empty bulls
- Responsive grid layout (3 columns on mobile, 6 on desktop)

#### Form Layout Redesign
- **Two-Column Layout** - Equipment selection (firearm/caliber/optic) in left column
- Distance, sheet label, and notes in right column
- Removed redundant search input when equipment count is low
- Better visual hierarchy and spacing

### 🔫 Firearm Management

#### Default Distance Field
- Added `defaultDistanceYards` to firearm schema
- Set on firearm edit page (moved notes below optics selection)
- Auto-populates distance field when creating new sheet after selecting firearm
- Uses `z.preprocess` in validator for proper number handling

#### Equipment Relationship Fixes
- Fixed caliber/optic selection not showing active styling on firearm edit
- Resolved state management issues with functional `setState`
- Consistent ObjectId string conversion for comparison
- Updated Zod schemas to include `caliberIds` and `opticIds` arrays
- Blue active state styling (`bg-blue-600 text-white ring-2 ring-blue-400`)

### 📊 Session View Enhancements

#### Session Summary Card
- New card above charts displaying key metrics with icons:
  - **Total Bullets Fired** (Crosshair icon)
  - **Bullseye %** (Target icon)
  - **Session Avg Score** (TrendingUp icon)
  - **Best Weapon** (Award icon) - Shows firearm with highest average
  - **By Firearm** (BarChart3 icon) - Average for each firearm used
- Clean grid layout with responsive design

#### Multi-Firearm Comparison Chart
- **Separate Lines Per Firearm** - Each firearm gets its own colored line on chart
- 8 distinct colors (purple, blue, green, amber, red, pink, teal, orange)
- **Gap Handling** - Lines only appear where that firearm was used (`connectNulls={false}`)
- Legend shows which color represents which firearm
- Enables direct comparison of different weapons in same session

#### UI Polish
- Moved "Add Sheet" button to top right next to Edit/Delete buttons
- Bar charts on sheet cards: removed hover effect, cleaner look
- Individual bull visualizations only show for bulls with data

### 📅 Session List Redesign

#### Line-Item Format
- Changed from card grid to vertical line-item list
- Each session displays as horizontal card with:
  - **Large Date** with day of week
  - **Location** with uppercase styling
  - **Stats Grid** (responsive 2→4 columns):
    - Sheets count
    - Total shots
    - Average score
    - Improvement percentage
  - **Color-Coded Improvement**:
    - Green with ↑ icon for positive change
    - Red with ↓ icon for negative change
    - Based on comparison with previous session by date

#### Better Statistics
- Shows overall average score for each session
- Displays improvement % from chronologically previous session
- Null-safe score display
- Responsive layout for mobile and desktop

### 📈 Analytics Fixes
- **Chronological Order** - Sessions sorted by date (oldest first) for proper trend analysis
- **Accurate Improvements** - Percentage changes now compare against chronologically previous session
- Fixed overall trend calculation (first half vs second half of time period)

### 🗄️ Database & API Updates

#### Slug Handling
- All relevant API routes now resolve slugs to ObjectIds before database operations
- `/api/sheets` POST route converts session slug to ObjectId
- `/api/bulls` POST route converts sheet slug to ObjectId
- Maintains backward compatibility with direct ObjectId usage

#### Schema Updates
- `Firearm`: Added `defaultDistanceYards`, renamed arrays to `caliberIds`/`opticIds`
- `TargetSheet`: Made `slug` optional with empty string default
- Moved slug generation from `pre('save')` to `pre('validate')` hook
- Removed `next()` callback from async pre-validate hook

#### API Enhancements
- `/api/sessions` GET now includes:
  - Total shots per session
  - Average score per session
  - Improvement % vs previous session (by date)
- `/api/bulls` POST filters out empty bulls before saving

### 🔧 Technical Fixes

#### Mongoose Schema Caching
- Resolved `defaultDistanceYards` not saving due to schema caching
- Required manual `.next` folder deletion and dev server restart
- Forced Mongoose to reload updated schema definitions

#### State Management
- Fixed stale state closures in firearm equipment selection
- Used functional `setState` pattern for reliable updates
- Proper ID type conversion throughout

#### Validation
- Updated Zod schemas for all firearm fields
- Added `z.preprocess` for number field handling
- Ensured arrays aren't stripped during validation

### 🎨 Styling Improvements
- Consistent blue active states across all selection interfaces
- Removed bright hover effects from charts
- Cleaner spacing and alignment throughout
- Better mobile responsiveness

### 📝 Documentation
- Updated `/readme/01-domain-model.md` with:
  - New firearm fields and relationship names
  - Slug fields for sessions and sheets
  - Flexible bull count notes
- Updated `/readme/09-implementation-status.md` with:
  - All new features and UI improvements
  - Resolved issues section expanded
  - Updated navigation structure
  - New component descriptions
- Removed `/readme/07-ocr-feature.md` (feature removed)

---

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

