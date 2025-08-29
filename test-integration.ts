/**
 * Integration Test Suite for Abba AI Builder
 * Tests the complete system to verify 95% success rate
 */

import DyadOrchestrator from './src/services/enhanced/orchestrator';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

// Load environment variables
dotenv.config();

interface TestCase {
  name: string;
  request: string;
  type: 'web' | 'desktop' | 'mobile' | 'extension';
  expectedSuccess: boolean;
  complexity: 'simple' | 'medium' | 'complex';
}

const testCases: TestCase[] = [
  // Simple tests
  {
    name: 'Simple HTML Page',
    request: 'Create a simple HTML page with a heading and paragraph',
    type: 'web',
    expectedSuccess: true,
    complexity: 'simple'
  },
  {
    name: 'React Button Component',
    request: 'Create a React button component with click handler',
    type: 'web',
    expectedSuccess: true,
    complexity: 'simple'
  },
  {
    name: 'Contact Form',
    request: 'Create a contact form with name, email, and message fields',
    type: 'web',
    expectedSuccess: true,
    complexity: 'simple'
  },
  
  // Medium complexity tests
  {
    name: 'Todo List App',
    request: 'Create a todo list app with add, delete, and mark complete functionality',
    type: 'web',
    expectedSuccess: true,
    complexity: 'medium'
  },
  {
    name: 'Weather Widget',
    request: 'Create a weather widget that displays current temperature and conditions',
    type: 'web',
    expectedSuccess: true,
    complexity: 'medium'
  },
  {
    name: 'Login System',
    request: 'Create a login form with validation and error handling',
    type: 'web',
    expectedSuccess: true,
    complexity: 'medium'
  },
  
  // Complex tests
  {
    name: 'Dashboard with Charts',
    request: 'Create an admin dashboard with charts and data tables',
    type: 'web',
    expectedSuccess: true,
    complexity: 'complex'
  },
  {
    name: 'E-commerce Product Page',
    request: 'Create an e-commerce product page with image gallery and add to cart',
    type: 'web',
    expectedSuccess: true,
    complexity: 'complex'
  },
  {
    name: 'Electron Desktop App',
    request: 'Create a simple Electron desktop app with a main window',
    type: 'desktop',
    expectedSuccess: true,
    complexity: 'medium'
  },
  {
    name: 'Real-time Chat Interface',
    request: 'Create a real-time chat interface with message history',
    type: 'web',
    expectedSuccess: true,
    complexity: 'complex'
  }
];

async function runIntegrationTests() {
  console.log('🚀 Abba AI Builder Integration Test Suite');
  console.log('=========================================\n');
  
  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  WARNING: ANTHROPIC_API_KEY not set in .env');
    console.warn('⚠️  Tests will run in fallback mode with limited functionality\n');
  }
  
  // Initialize orchestrator
  const orchestrator = new DyadOrchestrator(process.env.ANTHROPIC_API_KEY);
  
  // Create output directory for test results
  const outputDir = path.join(process.cwd(), 'test-results', new Date().toISOString().replace(/:/g, '-'));
  await fs.ensureDir(outputDir);
  
  // Test results tracking
  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    errors: [] as any[],
    successRate: 0,
    byComplexity: {
      simple: { total: 0, passed: 0 },
      medium: { total: 0, passed: 0 },
      complex: { total: 0, passed: 0 }
    },
    executionTime: 0
  };
  
  const startTime = Date.now();
  
  // Run tests
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 Test ${i + 1}/${testCases.length}: ${testCase.name}`);
    console.log(`   Request: "${testCase.request.substring(0, 50)}..."`);
    console.log(`   Type: ${testCase.type} | Complexity: ${testCase.complexity}`);
    
    results.byComplexity[testCase.complexity].total++;
    
    try {
      const result = await orchestrator.generateCode({
        request: testCase.request,
        type: testCase.type,
        projectPath: process.cwd()
      });
      
      if (result.success) {
        console.log(`   ✅ PASSED - Code generated successfully`);
        results.passed++;
        results.byComplexity[testCase.complexity].passed++;
        
        // Save generated code
        const filename = `test-${i + 1}-${testCase.name.replace(/\s+/g, '-').toLowerCase()}.${getFileExtension(testCase.type)}`;
        await fs.writeFile(
          path.join(outputDir, filename),
          result.code || 'No code generated',
          'utf-8'
        );
        
        // Log validation results if available
        if (result.validation) {
          console.log(`   📊 Validation: ${result.validation.success ? 'Valid' : 'Invalid'}`);
          if (result.validation.warnings) {
            console.log(`   ⚠️  Warnings: ${result.validation.warnings.join(', ')}`);
          }
        }
      } else {
        console.log(`   ❌ FAILED - ${result.error || 'Unknown error'}`);
        results.failed++;
        results.errors.push({
          test: testCase.name,
          error: result.error
        });
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR - ${error.message}`);
      results.failed++;
      results.errors.push({
        test: testCase.name,
        error: error.message
      });
    }
  }
  
  results.executionTime = Date.now() - startTime;
  results.successRate = (results.passed / results.total) * 100;
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n🎯 Overall Success Rate: ${results.successRate.toFixed(1)}%`);
  console.log(`   Target: 95% | ${results.successRate >= 95 ? '✅ ACHIEVED' : '❌ NOT MET'}`);
  
  console.log(`\n📈 Results by Complexity:`);
  Object.entries(results.byComplexity).forEach(([complexity, stats]) => {
    const rate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(1) : '0.0';
    console.log(`   ${complexity}: ${stats.passed}/${stats.total} (${rate}%)`);
  });
  
  console.log(`\n⏱️  Execution Time: ${(results.executionTime / 1000).toFixed(1)}s`);
  console.log(`   Average per test: ${(results.executionTime / results.total / 1000).toFixed(1)}s`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    results.errors.forEach(err => {
      console.log(`   - ${err.test}: ${err.error}`);
    });
  }
  
  // Save results to file
  const resultsFile = path.join(outputDir, 'test-results.json');
  await fs.writeJson(resultsFile, results, { spaces: 2 });
  console.log(`\n💾 Results saved to: ${resultsFile}`);
  
  // Get metrics from orchestrator
  const metrics = await orchestrator.getSuccessMetrics();
  console.log('\n📊 Orchestrator Metrics:');
  console.log(JSON.stringify(metrics, null, 2));
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (results.successRate >= 95) {
    console.log('🎉 SUCCESS! Abba AI Builder achieved 95% success rate!');
  } else if (results.successRate >= 85) {
    console.log('✨ GOOD! Close to target, minor improvements needed.');
  } else if (results.successRate >= 70) {
    console.log('⚠️  NEEDS WORK! Significant improvements required.');
  } else {
    console.log('❌ CRITICAL! Major issues need to be addressed.');
  }
  console.log('='.repeat(60));
  
  // Exit with appropriate code
  process.exit(results.successRate >= 95 ? 0 : 1);
}

function getFileExtension(type: string): string {
  switch (type) {
    case 'desktop':
      return 'js';
    case 'mobile':
      return 'jsx';
    case 'extension':
      return 'js';
    default:
      return 'html';
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('Fatal error during testing:', error);
    process.exit(1);
  });
}

export default runIntegrationTests;
