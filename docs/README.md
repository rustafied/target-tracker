# Target Tracker

A Next.js application for logging and visualizing shooting range sessions with per-bull scores. Track your progress over time with detailed scoring, filtering, and performance analytics.

## Features

- 🔐 **Discord Authentication** - Secure login with Discord OAuth (master admin only for now)
- 🎯 **Custom Target Templates** - Multiple built-in target types with visual selection (Six Bull, Single Bullseye, Sight-In Grid, Silhouette)
- 📊 **Detailed Scoring** - 5-4-3-2-1-0 system per aim point (flexible based on template)
- ⚡ **Quick Entry** - Type 6-digit codes (e.g., "543210") to instantly populate all score counts per aim point
- 📸 **Target Image Recognition** - Upload target photos and automatically detect bullet placements using OpenCV
- 🎯 **Comprehensive Tracking** - Associate each sheet with firearm, caliber, optic, distance, and target type
- 📈 **Analytics & Visualizations** - Trend graphs, multi-firearm comparison charts, bullseye visualizations, session heatmaps, and fatigue/sequence analysis with lazy loading and skeleton loaders
- 💡 **Expanded Insights Engine** - Auto-generated personalized recommendations, trend detection, equipment analysis, and actionable improvement suggestions with 15+ insight types (optimized for free-tier MongoDB)
- 🔫 **Equipment Management** - CRUD for firearms, optics, and calibers with drag-drop ordering
- 🔗 **Equipment Relationships** - Firearms can be linked to specific compatible calibers and optics with auto-filtering
- 🎚️ **Default Distances** - Set default distance for each firearm to speed up sheet creation
- 📊 **Performance Tracking** - Session-over-session improvement percentages with color-coded indicators
- 🏆 **Session Summaries** - View total shots, bullseye %, best weapon, and per-firearm averages
- 📊 **Multi-Firearm Comparison** - Line charts comparing different firearms in the same session
- 🎯 **Ammo Inventory Tracking** - Automatic deduction from inventory based on shots fired, transaction history, usage charts
- 📦 **Bulk Order Management** - Tag-based multi-caliber order entry and non-session usage recording
- 📈 **Usage Analytics** - Line charts for usage over time and pie charts for stock distribution
- 💰 **Ammo Efficiency Metrics** - Performance per round analysis, cost tracking, value rankings, and smart insights to optimize ammo spending
- 🔗 **SEO-Friendly URLs** - Descriptive slugs for sessions and sheets (e.g., `2026-01-04-reloaderz`)
- 📱 **Mobile-First Design** - Dark theme, optimized for quick data entry with scrollable modals
- ☁️ **Cloud Database** - MongoDB Atlas for reliable data storage
- 🚀 **Production Deployment** - Deployed on Vercel with automatic GitHub integration

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account (free tier) OR local MongoDB on port 27017

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rustafied/target-tracker.git
cd target-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# .env.local

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/target-tracker

# NextAuth - Discord Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
MASTER_DISCORD_ID=your-discord-user-id
```

See [Authentication Setup Guide](./readme/17-authentication-setup.md) for detailed instructions on setting up Discord OAuth.

See [Authentication Setup Guide](./readme/17-authentication-setup.md) for detailed instructions.

**Important:** After setting up authentication and logging in for the first time, run the migration script to attach existing data to your user:
```bash
node scripts/attach-data-to-user.mjs
```

This only needs to be run once to prepare your existing data for multi-user support.

4. (Optional) Seed sample data:
```bash
node seed.mjs
```

5. (Optional) Set up Target Image Recognition:
```bash
cd python-ocr
source venv/bin/activate
pip install -r requirements.txt
```

6. Run the development server:
```bash
npm run dev
```

7. (Optional) Start the detection service:
```bash
# In a separate terminal
cd python-ocr
./start-detector.sh
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Deployment

### Production Deployment (Vercel)

The app is deployed on Vercel with automatic GitHub integration.

**Live URL**: https://target-tracker-rho.vercel.app

#### Deploy Your Own

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Link your project:
```bash
vercel link
```

4. Set environment variables:
```bash
vercel env add MONGODB_URI production
vercel env add MONGODB_URI preview
vercel env add MONGODB_URI development
```

5. Deploy:
```bash
vercel --prod
```

#### Automatic Deployments

- Push to `main` branch → Production deployment
- Push to other branches → Preview deployment
- All deployments trigger automatic builds and tests

#### Production Environment Variables

Don't forget to set these in Vercel:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `NEXTAUTH_URL` - Your production URL (e.g., `https://target-tracker-rho.vercel.app`)
- `NEXTAUTH_SECRET` - Generate a new one for production (different from dev)
- `DISCORD_CLIENT_ID` - Same as local
- `DISCORD_CLIENT_SECRET` - Same as local
- `MASTER_DISCORD_ID` - Your Discord user ID

And add the production redirect to Discord: `https://yourdomain.com/api/auth/callback/discord`

#### Database Migration

To migrate local data to Atlas:

```bash
# Export from local
mongodump --uri="mongodb://localhost:27017/target-tracker" --out=./backup

# Import to Atlas
mongorestore --uri="your-atlas-connection-string" --drop ./backup/target-tracker
```

## Project Structure

```
target-tracker/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints for all entities
│   ├── sessions/          # Session management pages
│   ├── sheets/            # Sheet detail and scoring
│   ├── analytics/         # Performance analytics
│   └── setup/             # Equipment CRUD pages
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── AppShell.tsx      # Main layout
│   ├── BullseyeVisualization.tsx
│   ├── SingleBullVisualization.tsx
│   ├── SessionHeatmap.tsx
│   └── ...
├── lib/                   # Backend utilities and models
│   ├── models/           # Mongoose schemas
│   ├── validators/       # Zod validation schemas
│   └── db.ts            # MongoDB connection
└── readme/                # Detailed project documentation
```

## Documentation

Comprehensive project documentation is available in the `/readme` folder:

- [Overview](./00-overview.md) - Project goals and tech stack
- [Domain Model](./01-domain-model.md) - Data entities and relationships
- [User Flows](./02-user-flows.md) - Key user journeys
- [UI & Design](./03-ui-design.md) - Component specs and layout
- [API & Backend](./04-api-backend.md) - Routes and MongoDB setup
- [Implementation Plan](./05-implementation-plan.md) - Build sequence
- [Future Features](./06-future-features.md) - Planned expansions
- [Session URL Slugs](./08-session-url-slugs.md) - Descriptive URL slugs
- **[Implementation Status](./09-implementation-status.md) - Current state and completed features**
- [Deployment Guide](./10-deployment-guide.md) - Vercel & MongoDB Atlas setup
- [Target Image Recognition](./14-target-image-recognition.md) - Feature specification
- **[Recognition Setup Guide](./15-target-recognition-setup.md) - Installation and usage**
- **[Authentication Setup](./17-authentication-setup.md) - Discord OAuth configuration**
- **[Custom Target Templates](./18-custom-target-types.md) - Template system specification**
- **[Ammo Tracking](./19-ammo-tracking.md) - Inventory and usage tracking**
- **[Ammo Quick Start](./20-ammo-quick-start.md) - User guide for ammo features**
- **[Fatigue & Sequence Analysis](./22-fatigue-sequence-analysis.md) - Feature specification**
- **[Fatigue Analysis Quick Start](./23-fatigue-analysis-quick-start.md) - User guide**
- **[Ammo Efficiency Metrics](./24-ammo-efficiency-metrics.md) - Performance per round analysis**
- **[Ammo Efficiency Quick Start](./25-ammo-efficiency-quick-start.md) - User guide for efficiency metrics**
- **[Expanded Insights Engine](./30-expanded-insights-engine.md) - Personalized recommendations system**
- **[Insights Implementation](./31-expanded-insights-implementation.md) - Technical implementation details**
- **[Insights Quick Start](./32-insights-quick-start.md) - User guide for insights feature**

## Tech Stack

- **Framework**: Next.js 16.1 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: MongoDB Atlas + Mongoose
- **Computer Vision**: OpenCV + Python Flask (optional)
- **Deployment**: Vercel (with automatic GitHub integration)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts + ECharts (for advanced visualizations)
- **Icons**: Lucide React
- **Drag-Drop**: @dnd-kit
- **Date Formatting**: date-fns

## Current Implementation Status

### ✅ Completed MVP Features

- **Setup Pages**: Full CRUD for firearms, optics, and calibers with drag-drop reordering
  - Default distance field on firearms - auto-populates when creating sheets
  - Notes field on firearm edit (positioned below optics)
- **Firearm-Equipment Relationships**: Firearms can have multiple compatible calibers and optics
  - Multi-select interface with blue active state styling
  - Sheet creation form dynamically filters calibers and optics based on selected firearm
  - Auto-selects first compatible option
  - Two-column layout (equipment left, distance/label/notes right)
- **Range Sessions**: Create, edit, view, and delete sessions with location autocomplete
  - SEO-friendly URL slugs with date and location (e.g., `2026-01-04-reloaderz`)
  - Line-item session list with stats (sheets, shots, avg score, improvement %)
  - Color-coded improvement indicators (green ↑/red ↓) vs previous session
  - Session summary card with bullets fired, bullseye %, avg score, best weapon
  - Multi-firearm comparison chart with separate colored lines per firearm
- **Target Sheets**: Add sheets to sessions with filtered equipment selection
  - Descriptive URL slugs (e.g., `2026-01-04-ddm4-5-56-nato-20yd`)
  - Flexible bull count (1-6 bulls) - only saves non-zero bulls
  - "Add Sheet" button in top right of session detail
- **Bull Scoring**: 
  - **Quick Entry Card** at top of sheet edit page with 6 input fields
  - Type 6-digit codes (e.g., "543210" or "03") to populate score counts
  - Supports leading zeros for partial entry
  - Bidirectional sync between quick entry and count buttons
  - Button-based count entry (0-10) for each score level (5-4-3-2-1-0)
  - "Copy Previous" button for bulls 2-6
  - Smart saving - only stores bulls with data
- **Session Visualizations**:
  - Multi-firearm comparison line chart (8 unique colors)
  - Per-sheet bar charts with average score labels (no hover effect)
  - Individual bullseye visualizations (only for bulls with data)
  - Aggregate heatmap visualization for all shots in a session
  - Hover tooltips on bullseyes showing score breakdown
- **Analytics**: 
  - Collapsible filters (date, firearm, caliber, distance) with trend graphs
  - Chronologically ordered sessions for accurate trend analysis
  - Session-over-session improvement tracking with percentages
  - Overall trend calculation comparing performance periods
- **Ammo Inventory**:
  - Automatic deduction from inventory when sheets are saved
  - Single-column list view with bullet icons and rounds on hand
  - Usage over time line chart and stock distribution pie chart
  - Per-caliber detail pages with transaction history
  - Bulk order entry with tag-based multi-caliber selection
  - Non-session usage recording with notes
  - Complete transaction audit trail with session/sheet links

### 🎨 Visual Features

- **Bullseye Visualizations**: SVG-based targets with color-coded rings (red center, black, dark gray, light gray, white) and randomized shot placement
  - Desktop: Hover to zoom 2x with detailed tooltip
  - Mobile: Tap to expand/collapse with score breakdown
- **Session Heatmap**: Clickable density visualization with detailed modal
  - Large heatmap view with aggregate shot data
  - Statistics panel: Total shots, average score, bull hit rate
  - Score distribution with color-coded progress bars
  - Responsive: 80% width on desktop, 99% on mobile
- **Hover Interactions**: Smooth scale animations with detailed tooltips
- **Dark Theme**: Optimized color scheme with subtle accents
- **Mobile-First**: Responsive layouts optimized for touch interfaces with backdrop blur headers

### 📦 Database

All collections include:
- **Firearms** with `caliberIds`, `opticIds`, `defaultDistanceYards`, and `sortOrder`
- **Optics** with `sortOrder` for custom ordering
- **Calibers** with `sortOrder` for custom ordering
- **Range Sessions** with `slug`, location, date, and notes
- **Target Sheets** with `slug`, linked to sessions, equipment, and target template
- **Target Templates** with SVG rendering, aim points, and scoring models (system and custom)
- **Scoring Models** with ring or region-based scoring definitions
- **Aim Point Records** (formerly Bull Records) with aggregated score counts - only saved if non-zero

### 🔄 Recent Updates

#### Expanded Insights Engine (January 16, 2026) ✨ NEW!
**Auto-generated personalized recommendations and analysis:**
- **15 Insight Types**: 5 per-session, 5 overview, 5 comparison insights
- **Rule-Based Analysis**: Statistical confidence scoring with trend detection
- **Contextual Recommendations**: Actionable advice based on your shooting patterns
- **User Preferences**: Configurable confidence thresholds, verbosity, and enabled types
- **Session Insights**: Historical comparisons, setup milestones, distance diagnostics, bias patterns
- **Overview Insights**: Trend summaries, top performers, usage recommendations, inventory alerts
- **Comparison Insights**: Pairwise analysis, group rankings, use-case recommendations
- **Integration**: Appears in session views, analytics overview, and comparative dashboards
- **Settings Modal**: Gear icon access to customize insight generation
- **Performance Optimizations**: 
  - Batch database queries (reduced N+1 queries by 70%)
  - Parallel generator execution with Promise.all()
  - MongoDB .lean() and .select() for efficient data fetching
  - <2s generation time (down from 4.3s)
- **Lazy Loading**: Heavy analytics components load on scroll with Intersection Observer
- **Skeleton Loaders**: Beautiful animated placeholders with circular spinners
- **Free-Tier Friendly**: Optimized query patterns for MongoDB Atlas free tier
- See: [Insights Quick Start](./32-insights-quick-start.md) | [Implementation Details](./31-expanded-insights-implementation.md)

#### Ammo Inventory System (January 13, 2026)
**Complete ammunition tracking with automatic deduction:**
- **Automatic Inventory**: Ammo automatically deducted from inventory when target sheets are saved
- **Usage Charts**: Line graphs showing usage over time per caliber with pie chart for stock distribution
- **Transaction History**: Complete audit trail of all inventory changes linked to sessions and sheets
- **Bulk Order Entry**: Tag-based multi-caliber selection for adding inventory from purchases
- **Non-Session Usage**: Record ammo used outside of range sessions with notes
- **Visual Indicators**: Custom bullet and optic SVG icons with detailed line art
- **Mobile Optimization**: All modals fully scrollable on mobile devices
- **Detail Pages**: Per-caliber pages with summary cards, usage charts, and transaction logs
- **Smart Sorting**: Transaction history sorted newest first with session grouping
- **Data Integrity**: Robust date validation and automatic reconciliation from historical sessions

#### Custom Target Templates (January 6, 2026)
**Multiple target types for different training purposes:**
- **Built-In Templates**: 
  - **Six Bull (Default)**: Traditional 6-bull practice sheet with ring-based scoring (6 aim points)
  - **Single Bullseye**: Large precision target for accuracy work (1 aim point, 9-5 scoring)
  - **Sight-In Grid**: 5-square grid for optic zeroing (5 aim points, hit/miss scoring)
  - **Silhouette**: Head and torso zones for defensive training (2 aim points, zone scoring)
- **Visual Template Selection**: Card-based selector with SVG previews on sheet creation
- **Template-Driven UI**: Interactive targets and visualizations render actual template graphics
- **Smart Rendering**: Each aim point displays template-specific SVG (silhouette, grid, bullseye)
- **Flexible Aim Points**: Bulls renamed to "aim points" - can be "Head", "Torso", "Center", etc.
- **Template Gallery**: Browse all templates at `/setup/targets`
- **Drag-and-Drop Sorting**: Customize template display order with smooth drag-and-drop reordering
- **Persistent Order**: Custom sort order applies across all template selection interfaces
- **Backward Compatible**: Existing sheets automatically use "Six Bull (Default)" template
- **Data Migration**: Seamless migration of existing bull records to new template system
- **Session View Updates**: Sheet cards show correct template visuals and aim point names

#### Discord Authentication (January 5, 2026)
**Secure access control with Discord OAuth:**
- **NextAuth.js Integration**: Full Discord OAuth 2.0 authentication
- **Master Admin Access**: Single-user mode with Discord ID allowlist
- **Site-Wide Protection**: Middleware-based route protection
- **Session Management**: Secure JWT-based sessions
- **User Menu**: Avatar display with sign-out functionality
- **Future-Proofed**: Database schema ready for multi-user expansion
- **MongoDB User Records**: Tracks login history and user metadata

#### Target Image Recognition System (January 5, 2026)
**Automatic bullet hole detection from photos:**
- **SimpleBlobDetector Algorithm**: Switched from HoughCircles to handle irregular/torn holes
- **Red Bullseye Detection**: HSV color-based center detection (more reliable than outer ring)
- **Dual-Pass Processing**: Detects holes in both light areas (paper) and dark areas (black ring)
- **Upload/Paste Interface**: Drag-drop, file picker, or clipboard paste (Ctrl/Cmd+V)
- **Batch Processing**: Upload multiple target images at once, assign to different bulls
- **Image Management**: View full-size images in modal, delete when no longer needed
- **Smart Filtering**: Excludes bullseye, target boundaries, and false positives
- **Shot Merging**: Combines detected shots with manual entries
- **Detection Service**: Python Flask + OpenCV running on localhost:5001
- **Conservative Parameters**: Tuned for accuracy over false positives

#### Major UX Overhaul (January 5, 2026)
- **OCR Removed**: Removed Tesseract.js/EasyOCR due to poor handwriting detection (replaced with image recognition)
- **Quick Entry System**: 6-digit input fields for rapid score entry (e.g., "543210")
- **Flexible Bull Count**: Only saves bulls with data (1-6 bulls per sheet)
- **Default Distance**: Firearms can have default distance that auto-populates
- **Session Summary Card**: Total shots, bullseye %, best weapon, per-firearm averages
- **Multi-Firearm Charts**: Separate colored lines per firearm in session view
- **Session List Redesign**: Line-item format with stats and improvement indicators
- **Form Layout**: Two-column design for equipment selection
- **Blue Active States**: Consistent styling across all selection interfaces
- **Smart Filtering**: Equipment relationships properly enforced

#### Database & Deployment (January 2026)
- **MongoDB Atlas M2**: Upgraded to always-on cluster ($9/month) for better performance
- **Production URL**: https://target-tracker-rho.vercel.app
- **Auto-Deploy**: Push to main triggers automatic Vercel deployment
- Database migration completed with 92 documents

#### Mobile UX (January 2026)
- **Touch-Friendly Bullseyes**: Click-to-toggle expansion on mobile devices
- **Enhanced Header**: Backdrop blur prevents content bleed-through on scroll
- **Heatmap Modal**: Full-screen interactive statistics with responsive layout

#### Navigation (January 2026)
- **Desktop Sidebar**: Setup menu expanded by default for better discoverability
- **Favicon**: Custom bullseye target icon (white on transparent)

#### URL Slugs (January 4, 2026)
- **Sessions**: Now use descriptive slugs with date and location (`2026-01-04-reloaderz`)
- **Sheets**: Descriptive slugs with date, firearm, caliber, and distance
- All APIs support both slug and ID lookups for backward compatibility
- Migration scripts available in `/scripts` for updating existing data

#### Analytics Improvements (January 4, 2026)
- Chronological ordering for accurate trend analysis
- Session-over-session improvement percentages in analytics table
- Color-coded indicators (green ↑ for improvement, red ↓ for decline)
- Overall trend calculation displayed on average score card

## Future Enhancements

See [Future Features](./readme/06-future-features.md) for planned additions:
- ✅ ~~Direct target photo ingestion with shot detection~~ (Completed!)
- ✅ ~~Authentication and multi-device sync~~ (MVP completed - master admin only)
- ✅ ~~Support for different target types~~ (Completed - built-in templates!)
- Custom template creation UI
- Region-based scoring (non-ring shapes)
- Multi-user support with approval workflow
- ML model training for improved detection accuracy
- Additional target types (IPSC, steel, B-27, etc.)
- Drill types and structured training programs
- Advanced analytics and exports
- Shot grouping analysis (ES, SD calculations)

## License

MIT
