# Target Tracker – Project Overview

A Next.js application for logging and visualizing shooting range sessions with per-bull scores.

## Project Goals

* **Fast logging**: Low-friction entry after shooting sessions
* **Detailed scoring**: Capture scores per bull using 5–4–3–2–1–0 system
* **Comprehensive tracking**: Associate each bull with firearm, caliber, optic, and distance
* **Local storage**: MongoDB for all data
* **Performance visualization**: Simple views and graphs to track improvement over time
* **Future-proof data model**: Designed to support photo OCR, shot-level data, drill types, authentication, and multi-device sync without breaking changes
* **Mobile-first**: Minimal, compressed inputs to reduce clicks and typing

## Tech Stack

### Core Framework
* **Next.js** (App Router, TypeScript)
* **TypeScript** throughout

### UI & Styling
* **Tailwind CSS** + **shadcn/ui**
* **Theme**: Dark by default, minimal and modern
  * Dark background, muted neutrals
  * Accent color only for key actions
* **Icons**: lucide-react
* **Charting**: Recharts (lightweight line charts)

### Forms & Validation
* **React Hook Form** + **Zod** for validation

### Database
* **MongoDB** (local instance only)
* **Mongoose** ODM

### Development
* **Package manager**: pnpm
* **Repository**: GitHub `rustafied/target-tracker`
* **State management**: Local component state and server actions/API routes only

## Design Principles

### Mobile-First Responsive Design
* Tailwind's responsive utilities
* Touch-friendly with large tappable areas (minimum 48x48px)
* Minimal scrolling
* Compressed layouts
* Horizontal scrolling for tag selections if needed

### Visual Style
* Dark background (neutral-900)
* Content cards slightly lighter (neutral-800/900)
* Subtle borders and soft rounded corners
* Accent color for primary actions
* Simple sans-serif typography (system font or Inter)
* Minimal micro-animations (hover, focus)

## Repository Structure

```
target-tracker/
├── app/                    # App Router pages and API routes
├── components/             # Reusable UI components
├── lib/                    # Utilities and Mongoose models
├── public/                 # Static assets
├── readme/                 # Comprehensive project documentation
└── ...config files
```

## Quick Links

* [Domain Model](./01-domain-model.md) - Data entities and relationships
* [User Flows](./02-user-flows.md) - Key user journeys
* [UI & Design](./03-ui-design.md) - Component specs and layout
* [API & Backend](./04-api-backend.md) - Routes and MongoDB setup
* [Implementation Plan](./05-implementation-plan.md) - Build sequence and file structure
* [Future Features](./06-future-features.md) - Planned expansions

