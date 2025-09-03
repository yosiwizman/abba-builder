// scripts/run-visual-tests.js
/**
 * Script to run visual regression tests
 * Usage: npm run test:visual
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import VisualTestingIntegration from "../src/services/enhanced/visual-testing-integration.js";


// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run visual regression tests for specified apps
 */
async function runVisualTests() {
  console.log("🎨 Starting Visual Regression Tests...\n");
  console.log("=".repeat(60));

  // Get test configuration from environment or use defaults
  const config = {
    apiKey: process.env.ANTHROPIC_API_KEY,
    projectPath: process.env.PROJECT_PATH || join(__dirname, ".."),
    autoBaseline: process.env.AUTO_BASELINE === "true" || true,
    updateOnSuccess: process.env.UPDATE_BASELINE_ON_SUCCESS === "true" || false,
    failOnVisualChange: process.env.FAIL_ON_VISUAL_CHANGE === "true" || false,
    threshold: parseFloat(process.env.VISUAL_THRESHOLD) || 0.1,
  };

  // Initialize visual testing
  const visualTesting = new VisualTestingIntegration({
    autoBaseline: config.autoBaseline,
    updateBaselineOnSuccess: config.updateOnSuccess,
    failOnVisualChange: config.failOnVisualChange,
    visualThreshold: config.threshold,
    basePath: "./visual-baselines",
    resultsPath: "./visual-results",
    viewports: [
      { width: 375, height: 667, name: "mobile" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 1920, height: 1080, name: "desktop" },
    ],
  });

  // Get test targets from command line or environment
  const testTargets = process.argv.slice(2) || [];

  if (testTargets.length === 0) {
    // Default test targets if none specified
    testTargets.push(
      "./temp-apps/latest",
      "./examples/dashboard",
      "./examples/contact-form",
    );
  }

  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Run tests for each target
  for (const target of testTargets) {
    console.log(`\n📱 Testing: ${target}`);
    console.log("-".repeat(40));

    try {
      // Check if we're testing a URL or a local path
      const isUrl =
        target.startsWith("http://") || target.startsWith("https://");
      let appUrl = isUrl ? target : null;
      let appPath = !isUrl ? target : null;

      // Start server if testing local path
      let server = null;
      if (appPath) {
        const express = await import("express");
        const app = express.default();
        const port = 3000 + Math.floor(Math.random() * 1000);

        app.use(express.default.static(appPath));
        server = await new Promise((resolve) => {
          const s = app.listen(port, () => {
            console.log(`🌐 Test server running at http://localhost:${port}`);
            resolve(s);
          });
        });
        appUrl = `http://localhost:${port}`;
      }

      // Launch browser for testing
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({
        headless: process.env.HEADLESS !== "false",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Generate app identifier
      const appIdentifier = target.replace(/[^a-z0-9]/gi, "_").substring(0, 30);

      // Run visual tests
      const testResult = await visualTesting.runTestsWithVisualValidation(
        page,
        appUrl,
        appIdentifier,
        {
          captureBaseline: config.autoBaseline,
        },
      );

      // Process results
      totalTests++;
      if (testResult.visual?.success) {
        passedTests++;
        console.log("✅ Visual tests PASSED");
      } else if (testResult.visual?.baselineCreated) {
        console.log("📸 Baseline created (first run)");
      } else {
        failedTests++;
        console.log("❌ Visual tests FAILED");
      }

      // Show detailed results
      if (testResult.visual?.results) {
        const visualData = testResult.visual.results;
        console.log(`\n📊 Results:`);
        console.log(
          `  - Total viewports tested: ${visualData.summary?.totalTests || 0}`,
        );
        console.log(`  - Passed: ${visualData.summary?.passed || 0}`);
        console.log(`  - Failed: ${visualData.summary?.failed || 0}`);
        console.log(`  - Warnings: ${visualData.summary?.warnings || 0}`);

        // Show viewport-specific results
        if (visualData.comparisons && visualData.comparisons.length > 0) {
          console.log(`\n  Viewport Results:`);
          visualData.comparisons.forEach((comp) => {
            const status = comp.passed ? "✅" : comp.warning ? "⚠️" : "❌";
            console.log(
              `    ${status} ${comp.viewport.name}: ${comp.difference.toFixed(2)}% diff`,
            );
          });
        }
      }

      // Show recommendations
      if (testResult.recommendations && testResult.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        testResult.recommendations
          .filter((r) => r.severity === "high" || r.severity === "critical")
          .forEach((rec) => {
            console.log(`  - [${rec.severity.toUpperCase()}] ${rec.message}`);
          });
      }

      results.push({
        target: target,
        identifier: appIdentifier,
        result: testResult,
      });

      // Cleanup
      await browser.close();
      if (server) {
        server.close();
      }
    } catch (error) {
      console.error(`❌ Error testing ${target}:`, error.message);
      failedTests++;
      results.push({
        target: target,
        error: error.message,
      });
    }
  }

  // Generate summary report
  console.log("\n" + "=".repeat(60));
  console.log("📈 VISUAL TESTING SUMMARY");
  console.log("=".repeat(60));
  console.log(`\nTotal Targets Tested: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  const successRate =
    totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  console.log(`Success Rate: ${successRate}%`);

  // Generate report file
  const report = {
    timestamp: Date.now(),
    config: config,
    summary: {
      totalTests: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: successRate,
    },
    results: results,
  };

  // Save report
  const fs = await import("fs");
  const reportPath = join(
    process.cwd(),
    "visual-results",
    `report_${Date.now()}.json`,
  );

  // Ensure directory exists
  const reportDir = dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  // Exit with appropriate code
  if (failedTests > 0 && config.failOnVisualChange) {
    console.log("\n❌ Some visual tests failed. Exiting with error code.");
    process.exit(1);
  } else {
    console.log("\n✅ Visual testing completed successfully!");
    process.exit(0);
  }
}

// Run the tests
runVisualTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
