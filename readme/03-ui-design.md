# UI & Design

## Global Layout

### Top-Level Navigation
* Range Sessions
* Analytics
* Setup (Firearms, Optics, Calibers)

### Layout Structure
* **Mobile**: Top navbar with hamburger menu for sidebar
* **Desktop**: Persistent sidebar
* **Main content area**: Card-based layout

---

## Visual Style

### Colors
* **Background**: Dark (neutral-900)
* **Content cards**: Slightly lighter (neutral-800/900)
* **Borders**: Subtle with soft rounded corners
* **Accent**: Primary actions (use shadcn default accent)

### Typography
* **Font**: Simple sans-serif (system font or Inter)
* Clear hierarchy with appropriate weights

### Motion
* Minimal micro-animations
* Hover and focus states
* Smooth transitions

### Mobile-First Principles
* All elements use Tailwind's mobile-first breakpoints
* Prioritize vertical stacking
* Large buttons/tags (minimum 44px height)
* Avoid wide horizontal layouts

---

## Component Library (shadcn/ui)

### Layout Components
* **AppShell** - Consistent layout wrapper
* **Navbar** / **Sidebar** - Using `Sheet` and `Button`

### Form Components
* **Form** - Form wrapper with validation
* **Input** - Text inputs
* **Select** - Dropdowns (fallback for tags)
* **Textarea** - Multi-line text
* **Button** - Primary, secondary, ghost variants
* **Switch** - Toggle controls

### Custom Components
* **TagSelector** - Wrap `Badge` or `Button` in flex/grid for tag-like selections
* **InteractiveTargetInput** - Visual click-to-add shot placement with expand modal

### Feedback Components
* **Toast** - Save success/failure notifications
* **Dialog** - Delete confirmations and modals
* **Card** - Sessions, sheets, and content containers

### Filter Components
* **Badge** - Selected filter indicators
* **DropdownMenu** - Filter controls (fallback to tags on mobile)

### Icons
lucide-react icons:
* `Target` - Range/shooting related
* `Gun` - Firearms
* `LineChart` - Analytics
* `Calendar` - Date selection
* `Plus` - Add actions
* `Edit` - Edit actions
* `Trash` - Delete actions
* And more as needed

### Charts
* **Recharts** components wrapped in responsive containers
* Touch-friendly on mobile

---

## Forms for Score Entry

### Sheet Layout

#### 2-Column Grid (Desktop)
* Bulls displayed in 2-column grid (3 rows of 2)
* Each bull card contains interactive target and metrics
* Mobile: Single column, stacks vertically

#### Per Bull Card

##### Header
* Bull number and shot count
* Clear button (when shots exist)
* Expand button for full-screen precision input

##### Interactive Target Input
* Visual target with clickable zones (primary input method)
* Click to add shots to specific target locations
* Right-click to remove shots
* Shows real-time shot placement
* White dots for bullseye (5pts), red dots for other rings
* Hover feedback showing point value of hovered zone
* Centered below target: Instructions text

##### Expanded View Modal
* 90vw × 90vh modal with large target (80vw × 80vh)
* Shot markers scaled to half size (1.75 radius) for precision
* Same click/right-click interactions
* Close button to return to normal view

##### Interactive Target Features
* SVG-based target visualization (200x200 viewBox)
* Ring-based scoring zones:
  * Red center (0-15 radius): 5pts
  * Inner black (15-30): 4pts
  * Middle black (30-50): 3pts
  * Dark gray (50-70): 2pts
  * Light gray (70-85): 1pt
  * White outer (85-100): 0pts
* Real-time score calculation from shot positions
* Shot positions saved as XY coordinates
* Maximum 100 shots per score level (up from 10)

##### Metrics Display
Below each target (centered):
* Total shots, Total score, Average score
* 3-column grid layout
* Updates live as shots are added/removed

---

## Responsive Breakpoints

Using Tailwind's default breakpoints:
* **sm**: 640px - Small tablets
* **md**: 768px - Tablets
* **lg**: 1024px - Laptops
* **xl**: 1280px - Desktops
* **2xl**: 1536px - Large screens

### Mobile-First Strategy
1. Design for mobile (320px-640px) first
2. Add enhancements at larger breakpoints
3. Test on actual devices and emulators

---

## Accessibility

* Large tap targets (minimum 44×44px, preferably 48×48px)
* Proper color contrast ratios
* Keyboard navigation support
* ARIA labels where appropriate
* Focus indicators on all interactive elements

