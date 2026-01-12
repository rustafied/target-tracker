# Changelog

All notable changes to Target Tracker will be documented in this file.

## [Unreleased]

### Added - Ammo Tracking (January 2026)

#### Overview
Complete ammunition inventory management system with automatic deduction based on shots fired. Track ammo types, manage on-hand quantities, and view complete transaction history.

#### Core Features
- **Ammo Type Management**: Define ammunition by caliber, brand, load details, casing type, and reload status
- **Inventory Tracking**: Real-time on-hand quantity tracking with manual adjustments
- **Automatic Deductions**: Ammo automatically deducted when sheets are saved based on shots recorded
- **Transaction Log**: Complete audit trail of all inventory changes with reasons and timestamps
- **User Scoping**: All ammo data is user-specific (tied to Discord auth)

#### Data Models
- **AmmoType**: Stores ammo specifications (name, caliber, manufacturer, load, casing, reload flag)
- **AmmoInventory**: Tracks current on-hand quantity per ammo type per user
- **AmmoTransaction**: Append-only log of all inventory changes with reasons
- **TargetSheet Update**: Added optional `ammoTypeId` field to link sheets to ammo

#### User Interface
- **`/ammo` Page**: 
  - Inventory list with search and caliber filtering
  - Cards showing on-hand quantity, caliber, and metadata
  - Quick +/- buttons for fast adjustments
  - Visual warnings for negative or low inventory
  
- **`/ammo/new` Page**: 
  - Create new ammo type form
  - Set initial on-hand quantity
  - Auto-creates inventory record and transaction
  
- **`/ammo/[id]` Page**: 
  - Detailed view with current inventory
  - Complete transaction history
  - Quick adjust dialog with presets and custom amounts
  - Summary stats (total used, last updated)

- **Sheet Create/Edit Integration**: 
  - Ammo type selector on new sheet form
  - Filtered by selected caliber
  - Warning if no ammo types exist
  - Optional field (backward compatible)

#### Reconciliation Logic
- **Create**: Deducts ammo when sheet is saved with shots recorded
- **Edit**: Updates deduction based on shot count difference (not double subtract)
- **Delete**: Reverses deduction with reversal transaction for audit
- **Ammo Type Change**: Reverses old type, deducts from new type
- **Shot Count Source**: Calculated from `AimPointRecord.totalShots` for accuracy

#### API Endpoints
- `GET/POST /api/ammo/types` - List and create ammo types
- `GET/PUT/DELETE /api/ammo/types/[id]` - Manage individual ammo types
- `GET /api/ammo/inventory` - Get inventory with ammo type details
- `POST /api/ammo/inventory/adjust` - Manual inventory adjustments
- `GET /api/ammo/transactions` - Transaction log with pagination

#### Technical Implementation
- **Reconciliation Module**: `lib/ammo-reconciliation.ts` handles all inventory logic
- **Idempotent Operations**: Uses unique constraints to prevent duplicate transactions
- **Atomic Updates**: MongoDB `$inc` for safe concurrent updates
- **Difference-Based**: Only applies deltas, not full recalculations
- **Reversal Pattern**: Creates reversal transactions instead of deleting for audit clarity

#### Future Enhancements (Phase 3)
- Ammo consumption charts in analytics
- Inventory over time visualization
- Projected sessions left calculator
- Consumption by firearm/caliber/distance metrics

#### Documentation
- Feature specification: `readme/19-ammo-tracking.md`
- Complete data model definitions
- Reconciliation algorithm documentation
- API endpoint reference

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
