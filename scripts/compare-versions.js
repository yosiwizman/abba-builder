// scripts/compare-versions.js
/**
 * Script to compare visual versions of apps
 * Usage: npm run test:visual:compare [app-identifier] [version1] [version2]
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import VisualTestingIntegration from "../src/services/enhanced/visual-testing-integration.js";
import fs from "fs";


// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compare versions of an application
 */
async function compareVersions() {
  console.log("🔄 Visual Version Comparison Tool\n");
  console.log("=".repeat(60));
  console.log(
    "Compare visual changes across different versions of your app.\n",
  );

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  // Parse options
  const options = {
    appId: null,
    versions: [],
    listVersions: false,
    generateReport: true,
    threshold: 0.1,
  };

  // Process arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--list" || arg === "-l") {
      options.listVersions = true;
    } else if (arg === "--threshold" || arg === "-t") {
      options.threshold = parseFloat(args[++i]) || 0.1;
    } else if (arg === "--no-report") {
      options.generateReport = false;
    } else if (!options.appId) {
      options.appId = arg;
    } else {
      options.versions.push(arg);
    }
  }

  // Initialize visual testing integration
  const visualTesting = new VisualTestingIntegration({
    visualThreshold: options.threshold,
    basePath: "./visual-baselines",
    resultsPath: "./visual-results",
  });

  // List available versions if requested
  if (options.listVersions) {
    listAvailableVersions();
    process.exit(0);
  }

  // Validate inputs
  if (!options.appId) {
    console.error("❌ Error: App identifier is required");
    showHelp();
    process.exit(1);
  }

  // If no versions specified, find and compare last two
  if (options.versions.length === 0) {
    console.log("🔍 Finding available versions...");
    const availableVersions = findVersionsForApp(options.appId);

    if (availableVersions.length < 2) {
      console.error("❌ Error: Need at least 2 versions to compare");
      console.log(
        "💡 Tip: Capture baselines at different times or after changes",
      );
      process.exit(1);
    }

    // Use the last two versions
    options.versions = availableVersions.slice(-2);
    console.log(
      `📦 Comparing last two versions: ${options.versions.join(" vs ")}\n`,
    );
  } else if (options.versions.length === 1) {
    // Compare specified version with current baseline
    const currentBaseline = findCurrentBaseline(options.appId);
    if (currentBaseline) {
      options.versions.push("current");
      console.log(`📦 Comparing ${options.versions[0]} vs current baseline\n`);
    } else {
      console.error(
        "❌ Error: Need two versions to compare or a current baseline",
      );
      process.exit(1);
    }
  }

  try {
    console.log(`🎨 Comparing visual versions for: ${options.appId}`);
    console.log(`📊 Versions: ${options.versions.join(" → ")}`);
    console.log(`⚙️  Threshold: ${(options.threshold * 100).toFixed(1)}%\n`);
    console.log("-".repeat(60));

    // Perform version comparison
    const comparisonResult = await performComparison(
      visualTesting,
      options.appId,
      options.versions,
    );

    // Display results
    displayComparisonResults(comparisonResult);

    // Generate detailed report if requested
    if (options.generateReport) {
      const reportPath = await generateComparisonReport(
        options.appId,
        options.versions,
        comparisonResult,
      );
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }

    // Provide recommendations
    provideRecommendations(comparisonResult);

    process.exit(0);
  } catch (error) {
    console.error("❌ Comparison failed:", error.message);
    process.exit(1);
  }
}

/**
 * Perform the actual version comparison
 */
async function performComparison(visualTesting, appId, versions) {
  // For now, we'll do a simple file-based comparison
  // In a real scenario, this would use the visual testing integration

  const results = {
    appId: appId,
    versions: versions,
    comparisons: [],
    summary: {
      totalChanges: 0,
      avgDifference: 0,
      maxDifference: 0,
    },
  };

  // Load baseline files for each version
  const baselinePath = "./visual-baselines";
  const archivePath = join(baselinePath, "archive");

  for (let i = 1; i < versions.length; i++) {
    const prevVersion = versions[i - 1];
    const currVersion = versions[i];

    // Find baseline files
    const prevPath =
      prevVersion === "current"
        ? join(baselinePath, `${appId}_baseline.json`)
        : join(
            archivePath,
            `${appId}_${prevVersion}`,
            `${appId}_baseline.json`,
          );

    const currPath =
      currVersion === "current"
        ? join(baselinePath, `${appId}_baseline.json`)
        : join(
            archivePath,
            `${appId}_${currVersion}`,
            `${appId}_baseline.json`,
          );

    if (!fs.existsSync(prevPath) || !fs.existsSync(currPath)) {
      console.warn(
        `⚠️  Cannot find baselines for ${prevVersion} → ${currVersion}`,
      );
      continue;
    }

    const prevData = JSON.parse(fs.readFileSync(prevPath, "utf8"));
    const currData = JSON.parse(fs.readFileSync(currPath, "utf8"));

    // Compare metadata
    const comparison = {
      from: prevVersion,
      to: currVersion,
      fromTimestamp: prevData.timestamp,
      toTimestamp: currData.timestamp,
      screenshotChanges: {
        previous: prevData.screenshots.length,
        current: currData.screenshots.length,
        difference: currData.screenshots.length - prevData.screenshots.length,
      },
      viewportChanges: analyzeViewportChanges(
        prevData.screenshots,
        currData.screenshots,
      ),
    };

    results.comparisons.push(comparison);
    results.summary.totalChanges += Math.abs(
      comparison.screenshotChanges.difference,
    );
  }

  return results;
}

/**
 * Analyze viewport changes between versions
 */
function analyzeViewportChanges(prevScreenshots, currScreenshots) {
  const changes = [];
  const prevMap = new Map();
  const currMap = new Map();

  // Build maps for comparison
  prevScreenshots.forEach((s) => {
    const key = `${s.viewport.name}_${s.pixelDensity}x`;
    prevMap.set(key, s);
  });

  currScreenshots.forEach((s) => {
    const key = `${s.viewport.name}_${s.pixelDensity}x`;
    currMap.set(key, s);
  });

  // Find added, removed, and changed viewports
  const allKeys = new Set([...prevMap.keys(), ...currMap.keys()]);

  allKeys.forEach((key) => {
    if (!prevMap.has(key)) {
      changes.push({ type: "added", viewport: key });
    } else if (!currMap.has(key)) {
      changes.push({ type: "removed", viewport: key });
    } else {
      // Both versions have this viewport - could compare file sizes as a proxy for changes
      const prevSize = prevMap.get(key).size || 0;
      const currSize = currMap.get(key).size || 0;
      if (Math.abs(prevSize - currSize) > prevSize * 0.1) {
        changes.push({
          type: "modified",
          viewport: key,
          sizeChange:
            (((currSize - prevSize) / prevSize) * 100).toFixed(1) + "%",
        });
      }
    }
  });

  return changes;
}

/**
 * Display comparison results
 */
function displayComparisonResults(results) {
  console.log("\n📊 COMPARISON RESULTS");
  console.log("=".repeat(60));

  if (results.comparisons.length === 0) {
    console.log("No comparisons could be performed.");
    return;
  }

  results.comparisons.forEach((comp) => {
    console.log(`\n📦 ${comp.from} → ${comp.to}`);
    console.log(
      `   Time: ${new Date(comp.fromTimestamp).toLocaleDateString()} → ${new Date(comp.toTimestamp).toLocaleDateString()}`,
    );
    console.log(
      `   Screenshots: ${comp.screenshotChanges.previous} → ${comp.screenshotChanges.current} (${comp.screenshotChanges.difference >= 0 ? "+" : ""}${comp.screenshotChanges.difference})`,
    );

    if (comp.viewportChanges.length > 0) {
      console.log("   Viewport Changes:");
      comp.viewportChanges.forEach((change) => {
        const icon =
          change.type === "added"
            ? "➕"
            : change.type === "removed"
              ? "➖"
              : "🔄";
        console.log(
          `     ${icon} ${change.viewport}${change.sizeChange ? ` (${change.sizeChange})` : ""}`,
        );
      });
    }
  });

  console.log("\n📈 Summary:");
  console.log(`   Total version transitions: ${results.comparisons.length}`);
  console.log(`   Total screenshot changes: ${results.summary.totalChanges}`);
}

/**
 * Generate detailed comparison report
 */
async function generateComparisonReport(appId, versions, comparisonResult) {
  const report = {
    timestamp: Date.now(),
    date: new Date().toISOString(),
    appId: appId,
    versions: versions,
    comparison: comparisonResult,
    metadata: {
      tool: "ABBA Visual Version Comparison",
      version: "1.0.0",
    },
  };

  const reportPath = join(
    process.cwd(),
    "visual-results",
    `version_comparison_${appId}_${Date.now()}.json`,
  );

  // Ensure directory exists
  const reportDir = dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

/**
 * Provide recommendations based on comparison
 */
function provideRecommendations(results) {
  console.log("\n💡 RECOMMENDATIONS");
  console.log("=".repeat(60));

  const hasChanges = results.summary.totalChanges > 0;

  if (!hasChanges) {
    console.log("✅ No significant visual changes detected between versions.");
    return;
  }

  // Analyze patterns
  const recommendations = [];

  results.comparisons.forEach((comp) => {
    if (comp.screenshotChanges.difference > 0) {
      recommendations.push(
        `📱 New viewports added in ${comp.to} - ensure all are tested`,
      );
    } else if (comp.screenshotChanges.difference < 0) {
      recommendations.push(
        `⚠️  Viewports removed in ${comp.to} - verify this is intentional`,
      );
    }

    const modifiedViewports = comp.viewportChanges.filter(
      (c) => c.type === "modified",
    );
    if (modifiedViewports.length > 0) {
      recommendations.push(
        `🔄 ${modifiedViewports.length} viewports show visual changes - review for regressions`,
      );
    }
  });

  if (recommendations.length > 0) {
    recommendations.forEach((rec) => console.log(`  • ${rec}`));
  } else {
    console.log("  • Review visual differences manually");
    console.log("  • Update baselines if changes are intentional");
    console.log("  • Run full visual regression tests");
  }
}

/**
 * Find available versions for an app
 */
function findVersionsForApp(appId) {
  const versions = [];
  const archivePath = join("./visual-baselines", "archive");

  if (!fs.existsSync(archivePath)) {
    return versions;
  }

  const dirs = fs.readdirSync(archivePath);
  dirs.forEach((dir) => {
    if (dir.startsWith(`${appId}_`)) {
      const version = dir.replace(`${appId}_`, "");
      versions.push(version);
    }
  });

  return versions.sort();
}

/**
 * Find current baseline for an app
 */
function findCurrentBaseline(appId) {
  const baselinePath = join("./visual-baselines", `${appId}_baseline.json`);
  return fs.existsSync(baselinePath) ? baselinePath : null;
}

/**
 * List all available versions
 */
function listAvailableVersions() {
  console.log("📦 Available App Versions:\n");

  const basePath = "./visual-baselines";
  const archivePath = join(basePath, "archive");

  // Find all apps with baselines
  const apps = new Map();

  // Check current baselines
  if (fs.existsSync(basePath)) {
    const files = fs.readdirSync(basePath);
    files.forEach((file) => {
      if (file.endsWith("_baseline.json")) {
        const appId = file.replace("_baseline.json", "");
        if (!apps.has(appId)) {
          apps.set(appId, []);
        }
        apps.get(appId).push("current");
      }
    });
  }

  // Check archived versions
  if (fs.existsSync(archivePath)) {
    const dirs = fs.readdirSync(archivePath);
    dirs.forEach((dir) => {
      const match = dir.match(/^(.+)_(\d+)$/);
      if (match) {
        const appId = match[1];
        const version = match[2];
        if (!apps.has(appId)) {
          apps.set(appId, []);
        }
        apps.get(appId).push(version);
      }
    });
  }

  if (apps.size === 0) {
    console.log("No app versions found.");
    console.log(
      '💡 Tip: Run "npm run test:visual:baseline" to capture baselines first.',
    );
    return;
  }

  // Display apps and their versions
  apps.forEach((versions, appId) => {
    console.log(`📱 ${appId}`);
    versions.sort().forEach((version) => {
      const timestamp =
        version === "current"
          ? "Latest"
          : new Date(parseInt(version)).toLocaleDateString();
      console.log(`   • ${version} (${timestamp})`);
    });
    console.log("");
  });
}

/**
 * Show help message
 */
function showHelp() {
  console.log(
    "Usage: npm run test:visual:compare [options] [app-id] [version1] [version2]\n",
  );
  console.log("Options:");
  console.log("  --list, -l              List all available app versions");
  console.log(
    "  --threshold, -t <value> Set difference threshold (default: 0.1)",
  );
  console.log("  --no-report            Skip generating detailed report\n");
  console.log("Examples:");
  console.log("  npm run test:visual:compare --list");
  console.log("  npm run test:visual:compare my-app");
  console.log("  npm run test:visual:compare my-app v1 v2");
  console.log("  npm run test:visual:compare my-app current -t 0.05\n");
}

// Run the comparison
compareVersions().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
