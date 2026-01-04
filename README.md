# Target Tracker

A Next.js application for logging and visualizing shooting range sessions with per-bull scores. Track your progress over time with detailed scoring, filtering, and performance analytics.

## Features

- 📊 **Detailed Scoring** - 5-4-3-2-1-0 system per bull (up to 6 bulls per sheet)
- 🎯 **Comprehensive Tracking** - Associate each sheet with firearm, caliber, optic, and distance
- 📈 **Analytics & Visualizations** - Trend graphs, per-sheet charts, bullseye visualizations, and session heatmaps
- 📸 **OCR for Range Notes** - Upload photos of handwritten range notes to automatically create sheets with scores
- 🔫 **Equipment Management** - CRUD for firearms, optics, and calibers with drag-drop ordering
- 🔗 **Equipment Relationships** - Firearms can be linked to specific compatible calibers and optics
- 📊 **Performance Tracking** - Session-over-session improvement percentages with color-coded indicators
- 🔗 **SEO-Friendly URLs** - Descriptive slugs for sessions and sheets (e.g., `2026-01-04-reloaderz`, `2026-01-04-ddm4-5-56-nato-20yd`)
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
- [OCR Feature](./readme/07-ocr-feature.md) - Range notes OCR implementation
- [Session URL Slugs](./readme/08-session-url-slugs.md) - Descriptive URL slugs
- [Deployment Guide](./readme/10-deployment-guide.md) - Vercel & MongoDB Atlas setup

## Tech Stack

- **Framework**: Next.js 16.1 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: MongoDB Atlas + Mongoose
- **Deployment**: Vercel (with automatic GitHub integration)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React
- **OCR**: Tesseract.js

## Current Implementation Status

### ✅ Completed MVP Features

- **Setup Pages**: Full CRUD for firearms, optics, and calibers with drag-drop reordering
- **Firearm-Equipment Relationships**: Firearms can have multiple compatible calibers and optics
  - Sheet creation form dynamically filters calibers and optics based on selected firearm
  - Progressive form reveal - firearm selection first, then compatible options appear
- **Range Sessions**: Create, edit, view, and delete sessions with location autocomplete
  - Default location set to "Reloaderz"
  - SEO-friendly URL slugs with date and location (e.g., `2026-01-04-reloaderz`)
- **Target Sheets**: Add sheets to sessions with filtered equipment selection
  - Descriptive URL slugs (e.g., `2026-01-04-ddm4-5-56-nato-20yd`)
  - OCR upload option for creating sheets from range note photos
- **Bull Scoring**: Button-based count entry (0-10) for each score level (5-4-3-2-1-0)
- **Session Visualizations**:
  - Line chart showing average score progression across sheets
  - Per-sheet bar charts with average score labels
  - Individual bullseye visualizations (6 per sheet) with randomized shot placement
  - Aggregate heatmap visualization for all shots in a session
  - Hover tooltips on bullseyes showing score breakdown
- **Analytics**: 
  - Collapsible filters (date, firearm, caliber, distance) with trend graphs
  - Session-over-session improvement tracking with color-coded percentages (green for improvement, red for decline)
  - Overall trend calculation comparing performance periods
- **Edit Capabilities**: Edit sessions, sheets, and bull scores
- **OCR Range Notes**: 
  - Upload or paste images of handwritten range notes
  - Automatic parsing of distance and bull scores
  - Manual review/edit interface before creating sheets
  - Image preprocessing for better digit recognition

### 🎨 Visual Features

- **Bullseye Visualizations**: SVG-based targets with color-coded rings (red center, black, dark gray, light gray, white) and randomized shot placement
- **Heatmap**: Density visualization using transparent dots for aggregate shot data
- **Hover Interactions**: 2x scale animation on bullseye hover with detailed tooltip showing score grid and average
- **Dark Theme**: Optimized color scheme with subtle accents

### 📦 Database

All collections include:
- **Firearms** with `caliberIds` and `opticIds` arrays for equipment compatibility
- **Optics** with `sortOrder` for custom ordering
- **Calibers** with `sortOrder` for custom ordering
- **Range Sessions** with `slug`, location, date, and notes
- **Target Sheets** with `slug`, linked to sessions and equipment (firearm, caliber, optic, distance)
- **Bull Records** with aggregated score counts (0-10 per score level)

### 🔄 Recent Updates

#### URL Slugs (January 2026)
- **Sessions**: Now use descriptive slugs with date and location (`2026-01-04-reloaderz`)
- **Sheets**: Descriptive slugs with date, firearm, caliber, and distance (`2026-01-04-ddm4-5-56-nato-20yd`)
- All APIs support both slug and ID lookups for backward compatibility
- Migration scripts available in `/scripts` for updating existing data

#### OCR Feature (January 2026)
- Client-side OCR using Tesseract.js for handwritten range notes
- Image preprocessing (grayscale + contrast) for better digit recognition
- Automatic parsing of bull scores and distance information
- Manual review interface with editable table before sheet creation
- "Upload Range Notes" button on session detail page

#### Analytics Improvements (January 2026)
- Session-over-session improvement percentages in analytics table
- Color-coded indicators (green ↑ for improvement, red ↓ for decline)
- Overall trend calculation displayed on average score card

#### UI/UX Enhancements (January 2026)
- Progressive form reveal on sheet creation (select firearm first, then see filtered options)
- Fixed autocomplete background styling for proper theme support
- Default location set to "Reloaderz" on session creation
- Improved form validation and user feedback

## Future Enhancements

See [Future Features](./readme/06-future-features.md) for planned additions:
- Photo OCR for range notebook pages
- Direct target photo ingestion with shot detection
- Authentication and multi-device sync
- Drill types and structured training programs
- Advanced analytics and exports

## License

MIT
