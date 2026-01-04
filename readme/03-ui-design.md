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
* **CountButtons** - Grid of `Button` variants for 0–10 selections

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

### Per Bull Layout

#### Label
* "Bull 1", "Bull 2", etc.

#### Compact Grid
* **Rows**: Score levels (5, 4, 3, 2, 1, 0)
* **For each row**:
  * Label (e.g., "5pts:")
  * Row of 0–10 buttons
  * Small, rounded buttons
  * Selected state highlighted

#### Mobile Optimization
* Buttons in 2–3 columns per row to fit narrow screens
* Ensure tap targets are large enough

#### Derived Metrics Display
Real-time text updates:
* "Total shots: X"
* "Total score: Y"
* "Average score/shot: Z.Z"

These metrics update live as the user adjusts counts.

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

