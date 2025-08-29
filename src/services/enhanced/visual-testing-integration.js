// src/services/enhanced/visual-testing-integration.js

import VisualRegressionTester from "./visual-regression.js";
import fs from "fs";
import path from "path";

/**
 * Integration layer for visual regression testing with ABBA's existing systems
 * Connects with orchestrator, testing bots, and validation engine
 */
class VisualTestingIntegration {
  constructor(config = {}) {
    this.visualTester = new VisualRegressionTester({
      threshold: config.visualThreshold || 0.1,
      outputDiff: config.outputDiff !== false,
      basePath: config.basePath || "./visual-baselines",
      resultsPath: config.resultsPath || "./visual-results",
      viewports: config.viewports || [
        { width: 375, height: 667, name: "mobile" },
        { width: 768, height: 1024, name: "tablet" },
        { width: 1920, height: 1080, name: "desktop" },
      ],
    });

    this.config = {
      autoBaseline: config.autoBaseline || false,
      failOnVisualChange: config.failOnVisualChange || false,
      updateBaselineOnSuccess: config.updateBaselineOnSuccess || false,
      testScenarios: config.testScenarios || [],
      enableCrossBrowser: config.enableCrossBrowser || false,
      ...config,
    };

    this.testHistory = [];
  }

  /**
   * Enhanced test execution with visual regression
   */
  async runTestsWithVisualValidation(
    page,
    appUrl,
    appIdentifier,
    options = {},
  ) {
    console.log(`🎨 Running visual regression tests for ${appIdentifier}...`);

    const testResults = {
      appId: appIdentifier,
      url: appUrl,
      timestamp: Date.now(),
      functional: null,
      visual: null,
      combined: null,
      recommendations: [],
    };

    try {
      // Navigate to the application
      await page.goto(appUrl, { waitUntil: "networkidle" });

      // Check if baseline exists
      const baselineExists = this.checkBaselineExists(appIdentifier);

      if (!baselineExists) {
        if (this.config.autoBaseline) {
          console.log("📸 No baseline found. Creating initial baseline...");
          const baselineResult = await this.visualTester.captureBaseline(
            page,
            appIdentifier,
            this.config.testScenarios,
          );
          testResults.visual = {
            baselineCreated: true,
            result: baselineResult,
          };
        } else {
          throw new Error(
            "No baseline found. Please capture baseline first or enable autoBaseline.",
          );
        }
      } else {
        // Run visual comparison
        const visualResult = await this.visualTester.detectVisualChanges(
          page,
          appIdentifier,
          options,
        );
        testResults.visual = visualResult;

        // Determine if visual tests passed
        if (!visualResult.success && this.config.failOnVisualChange) {
          testResults.combined = {
            success: false,
            reason: "Visual regression detected",
          };
        }

        // Update baseline if tests passed and config allows
        if (visualResult.success && this.config.updateBaselineOnSuccess) {
          await this.visualTester.updateBaseline(appIdentifier);
          console.log("✅ Baseline updated with successful test results");
        }
      }

      // Generate comprehensive recommendations
      testResults.recommendations =
        this.generateComprehensiveRecommendations(testResults);

      // Store test results in history
      this.testHistory.push(testResults);

      return testResults;
    } catch (error) {
      console.error("❌ Visual testing failed:", error);
      testResults.error = error.message;
      testResults.combined = {
        success: false,
        reason: error.message,
      };
      return testResults;
    }
  }

  /**
   * Integration with existing testing bot system
   */
  async enhanceTestingBot(testingBot, visualConfig = {}) {
    // Store original runTestScenarios method
    const originalRunTests = testingBot.runTestScenarios.bind(testingBot);

    // Enhance with visual testing
    testingBot.runTestScenarios = async (appUrl, scenarios) => {
      // Run original functional tests
      const functionalResults = await originalRunTests(appUrl, scenarios);

      // Add visual regression tests
      if (visualConfig.enableVisual !== false) {
        const browser = await testingBot.browser; // Assuming browser is accessible
        const page = await testingBot.page; // Assuming page is accessible

        const visualResults = await this.runTestsWithVisualValidation(
          page,
          appUrl,
          visualConfig.appId || "unknown",
          visualConfig,
        );

        // Combine results
        return {
          ...functionalResults,
          visual: visualResults.visual,
          combinedSuccess:
            functionalResults.success &&
            visualResults.visual?.success !== false,
          recommendations: [
            ...(functionalResults.recommendations || []),
            ...(visualResults.recommendations || []),
          ],
        };
      }

      return functionalResults;
    };

    console.log("✅ Testing bot enhanced with visual regression capabilities");
    return testingBot;
  }

  /**
   * Check if baseline exists for an app
   */
  checkBaselineExists(appIdentifier) {
    const metadataPath = path.join(
      this.visualTester.config.basePath,
      `${appIdentifier}_baseline.json`,
    );
    return fs.existsSync(metadataPath);
  }

  /**
   * Generate test scenarios based on generated code analysis
   */
  async generateTestScenarios(generatedCode, appType) {
    const scenarios = [];

    // Analyze code for interactive elements
    const hasForm = /(<form|<input|<select|<textarea)/i.test(generatedCode);
    const hasButtons = /(<button|onClick)/i.test(generatedCode);
    const hasNavigation = /(<nav|<Link|Router)/i.test(generatedCode);
    const hasModal = /(modal|dialog|popup)/i.test(generatedCode);
    const hasDataTable = /(<table|DataTable|Grid)/i.test(generatedCode);

    // Base scenario - initial load
    scenarios.push({
      name: "initial_load",
      description: "Capture initial application state",
      actions: [{ type: "wait", duration: 2000 }],
    });

    // Form interaction scenario
    if (hasForm) {
      scenarios.push({
        name: "form_interaction",
        description: "Test form elements visual state",
        actions: [
          { type: "click", selector: "input:first-of-type" },
          { type: "type", selector: "input:first-of-type", text: "Test Input" },
          { type: "wait", duration: 500 },
          { type: "click", selector: "body" }, // Blur
          { type: "wait", duration: 500 },
        ],
      });

      scenarios.push({
        name: "form_validation",
        description: "Test form validation states",
        actions: [
          {
            type: "click",
            selector: 'button[type="submit"], input[type="submit"]',
          },
          { type: "wait", duration: 1000 },
        ],
      });
    }

    // Button interactions
    if (hasButtons) {
      scenarios.push({
        name: "button_states",
        description: "Test button hover and active states",
        actions: [
          { type: "hover", selector: "button:first-of-type" },
          { type: "wait", duration: 500 },
          { type: "click", selector: "button:first-of-type" },
          { type: "wait", duration: 500 },
        ],
      });
    }

    // Navigation testing
    if (hasNavigation) {
      scenarios.push({
        name: "navigation_states",
        description: "Test navigation menu states",
        actions: [
          { type: "click", selector: "nav a:first-of-type" },
          { type: "wait", duration: 1000 },
          { type: "hover", selector: "nav a:last-of-type" },
          { type: "wait", duration: 500 },
        ],
      });
    }

    // Modal/Dialog testing
    if (hasModal) {
      scenarios.push({
        name: "modal_open",
        description: "Test modal open state",
        actions: [
          {
            type: "click",
            selector: '[data-toggle="modal"], [aria-haspopup="dialog"]',
          },
          { type: "wait", duration: 1000 },
        ],
      });
    }

    // Data table testing
    if (hasDataTable) {
      scenarios.push({
        name: "table_interaction",
        description: "Test table sorting and pagination",
        actions: [
          { type: "click", selector: "th:first-of-type" }, // Sort
          { type: "wait", duration: 500 },
          { type: "scroll", position: 300 },
          { type: "wait", duration: 500 },
        ],
      });
    }

    // Responsive testing - always include
    scenarios.push({
      name: "scroll_states",
      description: "Test scroll positions and sticky elements",
      actions: [
        { type: "scroll", position: 0 },
        { type: "wait", duration: 500 },
        { type: "scroll", position: 500 },
        { type: "wait", duration: 500 },
        { type: "scroll", position: 1000 },
        { type: "wait", duration: 500 },
      ],
    });

    return scenarios;
  }

  /**
   * Generate comprehensive recommendations
   */
  generateComprehensiveRecommendations(testResults) {
    const recommendations = [];

    // Visual-specific recommendations
    if (testResults.visual?.results) {
      const visualRecs = testResults.visual.recommendation || [];
      recommendations.push(...visualRecs);

      // Add specific UI recommendations based on failures
      const failedComparisons =
        testResults.visual.results.comparisons?.filter((c) => !c.passed) || [];

      failedComparisons.forEach((comparison) => {
        if (comparison.difference > 20) {
          recommendations.push({
            severity: "critical",
            category: "major-ui-change",
            viewport: comparison.viewport.name,
            message: `Major UI changes detected in ${comparison.viewport.name} view (${comparison.difference.toFixed(1)}% difference)`,
            action:
              "Review component structure and layout for unintended modifications",
          });
        } else if (comparison.difference > 5) {
          recommendations.push({
            severity: "medium",
            category: "moderate-ui-change",
            viewport: comparison.viewport.name,
            message: `Moderate visual changes in ${comparison.viewport.name} view`,
            action: "Check spacing, colors, and font rendering",
          });
        }
      });
    }

    // Cross-viewport consistency check
    if (testResults.visual?.results?.comparisons) {
      const viewportDifferences = {};
      testResults.visual.results.comparisons.forEach((c) => {
        viewportDifferences[c.viewport.name] = c.difference;
      });

      const avgDiff =
        Object.values(viewportDifferences).reduce((a, b) => a + b, 0) /
        Object.values(viewportDifferences).length;
      const variance =
        Object.values(viewportDifferences).reduce(
          (sum, diff) => sum + Math.pow(diff - avgDiff, 2),
          0,
        ) / Object.values(viewportDifferences).length;

      if (variance > 25) {
        recommendations.push({
          severity: "high",
          category: "inconsistent-responsive",
          message: "Inconsistent visual changes across different viewports",
          action:
            "Review responsive breakpoints and ensure consistent behavior across screen sizes",
        });
      }
    }

    return recommendations;
  }

  /**
   * Compare visual results across multiple versions
   */
  async compareVersions(appIdentifier, versions = []) {
    console.log(
      `📊 Comparing ${versions.length} versions of ${appIdentifier}...`,
    );

    const comparisonResults = {
      appId: appIdentifier,
      versions: versions,
      comparisons: [],
      trend: null,
    };

    try {
      // Load all version baselines
      const versionData = versions
        .map((version) => {
          const metadataPath = path.join(
            this.visualTester.config.basePath,
            "archive",
            `${appIdentifier}_${version}`,
            `${appIdentifier}_baseline.json`,
          );

          if (fs.existsSync(metadataPath)) {
            return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
          }
          return null;
        })
        .filter(Boolean);

      // Analyze trends
      if (versionData.length >= 2) {
        // Calculate progressive changes
        for (let i = 1; i < versionData.length; i++) {
          const prev = versionData[i - 1];
          const curr = versionData[i];

          comparisonResults.comparisons.push({
            from: prev.version,
            to: curr.version,
            timestamp: curr.timestamp,
            screenshotCount: curr.screenshots.length,
          });
        }

        // Determine trend (improving, degrading, stable)
        comparisonResults.trend = this.analyzeTrend(
          comparisonResults.comparisons,
        );
      }

      return comparisonResults;
    } catch (error) {
      console.error("❌ Version comparison failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze trend across versions
   */
  analyzeTrend(comparisons) {
    // This would analyze the progression of visual changes
    // For now, return a simple analysis
    return {
      direction: "stable",
      confidence: 0.8,
      recommendation: "Visual consistency maintained across versions",
    };
  }

  /**
   * Generate visual testing report for orchestrator
   */
  async generateOrchestratorReport(allTestResults) {
    const report = {
      timestamp: Date.now(),
      summary: {
        totalApps: allTestResults.length,
        visuallyPassed: 0,
        visuallyFailed: 0,
        baselinesMissing: 0,
      },
      details: [],
      overallRecommendations: [],
    };

    allTestResults.forEach((result) => {
      if (result.visual?.success) {
        report.summary.visuallyPassed++;
      } else if (result.visual?.baselineCreated) {
        report.summary.baselinesMissing++;
      } else {
        report.summary.visuallyFailed++;
      }

      report.details.push({
        appId: result.appId,
        visualResult: result.visual?.success,
        highestDifference: Math.max(
          ...(result.visual?.results?.comparisons?.map((c) => c.difference) || [
            0,
          ]),
        ),
        recommendations: result.recommendations,
      });
    });

    // Generate overall recommendations
    if (report.summary.visuallyFailed > 0) {
      report.overallRecommendations.push({
        severity: "high",
        message: `${report.summary.visuallyFailed} apps have visual regressions`,
        action:
          "Review failed tests and update baselines if changes are intentional",
      });
    }

    if (report.summary.baselinesMissing > 0) {
      report.overallRecommendations.push({
        severity: "info",
        message: `${report.summary.baselinesMissing} apps had baselines created`,
        action: "These baselines will be used for future comparisons",
      });
    }

    return report;
  }

  /**
   * Integration with CI/CD pipelines
   */
  async runCIVisualTests(config) {
    const results = {
      success: true,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || "development",
      tests: [],
    };

    try {
      // Run visual tests for each configured app
      for (const app of config.apps) {
        const testResult = await this.runTestsWithVisualValidation(
          app.page,
          app.url,
          app.identifier,
          app.options,
        );

        results.tests.push(testResult);

        if (!testResult.visual?.success && config.failOnVisualChange) {
          results.success = false;
        }
      }

      // Generate CI report
      const reportPath = await this.generateCIReport(results);
      console.log(`📊 CI visual test report: ${reportPath}`);

      // Exit with appropriate code for CI
      if (!results.success && config.exitOnFailure) {
        process.exit(1);
      }

      return results;
    } catch (error) {
      console.error("❌ CI visual tests failed:", error);
      if (config.exitOnFailure) {
        process.exit(1);
      }
      throw error;
    }
  }

  /**
   * Generate CI-friendly report
   */
  async generateCIReport(results) {
    const reportPath = path.join(
      this.visualTester.config.resultsPath,
      `ci_visual_report_${results.timestamp}.json`,
    );

    const ciReport = {
      ...results,
      summary: {
        passed: results.tests.filter((t) => t.visual?.success).length,
        failed: results.tests.filter(
          (t) => !t.visual?.success && !t.visual?.baselineCreated,
        ).length,
        baselined: results.tests.filter((t) => t.visual?.baselineCreated)
          .length,
        total: results.tests.length,
      },
      exitCode: results.success ? 0 : 1,
    };

    fs.writeFileSync(reportPath, JSON.stringify(ciReport, null, 2));
    return reportPath;
  }
}

export default VisualTestingIntegration;




