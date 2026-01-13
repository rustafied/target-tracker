# Changelog

All notable changes to Target Tracker will be documented in this file.

## [Unreleased]

## [1.5.0] - January 13, 2026

### Added - Ammo Inventory System

#### Overview
Complete ammunition inventory management system with automatic deduction based on shots fired in range sessions. Track caliber inventory, manage on-hand quantities, visualize usage trends, and maintain complete transaction history.

#### Core Features
- **Caliber-Based Inventory**: Track ammunition inventory per caliber with automatic linking to existing calibers
- **Real-Time Tracking**: Live on-hand quantity tracking with manual adjustments and bulk order entry
- **Automatic Deductions**: Ammo automatically deducted from inventory when target sheets are created or updated
- **Transaction History**: Complete audit trail of all inventory changes with timestamps and session links
- **Usage Analytics**: Line charts showing usage over time and pie charts for stock distribution
- **Non-Session Usage**: Record ammo usage outside of range sessions with multi-caliber selection
- **User Scoping**: All inventory data is user-specific (tied to Discord authentication)

#### Data Models
- **AmmoInventory**: Tracks current on-hand quantity per caliber per user with timestamps
- **AmmoTransaction**: Append-only log of all inventory changes with reasons, deltas, and session/sheet links
- **TargetSheet Update**: Sheets automatically link to caliber for ammo reconciliation
- **BullRecord Integration**: Total shots calculated from aim point records for accuracy

#### User Interface

##### `/ammo` Page
- **Single-Column List Layout**: Compact horizontal cards with bullet icon, caliber name, category badge, rounds on hand, and edit button
- **Search & Filtering**: Real-time search across caliber names and categories
- **Zero Inventory Hiding**: Automatically hides calibers with zero inventory for cleaner display
- **Usage Over Time Chart**: Line graph showing ammo consumption per caliber over time (75% width)
- **Stock Distribution Pie Chart**: Donut chart showing current inventory proportions (25% width)
- **Bulk Order Entry**: Tag-based multi-caliber selection for adding inventory from orders
- **Non-Session Usage Tracking**: Record ammo used outside of range sessions with notes
- **Visual Indicators**: Bullet SVG icons and negative inventory warnings

##### `/ammo/[id]` Detail Page
- **Summary Cards**: On-hand quantity, total used, and last updated timestamp
- **Usage Chart**: Single-line graph showing usage history for that specific caliber
- **Transaction History**: 
  - Chronologically sorted (newest first) with grouped session transactions
  - Session links with date, location, and sheet count
  - Manual adjustments with notes and timestamps
  - Relative timestamps (e.g., "about 4 hours ago")
- **Quick Adjust Dialog**: Manual inventory adjustments with preset amounts (+50, +100, -50, -100) or custom values

##### Mobile Optimizations
- **Scrollable Modals**: All dialog windows (firearm edit, optic edit, caliber edit, order entry) are fully scrollable on mobile
- **Touch-Friendly Controls**: Large touch targets for all interactive elements

#### Reconciliation Logic
- **Automatic Deduction**: Ammo deducted when bull records are created or updated on target sheets
- **Shot Calculation**: Total shots calculated from `BullRecord.totalShots` (sum of all score counts)
- **Real-Time Updates**: Inventory updates immediately when sheets are saved
- **Transaction Creation**: Creates `session_deduct` transactions linked to sessions and sheets
- **Idempotent Operations**: Prevents duplicate deductions using transaction uniqueness checks
- **Historical Data Migration**: Scripts to backfill inventory from existing session data

#### API Endpoints
- `GET /api/ammo/inventory` - Get inventory for all calibers with on-hand quantities
- `POST /api/ammo/inventory/adjust` - Manual inventory adjustments (add/subtract with notes)
- `GET /api/ammo/transactions` - Transaction log with pagination, session/sheet population, and sorting
- `GET /api/ammo/usage-over-time` - Historical usage data for chart visualization

#### Technical Implementation
- **Reconciliation Module**: `lib/ammo-reconciliation.ts` handles all inventory logic with automatic triggering on bull record updates
- **Atomic Updates**: MongoDB `$inc` and `upsert` for safe concurrent inventory updates
- **Date Validation**: Robust handling of invalid/missing timestamps with fallbacks to most recent transaction
- **Transaction Sorting**: Multi-level sorting with session grouping and chronological ordering
- **Data Integrity**: Migration scripts to fix historical data inconsistencies (missing timestamps, incorrect ObjectIds)
- **Duplicate Prevention**: Cleanup of duplicate inventory records with transaction-based recalculation

#### Bug Fixes & Improvements (January 13, 2026)
- **Fixed Reconciliation Triggering**: Changed `BullRecord` query from `sheetId` to `targetSheetId` to properly calculate shots
- **Fixed Transaction Timestamps**: Backfilled missing `createdAt` values for historical transactions using sheet creation dates
- **Fixed Transaction Sorting**: Ensured newest transactions always appear first with proper date validation
- **Fixed Inventory Duplicates**: Removed duplicate inventory records and recalculated from transaction history
- **Fixed ObjectId Handling**: Proper conversion between `ObjectId` and string types in queries and transactions
- **Fixed Invalid Dates**: Added date validation before formatting to prevent "Invalid time value" errors
- **Fixed Shot Calculation**: Simplified to directly sum `totalShots` from `BullRecord` instead of iterating aim points
- **Mobile Modal Scrolling**: Fixed dialog overflow issues on mobile devices

#### Visual Design Improvements
- **Custom Bullet Icons**: Redesigned SVG icons for different caliber categories with detailed line art
  - Rifle: AR-15 style with stock, receivers, barrel, handguard
  - Pistol: Semi-auto with slide serrations, sights, grip texture
  - Shotgun: Pump-action with stock, receiver, fore-end
- **Custom Optic Icons**: Line-based SVG silhouettes for different optic types
  - Red Dot: Rectangular body with lens window
  - LPVO/Scope: Objective and ocular bells with turret housing
  - ACOG: Trapezoidal body with fiber optic tube
  - Holographic: EOTech-style window with protective wings
  - Iron Sights: Front post and rear sight with picatinny rail

#### Future Enhancements
- Advanced ammo consumption analytics dashboard
- Cost tracking per round and total expenditure
- Projected sessions remaining calculator
- Consumption by firearm/caliber/distance metrics
- Ammo purchase recommendations based on usage patterns

### Added - Custom Target Templates (January 2026)

#### Phase 1: Template Infrastructure & Migration
- **New Data Models**: Created `TargetTemplate`, `ScoringModel`, and `AimPointRecord` models
- **Backward Compatibility**: Migrated existing `BullRecord` data to new schema while maintaining legacy support
- **Default Template**: Created "Six Bull (Default)" template matching existing 6-bull functionality
- **Migration Scripts**: Automated scripts to migrate existing data without data loss

#### Phase 2: Template-Driven UI
- **Dynamic Sheet Rendering**: Sheet pages now render aim points based on template configuration
- **Template Display**: Show template names and aim point labels throughout the UI
- **API Integration**: All sheets now load and display their associated template data

#### Phase 3: Built-In Templates & UI Enhancements
- **New Templates Added**:
  - **Single Bullseye**: Large precision target with 9-5 ring scoring (1 aim point)
  - **Sight-In Grid**: 5-square zeroing grid with hit/miss scoring (5 aim points)
  - **Silhouette**: Head and torso zones for tactical training (2 aim points)
  - **Six Bull (Default)**: Traditional 6-bull practice sheet (6 aim points)

- **Visual Template Selection**: 
  - Replaced dropdown with visual card-based template selector
  - Shows SVG preview of each template
  - Clear visual feedback for selected template
  - Template cards on sheet creation form

- **Template-Specific Rendering**:
  - Interactive target input now renders actual template SVG
  - Session view displays correct template visuals for each sheet
  - Bull visualizations show template-specific graphics
  - Aim points display proper names (e.g., "Head", "Torso", "Center")

- **Template Gallery**: New `/setup/targets` page to browse and view all available templates

- **Template Sorting**:
  - Drag-and-drop reordering of templates on `/setup/targets`
  - Custom sort order persists across all template selections
  - Visual drag handles with smooth animations
  - Sort order applies to sheet creation form automatically

- **UI Improvements**:
  - Fixed dropdown/popover backgrounds (solid instead of translucent)
  - Updated sheet and session views to show template information
  - Template name displayed on all sheet cards
  - Colored ring target for default template
  - Improved empty state with icon and call-to-action

### Technical Improvements
- Model registration fixes for Next.js serverless functions
- Improved session authentication using `requireUserId` helper
- Better TypeScript type safety with template interfaces
- Optimized database queries with proper population

### Documentation
- Created comprehensive feature specification (`readme/18-custom-target-types.md`)
- Phase completion documents (PHASE1-COMPLETE.md, PHASE2-COMPLETE.md, PHASE3-COMPLETE.md)
- UI update documentation (PHASE3-UI-UPDATES.md)
- Migration guides and testing checklists

## [Previous Versions]

### Phase 1: Core Functionality
- Initial target tracking with 6-bull sheets
- Firearm, caliber, and optic management
- Session tracking and scoring
- Basic analytics and visualizations

### Phase 2: Analytics Upgrade
- Advanced analytics dashboard
- Per-firearm, caliber, and optic analysis
- Heatmaps and shot distribution charts
- Performance trends over time

### Phase 3: Image Recognition
- Python-based target image recognition
- Automatic shot detection and counting
- Bull-by-bull image upload
- OCR for score verification

### Phase 4: Authentication
- Discord OAuth integration
- User-specific data isolation
- Secure session management
- Multi-user support

---

**Date**: January 2026
**Contributors**: Aaron (with AI assistance)
