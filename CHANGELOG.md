# Changelog

All notable changes to Target Tracker will be documented in this file.

## [Unreleased]

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
