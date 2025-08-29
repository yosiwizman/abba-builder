/**
 * Test script to verify Claude result processing fix
 */

import DyadOrchestrator from './src/services/enhanced/orchestrator';
import { getMetricsTracker } from './src/services/enhanced/metrics-tracker';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testClaudeFix() {
  console.log('\n🧪 Testing Claude Result Processing Fix\n');
  
  // Check API key
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  console.log(`📝 API Key Status: ${hasApiKey ? '✅ Configured' : '⚠️ Not configured (will use fallback)'}\n`);
  
  // Initialize services
  const orchestrator = new DyadOrchestrator(process.env.ANTHROPIC_API_KEY);
  const metrics = getMetricsTracker();
  
  // Test case: Simple request that should trigger validation and refinement
  const testRequest = {
    request: 'Create a function that adds two numbers and returns the result',
    type: 'web' as const,
    projectPath: process.cwd()
  };
  
  console.log('📊 Before Test:');
  const beforeSummary = metrics.getSummary(1); // Last hour
  console.log(`   Total: ${beforeSummary.total} | Real Claude: ${beforeSummary.realClaudeCount} | Fallback: ${beforeSummary.fallbackCount}\n`);
  
  console.log('🚀 Running generation test...');
  console.log(`   Request: "${testRequest.request}"\n`);
  
  try {
    const startTime = Date.now();
    const result = await orchestrator.generateCode(testRequest);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Generation completed:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Generation Type: ${result.generationType || 'UNDEFINED'} ${result.generationType === undefined ? '❌ BUG!' : '✅'}`);
    console.log(`   Model Used: ${result.modelUsed || 'none'}`);
    console.log(`   Iterations: ${result.iterations || 1}`);
    
    if (result.code) {
      console.log(`   Code Length: ${result.code.length} chars`);
      console.log(`   Code Preview: ${result.code.substring(0, 100)}...`);
    }
    
    if (result.validation) {
      console.log(`   Validation: ${result.validation.success ? '✅ Passed' : '❌ Failed'}`);
      if (result.validation.error) {
        console.log(`   Validation Error: ${result.validation.error}`);
      }
    }
    
    // Check metrics
    console.log('\n📊 After Test:');
    const afterSummary = metrics.getSummary(1);
    console.log(`   Total: ${afterSummary.total} | Real Claude: ${afterSummary.realClaudeCount} | Fallback: ${afterSummary.fallbackCount}`);
    
    const newReal = afterSummary.realClaudeCount - beforeSummary.realClaudeCount;
    const newFallback = afterSummary.fallbackCount - beforeSummary.fallbackCount;
    
    console.log(`\n🎯 Test Result Analysis:`);
    
    if (result.generationType === 'real_claude' && newReal > 0) {
      console.log(`   ✅ SUCCESS: Claude generation properly recorded!`);
      console.log(`   New real Claude generations: ${newReal}`);
    } else if (result.generationType === 'fallback_template' && newFallback > 0) {
      console.log(`   ✅ Fallback properly recorded`);
    } else if (result.generationType === undefined) {
      console.log(`   ❌ BUG STILL EXISTS: generationType is undefined!`);
      console.log(`   The fix may not have been applied correctly.`);
    } else {
      console.log(`   ⚠️ Unexpected state:`);
      console.log(`   Result type: ${result.generationType}`);
      console.log(`   New real: ${newReal}, New fallback: ${newFallback}`);
    }
    
    // Print detailed analysis
    const analysis = metrics.getDetailedAnalysis(1);
    console.log(`\n📈 Detailed Metrics:`);
    console.log(`   Real Claude Success Rate: ${analysis.realClaudeSuccessRate.toFixed(1)}%`);
    console.log(`   Fallback Rate: ${analysis.fallbackRate.toFixed(1)}%`);
    console.log(`   Average Duration: ${(analysis.averageDuration / 1000).toFixed(2)}s`);
    if (analysis.bestModel) {
      console.log(`   Best Model: ${analysis.bestModel}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
  
  // Clean up
  metrics.flush();
  metrics.destroy();
  
  console.log('\n✅ Test complete!\n');
  process.exit(0);
}

// Run the test
testClaudeFix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
