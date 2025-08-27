// scripts/capture-baselines.js
/**
 * Script to capture visual baselines for apps
 * Usage: npm run test:visual:baseline [app-path-or-url]
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import VisualRegressionTester from '../src/services/enhanced/visual-regression.js';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Capture baselines for specified apps
 */
async function captureBaselines() {
  console.log('📸 Visual Baseline Capture Tool\n');
  console.log('=' .repeat(60));
  console.log('This tool will capture baseline screenshots for visual regression testing.\n');

  // Initialize visual tester
  const visualTester = new VisualRegressionTester({
    threshold: 0.1,
    outputDiff: true,
    basePath: './visual-baselines',
    resultsPath: './visual-results',
    viewports: [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1440, height: 900, name: 'laptop' }
    ],
    pixelDensity: [1, 2], // Regular and retina
    waitForStable: 2000
  });

  // Get targets from command line
  const targets = process.argv.slice(2);
  
  if (targets.length === 0) {
    console.log('⚠️  No targets specified. Usage: npm run test:visual:baseline [path-or-url]\n');
    console.log('Examples:');
    console.log('  npm run test:visual:baseline ./temp-apps/my-app');
    console.log('  npm run test:visual:baseline http://localhost:3000');
    console.log('  npm run test:visual:baseline ./examples/dashboard ./examples/form\n');
    process.exit(1);
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  // Process each target
  for (const target of targets) {
    console.log(`\n📱 Processing: ${target}`);
    console.log('-'.repeat(40));

    try {
      // Check if URL or local path
      const isUrl = target.startsWith('http://') || target.startsWith('https://');
      let appUrl = isUrl ? target : null;
      let appPath = !isUrl ? target : null;
      let server = null;

      // Verify local path exists
      if (appPath && !fs.existsSync(appPath)) {
        throw new Error(`Path does not exist: ${appPath}`);
      }

      // Start server for local files
      if (appPath) {
        const express = await import('express');
        const app = express.default();
        const port = 3000 + Math.floor(Math.random() * 1000);
        
        app.use(express.default.static(appPath));
        server = await new Promise((resolve) => {
          const s = app.listen(port, () => {
            console.log(`🌐 Local server started at http://localhost:${port}`);
            resolve(s);
          });
        });
        appUrl = `http://localhost:${port}`;
      }

      // Launch browser
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: process.env.HEADLESS !== 'false',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Generate app identifier
      const appIdentifier = target
        .replace(/^\.\//, '')
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 50);

      // Define test scenarios based on app type
      const testScenarios = [
        {
          name: 'initial_state',
          description: 'Initial page load state',
          actions: [
            { type: 'wait', duration: 2000 }
          ]
        },
        {
          name: 'scrolled_mid',
          description: 'Page scrolled to middle',
          actions: [
            { type: 'scroll', position: 500 },
            { type: 'wait', duration: 1000 }
          ]
        },
        {
          name: 'scrolled_bottom',
          description: 'Page scrolled to bottom',
          actions: [
            { type: 'scroll', position: 9999 },
            { type: 'wait', duration: 1000 }
          ]
        }
      ];

      // Add interactive scenarios if elements exist
      await page.goto(appUrl, { waitUntil: 'networkidle' });
      
      const hasButtons = await page.$$eval('button', buttons => buttons.length > 0);
      const hasForms = await page.$$eval('form', forms => forms.length > 0);
      const hasInputs = await page.$$eval('input', inputs => inputs.length > 0);

      if (hasButtons) {
        testScenarios.push({
          name: 'button_hover',
          description: 'Button hover state',
          actions: [
            { type: 'hover', selector: 'button:first-of-type' },
            { type: 'wait', duration: 500 }
          ]
        });
      }

      if (hasForms && hasInputs) {
        testScenarios.push({
          name: 'form_focused',
          description: 'Form input focused',
          actions: [
            { type: 'click', selector: 'input:first-of-type' },
            { type: 'wait', duration: 500 }
          ]
        });
      }

      // Capture baselines
      console.log(`📸 Capturing baselines for ${appIdentifier}...`);
      const baselineResult = await visualTester.captureBaseline(
        page,
        appIdentifier,
        testScenarios
      );

      if (baselineResult.success) {
        successCount++;
        console.log(`✅ Successfully captured ${baselineResult.totalScreenshots} screenshots`);
        console.log(`📁 Baselines saved to: ./visual-baselines/`);
        
        // List captured viewports
        console.log('\n  Captured viewports:');
        const viewportCounts = {};
        baselineResult.baseline.screenshots.forEach(screenshot => {
          const key = `${screenshot.viewport.name} @ ${screenshot.pixelDensity}x`;
          viewportCounts[key] = (viewportCounts[key] || 0) + 1;
        });
        
        Object.entries(viewportCounts).forEach(([viewport, count]) => {
          console.log(`    - ${viewport}: ${count} screenshot(s)`);
        });

        // List scenario screenshots if any
        if (baselineResult.baseline.scenarioScreenshots?.length > 0) {
          console.log('\n  Captured scenarios:');
          baselineResult.baseline.scenarioScreenshots.forEach(scenario => {
            console.log(`    - ${scenario.scenario}`);
          });
        }
        
        results.push({
          target: target,
          identifier: appIdentifier,
          success: true,
          screenshots: baselineResult.totalScreenshots,
          result: baselineResult
        });
      } else {
        failCount++;
        console.error(`❌ Failed to capture baseline: ${baselineResult.error}`);
        results.push({
          target: target,
          identifier: appIdentifier,
          success: false,
          error: baselineResult.error
        });
      }

      // Cleanup
      await browser.close();
      if (server) {
        server.close();
        console.log('🛑 Local server stopped');
      }

    } catch (error) {
      failCount++;
      console.error(`❌ Error processing ${target}:`, error.message);
      results.push({
        target: target,
        success: false,
        error: error.message
      });
    }
  }

  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BASELINE CAPTURE SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nTotal Targets: ${targets.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  // Show results table
  console.log('\n📋 Detailed Results:');
  console.log('-'.repeat(60));
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const info = result.success 
      ? `${result.screenshots} screenshots captured`
      : `Error: ${result.error}`;
    console.log(`${status} ${result.target}`);
    console.log(`   ID: ${result.identifier || 'N/A'}`);
    console.log(`   ${info}`);
  });

  // Save summary report
  const reportPath = join(process.cwd(), 'visual-baselines', 'baseline_capture_report.json');
  const report = {
    timestamp: Date.now(),
    date: new Date().toISOString(),
    summary: {
      total: targets.length,
      successful: successCount,
      failed: failCount
    },
    results: results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Instructions for next steps
  console.log('\n💡 Next Steps:');
  console.log('1. Review captured baselines in ./visual-baselines/');
  console.log('2. Run visual tests: npm run test:visual');
  console.log('3. View diff images in ./visual-results/ if changes detected');
  
  process.exit(failCount > 0 ? 1 : 0);
}

// Run the capture
captureBaselines().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
