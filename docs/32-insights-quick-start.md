# Expanded Insights Engine - Quick Start Guide

## What Are Insights?

Insights are auto-generated observations and recommendations based on your shooting data. They help you:
- Identify patterns in your performance
- Spot equipment strengths/weaknesses
- Get actionable improvement suggestions
- Track progress over time

## Where to Find Insights

### 1. Session Detail View
**Location**: Any session page (`/sessions/[id]`)

**What You'll See**:
- Personalized tips for that specific session
- Comparisons to your historical averages
- Equipment performance milestones
- Shot pattern analysis

**Example Insights**:
- "Avg score 3.8—12% below your 4.3 overall average—review fundamentals."
- "Shots clustered low-left (65% of rounds)—possible grip issue or trigger pull."

### 2. Analytics Overview
**Location**: Main analytics page (`/analytics`)

**What You'll See**:
- Overall performance trends (3-month window)
- Top/bottom performing equipment
- Usage recommendations
- Inventory alerts

**Example Insights**:
- "Monthly improvement: Avg score up 8% in last 3 months—consistent practice paying off."
- "Underused gem: Ruger 10/22 (high 3.5 avg, only 8% of shots)—rotate in more."

### 3. Comparative Dashboards
**Location**: Compare page (`/analytics/compare`)

**What You'll See**:
- Head-to-head performance analysis
- Group rankings (2-3 items)
- Use-case recommendations

**Example Insights**:
- "Vortex AMG beats Trijicon RMR by 0.4 avg score."
- "For precision: Choose SIG SAUER; for efficiency: Glock 34."

## Understanding Insights

### Confidence Score
Each insight includes a confidence percentage (e.g., "85% confidence"):
- **90-100%**: Very reliable, based on substantial data
- **70-89%**: Solid observation with good sample size
- **<70%**: Filtered out by default (adjustable in settings)

### Severity Indicators
Insights use color-coded icons:
- 🟢 **Success** (Green): Positive achievements, milestones
- 🔵 **Info** (Blue): Neutral observations, general trends
- 🟡 **Warning** (Yellow): Areas needing attention
- 🔴 **Error** (Red): Significant issues requiring action

### Insight Categories

#### Per-Session
Focus on individual session analysis:
- **Vs. Historical Average**: How this session compares to your norm
- **Setup Milestone**: Personal records with specific gear combos
- **Distance Diagnostic**: Performance at different ranges
- **Efficiency Snapshot**: Score per round rankings
- **Bias Pattern**: Shot grouping analysis

#### Overview
Global trends across all sessions:
- **Trend Summary**: Are you improving overall?
- **Top Performers**: Which equipment works best?
- **Usage Recommendations**: What to practice more/less
- **Inventory Alerts**: Ammo stock warnings
- **Composite Flags**: Multi-metric opportunities

#### Comparison
Side-by-side analysis:
- **Pairwise Winner**: Direct 1v1 comparisons
- **Group Ranking**: Overall standings in 3-way comparisons
- **Composite Recommendations**: Best tool for the job

## Customizing Insights

### Accessing Settings
Click the ⚙️ (gear) icon in any Insights panel header.

### Available Settings

#### 1. Minimum Confidence (default: 70%)
- Higher = fewer but more reliable insights
- Lower = more insights but potentially noisier
- **Recommended**: 70-80% for balanced experience

#### 2. Max Insights Per View (default: 5)
- How many insights to show at once
- Range: 1-20
- **Recommended**: 5-10 for most users

#### 3. Detail Level (default: Short)
- **Short**: Concise one-liners
- **Long**: Detailed explanations *(future enhancement)*

#### 4. Enabled Types
Toggle individual insight types on/off by category:
- Disable types you don't find useful
- Focus on specific areas of interest
- All enabled by default

### Saving Settings
Changes apply immediately and persist across sessions.

## Getting the Most from Insights

### Tips for Better Insights

#### 1. Log Consistently
- More sessions = better trend detection
- Aim for 5+ sessions minimum
- Regular practice yields clearer patterns

#### 2. Use Complete Data
- Enter distances for distance-based insights
- Add shot positions for bias analysis
- Link firearms/optics/calibers for comparisons

#### 3. Review Regularly
- Check insights after each session
- Look for recurring themes
- Track improvement over weeks/months

#### 4. Act on Recommendations
- Use insights to guide practice focus
- Test suggested equipment changes
- Revisit problematic distances/conditions

### Common Insight Triggers

| Insight Type | Minimum Data Required |
|-------------|----------------------|
| Vs. Average | 1 session (compares to historical) |
| Setup Milestone | 2+ sessions with same gear |
| Distance Diagnostic | Distance data + 2+ sessions |
| Efficiency Snapshot | 3+ sessions for ranking |
| Bias Pattern | 5+ shots with positions |
| Trend Summary | 5+ sessions over 3 months |
| Top Performers | 2+ items with 10+ shots each |
| Usage Recommendation | 2+ items with varied usage |
| Pairwise Winner | 2 items with 10+ shots each |

## Example Workflows

### Scenario 1: New Firearm Evaluation
1. Log 3-5 sessions with new firearm
2. View **Setup Milestone** insights (session view)
3. Use **Comparative Dashboard** to compare vs. existing firearms
4. Check **Composite Recommendations** for use-case fit

### Scenario 2: Skill Improvement Tracking
1. Review **Trend Summary** (analytics overview)
2. Look for **Vs. Average** patterns across sessions
3. Address **Bias Pattern** issues in practice
4. Track **Efficiency Snapshot** percentile rankings

### Scenario 3: Equipment Optimization
1. Check **Top Performers** (analytics overview)
2. Review **Usage Recommendations** for underused gems
3. Use **Comparative Dashboard** for head-to-head tests
4. Apply **Composite Recommendations** to match guns to scenarios

## Troubleshooting

### "No insights available yet"
**Cause**: Insufficient data  
**Solution**: Log more sessions (5+ recommended)

### Insights seem wrong
**Cause**: Limited sample size or data quality  
**Solution**: 
- Check confidence scores (low = less reliable)
- Verify session data accuracy
- Allow more sessions to accumulate

### Too many/few insights
**Cause**: Default settings don't match your preference  
**Solution**: Adjust max insights and confidence threshold in settings

### Insights not updating
**Cause**: Cached data or page not refreshed  
**Solution**: Reload the page or navigate away and back

## Privacy & Data

- All insights generated locally from your data only
- No external comparisons or benchmarks
- Preferences stored securely per-user
- No data shared with third parties

## Future Features

Coming soon:
- ML-driven predictive insights
- Custom insight rules
- Insight history tracking
- Export insights to PDF/CSV
- Actionable drill recommendations

## Feedback

Have ideas for new insight types? Find an insight confusing? The system is designed to evolve based on user needs. Consider documenting feedback for future development.

---

**Quick Access Links**:
- [Insight Types Documentation](./30-expanded-insights-engine.md)
- [Implementation Details](./31-expanded-insights-implementation.md)
- [Analytics Guide](./11-analytics-upgrade-spec.md)
