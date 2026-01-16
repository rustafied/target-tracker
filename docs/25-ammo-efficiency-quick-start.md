# Ammo Efficiency Metrics - Quick Start Guide

## What is Ammo Efficiency?

The Ammo Efficiency feature helps you understand which calibers give you the best "bang for your buck" by analyzing your shooting performance relative to ammo usage and costs. It answers questions like:

- Which caliber should I use for practice vs. competition?
- Am I getting good value from my expensive ammo?
- Which caliber gives me the most bulls per dollar spent?

## Getting Started

### Step 1: Record Shooting Sessions

The efficiency metrics are calculated from your shooting data, so make sure you have:
- Multiple shooting sessions recorded
- At least 50 shots per caliber (adjustable threshold)
- Accurate caliber selection for each target sheet

### Step 2: Add Cost Data (Optional but Recommended)

1. Navigate to **Ammo** page
2. Scroll to the **Efficiency Metrics** section
3. Click the **Settings** icon next to any caliber
4. Choose your cost entry method:
   - **Per Round**: Enter the cost per single round (e.g., $0.18)
   - **Bulk Purchase**: Enter the total cost and quantity (e.g., $180 for 1000 rounds)
5. Click **Save Cost**

**Tip**: Even without cost data, you'll still see usage-based efficiency metrics like score per round and bulls per 100 rounds.

### Step 3: View Your Efficiency Metrics

The Ammo page now shows several visualizations:

#### Efficiency Comparison Chart
- Bar chart comparing calibers by your selected metric
- Switch between:
  - **Value Score**: Overall efficiency ranking
  - **Score per Round**: Average score achieved per shot
  - **Bulls per 100**: Bullseyes per 100 rounds fired
  - **Cost per Point**: Money spent per point scored

#### Value Distribution Pie
- Shows how "value" is distributed across your calibers
- Hover to see detailed breakdown

#### Caliber Breakdown Table
- Detailed stats for each caliber
- Shows all metrics in one place
- Click settings to update costs

### Step 4: Review Insights

The **Insights** panel automatically generates recommendations:
- Identifies your most efficient caliber
- Suggests which calibers to use for practice
- Warns about expensive low-performers
- Compares cost efficiency between calibers

## Understanding the Metrics

### Score per Round
**What it is**: Your average score divided by total shots fired  
**Formula**: `avgScore / totalShots`  
**Use it for**: Finding which caliber you shoot most accurately with

**Example**: 4.2 score/round means you average 4.2 points per shot

### Bulls per 100 Rounds
**What it is**: How many bullseyes you get per 100 rounds  
**Formula**: `(bullCount / totalShots) * 100`  
**Use it for**: Measuring consistency and precision

**Example**: 35 bulls/100 means you hit the bullseye 35% of the time

### Cost per Point (requires cost data)
**What it is**: How much money you spend per point scored  
**Formula**: `totalCost / totalScore`  
**Use it for**: Financial efficiency analysis

**Example**: $0.043/point means each point costs you 4.3 cents

### Cost per Bull (requires cost data)
**What it is**: How much each bullseye costs you  
**Formula**: `totalCost / bullCount`  
**Use it for**: Optimizing for maximum performance

**Example**: $2.00/bull means each bullseye costs $2.00 in ammo

### Value Score (composite)
**What it is**: Overall ranking combining performance and cost  
**Formula**: `(avgScore * bullRate * 100) / (1 + costPerRound)`  
**Use it for**: Identifying the best overall "bang for buck"

**Example**: Higher value score = better efficiency. A caliber with 4.0 avg score, 30% bull rate, and $0.10/round gets a value score of ~109.

## Real-World Examples

### Example 1: Practice Ammo Selection

**Scenario**: You want to maximize practice time on a budget

**Your Data**:
- **.22 LR**: 3.8 avg score, 30% bull rate, $0.08/round → Value Score: 105.4
- **9mm**: 4.2 avg score, 35% bull rate, $0.18/round → Value Score: 124.5
- **5.56 NATO**: 3.4 avg score, 25% bull rate, $0.50/round → Value Score: 56.7

**Insight**: While 9mm has the highest value score, .22 LR is nearly as efficient at half the cost. Use .22 LR for high-volume practice, 9mm for focused training.

### Example 2: Competition Prep

**Scenario**: You need maximum accuracy for an upcoming match

**Your Data**:
- **.308 Win**: 4.5 avg score, 42 bulls/100, $0.75/round
- **6.5 Creedmoor**: 4.6 avg score, 45 bulls/100, $1.20/round
- **.223 Rem**: 3.9 avg score, 32 bulls/100, $0.40/round

**Insight**: 6.5 Creedmoor delivers the best performance (45 bulls/100) despite higher cost. For competition, the extra performance is worth it.

### Example 3: Budget Optimization

**Scenario**: You want to reduce ammo spending without sacrificing too much performance

**Your Data**:
- Current: 5.56 NATO at $0.50/round, 3.4 avg score
- Alternative: 9mm at $0.18/round, 4.2 avg score

**Insight**: Switching to 9mm saves 64% on ammo costs while actually improving your average score by 23%. Easy decision!

## Tips & Best Practices

### 1. Update Costs Regularly
Ammo prices fluctuate. Update your cost data when you make new purchases to keep metrics accurate.

### 2. Use Filters
The efficiency metrics respect the same filters as other analytics:
- Filter by date range to see recent efficiency
- Filter by firearm to see caliber efficiency with specific guns
- Adjust minimum shots threshold to exclude low-sample calibers

### 3. Track Trends
Export your efficiency data periodically (CSV button) to track how your efficiency changes over time as you improve.

### 4. Consider Context
- **Training**: Prioritize value score and cost efficiency
- **Competition**: Prioritize bulls per 100 and raw performance
- **Testing**: Look at score per round to evaluate new setups

### 5. Don't Ignore Usage Metrics
Even without cost data, score per round and bulls per 100 are valuable for understanding which calibers you shoot best.

## Filtering Your View

Use the filter options to focus your analysis:

- **By Caliber**: Compare specific calibers head-to-head
- **By Firearm**: See which caliber is most efficient with a specific gun
- **By Date Range**: Analyze recent performance vs. historical
- **By Min Shots**: Adjust threshold to include/exclude low-sample calibers

## Exporting Data

Click the **Export CSV** button to download all efficiency metrics for:
- Budgeting in spreadsheet software
- Sharing with shooting buddies
- Long-term trend analysis
- Record keeping

The CSV includes all metrics: shots, scores, costs, and efficiency calculations.

## Troubleshooting

### "No efficiency data available"
- You need at least 50 shots (default) per caliber
- Record more sessions or lower the minimum shots threshold

### "No cost data" in insights
- Add cost information using the Settings button next to each caliber
- Metrics will still show usage-based efficiency without costs

### Unexpected rankings
- Check that cost data is accurate and up-to-date
- Verify you have sufficient sample size (shots) per caliber
- Consider filtering by date range if old data is skewing results

### Value score seems wrong
- Value score combines performance AND cost
- A high-performing expensive caliber may rank lower than a decent-performing cheap one
- This is intentional - it's measuring "value" not just performance

## Next Steps

1. **Set Goals**: Use insights to set efficiency targets (e.g., "Get .22 LR to 40 bulls/100")
2. **Experiment**: Try different calibers and track how efficiency changes
3. **Optimize Inventory**: Stock up on your most efficient calibers
4. **Share**: Export data to discuss with your shooting group

## Advanced Usage

### Custom Analysis
Export the CSV and use spreadsheet formulas to:
- Calculate ROI on different ammo purchases
- Project costs for upcoming training plans
- Compare efficiency across different time periods

### Integration with Goals
Use efficiency metrics to inform your training goals:
- "Improve 9mm efficiency by 10% this month"
- "Reduce cost per bull to under $1.00"
- "Achieve 40+ bulls/100 with .22 LR"

## Related Documentation

- [Ammo Tracking](19-ammo-tracking.md) - Base ammo feature overview
- [Analytics Guide](11-analytics-upgrade-spec.md) - General analytics features
- [Feature Spec](24-ammo-efficiency-metrics.md) - Technical implementation details
