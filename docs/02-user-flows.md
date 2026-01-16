# User Flows

## 1. Configure Reference Data

**Flow:**
1. Open app → navigate to "Setup"
2. Add firearms, optics, calibers
3. Configure firearm relationships (compatible calibers and optics)
4. Set default distance for each firearm
5. Drag-and-drop to reorder equipment as needed

**User Stories:**
* As a user, I can create, edit, and archive firearms with default distances
* As a user, I can create, edit, and archive optics
* As a user, I can create, edit, and archive calibers
* As a user, I can link compatible calibers and optics to each firearm
* As a user, I can reorder my equipment to prioritize frequently used items

**Implementation Notes:**
* Simple CRUD forms with multi-select for equipment relationships
* For selections in other flows (e.g., TargetSheet creation), use tag-like UI instead of dropdowns
* Blue active state styling for selected items
* `sortOrder` field persists custom ordering

---

## 2. Create a Range Session

**Flow:**
1. Click "New session"
2. Default date = today (editable, use date picker optimized for mobile)
3. Optional location (with autocomplete from previous sessions) and notes (short text inputs)
4. Save → redirected to session detail page with clean URL slug (e.g., `/sessions/2026-01-04-reloaderz`)

**User Stories:**
* As a user, I can create a range session with a date and notes
* As a user, I can later edit the session date and notes
* As a user, I get a readable URL for sharing or bookmarking sessions

**Implementation Notes:**
* Session slug auto-generated from date and location
* Location autocomplete suggests previously used values
* Stored dates normalized to noon UTC to prevent timezone shifts

---

## 3. Add Target Sheets to Session

**Flow on session detail page:**
1. Click "Add sheet" (button in top-right next to Edit/Delete)
2. **Two-column layout:**
   * **Left column:**
     - Select firearm via tag UI (displays in custom sort order)
     - Select caliber via tag UI (filtered to firearm's compatible calibers, auto-selects first)
     - Select optic via tag UI (filtered to firearm's compatible optics, auto-selects first)
   * **Right column:**
     - Distance in yards (pre-populated from firearm's default, if set)
     - Optional sheet label
     - Optional notes
3. Save → redirected to sheet detail page with bull entry interface

**User Stories:**
* As a user, I can add multiple sheets to one session, each with its own firearm/caliber/optic/distance, using quick tag clicks to minimize interactions
* As a user, I see only compatible equipment options after selecting a firearm
* As a user, I don't need to set distance every time if I use a firearm's default distance

**UI Clarifications:**
* Tag UI should be responsive
* On mobile, tags wrap or use compact grid
* Large tap targets (at least 44×44px) for easy selection
* Blue active state for selected items
* No search input shown if equipment count is small (≤5 items)

---

## 4. Enter Bull Scores for a Sheet

**On sheet detail page:**

### Context Display (top of page)
* Firearm, caliber, optic, distance, session date

### Quick Entry Card (single input method)
* **6 input fields** (one for each bull) in responsive grid
* **6-digit format**: Each position = count for that score level
  * Example: "543210" = 5pts:5, 4pts:4, 3pts:3, 2pts:2, 1pts:1, 0pts:0
  * Example: "03" = 0 five-pointers, 3 four-pointers, rest zeros
* Supports leading zeros (e.g., "0312" for no 5's, three 4's, one 3, two 2's)
* Blank for new/empty bulls
* Pre-populated when viewing/editing existing sheets
* Bidirectional sync with count buttons below

### Bull Entry (for indices 1–6)
* Section for each bull (all 6 always displayed for input)
* For each score level (5, 4, 3, 2, 1, 0):
  * Display buttons for counts 0–10 as a compact row/grid
  * Small rounded buttons like a number pad subset
  * Single-click to set the count for that score
* "Copy Previous" button for bulls 2-6 to duplicate previous bull's counts
* Show derived total shots and total score inline, updating live

### Interface Requirements
* Default to showing six bulls for data entry
* **Smart saving**: Only saves bulls with non-zero scores to database
* **Compressed layout:**
  * Stack bull sections vertically on mobile
  * Use horizontal button rows for counts to fit small screens without excessive scrolling

**User Stories:**
* As a user, I can quickly enter aggregated scores using either quick entry (typing 6 digits) or count buttons
* As a user, I can review calculated total score and average per bull as I enter data
* As a user, I can save the sheet and return later to edit
* As a user, I don't waste database space on empty bulls I didn't use

**Clarification:**
* Quick entry updates when buttons clicked, and vice versa
* Bulls with all zeros are filtered before save
* Sheet cards only display bulls with actual data

---

## 5. Review Session Summary

**On RangeSession detail page:**

### Session Summary Card
* **Key Metrics** with icons:
  - Total bullets fired
  - Bullseye percentage (% of 5-point shots)
  - Session average score
  - Best weapon (firearm with highest average)
  - Average score per firearm used

### Multi-Firearm Comparison Chart
* Line chart comparing all firearms used in session
* Each firearm gets its own colored line
* X-axis: Sheet number/label
* Y-axis: Average score (0-5 scale)
* Gaps shown where firearm wasn't used (no connecting lines)

### Session Heatmap
* Aggregate bullseye visualization showing all shots from session
* Transparent dots show shot density and concentration
* Click to open detailed modal with statistics

### List of Sheets
For each sheet:
* Firearm, caliber, optic, distance
* Individual bull visualizations (only for bulls with data)
* Bar chart showing average score per bull
* Total shots and total score
* Link to sheet detail for editing

**User Stories:**
* As a user, I can see how I did on a given day across all sheets
* As a user, I can compare different firearms in the same session
* As a user, I can click into any sheet to see per-bull breakdown
* As a user, I can visualize my shot placement across the entire session

---

## 6. Review Session History

**On sessions list page:**

### Line-Item Session List
* Sorted by date (most recent first)
* Each session displays:
  - **Date** with day of week
  - **Location**
  - **Stats grid** (responsive 2→4 columns):
    - Sheets count
    - Total shots
    - Average score
    - **Improvement %** with color-coded indicator:
      - Green with ↑ for positive change vs previous session
      - Red with ↓ for negative change
  - Hover effect and chevron for navigation

**User Stories:**
* As a user, I can quickly scan my recent sessions and see if I'm improving
* As a user, I can see at a glance which sessions were productive
* As a user, I can track my progress over time with improvement indicators

---

## 7. Review History Over Time (Analytics)

**Minimal analytics page with:**

### Filters
Using tag-like UI for selections where possible:
* **Date range** - date pickers
* **Firearm** - multi-select via tags
* **Caliber** - multi-select via tags
* **Distance range** - numeric inputs with sliders or steppers for mobile

### Outputs

#### Table of Sessions
* Date (in chronological order)
* Total shots
* Average score per shot
* Improvement % from previous session

#### Graphs
* **Line chart** of average score per shot over time:
  * Session dates on X-axis (chronologically ordered)
  * Filtered by selected firearm(s), caliber(s), and distance
* **Additional filtered views:**
  * Separate lines or tabs for per-firearm, per-caliber, or per-distance breakdowns
  * Keep simple – one chart with multiple lines if multi-selected, or toggleable views
* Use Recharts for responsive, touch-friendly charts
* Ensure charts scale well on mobile with zoom/pan if needed

**User Stories:**
* As a user, I can see if my average score per shot is trending up over time, with graphs showing improvement across range days in proper chronological order
* As a user, I can filter graphs by firearm, caliber, or distance to track specific progress (e.g., improvement at 100 yards with 5.56 NATO)

**Clarification:**
* Sessions sorted chronologically for accurate trend analysis
* For filters, aggregate data accordingly (e.g., average across selected firearms)
* Account for future additions like more metrics (e.g., hit rate trends) by computing derivations server-side

