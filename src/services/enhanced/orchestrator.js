/**
 * Enhanced Dyad Orchestrator
 * Main coordinator for all enhanced services including desktop framework support
 */

import DesktopFrameworkManager from './desktop-frameworks.js';
import DesktopCodeGenerator from './desktop-code-generator.js';
import AbbaTestingBots from './testing-bots.js';

class EnhancedOrchestrator {
  constructor(config = {}) {
    this.config = {
      maxRetries: 3,
      timeout: 120000, // 2 minutes
      budgetLimit: config.budgetLimit || 10.00,
      enableLearning: config.enableLearning !== false,
      enableTemplates: config.enableTemplates !== false,
      enableDesktopApps: config.enableDesktopApps !== false,
      enableTestingBots: config.enableTestingBots !== false,
      ...config
    };

    // Initialize services (these will be lazy-loaded as needed)
    this.services = {};
    this.initialized = false;
  }

  /**
   * Initialize all services
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing Enhanced Orchestrator...');

      // Initialize core services
      await this.initializeCoreServices();

      // Initialize enhanced services
      await this.initializeEnhancedServices();

      // Initialize desktop framework services if enabled
      if (this.config.enableDesktopApps) {
        await this.initializeDesktopServices();
      }

      // Initialize testing bot services if enabled
      if (this.config.enableTestingBots) {
        await this.initializeTestingBotServices();
      }

      this.initialized = true;
      console.log('Enhanced Orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize orchestrator:', error);
      throw error;
    }
  }

  /**
   * Initialize core services
   */
  async initializeCoreServices() {
    // These would be imported dynamically in a real implementation
    this.services.claude = await this.loadService('claude-opus');
    this.services.contextManager = await this.loadService('context-manager');
    this.services.errorRecovery = await this.loadService('error-recovery');
    this.services.costManager = await this.loadService('cost-manager');
  }

  /**
   * Initialize enhanced services
   */
  async initializeEnhancedServices() {
    if (this.config.enableTemplates) {
      this.services.templateMatcher = await this.loadService('template-matcher');
    }
    
    this.services.promptOptimizer = await this.loadService('prompt-optimizer');
    
    if (this.config.enableLearning) {
      this.services.learningSystem = await this.loadService('learning-system');
    }
  }

  /**
   * Initialize desktop framework services
   */
  async initializeDesktopServices() {
    console.log('Initializing desktop framework services...');
    
    this.services.desktopFrameworkManager = new DesktopFrameworkManager();
    this.services.desktopCodeGenerator = new DesktopCodeGenerator(
      this.services.claude,
      this.services.templateMatcher
    );

    console.log('Desktop framework services initialized');
  }

  /**
   * Initialize testing bot services
   */
  async initializeTestingBotServices() {
    console.log('Initializing ABBA Testing Bot services...');
    
    this.services.testingBots = new AbbaTestingBots();
    
    console.log('ABBA Testing Bot services initialized');
  }

  /**
   * Load a service module dynamically
   */
  async loadService(serviceName) {
    try {
      // In a real implementation, this would dynamically import the service
      // For now, we'll just return a placeholder
      console.log(`Loading service: ${serviceName}`);
      
      // Simulate service loading
      return {
        name: serviceName,
        initialized: true,
        // Add mock methods as needed
        generateWithFullContext: async (prompt, context) => {
          return `Mock response from ${serviceName}`;
        }
      };
    } catch (error) {
      console.error(`Failed to load service ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Main generation method
   */
  async generateCode(request, options = {}) {
    await this.initialize();

    const startTime = Date.now();
    const context = {
      request,
      options,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };

    try {
      // Check if this is a desktop app request
      if (this.isDesktopAppRequest(request, options)) {
        return await this.generateDesktopApp(request, options, context);
      }

      // Check if this is a web app request
      if (this.isWebAppRequest(request, options)) {
        return await this.generateWebApp(request, options, context);
      }

      // Default to general code generation
      return await this.generateGeneralCode(request, options, context);

    } catch (error) {
      console.error('Code generation failed:', error);
      
      if (this.services.errorRecovery) {
        return await this.services.errorRecovery.handleError(error, context);
      }
      
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logMetrics(context, duration);
    }
  }

  /**
   * Generate desktop application
   */
  async generateDesktopApp(request, options = {}, context) {
    console.log('Generating desktop application...');

    if (!this.services.desktopFrameworkManager || !this.services.desktopCodeGenerator) {
      throw new Error('Desktop services not initialized');
    }

    // Determine the best framework
    const framework = options.framework || 
      this.services.desktopFrameworkManager.selectOptimalFramework(
        request,
        options.platforms || ['Windows', 'macOS', 'Linux'],
        options.userSkill || 'medium'
      );

    console.log(`Selected framework: ${framework}`);

    // Generate framework-specific prompts
    const prompts = this.services.desktopFrameworkManager.generateFrameworkSpecificPrompts(
      framework,
      request,
      context
    );

    // Generate the desktop app code
    const result = await this.services.desktopCodeGenerator.generateDesktopApp(
      request,
      framework,
      context
    );

    // Track costs if cost manager is available
    if (this.services.costManager) {
      await this.services.costManager.trackUsage({
        type: 'desktop-app',
        framework,
        tokens: this.estimateTokens(result)
      });
    }

    // Learn from the generation if learning is enabled
    if (this.services.learningSystem) {
      await this.services.learningSystem.recordGeneration({
        type: 'desktop',
        framework,
        request,
        result,
        success: result.success
      });
    }

    return {
      type: 'desktop-app',
      framework,
      ...result,
      metadata: {
        generatedAt: new Date().toISOString(),
        orchestratorVersion: '2.0.0',
        servicesUsed: ['desktopFrameworkManager', 'desktopCodeGenerator']
      },
      // Optionally run tests if enabled
      testResults: this.config.enableTestingBots ? await this.runAutomatedTests('desktop', result, request) : null
    };
  }

  /**
   * Generate web application
   */
  async generateWebApp(request, options = {}, context) {
    console.log('Generating web application...');

    // Optimize the prompt
    let optimizedPrompt = request;
    if (this.services.promptOptimizer) {
      optimizedPrompt = await this.services.promptOptimizer.optimize(request, 'web-app');
    }

    // Find best template if available
    let template = null;
    if (this.services.templateMatcher) {
      template = await this.services.templateMatcher.findBestTemplate(request, 'web');
    }

    // Generate with Claude
    const result = await this.services.claude.generateWithFullContext(
      optimizedPrompt,
      { ...context, template }
    );

    return {
      type: 'web-app',
      code: result,
      template: template?.name,
      metadata: {
        generatedAt: new Date().toISOString(),
        orchestratorVersion: '2.0.0'
      },
      // Optionally run tests if enabled
      testResults: this.config.enableTestingBots ? await this.runAutomatedTests('web', result, request) : null
    };
  }

  /**
   * Generate general code
   */
  async generateGeneralCode(request, options = {}, context) {
    console.log('Generating general code...');

    // Optimize the prompt
    let optimizedPrompt = request;
    if (this.services.promptOptimizer) {
      optimizedPrompt = await this.services.promptOptimizer.optimize(request, 'general');
    }

    // Generate with Claude
    const result = await this.services.claude.generateWithFullContext(
      optimizedPrompt,
      context
    );

    return {
      type: 'general',
      code: result,
      metadata: {
        generatedAt: new Date().toISOString(),
        orchestratorVersion: '2.0.0'
      }
    };
  }

  /**
   * Check if request is for a desktop app
   */
  isDesktopAppRequest(request, options) {
    if (options.type === 'desktop') return true;
    
    const desktopKeywords = [
      'desktop', 'electron', 'tauri', 'native', 'offline',
      'windows app', 'mac app', 'linux app', 'desktop application',
      'wpf', 'winforms', 'pyqt', 'tkinter', 'flutter desktop',
      'standalone', 'installable'
    ];
    
    const requestLower = request.toLowerCase();
    return desktopKeywords.some(keyword => requestLower.includes(keyword));
  }

  /**
   * Check if request is for a web app
   */
  isWebAppRequest(request, options) {
    if (options.type === 'web') return true;
    
    const webKeywords = [
      'website', 'web app', 'webapp', 'react', 'vue', 'angular',
      'nextjs', 'next.js', 'frontend', 'backend', 'fullstack',
      'api', 'rest', 'graphql', 'html', 'css', 'javascript',
      'responsive', 'mobile-first', 'progressive web app', 'pwa'
    ];
    
    const requestLower = request.toLowerCase();
    return webKeywords.some(keyword => requestLower.includes(keyword));
  }

  /**
   * Compare frameworks for a given request
   */
  async compareFrameworks(request, requirements = {}) {
    if (!this.services.desktopFrameworkManager) {
      throw new Error('Desktop framework manager not initialized');
    }

    return this.services.desktopFrameworkManager.compareFrameworks(requirements);
  }

  /**
   * Get framework recommendations
   */
  async getFrameworkRecommendation(request, options = {}) {
    if (!this.services.desktopFrameworkManager) {
      throw new Error('Desktop framework manager not initialized');
    }

    const framework = this.services.desktopFrameworkManager.selectOptimalFramework(
      request,
      options.platforms,
      options.userSkill
    );

    const comparison = await this.compareFrameworks(request, {
      platforms: options.platforms,
      performance: options.performance,
      bundleSize: options.bundleSize,
      complexity: options.complexity
    });

    return {
      recommended: framework,
      alternatives: comparison.slice(0, 3),
      reasoning: this.generateRecommendationReasoning(framework, request, options)
    };
  }

  /**
   * Generate reasoning for framework recommendation
   */
  generateRecommendationReasoning(framework, request, options) {
    const reasons = [];

    switch (framework) {
      case 'electron':
        reasons.push('Electron is recommended because:');
        reasons.push('- Familiar web technologies (HTML/CSS/JavaScript)');
        reasons.push('- Large ecosystem and community support');
        reasons.push('- Cross-platform compatibility');
        break;
      
      case 'tauri':
        reasons.push('Tauri is recommended because:');
        reasons.push('- Smaller bundle size and better performance');
        reasons.push('- Security-first approach');
        reasons.push('- Native system integration through Rust');
        break;
      
      case 'flutter':
        reasons.push('Flutter is recommended because:');
        reasons.push('- Single codebase for mobile and desktop');
        reasons.push('- Beautiful, customizable UI');
        reasons.push('- Hot reload for faster development');
        break;
      
      case 'dotnet':
        reasons.push('.NET is recommended because:');
        reasons.push('- Native Windows integration');
        reasons.push('- Enterprise-grade performance');
        reasons.push('- Rich tooling with Visual Studio');
        break;
      
      case 'python':
        reasons.push('Python is recommended because:');
        reasons.push('- Easy to learn and prototype');
        reasons.push('- Large library ecosystem');
        reasons.push('- Quick development cycle');
        break;
    }

    return reasons.join('\n');
  }

  /**
   * Estimate tokens for cost tracking
   */
  estimateTokens(content) {
    if (typeof content === 'string') {
      return Math.ceil(content.length / 4);
    }
    
    if (typeof content === 'object') {
      return Math.ceil(JSON.stringify(content).length / 4);
    }
    
    return 1000; // Default estimate
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log metrics
   */
  logMetrics(context, duration) {
    console.log('Generation metrics:', {
      sessionId: context.sessionId,
      duration: `${duration}ms`,
      request: context.request.substring(0, 100) + '...'
    });
  }

  /**
   * Get service status
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      services: {},
      config: this.config
    };

    for (const [name, service] of Object.entries(this.services)) {
      status.services[name] = {
        loaded: !!service,
        initialized: service?.initialized || false
      };
    }

    return status;
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown() {
    console.log('Shutting down orchestrator...');
    
    // Clean up services
    for (const service of Object.values(this.services)) {
      if (service?.shutdown) {
        await service.shutdown();
      }
    }

    this.services = {};
    this.initialized = false;
    
    console.log('Orchestrator shutdown complete');
  }

  /**
   * Run automated tests on generated code
   */
  async runAutomatedTests(appType, generatedCode, requirements) {
    if (!this.services.testingBots) {
      console.log('Testing bots not initialized, skipping tests');
      return null;
    }

    try {
      console.log(`Running automated tests for ${appType} app...`);
      
      const testingBot = await this.services.testingBots.createTestingBot(
        appType,
        generatedCode,
        requirements
      );

      if (appType === 'web' && testingBot.webAppBot) {
        const testResults = await testingBot.webAppBot.runComprehensiveTest();
        console.log(`Test results: ${testResults.overallSuccess ? 'PASSED' : 'FAILED'} (${testResults.successRate}% success rate)`);
        return testResults;
      }

      if (appType === 'desktop' && testingBot.desktopBot) {
        const testResults = await testingBot.desktopBot.runSmokeTest();
        console.log(`Desktop test results:`, testResults);
        return testResults;
      }

      return null;
    } catch (error) {
      console.error('Error running automated tests:', error);
      return {
        overallSuccess: false,
        error: error.message,
        notes: 'Testing failed due to error'
      };
    }
  }

  /**
   * Test a specific generated app
   */
  async testGeneratedApp(appType, code, requirements = {}) {
    await this.initialize();
    
    if (!this.services.testingBots) {
      throw new Error('Testing bots service not initialized');
    }

    const bot = await this.services.testingBots.createTestingBot(appType, code, requirements);
    
    if (appType === 'web' && bot.webAppBot) {
      return await bot.webAppBot.runComprehensiveTest();
    }
    
    if (appType === 'desktop' && bot.desktopBot) {
      return await bot.desktopBot.runSmokeTest();
    }
    
    if (appType === 'extension' && bot.extensionBot) {
      return await bot.extensionBot.runManifestValidation();
    }
    
    if (appType === 'mobile' && bot.mobileBot) {
      return await bot.mobileBot.runUITest();
    }

    throw new Error(`No testing bot available for app type: ${appType}`);
  }
}

export default EnhancedOrchestrator;
