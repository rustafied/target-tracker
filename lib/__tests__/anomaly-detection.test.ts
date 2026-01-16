/**
 * Unit tests for anomaly detection logic
 */

describe("Anomaly Detection", () => {
  describe("calculateDeviation", () => {
    it("should calculate percentage deviation correctly", () => {
      const value = 4.5;
      const average = 4.0;
      const expected = ((4.5 - 4.0) / 4.0) * 100; // 12.5%
      
      const result = calculateDeviation(value, average, null);
      
      expect(result.percentDeviation).toBeCloseTo(expected, 2);
    });

    it("should handle zero average gracefully", () => {
      const value = 5.0;
      const average = 0;
      
      const result = calculateDeviation(value, average, null);
      
      expect(result.percentDeviation).toBe(0);
    });

    it("should calculate z-score when stdDev provided", () => {
      const value = 5.0;
      const average = 4.0;
      const stdDev = 0.5;
      const expectedZScore = (5.0 - 4.0) / 0.5; // 2.0
      
      const result = calculateDeviation(value, average, stdDev);
      
      expect(result.zScore).toBeCloseTo(expectedZScore, 2);
    });

    it("should handle negative deviations", () => {
      const value = 3.0;
      const average = 4.0;
      const expected = ((3.0 - 4.0) / 4.0) * 100; // -25%
      
      const result = calculateDeviation(value, average, null);
      
      expect(result.percentDeviation).toBeCloseTo(expected, 2);
      expect(result.percentDeviation).toBeLessThan(0);
    });
  });

  describe("attributeCauses", () => {
    const mockGlobalAverages = {
      avgScore: 4.0,
      missRate: 0.1,
      bullRate: 0.3,
      meanRadius: 2.0,
      avgDistance: 25,
      totalShots: 50,
      sessionCount: 10,
    };

    it("should detect extended distance as a cause", () => {
      const metrics = {
        sessionId: "test",
        slug: "test",
        date: "2024-01-01",
        avgScore: 3.0,
        missRate: 0.2,
        bullRate: 0.2,
        totalShots: 50,
        avgDistance: 50, // 2x the average
        sheetCount: 1,
        uniqueFirearms: 1,
        uniqueOptics: 1,
        firstFirearmUse: false,
        firstOpticUse: false,
      };

      const deviations = [
        {
          metric: "Average Score",
          value: 3.0,
          average: 4.0,
          percentDeviation: -25,
          isAnomaly: true,
        },
      ];

      const causes = attributeCauses(metrics, mockGlobalAverages, deviations);

      expect(causes.some((c) => c.type === "distance")).toBe(true);
      expect(causes.find((c) => c.type === "distance")?.confidence).toBe("high");
    });

    it("should detect new equipment as a cause", () => {
      const metrics = {
        sessionId: "test",
        slug: "test",
        date: "2024-01-01",
        avgScore: 3.0,
        missRate: 0.2,
        bullRate: 0.2,
        totalShots: 50,
        avgDistance: 25,
        sheetCount: 1,
        uniqueFirearms: 1,
        uniqueOptics: 1,
        firstFirearmUse: true,
        firstOpticUse: false,
      };

      const deviations = [
        {
          metric: "Average Score",
          value: 3.0,
          average: 4.0,
          percentDeviation: -25,
          isAnomaly: true,
        },
      ];

      const causes = attributeCauses(metrics, mockGlobalAverages, deviations);

      expect(causes.some((c) => c.type === "equipment")).toBe(true);
    });

    it("should detect fatigue from high shot volume", () => {
      const metrics = {
        sessionId: "test",
        slug: "test",
        date: "2024-01-01",
        avgScore: 3.0, // Below average
        missRate: 0.2,
        bullRate: 0.2,
        totalShots: 100, // 2x the average
        avgDistance: 25,
        sheetCount: 1,
        uniqueFirearms: 1,
        uniqueOptics: 1,
        firstFirearmUse: false,
        firstOpticUse: false,
      };

      const deviations = [
        {
          metric: "Average Score",
          value: 3.0,
          average: 4.0,
          percentDeviation: -25,
          isAnomaly: true,
        },
      ];

      const causes = attributeCauses(metrics, mockGlobalAverages, deviations);

      expect(causes.some((c) => c.type === "fatigue")).toBe(true);
    });

    it("should limit causes to top 3", () => {
      const metrics = {
        sessionId: "test",
        slug: "test",
        date: "2024-01-01",
        avgScore: 3.0,
        missRate: 0.3,
        bullRate: 0.1,
        totalShots: 100,
        avgDistance: 50,
        sheetCount: 1,
        uniqueFirearms: 3,
        uniqueOptics: 3,
        firstFirearmUse: true,
        firstOpticUse: true,
      };

      const deviations = [
        {
          metric: "Average Score",
          value: 3.0,
          average: 4.0,
          percentDeviation: -25,
          isAnomaly: true,
        },
        {
          metric: "Miss Rate",
          value: 0.3,
          average: 0.1,
          percentDeviation: 200,
          isAnomaly: true,
        },
      ];

      const causes = attributeCauses(metrics, mockGlobalAverages, deviations);

      expect(causes.length).toBeLessThanOrEqual(3);
    });
  });

  describe("generateInsights", () => {
    const mockGlobalAverages = {
      avgScore: 4.0,
      missRate: 0.1,
      bullRate: 0.3,
      meanRadius: 2.0,
      avgDistance: 25,
      totalShots: 50,
      sessionCount: 10,
    };

    it("should generate insight when no anomalies", () => {
      const insights = generateInsights([], mockGlobalAverages, 10);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toContain("No anomalies detected");
    });

    it("should report anomaly count and percentage", () => {
      const anomalies = [
        {
          sessionId: "1",
          slug: "test-1",
          date: "2024-01-01",
          isAnomaly: true,
          severity: "high" as const,
          deviations: [],
          causes: [],
        },
        {
          sessionId: "2",
          slug: "test-2",
          date: "2024-01-02",
          isAnomaly: true,
          severity: "medium" as const,
          deviations: [],
          causes: [],
        },
      ];

      const insights = generateInsights(anomalies, mockGlobalAverages, 10);

      expect(insights[0]).toContain("2 anomalies");
      expect(insights[0]).toContain("20%");
    });

    it("should identify most common cause", () => {
      const anomalies = [
        {
          sessionId: "1",
          slug: "test-1",
          date: "2024-01-01",
          isAnomaly: true,
          severity: "high" as const,
          deviations: [],
          causes: [{ type: "distance", description: "Extended range", confidence: "high" as const }],
        },
        {
          sessionId: "2",
          slug: "test-2",
          date: "2024-01-02",
          isAnomaly: true,
          severity: "medium" as const,
          deviations: [],
          causes: [{ type: "distance", description: "Extended range", confidence: "high" as const }],
        },
      ];

      const insights = generateInsights(anomalies, mockGlobalAverages, 10);

      expect(insights.some((i) => i.includes("distance variations"))).toBe(true);
    });
  });
});

// Helper functions (extracted from route.ts for testing)
function calculateDeviation(
  value: number,
  average: number,
  stdDev: number | null
): { percentDeviation: number; zScore?: number } {
  if (average === 0) {
    return { percentDeviation: 0 };
  }

  const percentDeviation = ((value - average) / average) * 100;

  if (stdDev !== null && stdDev > 0) {
    const zScore = (value - average) / stdDev;
    return { percentDeviation, zScore };
  }

  return { percentDeviation };
}

function attributeCauses(
  metrics: any,
  globalAverages: any,
  deviations: any[]
): Array<{ type: string; description: string; confidence: "high" | "medium" | "low" }> {
  const causes: Array<{ type: string; description: string; confidence: "high" | "medium" | "low" }> = [];

  // Rule 1: Extended or shortened distance
  if (metrics.avgDistance > globalAverages.avgDistance * 1.5) {
    causes.push({
      type: "distance",
      description: `Extended range: ${metrics.avgDistance.toFixed(0)}yd vs. typical ${globalAverages.avgDistance.toFixed(0)}yd`,
      confidence: "high",
    });
  } else if (metrics.avgDistance < globalAverages.avgDistance * 0.7) {
    causes.push({
      type: "distance",
      description: `Shorter range: ${metrics.avgDistance.toFixed(0)}yd vs. typical ${globalAverages.avgDistance.toFixed(0)}yd`,
      confidence: "high",
    });
  }

  // Rule 2: New equipment
  if (metrics.firstFirearmUse) {
    causes.push({
      type: "equipment",
      description: "First use of a new firearm in this dataset",
      confidence: "high",
    });
  }

  if (metrics.firstOpticUse) {
    causes.push({
      type: "equipment",
      description: "First use of a new optic in this dataset",
      confidence: "high",
    });
  }

  // Rule 3: High volume (fatigue)
  if (metrics.totalShots > globalAverages.totalShots * 1.5) {
    const hasNegativePerformance = deviations.some(
      (d) => d.metric === "Average Score" && d.percentDeviation < 0
    );
    if (hasNegativePerformance) {
      causes.push({
        type: "fatigue",
        description: `High shot volume: ${metrics.totalShots} shots vs. typical ${globalAverages.totalShots.toFixed(0)}`,
        confidence: "medium",
      });
    }
  }

  // Rule 4: Multiple equipment changes
  if (metrics.uniqueFirearms > 2 || metrics.uniqueOptics > 2) {
    causes.push({
      type: "variety",
      description: `Multiple equipment changes in session (${metrics.uniqueFirearms} firearms, ${metrics.uniqueOptics} optics)`,
      confidence: "medium",
    });
  }

  // Rule 5: Very low shots (too little data)
  if (metrics.totalShots < globalAverages.totalShots * 0.5) {
    causes.push({
      type: "sample_size",
      description: `Limited data: Only ${metrics.totalShots} shots vs. typical ${globalAverages.totalShots.toFixed(0)}`,
      confidence: "low",
    });
  }

  // Rule 6: High miss rate correlation
  const missRateDeviation = deviations.find((d) => d.metric === "Miss Rate");
  if (missRateDeviation && missRateDeviation.percentDeviation > 0) {
    causes.push({
      type: "accuracy",
      description: `Miss rate ${(metrics.missRate * 100).toFixed(1)}% vs. typical ${(globalAverages.missRate * 100).toFixed(1)}%`,
      confidence: "high",
    });
  }

  // Limit to top 3 causes
  return causes.slice(0, 3);
}

function generateInsights(anomalies: any[], globalAverages: any, totalSessions: number): string[] {
  const insights: string[] = [];

  if (anomalies.length === 0) {
    insights.push("No anomalies detected. All sessions are within normal performance ranges.");
    return insights;
  }

  // Count anomalies by severity
  const severityCounts = {
    high: anomalies.filter((a) => a.severity === "high").length,
    medium: anomalies.filter((a) => a.severity === "medium").length,
    low: anomalies.filter((a) => a.severity === "low").length,
  };

  insights.push(
    `Detected ${anomalies.length} anomalies out of ${totalSessions} sessions ` +
      `(${((anomalies.length / totalSessions) * 100).toFixed(0)}%)`
  );

  if (severityCounts.high > 0) {
    insights.push(`${severityCounts.high} high-severity anomalies require attention`);
  }

  // Most common causes
  const causeTypes = new Map<string, number>();
  anomalies.forEach((a) => {
    a.causes.forEach((c: any) => {
      causeTypes.set(c.type, (causeTypes.get(c.type) || 0) + 1);
    });
  });

  const topCause = Array.from(causeTypes.entries()).sort((a, b) => b[1] - a[1])[0];

  if (topCause) {
    const causeLabels: Record<string, string> = {
      distance: "distance variations",
      equipment: "new equipment",
      fatigue: "high shot volume/fatigue",
      variety: "equipment changes mid-session",
      sample_size: "limited sample size",
      accuracy: "accuracy issues",
    };
    insights.push(
      `Most common anomaly cause: ${causeLabels[topCause[0]] || topCause[0]} ` + `(${topCause[1]} sessions)`
    );
  }

  // Performance trend in anomalies
  const negativeAnomalies = anomalies.filter((a) =>
    a.deviations.some((d: any) => d.metric === "Average Score" && d.percentDeviation < 0)
  );

  if (negativeAnomalies.length > anomalies.length * 0.6) {
    insights.push(
      `${negativeAnomalies.length} anomalies show below-average performance—consider reviewing training approach`
    );
  }

  return insights;
}
