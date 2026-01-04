# User Flows

## 1. Configure Reference Data

**Flow:**
1. Open app → navigate to "Setup"
2. Add firearms, optics, calibers

**User Stories:**
* As a user, I can create, edit, and archive firearms
* As a user, I can create, edit, and archive optics
* As a user, I can create, edit, and archive calibers

**Implementation Notes:**
* Simple CRUD forms
* For selections in other flows (e.g., TargetSheet creation), use tag-like UI instead of dropdowns

---

## 2. Create a Range Session

**Flow:**
1. Click "New session"
2. Default date = today (editable, use date picker optimized for mobile)
3. Optional location and notes (short text inputs)
4. Save → redirected to session detail page

**User Stories:**
* As a user, I can create a range session with a date and notes
* As a user, I can later edit the session date and notes

---

## 3. Add Target Sheets to Session

**Flow on session detail page:**
1. Click "Add sheet"
2. Select firearm via tag UI:
   * Display available firearms as clickable tags (rounded badges)
   * Single-select, with search/filter if list grows long
3. Select caliber via similar tag UI
4. Select optic via tag UI
5. Enter distance in yards:
   * Simple numeric input with stepper buttons for mobile ease
6. Optional sheet label / notes (short text inputs)
7. Save → redirected to sheet detail page with bull inputs

**User Stories:**
* As a user, I can add multiple sheets to one session, each with its own firearm/caliber/optic/distance, using quick tag clicks to minimize interactions
* As a user, I can duplicate a sheet with the same settings to save time (future enhancement, optional in MVP)

**UI Clarifications:**
* Tag UI should be responsive
* On mobile, tags wrap horizontally or use a compact grid
* Ensure large tap targets (at least 48×48px) for easy one-tap selection

---

## 4. Enter Bull Scores for a Sheet

**On sheet detail page:**

### Context Display (top of page)
* Firearm, caliber, optic, distance, session date

### Bull Entry (for indices 1–6)
* Section for each bull
* For each score level (5, 4, 3, 2, 1, 0):
  * Display buttons for counts 0–10 as a compact row/grid
  * Small rounded buttons like a number pad subset
  * Single-click to set the count for that score
* Show derived total shots and total score inline, updating live

### Interface Requirements
* Default to showing six bulls
* Allow hiding a bull if unused (toggle "Bull used")
* Provide a "copy previous bull" action to duplicate counts with tweak
* **Compressed layout:**
  * Stack bull sections vertically on mobile
  * Use horizontal button rows for counts to fit small screens without excessive scrolling

**User Stories:**
* As a user, I can quickly enter aggregated scores for each bull on a sheet by tapping count buttons (0–10) for each score level, minimizing typing or stepping
* As a user, I can review calculated total score and average per bull as I enter data
* As a user, I can save the sheet and return later to edit

**Clarification:**
* Limit counts to 0–10 per score to keep UI simple
* If higher needed in future, add a "custom" button to open a numeric input

---

## 5. Review Session Summary

**On RangeSession detail page:**

### Session Metadata Card
* Date, location, notes

### List of Sheets
For each sheet:
* Firearm, caliber, optic, distance
* Total shots across all bulls
* Total score and average score per shot
* Link to sheet detail

**Optional Lightweight Visual:**
* Small bar or sparkline representing average score per sheet

**User Stories:**
* As a user, I can see how I did on a given day across all sheets
* As a user, I can click into any sheet to see per-bull breakdown

---

## 6. Review History Over Time (Analytics)

**Minimal analytics page with:**

### Filters
Using tag-like UI for selections where possible:
* **Date range** - date pickers
* **Firearm** - multi-select via tags
* **Caliber** - multi-select via tags
* **Distance range** - numeric inputs with sliders or steppers for mobile

### Outputs

#### Table of Sessions
* Date
* Total shots
* Average score per shot

#### Graphs
* **Line chart** of average score per shot over time:
  * Session dates on X-axis
  * Filtered by selected firearm(s), caliber(s), and distance
* **Additional filtered views:**
  * Separate lines or tabs for per-firearm, per-caliber, or per-distance breakdowns
  * Keep simple – one chart with multiple lines if multi-selected, or toggleable views
* Use Recharts for responsive, touch-friendly charts
* Ensure charts scale well on mobile with zoom/pan if needed

**User Stories:**
* As a user, I can see if my average score per shot is trending up over time, with graphs showing improvement across range days
* As a user, I can filter graphs by firearm, caliber, or distance to track specific progress (e.g., improvement at 100 yards with 5.56 NATO)

**Clarification:**
* Start with a single line chart
* For filters, aggregate data accordingly (e.g., average across selected firearms)
* Account for future additions like more metrics (e.g., hit rate trends) by computing derivations server-side

