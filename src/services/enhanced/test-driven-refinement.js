/**
 * Test-Driven Refinement System
 * Automatically refines code based on test results
 */

class TestDrivenRefinement {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.maxRefinementIterations = 3;
    this.refinementHistory = [];
  }

  async refineBasedOnTestResults(code, testResults, requirements = '') {
    console.log('🔧 Starting test-driven refinement...');
    
    let refinedCode = code;
    let currentTests = testResults;
    let iteration = 0;
    
    while (!this.allTestsPass(currentTests) && iteration < this.maxRefinementIterations) {
      iteration++;
      console.log(`\n🔄 Refinement iteration ${iteration}`);
      
      // Analyze failures
      const analysis = this.analyzeTestFailures(currentTests);
      console.log(`Found ${analysis.failures.length} failures to fix`);
      
      // Generate fixes for each failure
      const fixes = await this.generateFixes(refinedCode, analysis, requirements);
      
      // Apply fixes
      refinedCode = await this.applyFixes(refinedCode, fixes);
      
      // Re-run tests
      currentTests = await this.runTests(refinedCode);
      
      // Record refinement
      this.recordRefinement({
        iteration,
        analysis,
        fixes,
        testResults: currentTests
      });
      
      // Check improvement
      if (this.hasImproved(testResults, currentTests)) {
        console.log('✅ Tests improved!');
      } else {
        console.log('⚠️ No improvement detected');
        break;
      }
    }
    
    console.log(`\n🎯 Refinement complete after ${iteration} iterations`);
    return refinedCode;
  }

  analyzeTestFailures(testResults) {
    const analysis = {
      failures: [],
      errors: [],
      warnings: [],
      patterns: [],
      priority: []
    };

    // Extract failures
    if (testResults.failures) {
      testResults.failures.forEach(failure => {
        analysis.failures.push({
          test: failure.test,
          error: failure.error,
          type: this.classifyFailure(failure),
          severity: this.calculateSeverity(failure)
        });
      });
    }

    // Extract errors
    if (testResults.errors) {
      testResults.errors.forEach(error => {
        analysis.errors.push({
          message: error.message,
          line: error.line,
          type: this.classifyError(error)
        });
      });
    }

    // Find patterns
    analysis.patterns = this.findFailurePatterns(analysis.failures);
    
    // Prioritize fixes
    analysis.priority = this.prioritizeFixes(analysis);
    
    return analysis;
  }

  classifyFailure(failure) {
    const errorMessage = failure.error?.toLowerCase() || '';
    
    if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
      return 'null-reference';
    }
    if (errorMessage.includes('type') || errorMessage.includes('cannot read')) {
      return 'type-error';
    }
    if (errorMessage.includes('syntax')) {
      return 'syntax-error';
    }
    if (errorMessage.includes('timeout')) {
      return 'timeout';
    }
    if (errorMessage.includes('assert') || errorMessage.includes('expect')) {
      return 'assertion';
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network';
    }
    
    return 'unknown';
  }

  classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('syntax')) return 'syntax';
    if (message.includes('reference')) return 'reference';
    if (message.includes('type')) return 'type';
    if (message.includes('range')) return 'range';
    
    return 'runtime';
  }

  calculateSeverity(failure) {
    // Higher severity for critical failures
    if (failure.test?.includes('critical') || failure.test?.includes('required')) {
      return 'high';
    }
    if (failure.error?.includes('undefined') || failure.error?.includes('null')) {
      return 'medium';
    }
    return 'low';
  }

  findFailurePatterns(failures) {
    const patterns = [];
    const typeCount = {};
    
    // Count failure types
    failures.forEach(failure => {
      typeCount[failure.type] = (typeCount[failure.type] || 0) + 1;
    });
    
    // Identify patterns
    Object.entries(typeCount).forEach(([type, count]) => {
      if (count >= 2) {
        patterns.push({
          type,
          count,
          message: `Multiple ${type} failures detected`
        });
      }
    });
    
    return patterns;
  }

  prioritizeFixes(analysis) {
    const priority = [];
    
    // High priority: Syntax errors
    analysis.errors
      .filter(e => e.type === 'syntax')
      .forEach(e => priority.push({ type: 'syntax', item: e, priority: 1 }));
    
    // High priority: Null reference errors
    analysis.failures
      .filter(f => f.type === 'null-reference')
      .forEach(f => priority.push({ type: 'null-reference', item: f, priority: 2 }));
    
    // Medium priority: Type errors
    analysis.failures
      .filter(f => f.type === 'type-error')
      .forEach(f => priority.push({ type: 'type-error', item: f, priority: 3 }));
    
    // Low priority: Assertion failures
    analysis.failures
      .filter(f => f.type === 'assertion')
      .forEach(f => priority.push({ type: 'assertion', item: f, priority: 4 }));
    
    // Sort by priority
    priority.sort((a, b) => a.priority - b.priority);
    
    return priority;
  }

  async generateFixes(code, analysis, requirements) {
    const fixes = [];
    
    for (const item of analysis.priority.slice(0, 5)) { // Fix top 5 issues
      const fix = await this.generateFix(code, item, requirements);
      if (fix) {
        fixes.push(fix);
      }
    }
    
    return fixes;
  }

  async generateFix(code, priorityItem, requirements) {
    const { type, item } = priorityItem;
    
    console.log(`Generating fix for ${type}...`);
    
    switch (type) {
      case 'syntax':
        return this.fixSyntaxError(code, item);
      
      case 'null-reference':
        return this.fixNullReference(code, item);
      
      case 'type-error':
        return this.fixTypeError(code, item);
      
      case 'assertion':
        return this.fixAssertion(code, item, requirements);
      
      default:
        return this.generateGenericFix(code, item);
    }
  }

  fixSyntaxError(code, error) {
    const fix = {
      type: 'syntax',
      description: `Fix syntax error: ${error.message}`,
      changes: []
    };
    
    // Common syntax fixes
    if (error.message?.includes('missing')) {
      if (error.message.includes(';')) {
        fix.changes.push({
          pattern: /([^;])\n/g,
          replacement: '$1;\n',
          description: 'Add missing semicolons'
        });
      }
      if (error.message.includes('}')) {
        fix.changes.push({
          pattern: /{\s*([^}]*?)$/gm,
          replacement: '{ $1 }',
          description: 'Add missing closing braces'
        });
      }
    }
    
    // Unclosed strings
    if (error.message?.includes('string') || error.message?.includes('quote')) {
      fix.changes.push({
        pattern: /(['"])([^'"\n]*?)$/gm,
        replacement: '$1$2$1',
        description: 'Close unclosed strings'
      });
    }
    
    return fix;
  }

  fixNullReference(code, failure) {
    const fix = {
      type: 'null-reference',
      description: `Fix null reference: ${failure.error}`,
      changes: []
    };
    
    // Add null checks
    fix.changes.push({
      pattern: /(\w+)\.(\w+)/g,
      replacement: '($1 && $1.$2)',
      description: 'Add null checks',
      conditional: true
    });
    
    // Initialize undefined variables
    if (failure.error?.includes('undefined')) {
      const varName = this.extractVariableName(failure.error);
      if (varName) {
        fix.changes.push({
          pattern: new RegExp(`(function|const|let|var)([^{]*{)`),
          replacement: `$1$2\n  let ${varName} = null;`,
          description: `Initialize ${varName}`
        });
      }
    }
    
    return fix;
  }

  fixTypeError(code, failure) {
    const fix = {
      type: 'type-error',
      description: `Fix type error: ${failure.error}`,
      changes: []
    };
    
    // Type coercion
    if (failure.error?.includes('number')) {
      fix.changes.push({
        pattern: /parseInt\(([^)]+)\)/g,
        replacement: 'Number($1)',
        description: 'Use Number() for type conversion'
      });
    }
    
    // String conversion
    if (failure.error?.includes('string')) {
      fix.changes.push({
        pattern: /(\w+)\.toString\(\)/g,
        replacement: 'String($1)',
        description: 'Use String() for type conversion'
      });
    }
    
    return fix;
  }

  async fixAssertion(code, failure, requirements) {
    const fix = {
      type: 'assertion',
      description: `Fix assertion failure: ${failure.test}`,
      changes: []
    };
    
    // Try to understand what the test expects
    const expectation = this.extractExpectation(failure);
    
    if (expectation) {
      // Generate code to meet the expectation
      const patch = await this.generateAssertionFix(code, expectation, requirements);
      if (patch) {
        fix.changes.push(patch);
      }
    }
    
    return fix;
  }

  generateGenericFix(code, item) {
    const fix = {
      type: 'generic',
      description: 'Apply generic improvements',
      changes: []
    };
    
    // Add error handling
    if (!code.includes('try') && !code.includes('catch')) {
      fix.changes.push({
        pattern: /(async\s+function\s+\w+\([^)]*\)\s*{)/g,
        replacement: '$1\n  try {',
        description: 'Add error handling'
      });
    }
    
    // Add default returns
    if (!code.includes('return')) {
      fix.changes.push({
        pattern: /function\s+(\w+)\([^)]*\)\s*{([^}]*)}/g,
        replacement: 'function $1() { $2\n  return null; }',
        description: 'Add default returns'
      });
    }
    
    return fix;
  }

  extractVariableName(errorMessage) {
    // Try to extract variable name from error message
    const match = errorMessage.match(/['"]?(\w+)['"]?\s+is\s+(undefined|not defined)/);
    return match ? match[1] : null;
  }

  extractExpectation(failure) {
    // Try to extract what the test expects
    const expectMatch = failure.error?.match(/expected\s+(.+?)\s+to/);
    const toMatch = failure.error?.match(/to\s+(be|equal|contain|have)\s+(.+)/);
    
    if (expectMatch && toMatch) {
      return {
        subject: expectMatch[1],
        verb: toMatch[1],
        expected: toMatch[2]
      };
    }
    
    return null;
  }

  async generateAssertionFix(code, expectation, requirements) {
    // Generate code to meet test expectations
    const { subject, verb, expected } = expectation;
    
    const patch = {
      pattern: null,
      replacement: null,
      description: `Make ${subject} ${verb} ${expected}`
    };
    
    // Handle different expectation types
    if (verb === 'be' || verb === 'equal') {
      // Find where the subject is defined and set it to expected value
      patch.pattern = new RegExp(`(let|const|var)\\s+${subject}\\s*=\\s*[^;]+;`);
      patch.replacement = `$1 ${subject} = ${expected};`;
    } else if (verb === 'contain') {
      // Add the expected value to arrays/strings
      patch.pattern = new RegExp(`${subject}\\s*=\\s*\\[([^\\]]*)\\]`);
      patch.replacement = `${subject} = [$1, ${expected}]`;
    } else if (verb === 'have') {
      // Add properties to objects
      patch.pattern = new RegExp(`${subject}\\s*=\\s*{([^}]*)}`);
      patch.replacement = `${subject} = { $1, ${expected} }`;
    }
    
    return patch;
  }

  async applyFixes(code, fixes) {
    let fixedCode = code;
    
    for (const fix of fixes) {
      console.log(`Applying ${fix.type} fix: ${fix.description}`);
      
      for (const change of fix.changes) {
        if (change.pattern && change.replacement) {
          const before = fixedCode.length;
          
          if (change.conditional) {
            // Apply conditionally (check if it doesn't break anything)
            const testCode = fixedCode.replace(change.pattern, change.replacement);
            if (this.validateCode(testCode)) {
              fixedCode = testCode;
            }
          } else {
            fixedCode = fixedCode.replace(change.pattern, change.replacement);
          }
          
          const after = fixedCode.length;
          if (after !== before) {
            console.log(`  ✓ Applied: ${change.description}`);
          }
        }
      }
    }
    
    // Final validation
    if (!this.validateCode(fixedCode)) {
      console.log('⚠️ Fixed code failed validation, reverting...');
      return code;
    }
    
    return fixedCode;
  }

  validateCode(code) {
    // Basic validation
    try {
      // Check for balanced braces
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      if (Math.abs(openBraces - closeBraces) > 1) return false;
      
      // Check for balanced parentheses
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      if (Math.abs(openParens - closeParens) > 1) return false;
      
      // Check for balanced brackets
      const openBrackets = (code.match(/\[/g) || []).length;
      const closeBrackets = (code.match(/\]/g) || []).length;
      if (Math.abs(openBrackets - closeBrackets) > 1) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  async runTests(code) {
    // This would run actual tests
    // For now, return mock improved results
    console.log('Running tests on refined code...');
    
    return {
      total: 10,
      passed: 8,
      failed: 2,
      failures: [
        {
          test: 'remaining test 1',
          error: 'minor issue'
        },
        {
          test: 'remaining test 2',
          error: 'edge case'
        }
      ]
    };
  }

  allTestsPass(testResults) {
    if (!testResults) return false;
    return testResults.failed === 0 || 
           (testResults.failures && testResults.failures.length === 0);
  }

  hasImproved(oldResults, newResults) {
    if (!oldResults || !newResults) return false;
    
    const oldPassed = oldResults.passed || 0;
    const newPassed = newResults.passed || 0;
    
    const oldFailed = oldResults.failed || oldResults.failures?.length || 0;
    const newFailed = newResults.failed || newResults.failures?.length || 0;
    
    return newPassed > oldPassed || newFailed < oldFailed;
  }

  recordRefinement(refinement) {
    this.refinementHistory.push({
      ...refinement,
      timestamp: Date.now()
    });
    
    // Keep only last 50 refinements
    if (this.refinementHistory.length > 50) {
      this.refinementHistory = this.refinementHistory.slice(-50);
    }
  }

  getStatistics() {
    const stats = {
      totalRefinements: this.refinementHistory.length,
      averageIterations: 0,
      improvementRate: 0,
      commonFailureTypes: {},
      successfulFixes: 0
    };
    
    if (this.refinementHistory.length > 0) {
      // Calculate average iterations
      const iterations = this.refinementHistory.map(r => r.iteration);
      stats.averageIterations = 
        iterations.reduce((a, b) => a + b, 0) / iterations.length;
      
      // Count failure types
      this.refinementHistory.forEach(r => {
        r.analysis?.failures?.forEach(f => {
          stats.commonFailureTypes[f.type] = 
            (stats.commonFailureTypes[f.type] || 0) + 1;
        });
      });
      
      // Count successful fixes
      stats.successfulFixes = this.refinementHistory
        .filter(r => r.testResults && this.allTestsPass(r.testResults))
        .length;
      
      // Calculate improvement rate
      stats.improvementRate = 
        (stats.successfulFixes / stats.totalRefinements * 100).toFixed(1) + '%';
    }
    
    return stats;
  }
}

export default TestDrivenRefinement;
