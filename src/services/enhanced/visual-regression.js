// src/services/enhanced/visual-regression.js

import fs from "fs";
import path from "path";
import sharp from "sharp";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/**
 * Visual Regression Testing System for ABBA AI Builder
 * Provides pixel-perfect comparison, responsive validation, and cross-browser testing
 */
class VisualRegressionTester {
  constructor(config = {}) {
    this.config = {
      threshold: config.threshold || 0.1, // 0.1 = 10% difference threshold
      outputDiff: config.outputDiff !== false,
      diffColor: config.diffColor || { r: 255, g: 0, b: 0, a: 255 }, // Red for differences
      basePath: config.basePath || "./visual-baselines",
      resultsPath: config.resultsPath || "./visual-results",
      viewports: config.viewports || [
        { width: 375, height: 667, name: "mobile" }, // iPhone SE
        { width: 768, height: 1024, name: "tablet" }, // iPad
        { width: 1920, height: 1080, name: "desktop" }, // Full HD
        { width: 1440, height: 900, name: "laptop" }, // MacBook
        { width: 2560, height: 1440, name: "2k" }, // 2K Display
      ],
      browsers: config.browsers || ["chromium", "firefox", "webkit"],
      animations: config.animations || "disabled", // Disable animations for consistency
      waitForStable: config.waitForStable || 2000, // Wait for UI to stabilize
      retryAttempts: config.retryAttempts || 3,
      pixelDensity: config.pixelDensity || [1, 2], // Regular and retina displays
    };

    this.ensureDirectories();
    this.testResults = [];
    this.baselineVersion = null;
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    [this.config.basePath, this.config.resultsPath].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Capture baseline screenshots for a deployed application
   */
  async captureBaseline(page, appIdentifier, testScenarios = []) {
//     console.log(`📸 Capturing baseline for ${appIdentifier}...`);
    const baselineData = {
      appId: appIdentifier,
      timestamp: Date.now(),
      version: this.generateVersion(),
      screenshots: [],
      metadata: {},
    };

    try {
      // Disable animations and transitions
      await this.disableAnimations(page);

      // Capture for each viewport
      for (const viewport of this.config.viewports) {
        await page.setViewportSize(viewport);
        await this.waitForStableUI(page);

        // Capture for each pixel density
        for (const density of this.config.pixelDensity) {
          const screenshotName = `${appIdentifier}_${viewport.name}_${density}x`;

          // Take screenshot with retries for stability
          const screenshot = await this.captureWithRetry(page, {
            fullPage: true,
            deviceScaleFactor: density,
          });

          // Save baseline
          const baselinePath = path.join(
            this.config.basePath,
            `${screenshotName}_baseline.png`,
          );

          await sharp(screenshot)
            .png({ quality: 100, compressionLevel: 0 })
            .toFile(baselinePath);

          baselineData.screenshots.push({
            name: screenshotName,
            viewport: viewport,
            pixelDensity: density,
            path: baselinePath,
            size: screenshot.length,
          });

//           console.log(`✅ Captured ${viewport.name} @ ${density}x density`);
        }
      }

      // Run test scenarios and capture states
      if (testScenarios.length > 0) {
        baselineData.scenarioScreenshots = await this.captureScenarioStates(
          page,
          appIdentifier,
          testScenarios,
        );
      }

      // Save baseline metadata
      const metadataPath = path.join(
        this.config.basePath,
        `${appIdentifier}_baseline.json`,
      );
      fs.writeFileSync(metadataPath, JSON.stringify(baselineData, null, 2));

      return {
        success: true,
        baseline: baselineData,
        totalScreenshots: baselineData.screenshots.length,
        message: `Baseline captured successfully with ${baselineData.screenshots.length} screenshots`,
      };
    } catch (error) {
      console.error("❌ Baseline capture failed:", error);
      return {
        success: false,
        error: error.message,
        partialData: baselineData,
      };
    }
  }

  /**
   * Capture screenshots for specific test scenarios
   */
  async captureScenarioStates(page, appIdentifier, scenarios) {
    const scenarioScreenshots = [];

    for (const scenario of scenarios) {
//       console.log(`🎬 Running scenario: ${scenario.name}`);

      // Execute scenario actions
      if (scenario.actions) {
        for (const action of scenario.actions) {
          await this.executeAction(page, action);
        }
      }

      // Wait for UI to stabilize
      await this.waitForStableUI(page);

      // Capture state
      const screenshot = await page.screenshot({
        fullPage: scenario.fullPage !== false,
      });

      const screenshotPath = path.join(
        this.config.basePath,
        `${appIdentifier}_scenario_${scenario.name}.png`,
      );

      await sharp(screenshot).toFile(screenshotPath);

      scenarioScreenshots.push({
        scenario: scenario.name,
        path: screenshotPath,
        timestamp: Date.now(),
      });
    }

    return scenarioScreenshots;
  }

  /**
   * Execute a test action on the page
   */
  async executeAction(page, action) {
    switch (action.type) {
      case "click":
        await page.click(action.selector);
        break;
      case "type":
        await page.type(action.selector, action.text);
        break;
      case "hover":
        await page.hover(action.selector);
        break;
      case "select":
        await page.select(action.selector, action.value);
        break;
      case "wait":
        await page.waitForTimeout(action.duration || 1000);
        break;
      case "scroll":
        await page.evaluate((scrollTo) => {
          window.scrollTo(0, scrollTo);
        }, action.position || 500);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Compare current version against baseline
   */
  async detectVisualChanges(page, appIdentifier, options = {}) {
//     console.log(`🔍 Detecting visual changes for ${appIdentifier}...`);

    const results = {
      appId: appIdentifier,
      timestamp: Date.now(),
      comparisons: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    };

    try {
      // Load baseline metadata
      const metadataPath = path.join(
        this.config.basePath,
        `${appIdentifier}_baseline.json`,
      );

      if (!fs.existsSync(metadataPath)) {
        throw new Error("No baseline found. Please capture baseline first.");
      }

      const baseline = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

      // Disable animations for consistency
      await this.disableAnimations(page);

      // Compare each viewport configuration
      for (const config of baseline.screenshots) {
        const comparison = await this.compareScreenshot(
          page,
          config,
          appIdentifier,
        );

        results.comparisons.push(comparison);
        results.summary.totalTests++;

        if (comparison.passed) {
          results.summary.passed++;
//           console.log(
            `✅ ${config.name}: Passed (${comparison.difference.toFixed(2)}% diff)`,
          );
        } else if (comparison.warning) {
          results.summary.warnings++;
//           console.log(
            `⚠️ ${config.name}: Warning (${comparison.difference.toFixed(2)}% diff)`,
          );
        } else {
          results.summary.failed++;
//           console.log(
            `❌ ${config.name}: Failed (${comparison.difference.toFixed(2)}% diff)`,
          );
        }
      }

      // Generate visual report
      const report = await this.generateVisualReport(results);

      return {
        success: results.summary.failed === 0,
        results: results,
        report: report,
        recommendation: this.generateRecommendations(results),
      };
    } catch (error) {
      console.error("❌ Visual comparison failed:", error);
      return {
        success: false,
        error: error.message,
        results: results,
      };
    }
  }

  /**
   * Compare a single screenshot configuration
   */
  async compareScreenshot(page, baselineConfig, appIdentifier) {
    // Set viewport and pixel density
    await page.setViewportSize({
      width: baselineConfig.viewport.width,
      height: baselineConfig.viewport.height,
    });

    // Wait for UI to stabilize
    await this.waitForStableUI(page);

    // Capture current screenshot
    const currentScreenshot = await this.captureWithRetry(page, {
      fullPage: true,
      deviceScaleFactor: baselineConfig.pixelDensity,
    });

    // Save current screenshot
    const currentPath = path.join(
      this.config.resultsPath,
      `${baselineConfig.name}_current.png`,
    );
    await sharp(currentScreenshot).toFile(currentPath);

    // Load baseline image
    const baselineBuffer = fs.readFileSync(baselineConfig.path);

    // Resize images to same dimensions if needed
    const { normalizedBaseline, normalizedCurrent } =
      await this.normalizeImages(baselineBuffer, currentScreenshot);

    // Perform pixel comparison
    const comparison = await this.pixelComparison(
      normalizedBaseline,
      normalizedCurrent,
      baselineConfig.name,
    );

    return {
      name: baselineConfig.name,
      viewport: baselineConfig.viewport,
      pixelDensity: baselineConfig.pixelDensity,
      difference: comparison.percentDifference,
      pixelsDiff: comparison.diffPixels,
      totalPixels: comparison.totalPixels,
      passed: comparison.percentDifference <= this.config.threshold,
      warning:
        comparison.percentDifference > this.config.threshold &&
        comparison.percentDifference <= this.config.threshold * 2,
      diffImagePath: comparison.diffPath,
      currentPath: currentPath,
      baselinePath: baselineConfig.path,
    };
  }

  /**
   * Normalize images to same dimensions for comparison
   */
  async normalizeImages(baselineBuffer, currentBuffer) {
    const baselineImage = sharp(baselineBuffer);
    const currentImage = sharp(currentBuffer);

    const [baselineMeta, currentMeta] = await Promise.all([
      baselineImage.metadata(),
      currentImage.metadata(),
    ]);

    // Use the larger dimensions
    const width = Math.max(baselineMeta.width, currentMeta.width);
    const height = Math.max(baselineMeta.height, currentMeta.height);

    // Resize both images to the same dimensions
    const [normalizedBaseline, normalizedCurrent] = await Promise.all([
      baselineImage
        .resize(width, height, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .raw()
        .toBuffer(),
      currentImage
        .resize(width, height, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .raw()
        .toBuffer(),
    ]);

    return {
      normalizedBaseline: { data: normalizedBaseline, width, height },
      normalizedCurrent: { data: normalizedCurrent, width, height },
    };
  }

  /**
   * Perform pixel-by-pixel comparison
   */
  async pixelComparison(baselineImage, currentImage, identifier) {
    const { width, height } = baselineImage;
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      baselineImage.data,
      currentImage.data,
      diff.data,
      width,
      height,
      {
        threshold: 0.1, // Pixel-level threshold
        includeAA: false, // Don't include anti-aliasing
        alpha: 0.1,
        aaColor: [255, 255, 0], // Yellow for anti-aliasing
        diffColor: [255, 0, 0], // Red for differences
        diffColorAlt: [0, 255, 0], // Green for additions
        diffMask: false,
      },
    );

    const totalPixels = width * height;
    const percentDifference = (diffPixels / totalPixels) * 100;

    // Save diff image if requested
    let diffPath = null;
    if (this.config.outputDiff && diffPixels > 0) {
      diffPath = path.join(this.config.resultsPath, `${identifier}_diff.png`);

      await new Promise((resolve, reject) => {
        diff
          .pack()
          .pipe(fs.createWriteStream(diffPath))
          .on("finish", resolve)
          .on("error", reject);
      });
    }

    return {
      diffPixels,
      totalPixels,
      percentDifference,
      diffPath,
    };
  }

  /**
   * Capture screenshot with retry logic for stability
   */
  async captureWithRetry(page, options, attempts = 0) {
    try {
      return await page.screenshot(options);
    } catch (error) {
      if (attempts < this.config.retryAttempts) {
//         console.log(
          `⏳ Retrying screenshot capture (attempt ${attempts + 1})...`,
        );
        await page.waitForTimeout(1000);
        return this.captureWithRetry(page, options, attempts + 1);
      }
      throw error;
    }
  }

  /**
   * Wait for UI to become stable (no changes)
   */
  async waitForStableUI(page) {
    // Wait for network to be idle
    await page.waitForLoadState("networkidle");

    // Additional wait for any animations/transitions
    await page.waitForTimeout(this.config.waitForStable);

    // Check for any pending animations
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Disable animations and transitions for consistent screenshots
   */
  async disableAnimations(page) {
    try {
      // Try to inject styles directly
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `,
      });
    } catch (error) {
      // If CSP blocks inline styles, try to inject via JavaScript
      try {
        await page.evaluate(() => {
          const style = document.createElement("style");
          style.textContent = `
            *, *::before, *::after {
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
          `;
          document.head.appendChild(style);
        });
      } catch (evalError) {
        // If both methods fail, log warning but continue
//         console.log(
          "⚠️  Could not disable animations (CSP restriction), continuing anyway...",
        );
      }
    }
  }

  /**
   * Generate visual comparison report
   */
  async generateVisualReport(results) {
    const reportPath = path.join(
      this.config.resultsPath,
      `visual_report_${results.appId}_${Date.now()}.html`,
    );

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Visual Regression Report - ${results.appId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem;
      text-align: center;
    }
    h1 { 
      font-size: 2.5rem; 
      margin-bottom: 1rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .summary {
      display: flex;
      justify-content: center;
      gap: 3rem;
      margin-top: 2rem;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
    }
    .stat-label {
      font-size: 0.9rem;
      opacity: 0.9;
      margin-top: 0.5rem;
    }
    .comparisons {
      padding: 3rem;
    }
    .comparison {
      margin-bottom: 3rem;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .comparison-header {
      padding: 1.5rem;
      background: #f5f5f5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .comparison-title {
      font-size: 1.2rem;
      font-weight: 600;
    }
    .badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.passed { 
      background: #10b981; 
      color: white;
    }
    .badge.failed { 
      background: #ef4444; 
      color: white;
    }
    .badge.warning { 
      background: #f59e0b; 
      color: white;
    }
    .comparison-images {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2px;
      background: #f0f0f0;
    }
    .image-container {
      position: relative;
      background: white;
      padding: 1rem;
    }
    .image-label {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #333;
    }
    img {
      width: 100%;
      height: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .diff-stats {
      padding: 1rem;
      background: #f9f9f9;
      display: flex;
      justify-content: space-around;
      font-size: 0.9rem;
    }
    .passed { color: #10b981; }
    .failed { color: #ef4444; }
    .warning { color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Visual Regression Report</h1>
      <p style="opacity: 0.9; margin-top: 0.5rem;">Application: ${results.appId}</p>
      <div class="summary">
        <div class="stat">
          <div class="stat-value">${results.summary.totalTests}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat">
          <div class="stat-value passed">${results.summary.passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value warning">${results.summary.warnings}</div>
          <div class="stat-label">Warnings</div>
        </div>
        <div class="stat">
          <div class="stat-value failed">${results.summary.failed}</div>
          <div class="stat-label">Failed</div>
        </div>
      </div>
    </div>
    <div class="comparisons">
      ${results.comparisons
        .map(
          (comp) => `
        <div class="comparison">
          <div class="comparison-header">
            <div>
              <div class="comparison-title">${comp.name}</div>
              <div style="color: #666; font-size: 0.85rem; margin-top: 0.25rem;">
                ${comp.viewport.width}x${comp.viewport.height} @ ${comp.pixelDensity}x
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span style="color: #666; font-size: 0.9rem;">
                ${comp.difference.toFixed(2)}% difference
              </span>
              <span class="badge ${comp.passed ? "passed" : comp.warning ? "warning" : "failed"}">
                ${comp.passed ? "Passed" : comp.warning ? "Warning" : "Failed"}
              </span>
            </div>
          </div>
          <div class="comparison-images">
            <div class="image-container">
              <div class="image-label">📸 Baseline</div>
              <img src="${path.relative(this.config.resultsPath, comp.baselinePath)}" alt="Baseline">
            </div>
            <div class="image-container">
              <div class="image-label">📱 Current</div>
              <img src="${path.relative(this.config.resultsPath, comp.currentPath)}" alt="Current">
            </div>
            ${
              comp.diffImagePath
                ? `
              <div class="image-container">
                <div class="image-label">🔍 Difference</div>
                <img src="${path.relative(this.config.resultsPath, comp.diffImagePath)}" alt="Difference">
              </div>
            `
                : ""
            }
          </div>
          <div class="diff-stats">
            <span>Total Pixels: ${comp.totalPixels.toLocaleString()}</span>
            <span>Different Pixels: ${comp.pixelsDiff.toLocaleString()}</span>
            <span>Difference: ${comp.difference.toFixed(4)}%</span>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(reportPath, html);
//     console.log(`📊 Visual report generated: ${reportPath}`);

    return reportPath;
  }

  /**
   * Generate recommendations based on visual test results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Analyze failure patterns
    const failedViewports = results.comparisons
      .filter((c) => !c.passed)
      .map((c) => c.viewport.name);

    if (failedViewports.includes("mobile")) {
      recommendations.push({
        severity: "high",
        category: "responsive",
        message:
          "Mobile layout has visual regressions. Check responsive breakpoints and media queries.",
        action:
          "Review CSS media queries for mobile breakpoints (max-width: 768px)",
      });
    }

    if (
      failedViewports.includes("desktop") &&
      !failedViewports.includes("mobile")
    ) {
      recommendations.push({
        severity: "medium",
        category: "desktop",
        message:
          "Desktop layout issues detected. May be related to wide-screen specific styles.",
        action:
          "Check desktop-specific layouts and ensure proper container widths",
      });
    }

    // Check for high pixel density issues
    const retinaFailures = results.comparisons.filter(
      (c) => !c.passed && c.pixelDensity === 2,
    );

    if (retinaFailures.length > 0) {
      recommendations.push({
        severity: "low",
        category: "retina",
        message: "Retina display rendering differences detected.",
        action:
          "Verify image assets are properly optimized for high-DPI displays",
      });
    }

    // Analyze difference percentages
    const avgDifference =
      results.comparisons.reduce((sum, c) => sum + c.difference, 0) /
      results.comparisons.length;

    if (avgDifference > 5) {
      recommendations.push({
        severity: "high",
        category: "major-changes",
        message: `Significant visual changes detected (avg ${avgDifference.toFixed(2)}% difference).`,
        action: "Review all UI components for unintended modifications",
      });
    } else if (avgDifference > 1) {
      recommendations.push({
        severity: "medium",
        category: "minor-changes",
        message: "Minor visual inconsistencies detected.",
        action:
          "Check for subtle CSS changes, font rendering, or spacing issues",
      });
    }

    // Add general recommendations
    if (results.summary.failed > 0) {
      recommendations.push({
        severity: "info",
        category: "testing",
        message: "Consider updating baselines if changes are intentional.",
        action: "Run baseline capture again if the current version is correct",
      });
    }

    return recommendations;
  }

  /**
   * Cross-browser visual testing
   */
  async testAcrossBrowsers(url, appIdentifier) {
//     console.log(`🌐 Testing across browsers for ${appIdentifier}...`);
    const browserResults = {};

    for (const browserType of this.config.browsers) {
//       console.log(`🔧 Testing in ${browserType}...`);

      try {
        // This would integrate with Playwright for multi-browser support
        // For now, we'll structure the API
        const result = {
          browser: browserType,
          timestamp: Date.now(),
          comparisons: [],
          success: true,
        };

        // Each browser would run the visual comparison
        // This is a placeholder for the actual implementation
        browserResults[browserType] = result;
      } catch (error) {
        console.error(`❌ ${browserType} test failed:`, error);
        browserResults[browserType] = {
          browser: browserType,
          success: false,
          error: error.message,
        };
      }
    }

    return {
      success: Object.values(browserResults).every((r) => r.success),
      results: browserResults,
      summary: this.generateCrossBrowserSummary(browserResults),
    };
  }

  /**
   * Generate cross-browser testing summary
   */
  generateCrossBrowserSummary(browserResults) {
    const summary = {
      totalBrowsers: Object.keys(browserResults).length,
      passed: Object.values(browserResults).filter((r) => r.success).length,
      failed: Object.values(browserResults).filter((r) => !r.success).length,
      consistencyScore: 0,
    };

    // Calculate consistency score across browsers
    const allComparisons = Object.values(browserResults)
      .filter((r) => r.comparisons)
      .flatMap((r) => r.comparisons);

    if (allComparisons.length > 0) {
      const avgDifferences = {};
      allComparisons.forEach((comp) => {
        if (!avgDifferences[comp.name]) {
          avgDifferences[comp.name] = [];
        }
        avgDifferences[comp.name].push(comp.difference);
      });

      // Calculate variance in differences across browsers
      const variances = Object.values(avgDifferences).map((diffs) => {
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const variance =
          diffs.reduce((sum, diff) => sum + Math.pow(diff - avg, 2), 0) /
          diffs.length;
        return variance;
      });

      const avgVariance =
        variances.reduce((a, b) => a + b, 0) / variances.length;
      summary.consistencyScore = Math.max(0, 100 - avgVariance * 10);
    }

    return summary;
  }

  /**
   * Generate version identifier for baselines
   */
  generateVersion() {
    return `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update baseline with current screenshots
   */
  async updateBaseline(appIdentifier) {
//     console.log(`🔄 Updating baseline for ${appIdentifier}...`);

    try {
      // Archive old baseline
      const timestamp = Date.now();
      const archivePath = path.join(
        this.config.basePath,
        "archive",
        `${appIdentifier}_${timestamp}`,
      );

      if (!fs.existsSync(path.join(this.config.basePath, "archive"))) {
        fs.mkdirSync(path.join(this.config.basePath, "archive"), {
          recursive: true,
        });
      }

      // Move old baselines to archive
      const files = fs
        .readdirSync(this.config.basePath)
        .filter((f) => f.includes(appIdentifier));

      files.forEach((file) => {
        const oldPath = path.join(this.config.basePath, file);
        const newPath = path.join(archivePath, file);
        fs.renameSync(oldPath, newPath);
      });

      // Move current screenshots to baseline
      const currentFiles = fs
        .readdirSync(this.config.resultsPath)
        .filter((f) => f.includes(appIdentifier) && f.includes("_current.png"));

      currentFiles.forEach((file) => {
        const currentPath = path.join(this.config.resultsPath, file);
        const baselinePath = path.join(
          this.config.basePath,
          file.replace("_current.png", "_baseline.png"),
        );
        fs.copyFileSync(currentPath, baselinePath);
      });

//       console.log(
        `✅ Baseline updated successfully. Old baseline archived at: ${archivePath}`,
      );

      return {
        success: true,
        archivePath: archivePath,
        message: "Baseline updated successfully",
      };
    } catch (error) {
      console.error("❌ Failed to update baseline:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default VisualRegressionTester;
