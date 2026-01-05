# Implementation Plan

## Build Sequence

Recommended order for MVP development:

### 1. Project Setup
* Initialize Next.js with TypeScript
* Install and configure Tailwind CSS
* Install and configure shadcn/ui
* Set up dark theme
* Configure MongoDB connection
* Create Mongoose models

**Deliverables:**
* Working Next.js app
* Dark theme applied
* MongoDB connected
* All models defined

---

### 2. Setup Pages (CRUD for Reference Data)
* Create `/setup` overview page
* Implement Firearms CRUD
* Implement Optics CRUD
* Implement Calibers CRUD
* Add toast notifications for success/error

**Deliverables:**
* Full CRUD for firearms, optics, calibers
* Working forms with validation
* Archive/unarchive functionality

---

### 3. Range Sessions
* Create `/sessions` list page
* Implement "New Session" form
* Create session detail page
* Add edit functionality
* Add delete with confirmation

**Deliverables:**
* Create, read, update, delete sessions
* Session list with cards
* Session detail view with metadata

---

### 4. Target Sheets
* Create "Add Sheet" form on session page
* Implement tag-based selectors for firearm/caliber/optic
* Add distance input with steppers
* Display sheet list on session detail
* Create sheet cards with summary

**Deliverables:**
* Add sheets to sessions
* Tag-based selection UI
* Sheet list display

---

### 5. Bull Records (Core Scoring Feature)
* Create sheet detail page (`/sheets/[sheetId]`)
* Implement bull form sections (1-6)
* Build `CountButtons` component for score entry
* Add live metric calculations (total shots, score, average)
* Implement save/update functionality
* Add "copy previous bull" feature
* Add "toggle bull used" feature

**Deliverables:**
* Full bull score entry interface
* Live metric updates
* Button-based count input (0-10)
* Save and edit bull records

---

### 6. Analytics Page
* Create `/analytics` page
* Implement date range filters
* Build tag-based multi-select filters (firearm, caliber)
* Add distance range filter
* Create session summary table
* Implement trend graph with Recharts
* Add line chart for average score over time
* Support multiple series (multi-firearm/caliber)

**Deliverables:**
* Working analytics page
* Filters for all dimensions
* Line chart showing progress over time
* Table view of sessions

---

### 7. Polish & Testing
* Add loading states to all async operations
* Improve error handling and messaging
* Add toasters for all user actions
* Test responsive behavior on mobile emulators
* Optimize mobile layouts (tap targets, spacing)
* Add empty states for lists
* Verify data validation edge cases
* Test on actual mobile devices if possible

**Deliverables:**
* Polished, production-ready UI
* Proper loading and error states
* Mobile-optimized interface
* Comprehensive error handling

---

## Proposed File Structure

```
target-tracker/
├── app/                          # App Router pages and routes
│   ├── api/                      # API route handlers
│   │   ├── analytics/
│   │   │   └── summary/
│   │   │       └── route.ts
│   │   ├── bulls/
│   │   │   └── route.ts
│   │   ├── bulls/[id]/
│   │   │   └── route.ts
│   │   ├── calibers/
│   │   │   └── route.ts
│   │   ├── calibers/[id]/
│   │   │   └── route.ts
│   │   ├── firearms/
│   │   │   └── route.ts
│   │   ├── firearms/[id]/
│   │   │   └── route.ts
│   │   ├── optics/
│   │   │   └── route.ts
│   │   ├── optics/[id]/
│   │   │   └── route.ts
│   │   ├── sessions/
│   │   │   └── route.ts
│   │   ├── sessions/[id]/
│   │   │   └── route.ts
│   │   ├── sheets/
│   │   │   └── route.ts
│   │   └── sheets/[id]/
│   │       └── route.ts
│   ├── analytics/                # Analytics page
│   │   └── page.tsx
│   ├── sessions/                 # Sessions-related pages
│   │   ├── new/
│   │   │   └── page.tsx
│   │   ├── [sessionId]/          # Dynamic session detail
│   │   │   ├── page.tsx
│   │   │   └── sheets/
│   │   │       └── new/
│   │   │           └── page.tsx
│   │   └── page.tsx              # Sessions list
│   ├── sheets/[sheetId]/         # Sheet detail
│   │   └── page.tsx
│   ├── setup/                    # Setup pages
│   │   ├── calibers/
│   │   │   └── page.tsx
│   │   ├── firearms/
│   │   │   └── page.tsx
│   │   ├── optics/
│   │   │   └── page.tsx
│   │   └── page.tsx              # Setup overview
│   ├── globals.css               # Global styles (Tailwind imports)
│   ├── layout.tsx                # Root layout (AppShell)
│   └── page.tsx                  # Root page (redirect)
├── components/                   # Reusable UI components
│   ├── ui/                       # shadcn/ui components (generated)
│   ├── AppShell.tsx              # Layout wrapper
│   ├── CountButtons.tsx          # Button grid for score counts
│   ├── Navbar.tsx                # Top navbar
│   ├── Sidebar.tsx               # Sidebar (desktop/mobile sheet)
│   ├── TagSelector.tsx           # Tag-based selector for firearms, etc.
│   ├── SessionCard.tsx           # Card for session summaries
│   ├── SheetCard.tsx             # Card for sheet summaries
│   ├── BullForm.tsx              # Per-bull score entry form
│   └── TrendChart.tsx            # Wrapped Recharts component for graphs
├── lib/                          # Utilities and models
│   ├── models/                   # Mongoose schemas
│   │   ├── BullRecord.ts
│   │   ├── Caliber.ts
│   │   ├── Firearm.ts
│   │   ├── Optic.ts
│   │   ├── RangeSession.ts
│   │   └── TargetSheet.ts
│   ├── db.ts                     # Database connection utility
│   ├── utils.ts                  # General helpers (e.g., derive metrics)
│   └── validators/               # Zod schemas for forms
│       ├── bull.ts
│       ├── session.ts
│       └── sheet.ts
├── public/                       # Static assets
│   ├── favicon.ico
│   └── icons/                    # Custom icons if needed
├── readme/                       # Comprehensive project docs
│   ├── 00-overview.md
│   ├── 01-domain-model.md
│   ├── 02-user-flows.md
│   ├── 03-ui-design.md
│   ├── 04-api-backend.md
│   ├── 05-implementation-plan.md
│   └── 06-future-features.md
├── .env.local                    # Environment variables (MONGODB_URI)
├── .gitignore
├── next.config.js                # Next.js config
├── package.json
├── pnpm-lock.yaml                # Or package-lock.json
├── postcss.config.js             # For Tailwind
├── tailwind.config.js            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── README.md                     # Project readme
```

---

## Development Notes

### Key Directories
* **`app/`** - All routing and pages using App Router
* **`components/`** - Split into `ui/` (shadcn) and custom components
* **`lib/`** - Backend logic, models, and utilities
* **`readme/`** - Comprehensive project documentation

### Extensibility
This structure allows easy addition of:
* New pages in `app/`
* New API routes in `app/api/`
* New components in `components/`
* Future services (e.g., `services/` for external integrations)

### Best Practices
* Use server components by default
* Client components only when needed (forms, interactive UI)
* Keep API routes thin, logic in `lib/`
* Validate all inputs with Zod
* Handle errors consistently
* Add TypeScript types for all data structures

