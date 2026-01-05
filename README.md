# Target Tracker

A Next.js application for logging and visualizing shooting range sessions with per-bull scores. Track your progress over time with detailed scoring, filtering, and performance analytics.

## Features

- 📊 **Detailed Scoring** - 5-4-3-2-1-0 system per bull (flexible 1-6 bulls per sheet)
- ⚡ **Quick Entry** - Type 6-digit codes (e.g., "543210") to instantly populate all score counts per bull
- 🎯 **Comprehensive Tracking** - Associate each sheet with firearm, caliber, optic, and distance
- 📈 **Analytics & Visualizations** - Trend graphs, multi-firearm comparison charts, bullseye visualizations, and session heatmaps
- 🔫 **Equipment Management** - CRUD for firearms, optics, and calibers with drag-drop ordering
- 🔗 **Equipment Relationships** - Firearms can be linked to specific compatible calibers and optics with auto-filtering
- 🎚️ **Default Distances** - Set default distance for each firearm to speed up sheet creation
- 📊 **Performance Tracking** - Session-over-session improvement percentages with color-coded indicators
- 🏆 **Session Summaries** - View total shots, bullseye %, best weapon, and per-firearm averages
- 📊 **Multi-Firearm Comparison** - Line charts comparing different firearms in the same session
- 🔗 **SEO-Friendly URLs** - Descriptive slugs for sessions and sheets (e.g., `2026-01-04-reloaderz`)
- 📱 **Mobile-First Design** - Dark theme, optimized for quick data entry
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
# For local development with MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/target-tracker?retryWrites=true&w=majority

# OR for local MongoDB:
# MONGODB_URI=mongodb://localhost:27017/target-tracker
```

4. (Optional) Seed sample data:
```bash
node seed.mjs
```

5. Run the development server:
```bash
npm run dev
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

- [Overview](./readme/00-overview.md) - Project goals and tech stack
- [Domain Model](./readme/01-domain-model.md) - Data entities and relationships
- [User Flows](./readme/02-user-flows.md) - Key user journeys
- [UI & Design](./readme/03-ui-design.md) - Component specs and layout
- [API & Backend](./readme/04-api-backend.md) - Routes and MongoDB setup
- [Implementation Plan](./readme/05-implementation-plan.md) - Build sequence
- [Future Features](./readme/06-future-features.md) - Planned expansions
- [Session URL Slugs](./readme/08-session-url-slugs.md) - Descriptive URL slugs
- **[Implementation Status](./readme/09-implementation-status.md) - Current state and completed features**
- [Deployment Guide](./readme/10-deployment-guide.md) - Vercel & MongoDB Atlas setup

## Tech Stack

- **Framework**: Next.js 16.1 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: MongoDB Atlas + Mongoose
- **Deployment**: Vercel (with automatic GitHub integration)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
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
- **Target Sheets** with `slug`, linked to sessions and equipment (firearm, caliber, optic, distance)
- **Bull Records** with aggregated score counts (0-10 per score level) - only saved if non-zero

### 🔄 Recent Updates

#### Major UX Overhaul (January 5, 2026)
- **OCR Removed**: Removed Tesseract.js/EasyOCR due to poor handwriting detection
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
- Direct target photo ingestion with shot detection
- Authentication and multi-device sync
- Drill types and structured training programs
- Advanced analytics and exports

## License

MIT
