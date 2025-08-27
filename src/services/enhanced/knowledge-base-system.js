/**
 * Knowledge Base System
 * Learns from every success and failure to improve future builds
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class KnowledgeBaseSystem {
  constructor() {
    this.knowledgePath = path.join(process.cwd(), 'knowledge');
    this.ensureKnowledgeDirectory();
    
    // Knowledge stores
    this.bugs = new Map();        // Known bugs and their fixes
    this.patterns = new Map();     // Successful patterns
    this.failures = new Map();     // Common failure modes
    this.compatibility = new Map(); // Tech stack compatibility issues
    this.solutions = new Map();    // Proven solutions to common problems
    
    this.loadKnowledge();
  }

  ensureKnowledgeDirectory() {
    if (!fs.existsSync(this.knowledgePath)) {
      fs.mkdirSync(this.knowledgePath, { recursive: true });
    }
  }

  loadKnowledge() {
    // Load bugs database
    const bugsPath = path.join(this.knowledgePath, 'bugs.json');
    if (fs.existsSync(bugsPath)) {
      const bugs = JSON.parse(fs.readFileSync(bugsPath, 'utf8'));
      bugs.forEach(bug => this.bugs.set(bug.id, bug));
    }

    // Load patterns database
    const patternsPath = path.join(this.knowledgePath, 'patterns.json');
    if (fs.existsSync(patternsPath)) {
      const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
      patterns.forEach(pattern => this.patterns.set(pattern.id, pattern));
    }

    // Load failures database
    const failuresPath = path.join(this.knowledgePath, 'failures.json');
    if (fs.existsSync(failuresPath)) {
      const failures = JSON.parse(fs.readFileSync(failuresPath, 'utf8'));
      failures.forEach(failure => this.failures.set(failure.id, failure));
    }

    // Load compatibility database
    const compatPath = path.join(this.knowledgePath, 'compatibility.json');
    if (fs.existsSync(compatPath)) {
      const compat = JSON.parse(fs.readFileSync(compatPath, 'utf8'));
      compat.forEach(item => this.compatibility.set(item.id, item));
    }

    console.log(`📚 Knowledge Base loaded: ${this.bugs.size} bugs, ${this.patterns.size} patterns, ${this.failures.size} failures`);
  }

  saveKnowledge() {
    // Save bugs
    const bugsPath = path.join(this.knowledgePath, 'bugs.json');
    fs.writeFileSync(bugsPath, JSON.stringify(Array.from(this.bugs.values()), null, 2));

    // Save patterns
    const patternsPath = path.join(this.knowledgePath, 'patterns.json');
    fs.writeFileSync(patternsPath, JSON.stringify(Array.from(this.patterns.values()), null, 2));

    // Save failures
    const failuresPath = path.join(this.knowledgePath, 'failures.json');
    fs.writeFileSync(failuresPath, JSON.stringify(Array.from(this.failures.values()), null, 2));

    // Save compatibility
    const compatPath = path.join(this.knowledgePath, 'compatibility.json');
    fs.writeFileSync(compatPath, JSON.stringify(Array.from(this.compatibility.values()), null, 2));
  }

  learnFromSuccess(successData) {
    const { code, requirements, techStack, testResults } = successData;
    
    // Extract successful pattern
    const pattern = {
      id: crypto.randomBytes(8).toString('hex'),
      timestamp: Date.now(),
      requirements: this.normalizeRequirements(requirements),
      techStack: techStack,
      codeFingerprint: this.generateCodeFingerprint(code),
      testResults: testResults,
      successCount: 1,
      failureCount: 0,
      confidence: 1.0
    };

    // Check if similar pattern exists
    const existingPattern = this.findSimilarPattern(pattern);
    if (existingPattern) {
      existingPattern.successCount++;
      existingPattern.confidence = this.calculateConfidence(existingPattern);
      this.patterns.set(existingPattern.id, existingPattern);
    } else {
      this.patterns.set(pattern.id, pattern);
    }

    // Learn tech stack compatibility
    if (techStack && techStack.length > 1) {
      this.learnCompatibility(techStack, true);
    }

    // Extract and store solutions from successful code
    const solutions = this.extractSolutions(code, requirements);
    solutions.forEach(solution => {
      const existingSolution = this.solutions.get(solution.problem);
      if (!existingSolution || existingSolution.confidence < solution.confidence) {
        this.solutions.set(solution.problem, solution);
      }
    });

    this.saveKnowledge();
    console.log(`✅ Learned from success: Pattern ${pattern.id} added/updated`);
  }

  learnFromFailure(failureData) {
    const { code, error, techStack, context } = failureData;
    
    // Record failure
    const failure = {
      id: crypto.randomBytes(8).toString('hex'),
      timestamp: Date.now(),
      error: error,
      errorType: this.classifyError(error),
      context: context,
      techStack: techStack,
      codeFingerprint: code ? this.generateCodeFingerprint(code) : null,
      occurrences: 1
    };

    // Check if similar failure exists
    const existingFailure = this.findSimilarFailure(failure);
    if (existingFailure) {
      existingFailure.occurrences++;
      this.failures.set(existingFailure.id, existingFailure);
    } else {
      this.failures.set(failure.id, failure);
    }

    // Learn tech stack incompatibility
    if (techStack && techStack.length > 1) {
      this.learnCompatibility(techStack, false);
    }

    // Extract bug if it's a code error
    if (code && error) {
      const bug = this.extractBug(code, error);
      if (bug) {
        this.bugs.set(bug.id, bug);
      }
    }

    this.saveKnowledge();
    console.log(`❌ Learned from failure: ${failure.errorType} recorded`);
  }

  getRecommendations(requirements, techStack = []) {
    const recommendations = {
      patterns: [],
      warnings: [],
      solutions: [],
      knownBugs: [],
      compatibility: []
    };

    // Find matching patterns
    const normalizedReqs = this.normalizeRequirements(requirements);
    this.patterns.forEach(pattern => {
      const similarity = this.calculateSimilarity(normalizedReqs, pattern.requirements);
      if (similarity > 0.7) {
        recommendations.patterns.push({
          pattern: pattern,
          similarity: similarity,
          confidence: pattern.confidence
        });
      }
    });

    // Sort patterns by confidence and similarity
    recommendations.patterns.sort((a, b) => 
      (b.confidence * b.similarity) - (a.confidence * a.similarity)
    );

    // Check for known failures
    this.failures.forEach(failure => {
      if (this.contextMatches(requirements, failure.context)) {
        recommendations.warnings.push({
          type: failure.errorType,
          message: `Warning: Similar requirements have failed ${failure.occurrences} times`,
          suggestion: this.generateFailureSuggestion(failure)
        });
      }
    });

    // Find relevant solutions
    const problems = this.identifyProblems(requirements);
    problems.forEach(problem => {
      const solution = this.solutions.get(problem);
      if (solution) {
        recommendations.solutions.push(solution);
      }
    });

    // Check for known bugs in tech stack
    this.bugs.forEach(bug => {
      if (techStack.some(tech => bug.affectedTech.includes(tech))) {
        recommendations.knownBugs.push({
          bug: bug,
          fix: bug.fix,
          workaround: bug.workaround
        });
      }
    });

    // Check tech stack compatibility
    if (techStack.length > 1) {
      const compatKey = techStack.sort().join('-');
      const compatInfo = this.compatibility.get(compatKey);
      if (compatInfo) {
        recommendations.compatibility.push({
          stack: techStack,
          compatible: compatInfo.compatible,
          issues: compatInfo.issues,
          successRate: compatInfo.successRate
        });
      }
    }

    return recommendations;
  }

  normalizeRequirements(requirements) {
    if (typeof requirements !== 'string') {
      return requirements;
    }
    
    // Extract key features from requirements text
    const features = [];
    const keywords = [
      'authentication', 'database', 'api', 'real-time', 'chat', 
      'payment', 'upload', 'search', 'admin', 'dashboard',
      'responsive', 'mobile', 'desktop', 'offline', 'pwa'
    ];

    const lowerReqs = requirements.toLowerCase();
    keywords.forEach(keyword => {
      if (lowerReqs.includes(keyword)) {
        features.push(keyword);
      }
    });

    return features;
  }

  generateCodeFingerprint(code) {
    // Create a fingerprint of the code structure
    const fingerprint = {
      length: code.length,
      imports: this.extractImports(code),
      functions: this.countFunctions(code),
      components: this.countComponents(code),
      hash: crypto.createHash('md5').update(code).digest('hex').substring(0, 8)
    };
    return fingerprint;
  }

  extractImports(code) {
    const imports = [];
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  countFunctions(code) {
    const functionRegex = /function\s+\w+|const\s+\w+\s*=\s*\(.*?\)\s*=>|const\s+\w+\s*=\s*function/g;
    const matches = code.match(functionRegex);
    return matches ? matches.length : 0;
  }

  countComponents(code) {
    const componentRegex = /class\s+\w+\s+extends\s+(React\.)?Component|function\s+[A-Z]\w+|const\s+[A-Z]\w+\s*=/g;
    const matches = code.match(componentRegex);
    return matches ? matches.length : 0;
  }

  findSimilarPattern(newPattern) {
    let mostSimilar = null;
    let highestSimilarity = 0;

    this.patterns.forEach(pattern => {
      const similarity = this.calculatePatternSimilarity(newPattern, pattern);
      if (similarity > 0.8 && similarity > highestSimilarity) {
        highestSimilarity = similarity;
        mostSimilar = pattern;
      }
    });

    return mostSimilar;
  }

  calculatePatternSimilarity(pattern1, pattern2) {
    // Compare requirements
    const reqSimilarity = this.calculateSimilarity(
      pattern1.requirements, 
      pattern2.requirements
    );

    // Compare tech stacks
    const techSimilarity = this.calculateArraySimilarity(
      pattern1.techStack || [], 
      pattern2.techStack || []
    );

    // Weighted average
    return reqSimilarity * 0.7 + techSimilarity * 0.3;
  }

  calculateSimilarity(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
      return 0;
    }
    
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  calculateArraySimilarity(arr1, arr2) {
    return this.calculateSimilarity(arr1, arr2);
  }

  calculateConfidence(pattern) {
    const total = pattern.successCount + pattern.failureCount;
    if (total === 0) return 0;
    
    // Confidence based on success rate with minimum threshold
    const successRate = pattern.successCount / total;
    const minSamples = 3;
    const sampleWeight = Math.min(1, total / minSamples);
    
    return successRate * sampleWeight;
  }

  classifyError(error) {
    if (!error) return 'unknown';
    
    const errorString = error.toString().toLowerCase();
    
    if (errorString.includes('syntax')) return 'syntax';
    if (errorString.includes('type')) return 'type';
    if (errorString.includes('reference')) return 'reference';
    if (errorString.includes('network')) return 'network';
    if (errorString.includes('permission')) return 'permission';
    if (errorString.includes('timeout')) return 'timeout';
    if (errorString.includes('memory')) return 'memory';
    if (errorString.includes('module')) return 'module';
    
    return 'runtime';
  }

  findSimilarFailure(newFailure) {
    let mostSimilar = null;

    this.failures.forEach(failure => {
      if (failure.errorType === newFailure.errorType &&
          failure.techStack?.toString() === newFailure.techStack?.toString()) {
        mostSimilar = failure;
      }
    });

    return mostSimilar;
  }

  learnCompatibility(techStack, isCompatible) {
    const key = techStack.sort().join('-');
    let compat = this.compatibility.get(key);
    
    if (!compat) {
      compat = {
        id: key,
        techStack: techStack,
        compatible: isCompatible,
        successCount: 0,
        failureCount: 0,
        issues: [],
        successRate: 0
      };
    }

    if (isCompatible) {
      compat.successCount++;
    } else {
      compat.failureCount++;
    }

    const total = compat.successCount + compat.failureCount;
    compat.successRate = total > 0 ? compat.successCount / total : 0;
    compat.compatible = compat.successRate > 0.5;

    this.compatibility.set(key, compat);
  }

  extractBug(code, error) {
    // Try to identify the specific bug from the error
    const bug = {
      id: crypto.randomBytes(8).toString('hex'),
      timestamp: Date.now(),
      error: error.toString(),
      errorType: this.classifyError(error),
      codePattern: this.extractErrorPattern(code, error),
      affectedTech: [],
      fix: null,
      workaround: null,
      occurrences: 1
    };

    // Try to identify affected technologies
    const imports = this.extractImports(code);
    bug.affectedTech = imports.filter(imp => 
      imp.includes('react') || 
      imp.includes('vue') || 
      imp.includes('angular') ||
      imp.includes('next')
    );

    // Generate potential fix
    bug.fix = this.generatePotentialFix(bug.errorType, error);
    
    return bug;
  }

  extractErrorPattern(code, error) {
    // Try to extract the code pattern that caused the error
    const errorString = error.toString();
    const lineMatch = errorString.match(/line (\d+)/i);
    
    if (lineMatch) {
      const lineNumber = parseInt(lineMatch[1]);
      const lines = code.split('\n');
      
      if (lines[lineNumber - 1]) {
        return lines[lineNumber - 1].trim();
      }
    }
    
    return null;
  }

  generatePotentialFix(errorType, error) {
    const fixes = {
      'syntax': 'Check for missing semicolons, brackets, or quotes',
      'type': 'Ensure correct data types are being used',
      'reference': 'Check that all variables are defined before use',
      'module': 'Verify all imports are correctly installed and imported',
      'network': 'Check network connectivity and API endpoints',
      'permission': 'Verify necessary permissions are granted'
    };

    return fixes[errorType] || 'Review the error message for specific details';
  }

  extractSolutions(code, requirements) {
    const solutions = [];
    
    // Extract common problem-solution patterns from successful code
    const problemPatterns = [
      { problem: 'authentication', pattern: /auth|login|session/i },
      { problem: 'database', pattern: /database|sql|mongo|postgres/i },
      { problem: 'api', pattern: /api|rest|graphql|endpoint/i },
      { problem: 'state-management', pattern: /redux|mobx|context|state/i },
      { problem: 'routing', pattern: /router|route|navigation/i }
    ];

    problemPatterns.forEach(({ problem, pattern }) => {
      if (pattern.test(code) && pattern.test(requirements)) {
        solutions.push({
          problem: problem,
          solution: this.extractCodeSection(code, pattern),
          confidence: 0.8,
          source: 'extracted'
        });
      }
    });

    return solutions;
  }

  extractCodeSection(code, pattern) {
    // Extract relevant code section around the pattern
    const lines = code.split('\n');
    const relevantLines = [];
    
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        // Get surrounding context (3 lines before and after)
        const start = Math.max(0, index - 3);
        const end = Math.min(lines.length - 1, index + 3);
        
        for (let i = start; i <= end; i++) {
          if (!relevantLines.includes(lines[i])) {
            relevantLines.push(lines[i]);
          }
        }
      }
    });

    return relevantLines.join('\n');
  }

  contextMatches(requirements, context) {
    if (!requirements || !context) return false;
    
    const reqNormalized = this.normalizeRequirements(requirements);
    const contextNormalized = this.normalizeRequirements(context);
    
    const similarity = this.calculateSimilarity(reqNormalized, contextNormalized);
    return similarity > 0.6;
  }

  generateFailureSuggestion(failure) {
    const suggestions = {
      'syntax': 'Use a linter to catch syntax errors before building',
      'type': 'Consider using TypeScript for better type safety',
      'module': 'Verify all dependencies are installed and compatible',
      'network': 'Add proper error handling for network requests',
      'timeout': 'Increase timeout values or optimize performance',
      'memory': 'Optimize code to reduce memory usage'
    };

    return suggestions[failure.errorType] || 'Review similar successful patterns';
  }

  identifyProblems(requirements) {
    const problems = [];
    const problemKeywords = {
      'authentication': ['login', 'auth', 'user', 'session', 'jwt'],
      'database': ['database', 'store', 'persist', 'save', 'crud'],
      'real-time': ['real-time', 'live', 'websocket', 'chat', 'update'],
      'payment': ['payment', 'stripe', 'checkout', 'billing'],
      'file-upload': ['upload', 'file', 'image', 'media'],
      'search': ['search', 'filter', 'find', 'query']
    };

    const lowerReqs = requirements.toLowerCase();
    
    Object.entries(problemKeywords).forEach(([problem, keywords]) => {
      if (keywords.some(keyword => lowerReqs.includes(keyword))) {
        problems.push(problem);
      }
    });

    return problems;
  }

  getStatistics() {
    const stats = {
      totalPatterns: this.patterns.size,
      totalBugs: this.bugs.size,
      totalFailures: this.failures.size,
      compatibilityEntries: this.compatibility.size,
      totalSolutions: this.solutions.size,
      
      successfulPatterns: Array.from(this.patterns.values())
        .filter(p => p.confidence > 0.8).length,
      
      commonFailures: Array.from(this.failures.values())
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 5),
      
      mostCompatibleStacks: Array.from(this.compatibility.values())
        .filter(c => c.successRate > 0.8)
        .map(c => c.techStack)
    };

    return stats;
  }

  exportKnowledge() {
    const exportPath = path.join(this.knowledgePath, `export_${Date.now()}.json`);
    
    const exportData = {
      bugs: Array.from(this.bugs.values()),
      patterns: Array.from(this.patterns.values()),
      failures: Array.from(this.failures.values()),
      compatibility: Array.from(this.compatibility.values()),
      solutions: Array.from(this.solutions.values()),
      statistics: this.getStatistics(),
      exportDate: new Date().toISOString()
    };

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`📚 Knowledge exported to ${exportPath}`);
    
    return exportPath;
  }

  clearKnowledge(type = 'all') {
    if (type === 'all' || type === 'bugs') this.bugs.clear();
    if (type === 'all' || type === 'patterns') this.patterns.clear();
    if (type === 'all' || type === 'failures') this.failures.clear();
    if (type === 'all' || type === 'compatibility') this.compatibility.clear();
    if (type === 'all' || type === 'solutions') this.solutions.clear();
    
    this.saveKnowledge();
    console.log(`🧹 Knowledge base cleared: ${type}`);
  }
}

export default KnowledgeBaseSystem;
