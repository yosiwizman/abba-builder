/**
 * Comprehensive Metrics Tracking System
 * Tracks test success rates, refinement efficiency, and failure patterns
 */

class MetricsTrackingSystem {
  constructor(config = {}) {
    this.config = {
      dbPath: config.dbPath || "./metrics-database",
      reportingInterval: config.reportingInterval || 86400000, // 24 hours
      alertThresholds: config.alertThresholds || {
        successRate: 0.85,
        avgIterations: 3,
        tokenUsage: 100000,
        errorRate: 0.15,
      },
      enableRealTimeTracking: config.enableRealTimeTracking !== false,
    };

    this.metrics = {
      testMetrics: new Map(),
      refinementMetrics: new Map(),
      failurePatterns: new Map(),
      historicalData: [],
      realTimeData: [],
    };

    this.activeAlerts = [];
    this.initializeTracking();
  }

  /**
   * 1. SUCCESS RATE BY TEST TYPE
   */
  trackTestExecution(testResult) {
    const timestamp = Date.now();
    const testType = this.categorizeTestType(testResult);

    const metric = {
      id: `test_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      testType,
      appType: testResult.appType,
      success: testResult.success,
      duration: testResult.duration,
      details: {
        scenario: testResult.scenario,
        steps: testResult.steps?.length || 0,
        failures: testResult.failures || [],
        errors: testResult.errors || [],
      },
    };

    // Store by test type
    if (!this.metrics.testMetrics.has(testType)) {
      this.metrics.testMetrics.set(testType, {
        total: 0,
        passed: 0,
        failed: 0,
        avgDuration: 0,
        successRate: 0,
        history: [],
      });
    }

    const typeMetrics = this.metrics.testMetrics.get(testType);
    typeMetrics.total++;
    if (metric.success) typeMetrics.passed++;
    else typeMetrics.failed++;

    // Update rolling average duration
    typeMetrics.avgDuration =
      (typeMetrics.avgDuration * (typeMetrics.total - 1) + metric.duration) /
      typeMetrics.total;

    typeMetrics.successRate = (typeMetrics.passed / typeMetrics.total) * 100;
    typeMetrics.history.push(metric);

    // Keep only last 1000 entries for memory efficiency
    if (typeMetrics.history.length > 1000) {
      typeMetrics.history.shift();
    }

    // Real-time tracking
    if (this.config.enableRealTimeTracking) {
      this.updateRealTimeMetrics("test", metric);
    }

    return metric;
  }

  categorizeTestType(testResult) {
    const scenario = testResult.scenario?.toLowerCase() || "";
    

    if (
      scenario.includes("ui") ||
      scenario.includes("click") ||
      scenario.includes("visual")
    ) {
      return "ui-interaction";
    }
    if (
      scenario.includes("form") ||
      scenario.includes("validation") ||
      scenario.includes("input")
    ) {
      return "form-validation";
    }
    if (
      scenario.includes("api") ||
      scenario.includes("fetch") ||
      scenario.includes("request")
    ) {
      return "api-integration";
    }
    if (
      scenario.includes("performance") ||
      scenario.includes("load") ||
      scenario.includes("speed")
    ) {
      return "performance";
    }
    if (scenario.includes("accessibility") || scenario.includes("a11y")) {
      return "accessibility";
    }
    if (scenario.includes("security") || scenario.includes("auth")) {
      return "security";
    }

    return "general";
  }

  /**
   * Get success rates by test type
   */
  getSuccessRatesByType() {
    const rates = {};

    this.metrics.testMetrics.forEach((metrics, type) => {
      rates[type] = {
        successRate: metrics.successRate.toFixed(2) + "%",
        total: metrics.total,
        passed: metrics.passed,
        failed: metrics.failed,
        avgDuration: metrics.avgDuration.toFixed(0) + "ms",
        trend: this.calculateTrend(metrics.history, "success"),
      };
    });

    // Calculate overall success rate
    let totalTests = 0;
    let totalPassed = 0;

    this.metrics.testMetrics.forEach((metrics) => {
      totalTests += metrics.total;
      totalPassed += metrics.passed;
    });

    rates.overall = {
      successRate:
        totalTests > 0
          ? ((totalPassed / totalTests) * 100).toFixed(2) + "%"
          : "0%",
      total: totalTests,
      passed: totalPassed,
      failed: totalTests - totalPassed,
    };

    return rates;
  }

  /**
   * 2. REFINEMENT EFFICIENCY METRICS
   */
  trackRefinementCycle(refinementData) {
    const metric = {
      id: `refine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      appId: refinementData.appId,
      iterations: refinementData.iterations,
      timeToSuccess: refinementData.duration,
      tokenUsage: {
        generation: refinementData.generationTokens || 0,
        refinement: refinementData.refinementTokens || 0,
        total:
          (refinementData.generationTokens || 0) +
          (refinementData.refinementTokens || 0),
      },
      success: refinementData.success,
      failuresFixed: refinementData.failuresFixed || [],
      promptType: refinementData.promptType,
      complexity: this.assessComplexity(refinementData),
    };

    // Store refinement metrics
    const key = refinementData.promptType || "general";

    if (!this.metrics.refinementMetrics.has(key)) {
      this.metrics.refinementMetrics.set(key, {
        total: 0,
        successful: 0,
        avgIterations: 0,
        avgTimeToSuccess: 0,
        avgTokenUsage: 0,
        history: [],
      });
    }

    const refMetrics = this.metrics.refinementMetrics.get(key);
    refMetrics.total++;

    if (metric.success) {
      refMetrics.successful++;
      refMetrics.avgIterations =
        (refMetrics.avgIterations * (refMetrics.successful - 1) +
          metric.iterations) /
        refMetrics.successful;
      refMetrics.avgTimeToSuccess =
        (refMetrics.avgTimeToSuccess * (refMetrics.successful - 1) +
          metric.timeToSuccess) /
        refMetrics.successful;
    }

    refMetrics.avgTokenUsage =
      (refMetrics.avgTokenUsage * (refMetrics.total - 1) +
        metric.tokenUsage.total) /
      refMetrics.total;

    refMetrics.history.push(metric);

    // Alert if thresholds exceeded
    this.checkThresholds(refMetrics);

    return metric;
  }

  getRefinementEfficiency() {
    const efficiency = {};

    this.metrics.refinementMetrics.forEach((metrics, type) => {
      efficiency[type] = {
        avgIterations: metrics.avgIterations.toFixed(2),
        avgTimeToSuccess: (metrics.avgTimeToSuccess / 1000).toFixed(1) + "s",
        avgTokenUsage: metrics.avgTokenUsage.toFixed(0),
        successRate:
          ((metrics.successful / metrics.total) * 100).toFixed(2) + "%",
        costEstimate: this.estimateCost(metrics.avgTokenUsage),
        trend: this.calculateTrend(metrics.history, "iterations"),
      };
    });

    // Calculate overall efficiency
    let totalRefinements = 0;
    let totalSuccessful = 0;
    let totalIterations = 0;
    let totalTokens = 0;

    this.metrics.refinementMetrics.forEach((metrics) => {
      totalRefinements += metrics.total;
      totalSuccessful += metrics.successful;
      totalIterations += metrics.avgIterations * metrics.successful;
      totalTokens += metrics.avgTokenUsage * metrics.total;
    });

    efficiency.overall = {
      avgIterations:
        totalSuccessful > 0
          ? (totalIterations / totalSuccessful).toFixed(2)
          : 0,
      avgTokenUsage:
        totalRefinements > 0 ? (totalTokens / totalRefinements).toFixed(0) : 0,
      successRate:
        totalRefinements > 0
          ? ((totalSuccessful / totalRefinements) * 100).toFixed(2) + "%"
          : "0%",
      totalCost: this.estimateCost(totalTokens),
    };

    return efficiency;
  }

  /**
   * 3. COMMON FAILURE PATTERNS
   */
  trackFailurePattern(failure) {
    const pattern = {
      timestamp: Date.now(),
      testType: failure.testType,
      errorType: this.categorizeError(failure.error),
      errorMessage: failure.error,
      promptType: failure.promptType,
      appType: failure.appType,
      component: failure.component || "unknown",
      severity: failure.severity || "normal",
    };

    const patternKey = `${pattern.errorType}_${pattern.testType}_${pattern.appType}`;

    if (!this.metrics.failurePatterns.has(patternKey)) {
      this.metrics.failurePatterns.set(patternKey, {
        count: 0,
        firstSeen: pattern.timestamp,
        lastSeen: pattern.timestamp,
        examples: [],
        correlations: {
          promptTypes: {},
          components: {},
          timeOfDay: {},
        },
      });
    }

    const patternData = this.metrics.failurePatterns.get(patternKey);
    patternData.count++;
    patternData.lastSeen = pattern.timestamp;

    // Track correlations
    patternData.correlations.promptTypes[pattern.promptType] =
      (patternData.correlations.promptTypes[pattern.promptType] || 0) + 1;

    patternData.correlations.components[pattern.component] =
      (patternData.correlations.components[pattern.component] || 0) + 1;

    const hour = new Date(pattern.timestamp).getHours();
    patternData.correlations.timeOfDay[hour] =
      (patternData.correlations.timeOfDay[hour] || 0) + 1;

    // Keep last 10 examples
    patternData.examples.push(pattern);
    if (patternData.examples.length > 10) {
      patternData.examples.shift();
    }

    return pattern;
  }

  getCommonFailurePatterns() {
    const patterns = [];

    this.metrics.failurePatterns.forEach((data, key) => {
      const [errorType, testType, appType] = key.split("_");

      // Find strongest correlations
      const strongestPromptCorrelation = this.findStrongestCorrelation(
        data.correlations.promptTypes,
      );
      const strongestComponentCorrelation = this.findStrongestCorrelation(
        data.correlations.components,
      );

      patterns.push({
        pattern: key,
        errorType,
        testType,
        appType,
        frequency: data.count,
        lastSeen: new Date(data.lastSeen).toISOString(),
        daysSinceFirst: Math.floor((Date.now() - data.firstSeen) / 86400000),
        correlations: {
          mostAffectedPromptType: strongestPromptCorrelation,
          mostAffectedComponent: strongestComponentCorrelation,
          peakFailureHour: this.findPeakHour(data.correlations.timeOfDay),
        },
        trend: this.calculateFailureTrend(data),
        suggestedFix: this.suggestFixForPattern(errorType, testType),
      });
    });

    // Sort by frequency
    patterns.sort((a, b) => b.frequency - a.frequency);

    return {
      topPatterns: patterns.slice(0, 10),
      totalUniquePatterns: patterns.length,
      mostCommonError: patterns[0]?.errorType || "none",
      mostAffectedTestType: this.getMostAffectedTestType(patterns),
      improvements: this.generateImprovementRecommendations(patterns),
    };
  }

  categorizeError(error) {
    const errorLower = error?.toLowerCase() || "";

    if (errorLower.includes("undefined") || errorLower.includes("null")) {
      return "null-reference";
    }
    if (errorLower.includes("timeout") || errorLower.includes("async")) {
      return "timeout";
    }
    if (errorLower.includes("syntax") || errorLower.includes("parse")) {
      return "syntax";
    }
    if (errorLower.includes("network") || errorLower.includes("fetch")) {
      return "network";
    }
    if (errorLower.includes("validation")) {
      return "validation";
    }
    if (
      errorLower.includes("permission") ||
      errorLower.includes("unauthorized")
    ) {
      return "permission";
    }
    if (errorLower.includes("memory") || errorLower.includes("heap")) {
      return "memory";
    }

    return "general";
  }

  /**
   * ADVANCED ANALYTICS
   */
  calculateSuccessRateImprovement() {
    const timeRanges = [
      { label: "Last 24 hours", ms: 86400000 },
      { label: "Last 7 days", ms: 604800000 },
      { label: "Last 30 days", ms: 2592000000 },
    ];

    const improvements = {};
    const now = Date.now();

    timeRanges.forEach((range) => {
      const cutoff = now - range.ms;
      let periodTests = 0;
      let periodPassed = 0;
      let previousTests = 0;
      let previousPassed = 0;

      this.metrics.testMetrics.forEach((metrics) => {
        metrics.history.forEach((test) => {
          if (test.timestamp > cutoff) {
            periodTests++;
            if (test.success) periodPassed++;
          } else if (test.timestamp > cutoff - range.ms) {
            previousTests++;
            if (test.success) previousPassed++;
          }
        });
      });

      const currentRate =
        periodTests > 0 ? (periodPassed / periodTests) * 100 : 0;
      const previousRate =
        previousTests > 0 ? (previousPassed / previousTests) * 100 : 0;

      improvements[range.label] = {
        currentSuccessRate: currentRate.toFixed(2) + "%",
        previousSuccessRate: previousRate.toFixed(2) + "%",
        improvement: (currentRate - previousRate).toFixed(2) + "%",
        trend:
          currentRate > previousRate
            ? "improving"
            : currentRate < previousRate
              ? "declining"
              : "stable",
      };
    });

    return improvements;
  }

  generateDashboard() {
    return {
      timestamp: new Date().toISOString(),
      overview: {
        totalTestsRun: this.getTotalTests(),
        overallSuccessRate: this.getOverallSuccessRate(),
        avgRefinementIterations: this.getAvgRefinementIterations(),
        totalTokensUsed: this.getTotalTokensUsed(),
        estimatedCost: this.getTotalCost(),
      },
      testMetrics: this.getSuccessRatesByType(),
      refinementMetrics: this.getRefinementEfficiency(),
      failurePatterns: this.getCommonFailurePatterns(),
      improvements: this.calculateSuccessRateImprovement(),
      alerts: this.getActiveAlerts(),
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * HELPER METHODS
   */
  calculateTrend(history, metric) {
    if (history.length < 2) return "insufficient-data";

    const recent = history.slice(-10);
    const older = history.slice(
      Math.max(0, history.length - 20),
      Math.max(0, history.length - 10),
    );

    if (older.length === 0) return "insufficient-data";

    const recentAvg =
      recent.reduce((sum, item) => {
        if (metric === "success") return sum + (item.success ? 1 : 0);
        if (metric === "iterations") return sum + (item.iterations || 0);
        return sum;
      }, 0) / recent.length;

    const olderAvg =
      older.reduce((sum, item) => {
        if (metric === "success") return sum + (item.success ? 1 : 0);
        if (metric === "iterations") return sum + (item.iterations || 0);
        return sum;
      }, 0) / older.length;

    if (recentAvg > olderAvg * 1.1) return "improving";
    if (recentAvg < olderAvg * 0.9) return "declining";
    return "stable";
  }

  calculateFailureTrend(data) {
    // Calculate if failures are increasing, decreasing, or stable
    const recentDays = 7;
    const recentCutoff = Date.now() - recentDays * 86400000;

    let recentCount = 0;
    data.examples.forEach((example) => {
      if (example.timestamp > recentCutoff) recentCount++;
    });

    const avgPerDay =
      data.count /
      Math.max(1, Math.floor((Date.now() - data.firstSeen) / 86400000));
    const recentAvgPerDay = recentCount / recentDays;

    if (recentAvgPerDay > avgPerDay * 1.2) return "increasing";
    if (recentAvgPerDay < avgPerDay * 0.8) return "decreasing";
    return "stable";
  }

  assessComplexity(refinementData) {
    const factors = {
      iterations: refinementData.iterations || 0,
      failures: refinementData.failuresFixed?.length || 0,
      tokenUsage: refinementData.generationTokens || 0,
    };

    if (
      factors.iterations <= 1 &&
      factors.failures <= 2 &&
      factors.tokenUsage < 10000
    ) {
      return "simple";
    }
    if (
      factors.iterations <= 2 &&
      factors.failures <= 5 &&
      factors.tokenUsage < 50000
    ) {
      return "moderate";
    }
    return "complex";
  }

  estimateCost(tokens) {
    const costPer1kTokens = 0.015; // Claude Opus pricing
    return `$${((tokens / 1000) * costPer1kTokens).toFixed(4)}`;
  }

  findStrongestCorrelation(correlations) {
    let strongest = { key: "none", count: 0 };

    Object.entries(correlations).forEach(([key, count]) => {
      if (count > strongest.count) {
        strongest = { key, count };
      }
    });

    return strongest.key;
  }

  findPeakHour(timeData) {
    let peak = { hour: 0, count: 0 };

    Object.entries(timeData).forEach(([hour, count]) => {
      if (count > peak.count) {
        peak = { hour: parseInt(hour), count };
      }
    });

    return peak.hour;
  }

  getMostAffectedTestType(patterns) {
    const testTypeCounts = {};

    patterns.forEach((pattern) => {
      testTypeCounts[pattern.testType] =
        (testTypeCounts[pattern.testType] || 0) + pattern.frequency;
    });

    return this.findStrongestCorrelation(testTypeCounts);
  }

  suggestFixForPattern(errorType, testType) {
    const fixes = {
      "null-reference": "Add null checks and default values",
      timeout: "Increase timeouts or optimize async operations",
      syntax: "Review code generation templates for syntax issues",
      network: "Add retry logic and error handling for network requests",
      validation: "Improve input validation rules",
      permission: "Review authentication and authorization logic",
      memory: "Optimize memory usage and implement cleanup",
    };

    return fixes[errorType] || "Review and debug the specific error pattern";
  }

  generateImprovementRecommendations(patterns) {
    const recommendations = [];

    // Find patterns that are increasing
    patterns.forEach((pattern) => {
      if (pattern.trend === "increasing" && pattern.frequency > 5) {
        recommendations.push({
          priority: "high",
          issue: `Rising ${pattern.errorType} errors in ${pattern.testType} tests`,
          action: pattern.suggestedFix,
          impact: `Could improve success rate by ${(pattern.frequency * 0.5).toFixed(0)}%`,
        });
      }
    });

    // Find prompt type correlations
    const promptTypeIssues = {};
    patterns.forEach((pattern) => {
      const promptType = pattern.correlations.mostAffectedPromptType;
      if (promptType !== "none") {
        promptTypeIssues[promptType] =
          (promptTypeIssues[promptType] || 0) + pattern.frequency;
      }
    });

    Object.entries(promptTypeIssues).forEach(([promptType, count]) => {
      if (count > 10) {
        recommendations.push({
          priority: "medium",
          issue: `${promptType} prompts have high failure rate`,
          action: `Review and improve ${promptType} prompt templates`,
          impact: `Affects ${count} test failures`,
        });
      }
    });

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  checkThresholds(metrics) {
    const alerts = [];

    if (metrics.avgIterations > this.config.alertThresholds.avgIterations) {
      alerts.push({
        level: "warning",
        message: `Average iterations (${metrics.avgIterations.toFixed(2)}) exceeds threshold`,
        metric: "refinement-iterations",
      });
    }

    if (metrics.avgTokenUsage > this.config.alertThresholds.tokenUsage) {
      alerts.push({
        level: "warning",
        message: `Token usage (${metrics.avgTokenUsage}) exceeds threshold`,
        metric: "token-usage",
        cost: this.estimateCost(metrics.avgTokenUsage),
      });
    }

    // Store alerts
    alerts.forEach((alert) => {
      this.activeAlerts.push({ ...alert, timestamp: Date.now() });
    });

    return alerts;
  }

  getActiveAlerts() {
    const cutoff = Date.now() - 3600000; // Last hour
    this.activeAlerts = this.activeAlerts.filter((a) => a.timestamp > cutoff);
    return this.activeAlerts;
  }

  updateRealTimeMetrics(type, data) {
    this.metrics.realTimeData.push({
      type,
      data,
      timestamp: Date.now(),
    });

    // Keep only last 100 events
    if (this.metrics.realTimeData.length > 100) {
      this.metrics.realTimeData.shift();
    }
  }

  // Summary helper methods
  getTotalTests() {
    let total = 0;
    this.metrics.testMetrics.forEach((metrics) => {
      total += metrics.total;
    });
    return total;
  }

  getOverallSuccessRate() {
    let totalTests = 0;
    let totalPassed = 0;

    this.metrics.testMetrics.forEach((metrics) => {
      totalTests += metrics.total;
      totalPassed += metrics.passed;
    });

    return totalTests > 0
      ? ((totalPassed / totalTests) * 100).toFixed(2) + "%"
      : "0%";
  }

  getAvgRefinementIterations() {
    let total = 0;
    let count = 0;

    this.metrics.refinementMetrics.forEach((metrics) => {
      if (metrics.successful > 0) {
        total += metrics.avgIterations * metrics.successful;
        count += metrics.successful;
      }
    });

    return count > 0 ? (total / count).toFixed(2) : "0";
  }

  getTotalTokensUsed() {
    let total = 0;

    this.metrics.refinementMetrics.forEach((metrics) => {
      total += metrics.avgTokenUsage * metrics.total;
    });

    return Math.round(total);
  }

  getTotalCost() {
    return this.estimateCost(this.getTotalTokensUsed());
  }

  generateRecommendations() {
    const recommendations = [];
    const successRate = parseFloat(this.getOverallSuccessRate());

    if (successRate < 85) {
      recommendations.push({
        priority: "high",
        message: "Success rate below target",
        action: "Review failing test patterns and improve generation prompts",
      });
    }

    const avgIterations = parseFloat(this.getAvgRefinementIterations());
    if (avgIterations > 2) {
      recommendations.push({
        priority: "medium",
        message: "High refinement iterations",
        action: "Improve initial generation quality to reduce refinements",
      });
    }

    // Check for token usage
    const totalTokens = this.getTotalTokensUsed();
    if (totalTokens > 1000000) {
      recommendations.push({
        priority: "medium",
        message: "High token usage",
        action: "Optimize prompts and consider caching common patterns",
        cost: this.getTotalCost(),
      });
    }

    return recommendations;
  }

  /**
   * EXPORT & REPORTING
   */
  exportMetrics(format = "json") {
    const data = this.generateDashboard();

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    }

    if (format === "csv") {
      // Convert to CSV format
      return this.convertToCSV(data);
    }

    if (format === "html") {
      return this.generateHTMLReport(data);
    }

    return data;
  }

  convertToCSV(data) {
    const rows = [];

    // Header
    rows.push("Metric,Value,Trend");

    // Overview metrics
    rows.push(`Total Tests,${data.overview.totalTestsRun},`);
    rows.push(`Success Rate,${data.overview.overallSuccessRate},`);
    rows.push(`Avg Refinements,${data.overview.avgRefinementIterations},`);
    rows.push(`Total Cost,${data.overview.estimatedCost},`);

    // Test metrics by type
    Object.entries(data.testMetrics).forEach(([type, metrics]) => {
      if (type !== "overall") {
        rows.push(
          `${type} Success Rate,${metrics.successRate},${metrics.trend}`,
        );
      }
    });

    return rows.join("\n");
  }

  generateHTMLReport(data) {
    return `<!DOCTYPE html>
<html>
<head>
  <title>ABBA Metrics Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f7fa;
      padding: 2rem;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: #1a202c;
      margin-bottom: 2rem;
      font-size: 2.5rem;
      font-weight: 600;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metric-card h2 {
      color: #4a5568;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: 600;
      color: #1a202c;
      margin-bottom: 0.5rem;
    }
    .metric-trend {
      font-size: 0.875rem;
      color: #718096;
    }
    .success { color: #10b981; }
    .warning { color: #f59e0b; }
    .error { color: #ef4444; }
    .improving { color: #10b981; }
    .declining { color: #ef4444; }
    .stable { color: #6b7280; }
    .table {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    .table h2 {
      padding: 1rem 1.5rem;
      background: #f7fafc;
      border-bottom: 1px solid #e2e8f0;
      font-size: 1.25rem;
      color: #2d3748;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 0.75rem 1.5rem;
      background: #f7fafc;
      font-weight: 600;
      color: #4a5568;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      padding: 0.75rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      color: #2d3748;
    }
    .alert {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .alert-warning {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .recommendation {
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .timestamp {
      color: #718096;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 ABBA Metrics Dashboard</h1>
    <p class="timestamp">Generated: ${data.timestamp}</p>
    
    <div class="grid">
      <div class="metric-card">
        <h2>Total Tests</h2>
        <div class="metric-value">${data.overview.totalTestsRun}</div>
        <div class="metric-trend">All time</div>
      </div>
      
      <div class="metric-card">
        <h2>Success Rate</h2>
        <div class="metric-value success">${data.overview.overallSuccessRate}</div>
        <div class="metric-trend">Target: 85%</div>
      </div>
      
      <div class="metric-card">
        <h2>Avg Refinements</h2>
        <div class="metric-value">${data.overview.avgRefinementIterations}</div>
        <div class="metric-trend">Per generation</div>
      </div>
      
      <div class="metric-card">
        <h2>Total Cost</h2>
        <div class="metric-value">${data.overview.estimatedCost}</div>
        <div class="metric-trend">${data.overview.totalTokensUsed.toLocaleString()} tokens</div>
      </div>
    </div>
    
    <div class="table">
      <h2>Test Success by Type</h2>
      <table>
        <thead>
          <tr>
            <th>Test Type</th>
            <th>Success Rate</th>
            <th>Total Tests</th>
            <th>Avg Duration</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.testMetrics)
            .filter(([type]) => type !== "overall")
            .map(
              ([type, metrics]) => `
          <tr>
            <td>${type}</td>
            <td class="${parseFloat(metrics.successRate) >= 85 ? "success" : parseFloat(metrics.successRate) >= 70 ? "warning" : "error"}">
              ${metrics.successRate}
            </td>
            <td>${metrics.total}</td>
            <td>${metrics.avgDuration}</td>
            <td class="${metrics.trend}">${metrics.trend}</td>
          </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="table">
      <h2>Refinement Efficiency</h2>
      <table>
        <thead>
          <tr>
            <th>Prompt Type</th>
            <th>Avg Iterations</th>
            <th>Avg Time</th>
            <th>Success Rate</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.refinementMetrics)
            .filter(([type]) => type !== "overall")
            .map(
              ([type, metrics]) => `
          <tr>
            <td>${type}</td>
            <td>${metrics.avgIterations}</td>
            <td>${metrics.avgTimeToSuccess}</td>
            <td class="${parseFloat(metrics.successRate) >= 85 ? "success" : "warning"}">${metrics.successRate}</td>
            <td>${metrics.costEstimate}</td>
          </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    
    ${
      data.alerts && data.alerts.length > 0
        ? `
    <div class="table">
      <h2>Active Alerts</h2>
      <div style="padding: 1.5rem;">
        ${data.alerts
          .map(
            (alert) => `
        <div class="alert alert-${alert.level}">
          <strong>${alert.level.toUpperCase()}:</strong> ${alert.message}
          ${alert.cost ? `<span style="float: right;">Cost: ${alert.cost}</span>` : ""}
        </div>
        `,
          )
          .join("")}
      </div>
    </div>
    `
        : ""
    }
    
    ${
      data.recommendations && data.recommendations.length > 0
        ? `
    <div class="table">
      <h2>Recommendations</h2>
      <div style="padding: 1.5rem;">
        ${data.recommendations
          .map(
            (rec) => `
        <div class="recommendation">
          <strong>${rec.priority.toUpperCase()}:</strong> ${rec.message}<br>
          <span style="color: #4a5568;">Action: ${rec.action}</span>
          ${rec.cost ? `<br><span style="color: #718096;">Cost impact: ${rec.cost}</span>` : ""}
        </div>
        `,
          )
          .join("")}
      </div>
    </div>
    `
        : ""
    }
  </div>
</body>
</html>`;
  }

  initializeTracking() {
    // Set up periodic reporting
    if (this.config.reportingInterval > 0) {
      setInterval(async () => {
        try {
          const report = this.generateDashboard();
          console.log("📊 Metrics Report:", report.overview);

          // Save to file if fs is available
          try {
            const fs = await import("fs");
            const path = await import("path");

            // Ensure directory exists
            await fs.promises.mkdir(this.config.dbPath, { recursive: true });

            const reportPath = path.default.join(
              this.config.dbPath,
              `report_${Date.now()}.json`,
            );
            await fs.promises.writeFile(
              reportPath,
              JSON.stringify(report, null, 2),
            );
            console.log(`📁 Report saved to ${reportPath}`);
          } catch (fsError) {
            console.log("📊 Report (no file system):", report);
          }
        } catch (error) {
          console.error("Error generating metrics report:", error);
        }
      }, this.config.reportingInterval);
    }
  }

  /**
   * Get real-time metrics stream
   */
  getRealTimeMetrics() {
    return this.metrics.realTimeData;
  }

  /**
   * Clear all metrics data
   */
  clearMetrics() {
    this.metrics = {
      testMetrics: new Map(),
      refinementMetrics: new Map(),
      failurePatterns: new Map(),
      historicalData: [],
      realTimeData: [],
    };
    this.activeAlerts = [];
    console.log("✨ All metrics cleared");
  }

  /**
   * Export metrics for specific time range
   */
  exportTimeRangeMetrics(startDate, endDate, format = "json") {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    // Filter metrics by time range
    const filteredMetrics = {
      testMetrics: new Map(),
      refinementMetrics: new Map(),
      failurePatterns: new Map(),
    };

    this.metrics.testMetrics.forEach((metrics, type) => {
      const filtered = metrics.history.filter(
        (m) => m.timestamp >= start && m.timestamp <= end,
      );
      if (filtered.length > 0) {
        filteredMetrics.testMetrics.set(type, {
          ...metrics,
          history: filtered,
        });
      }
    });

    this.metrics.refinementMetrics.forEach((metrics, type) => {
      const filtered = metrics.history.filter(
        (m) => m.timestamp >= start && m.timestamp <= end,
      );
      if (filtered.length > 0) {
        filteredMetrics.refinementMetrics.set(type, {
          ...metrics,
          history: filtered,
        });
      }
    });

    // Generate dashboard for filtered data
    const originalMetrics = this.metrics;
    this.metrics = filteredMetrics;
    
    this.metrics = originalMetrics;

    return this.exportMetrics(format);
  }
}

export default MetricsTrackingSystem;
