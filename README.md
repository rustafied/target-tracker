# Target Tracker

A Next.js application for logging and visualizing shooting range sessions with per-bull scores. Track your progress over time with detailed scoring, filtering, and performance analytics.

## Features

- 📊 **Detailed Scoring** - 5-4-3-2-1-0 system per bull (up to 6 bulls per sheet)
- 🎯 **Comprehensive Tracking** - Associate each sheet with firearm, caliber, optic, and distance
- 📈 **Analytics & Visualizations** - Trend graphs, per-sheet charts, and bullseye visualizations
- 🔫 **Equipment Management** - CRUD for firearms, optics, and calibers with drag-drop ordering
- 📱 **Mobile-First Design** - Dark theme, optimized for quick data entry
- 💾 **Local MongoDB Storage** - All data stored locally

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB running locally on port 27017

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
MONGODB_URI=mongodb://localhost:27017/target-tracker
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

## Tech Stack

- **Framework**: Next.js 16.1 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: MongoDB + Mongoose
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React

## Current Implementation Status

### ✅ Completed MVP Features

- **Setup Pages**: Full CRUD for firearms, optics, and calibers with drag-drop reordering
- **Firearm-Equipment Relationships**: Firearms can have multiple compatible calibers and optics
- **Range Sessions**: Create, edit, view, and delete sessions with location autocomplete
- **Target Sheets**: Add sheets to sessions with filtered equipment selection
- **Bull Scoring**: Button-based count entry (0-10) for each score level (5-4-3-2-1-0)
- **Session Visualizations**:
  - Line chart showing average score progression across sheets
  - Per-sheet bar charts with average score labels
  - Individual bullseye visualizations (6 per sheet) with randomized shot placement
  - Aggregate heatmap visualization for all shots in a session
  - Hover tooltips on bullseyes showing score breakdown
- **Analytics**: Collapsible filters (date, firearm, caliber, distance) with trend graphs
- **Edit Capabilities**: Edit sessions, sheets, and bull scores

### 🎨 Visual Features

- **Bullseye Visualizations**: SVG-based targets with color-coded rings (red center, black, dark gray, light gray, white) and randomized shot placement
- **Heatmap**: Density visualization using transparent dots for aggregate shot data
- **Hover Interactions**: 2x scale animation on bullseye hover with detailed tooltip showing score grid and average
- **Dark Theme**: Optimized color scheme with subtle accents

### 📦 Database

All collections include:
- Firearms with `compatibleCaliberIds` and `compatibleOpticIds` arrays
- Optics with `sortOrder` for custom ordering
- Calibers with `sortOrder` for custom ordering
- Range sessions with location and date
- Target sheets linked to sessions and equipment
- Bull records with aggregated score counts (0-10 per score level)

## Future Enhancements

See [Future Features](./readme/06-future-features.md) for planned additions:
- Photo OCR for range notebook pages
- Direct target photo ingestion with shot detection
- Authentication and multi-device sync
- Drill types and structured training programs
- Advanced analytics and exports

## License

MIT
