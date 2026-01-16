# Anomaly Detection - E2E Testing Guide

## Manual E2E Test Cases

Since this is a complex analytics feature with real-time data dependencies, manual E2E testing is recommended. Below are comprehensive test scenarios.

### Prerequisites
- At least 10 sessions with varied performance data
- Mix of distances (e.g., 10yd, 25yd, 50yd)
- Different firearms and optics used
- Some sessions with high/low shot counts

---

## Test Suite 1: Basic Anomaly Detection

### TC1.1: View Anomalies on Sessions List
**Steps:**
1. Navigate to `/sessions`
2. Scroll through session list
3. Look for anomaly flags (colored badges)

**Expected:**
- Anomaly flags appear on sessions with significant deviations
- Flags show correct severity (red/yellow/blue)
- Tooltip shows deviation count on hover
- No flags on normal sessions

**Pass Criteria:**
- ✓ Flags visible and correctly colored
- ✓ Tooltip displays on hover
- ✓ Count matches actual deviations

---

### TC1.2: Open Insights Panel from Flag
**Steps:**
1. On sessions list, click an anomaly flag
2. Observe insights panel opens
3. Do NOT click session card itself

**Expected:**
- Panel opens without navigating away
- Shows session date and location
- Displays severity indicator
- Has three tabs: Deviations, Causes, Comparison

**Pass Criteria:**
- ✓ Panel opens on flag click
- ✓ Session card click still navigates to session
- ✓ All tabs visible

---

### TC1.3: Review Deviations Tab
**Steps:**
1. Open insights panel for an anomaly
2. View Deviations tab (default)
3. Check each deviation card

**Expected:**
- Shows all metrics with >threshold deviation
- Each card displays:
  - Metric name with icon
  - Session value vs. average
  - Percent deviation with trend arrow
  - Color coding (red for negative, green for positive)

**Pass Criteria:**
- ✓ All anomalous metrics shown
- ✓ Values accurate
- ✓ Percentages calculated correctly

---

### TC1.4: Review Causes Tab
**Steps:**
1. Switch to Causes tab
2. Read suggested causes
3. Check confidence levels

**Expected:**
- Lists 1-3 likely causes
- Each cause shows:
  - Description (e.g., "Extended range: 50yd vs. typical 25yd")
  - Confidence badge (high/medium/low)
- Causes make logical sense for the deviations

**Pass Criteria:**
- ✓ Causes displayed
- ✓ Confidence levels shown
- ✓ Descriptions are clear

---

### TC1.5: Review Comparison Chart
**Steps:**
1. Switch to Comparison tab
2. View bar chart
3. Check legend and axis labels

**Expected:**
- Bar chart shows session value vs. average
- Two bars per metric (session in primary color, average in muted)
- Axis labels clear
- Tooltip on hover shows exact values

**Pass Criteria:**
- ✓ Chart renders correctly
- ✓ Data matches deviations
- ✓ Interactive tooltips work

---

## Test Suite 2: Analytics Dashboard Widget

### TC2.1: View Anomaly Summary Widget
**Steps:**
1. Navigate to `/analytics`
2. Scroll to "Session Anomalies" widget
3. Observe summary

**Expected:**
- Widget shows:
  - Total anomaly count
  - Severity breakdown badges
  - Top 3 insights
  - List of up to 5 recent anomalies
- "View all" button if more than 5 anomalies

**Pass Criteria:**
- ✓ Widget displays correctly
- ✓ Counts accurate
- ✓ Insights relevant

---

### TC2.2: Click Anomaly in Widget
**Steps:**
1. Click any anomaly card in widget
2. Verify navigation

**Expected:**
- Navigates to session detail page
- Session loads correctly

**Pass Criteria:**
- ✓ Navigation works
- ✓ Correct session loaded

---

### TC2.3: No Anomalies State
**Steps:**
1. Set threshold very high (e.g., 50%)
2. Reload analytics page
3. Check widget

**Expected:**
- Shows green checkmark icon
- Message: "No anomalies detected"
- Displays session count

**Pass Criteria:**
- ✓ Empty state displays
- ✓ Message clear

---

## Test Suite 3: Dedicated Anomalies Page

### TC3.1: Access Anomalies Page
**Steps:**
1. Navigate to `/analytics/anomalies`
2. Wait for page load

**Expected:**
- Page title: "Session Anomaly Detection"
- Settings panel visible
- Global averages card
- Insights card
- Anomalies list

**Pass Criteria:**
- ✓ Page loads without errors
- ✓ All sections present

---

### TC3.2: Adjust Threshold
**Steps:**
1. Change threshold from 20 to 30
2. Wait for reload
3. Observe anomaly count change

**Expected:**
- Fewer anomalies detected (higher threshold = less sensitive)
- List updates automatically
- No page refresh required

**Pass Criteria:**
- ✓ Threshold updates
- ✓ Anomaly count decreases
- ✓ Smooth update

---

### TC3.3: Adjust Minimum Sessions
**Steps:**
1. Change minSessions from 5 to 10
2. Observe behavior

**Expected:**
- If <10 sessions: Shows "Need at least 10 sessions" message
- If ≥10 sessions: Detection continues normally

**Pass Criteria:**
- ✓ Validation works
- ✓ Appropriate message shown

---

### TC3.4: Filter by Severity
**Steps:**
1. Set severity filter to "High Only"
2. Observe list
3. Try "Medium Only" and "Low Only"

**Expected:**
- List shows only selected severity
- Count updates
- Empty state if none of that severity

**Pass Criteria:**
- ✓ Filtering works correctly
- ✓ All severity levels testable

---

### TC3.5: View Global Averages
**Steps:**
1. Check "Historical Baselines" card
2. Verify values

**Expected:**
- Shows:
  - Avg Score (e.g., 4.25)
  - Bull Rate (e.g., 32.5%)
  - Miss Rate (e.g., 8.2%)
  - Avg Distance (e.g., 25 yd)
- Session count displayed
- Values match manual calculation (spot check)

**Pass Criteria:**
- ✓ All metrics shown
- ✓ Values reasonable

---

### TC3.6: View Key Insights
**Steps:**
1. Read insights in "Key Insights" card
2. Verify relevance

**Expected:**
- 3-5 insights generated
- Examples:
  - "Detected X anomalies out of Y sessions (Z%)"
  - "Most common cause: distance variations"
  - "X anomalies show below-average performance"

**Pass Criteria:**
- ✓ Insights make sense
- ✓ Grammar correct
- ✓ Numbers accurate

---

## Test Suite 4: Mobile Responsiveness

### TC4.1: Sessions List on Mobile
**Steps:**
1. Open `/sessions` on mobile (or narrow browser)
2. Check anomaly flags

**Expected:**
- Flags visible and appropriately sized
- Tap opens insights panel
- Panel is full-screen or modal
- Scrollable content

**Pass Criteria:**
- ✓ Mobile layout works
- ✓ Touch interactions smooth

---

### TC4.2: Insights Panel on Mobile
**Steps:**
1. Open insights panel on mobile
2. Switch between tabs
3. Scroll through content

**Expected:**
- Tabs stack or scroll horizontally
- Charts resize appropriately
- Text readable
- Close button accessible

**Pass Criteria:**
- ✓ Panel usable on mobile
- ✓ All content accessible

---

### TC4.3: Anomalies Page on Mobile
**Steps:**
1. Open `/analytics/anomalies` on mobile
2. Test settings inputs
3. Scroll through anomalies

**Expected:**
- Settings stack vertically
- Inputs full-width
- Cards stack
- Charts responsive

**Pass Criteria:**
- ✓ Page fully functional on mobile
- ✓ No horizontal scroll

---

## Test Suite 5: Edge Cases

### TC5.1: Insufficient Data
**Steps:**
1. Test with <5 sessions (use test account or adjust minSessions)
2. Check all views

**Expected:**
- Sessions list: No flags
- Analytics widget: "Need at least 5 sessions" message
- Anomalies page: Warning message, no detection

**Pass Criteria:**
- ✓ Graceful handling
- ✓ Clear messaging

---

### TC5.2: All Sessions Anomalous
**Steps:**
1. Set threshold to 5% (very sensitive)
2. Observe behavior

**Expected:**
- Many/all sessions flagged
- Insights reflect high anomaly rate
- System remains performant

**Pass Criteria:**
- ✓ Handles extreme case
- ✓ No crashes or slowdowns

---

### TC5.3: Zero Deviation Session
**Steps:**
1. Find or create session exactly matching averages
2. Check for flag

**Expected:**
- No flag shown
- Session appears normal in list

**Pass Criteria:**
- ✓ No false positives

---

### TC5.4: Multiple High Deviations
**Steps:**
1. Find session with 3+ anomalous metrics
2. Open insights panel
3. Check deviations tab

**Expected:**
- All deviations listed
- Sorted by severity (highest first)
- Causes prioritize most impactful

**Pass Criteria:**
- ✓ All deviations shown
- ✓ Prioritization logical

---

## Test Suite 6: Performance

### TC6.1: Load Time - Sessions List
**Steps:**
1. Open `/sessions` with 50+ sessions
2. Measure page load time

**Expected:**
- Page loads in <2s
- Anomaly flags appear without delay
- Smooth scrolling

**Pass Criteria:**
- ✓ <2s load time
- ✓ No janky rendering

---

### TC6.2: Load Time - Anomalies Page
**Steps:**
1. Open `/analytics/anomalies` with 100+ sessions
2. Measure initial load

**Expected:**
- Detection completes in <1s
- Results display smoothly

**Pass Criteria:**
- ✓ <1s detection time
- ✓ Responsive UI

---

### TC6.3: Settings Change Performance
**Steps:**
1. On anomalies page, change threshold
2. Measure re-detection time

**Expected:**
- Re-detection in <500ms
- UI updates smoothly

**Pass Criteria:**
- ✓ <500ms re-detection
- ✓ No UI flicker

---

## Test Suite 7: Integration

### TC7.1: Navigate from Sessions to Anomalies Page
**Steps:**
1. On sessions list, click anomaly flag
2. In insights panel, note session
3. Navigate to `/analytics/anomalies`
4. Find same session in list

**Expected:**
- Session appears in anomalies list
- Same severity and deviations
- Consistent data

**Pass Criteria:**
- ✓ Data consistent across views

---

### TC7.2: Link from Widget to Session
**Steps:**
1. On analytics page, click anomaly in widget
2. Verify session page loads
3. Check session data matches anomaly

**Expected:**
- Correct session loads
- Data consistent

**Pass Criteria:**
- ✓ Navigation works
- ✓ Data matches

---

## Regression Tests

### RT1: Existing Sessions Unaffected
**Steps:**
1. View sessions without anomalies
2. Verify normal display

**Expected:**
- No flags on normal sessions
- Session cards unchanged
- Navigation works as before

**Pass Criteria:**
- ✓ No regressions

---

### RT2: Analytics Page Unaffected
**Steps:**
1. Check existing analytics charts
2. Verify KPIs unchanged

**Expected:**
- All existing features work
- New widget doesn't break layout

**Pass Criteria:**
- ✓ No regressions

---

## Test Data Setup

### Creating Test Scenarios

**High Severity Anomaly:**
- Session at 50yd when typical is 25yd
- Low avg score (e.g., 2.5 vs 4.0)
- High miss rate (e.g., 25% vs 8%)

**Medium Severity Anomaly:**
- First use of new firearm
- Bull rate 15% vs 30%

**Low Severity Anomaly:**
- Slightly higher shot count (80 vs 60)
- Avg score 3.8 vs 4.2

**Normal Session:**
- Typical distance
- Avg score within 10% of average
- Standard shot count

---

## Bug Reporting Template

If issues found:

```
**Bug ID:** ANO-XXX
**Severity:** Critical/High/Medium/Low
**Test Case:** TC#.#
**Environment:** Browser, OS, Screen size
**Steps to Reproduce:**
1. ...
2. ...
**Expected:** ...
**Actual:** ...
**Screenshots:** [attach]
**Console Errors:** [paste]
```

---

## Test Completion Checklist

- [ ] All Test Suite 1 cases passed
- [ ] All Test Suite 2 cases passed
- [ ] All Test Suite 3 cases passed
- [ ] All Test Suite 4 cases passed
- [ ] All Test Suite 5 cases passed
- [ ] All Test Suite 6 cases passed
- [ ] All Test Suite 7 cases passed
- [ ] All Regression Tests passed
- [ ] No critical bugs found
- [ ] Performance meets targets
- [ ] Mobile experience acceptable
- [ ] Documentation reviewed
- [ ] Feature ready for production

---

## Notes

- Run tests on Chrome, Firefox, Safari, and mobile browsers
- Test with real user data when possible
- Performance targets assume reasonable dataset size (<500 sessions)
- For automated E2E tests, consider Playwright or Cypress in future
