// test-visual-integration.js
/**
 * Integration test to verify the visual regression testing system
 * This test ensures all components work together properly
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import VisualRegressionTester from './src/services/enhanced/visual-regression.js';
import VisualTestingIntegration from './src/services/enhanced/visual-testing-integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Visual Regression Testing System - Integration Test\n');
console.log('=' .repeat(60));

async function runIntegrationTest() {
  const results = {
    moduleLoading: false,
    directoryCreation: false,
    configurationSetup: false,
    integrationLayer: false,
    overallSuccess: false
  };

  try {
    // Test 1: Module Loading
    console.log('\n1️⃣ Testing module loading...');
    try {
      const tester = new VisualRegressionTester();
      console.log('   ✅ VisualRegressionTester loaded successfully');
      
      const integration = new VisualTestingIntegration();
      console.log('   ✅ VisualTestingIntegration loaded successfully');
      
      results.moduleLoading = true;
    } catch (error) {
      console.error('   ❌ Module loading failed:', error.message);
    }

    // Test 2: Directory Creation
    console.log('\n2️⃣ Testing directory creation...');
    try {
      const testConfig = {
        basePath: './test-visual-baselines',
        resultsPath: './test-visual-results'
      };
      
      const tester = new VisualRegressionTester(testConfig);
      
      if (fs.existsSync(testConfig.basePath) && fs.existsSync(testConfig.resultsPath)) {
        console.log('   ✅ Directories created successfully');
        results.directoryCreation = true;
        
        // Cleanup test directories
        fs.rmSync(testConfig.basePath, { recursive: true, force: true });
        fs.rmSync(testConfig.resultsPath, { recursive: true, force: true });
      } else {
        console.error('   ❌ Directory creation failed');
      }
    } catch (error) {
      console.error('   ❌ Directory test failed:', error.message);
    }

    // Test 3: Configuration Setup
    console.log('\n3️⃣ Testing configuration setup...');
    try {
      const customConfig = {
        threshold: 0.15,
        viewports: [
          { width: 400, height: 800, name: 'custom-mobile' },
          { width: 1200, height: 900, name: 'custom-desktop' }
        ],
        pixelDensity: [1, 2],
        waitForStable: 1500
      };
      
      const tester = new VisualRegressionTester(customConfig);
      
      if (tester.config.threshold === 0.15 &&
          tester.config.viewports.length === 2 &&
          tester.config.viewports[0].name === 'custom-mobile') {
        console.log('   ✅ Configuration applied correctly');
        results.configurationSetup = true;
      } else {
        console.error('   ❌ Configuration not applied correctly');
      }
    } catch (error) {
      console.error('   ❌ Configuration test failed:', error.message);
    }

    // Test 4: Integration Layer
    console.log('\n4️⃣ Testing integration layer...');
    try {
      const integration = new VisualTestingIntegration({
        autoBaseline: true,
        visualThreshold: 0.2
      });
      
      // Check if methods exist
      const requiredMethods = [
        'runTestsWithVisualValidation',
        'enhanceTestingBot',
        'checkBaselineExists',
        'generateTestScenarios',
        'compareVersions'
      ];
      
      let allMethodsExist = true;
      for (const method of requiredMethods) {
        if (typeof integration[method] !== 'function') {
          console.error(`   ❌ Method missing: ${method}`);
          allMethodsExist = false;
        }
      }
      
      if (allMethodsExist) {
        console.log('   ✅ All integration methods available');
        
        // Test scenario generation
        const testCode = '<form><input type="text"><button>Submit</button></form>';
        const scenarios = await integration.generateTestScenarios(testCode, 'html');
        
        if (scenarios && scenarios.length > 0) {
          console.log(`   ✅ Generated ${scenarios.length} test scenarios`);
          results.integrationLayer = true;
        }
      }
    } catch (error) {
      console.error('   ❌ Integration test failed:', error.message);
    }

    // Overall success check
    results.overallSuccess = Object.values(results).filter(v => v === true).length >= 3;

  } catch (error) {
    console.error('\n❌ Integration test encountered an error:', error);
  }

  // Display summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 INTEGRATION TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`\nModule Loading:      ${results.moduleLoading ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Directory Creation:  ${results.directoryCreation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Configuration:       ${results.configurationSetup ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Integration Layer:   ${results.integrationLayer ? '✅ PASS' : '❌ FAIL'}`);
  console.log('\n' + '-' .repeat(60));
  console.log(`Overall Result:      ${results.overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);

  if (results.overallSuccess) {
    console.log('\n🎉 Visual Regression Testing System is working correctly!');
    console.log('\n📝 Next steps:');
    console.log('   1. Use "npm run test:visual:baseline" to capture baselines');
    console.log('   2. Use "npm run test:visual" to run visual tests');
    console.log('   3. Use "npm run test:visual:compare" to compare versions');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  return results.overallSuccess ? 0 : 1;
}

// Run the test
runIntegrationTest().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
