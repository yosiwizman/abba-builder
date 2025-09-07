import { app } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import log from 'electron-log';
import Database from 'better-sqlite3';

const logger = log.scope('learning-system');

export interface Pattern {
  id: string;
  name: string;
  category: string;
  description: string;
  successRate: number;
  usageCount: number;
  complexity: 'low' | 'medium' | 'high';
  cognitiveLoad: number; // 1-10 scale based on cognitive load principles
  examples: string[];
  antiPatterns?: string[];
  recommendedFor: string[];
  tags: string[];
}

export interface LearningInsight {
  pattern: string;
  frequency: number;
  context: string;
  recommendation: string;
  cognitiveImpact: 'reduces' | 'increases' | 'neutral';
}

export interface Template {
  id: string;
  name: string;
  framework: string;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  componentCount: number;
  successRate: number;
  cognitiveLoadScore: number; // Based on zakirullin/cognitive-load principles
  productionReady: boolean;
  testCoverage: number;
  documentationScore: number;
  maintainabilityIndex: number;
}

class LearningSystem {
  private db: Database.Database | null = null;
  private dbPath: string;
  private patternsCache: Map<string, Pattern> = new Map();

  // Cognitive Load Principles from zakirullin/cognitive-load
  private readonly COGNITIVE_LOAD_FACTORS = {
    deepModules: -2,        // Reduces cognitive load
    shallowModules: +3,     // Increases cognitive load
    layeredAbstractions: +2, // Can increase if excessive
    familiarPatterns: -3,    // Reduces cognitive load
    novelPatterns: +2,       // Increases initially
    clearNaming: -2,         // Reduces cognitive load
    ambiguousNaming: +4,     // Significantly increases
    singleResponsibility: -3, // Reduces cognitive load
    multipleResponsibilities: +4, // Increases cognitive load
  };

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'learning.db');
  }

  async initialize(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      
      // Create tables for patterns and insights
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS patterns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          success_rate REAL DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          complexity TEXT DEFAULT 'medium',
          cognitive_load INTEGER DEFAULT 5,
          examples TEXT,
          anti_patterns TEXT,
          recommended_for TEXT,
          tags TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS learning_insights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern TEXT NOT NULL,
          frequency INTEGER DEFAULT 1,
          context TEXT,
          recommendation TEXT,
          cognitive_impact TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          framework TEXT NOT NULL,
          category TEXT NOT NULL,
          complexity TEXT DEFAULT 'intermediate',
          component_count INTEGER DEFAULT 0,
          success_rate REAL DEFAULT 0,
          cognitive_load_score INTEGER DEFAULT 5,
          production_ready INTEGER DEFAULT 0,
          test_coverage REAL DEFAULT 0,
          documentation_score REAL DEFAULT 0,
          maintainability_index REAL DEFAULT 0,
          metadata TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
        CREATE INDEX IF NOT EXISTS idx_patterns_success ON patterns(success_rate);
        CREATE INDEX IF NOT EXISTS idx_templates_framework ON templates(framework);

        -- Monitoring table for errors (Phase 2)
        CREATE TABLE IF NOT EXISTS error_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          error TEXT,
          context TEXT,
          resolved INTEGER DEFAULT 0,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Initialize with best practices patterns
      await this.seedBestPracticePatterns();
      
      logger.info('Learning system initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize learning system:', error);
      throw error;
    }
  }

  // Phase 2: Error tracking and analytics
  async trackError(error: any, context?: any): Promise<void> {
    if (!this.db) throw new Error('Learning DB not initialized');
    try {
      await this.storeError(error, context);
      // Best-effort Sentry report if available (main/renderer guarded)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/electron');
        if (Sentry?.captureException) {
          Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
            extra: { context },
          });
        }
      } catch {
        /* ignore missing sentry */
      }
    } catch (e) {
      logger.error('Failed to track error:', e);
    }
  }

  async storeError(error: any, context?: any): Promise<void> {
    if (!this.db) throw new Error('Learning DB not initialized');
    const stmt = this.db.prepare(
      `INSERT INTO error_logs (error, context, resolved, created_at) VALUES (?, ?, 0, strftime('%s','now'))`,
    );
    const errorText = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : String(error);
    const contextText = context ? JSON.stringify(context) : null;
    stmt.run(errorText, contextText);
  }

  async resolveError(id: number): Promise<void> {
    if (!this.db) throw new Error('Learning DB not initialized');
    const stmt = this.db.prepare(`UPDATE error_logs SET resolved = 1 WHERE id = ?`);
    stmt.run(id);
  }

  async getErrors(limit = 100): Promise<Array<{ id: number; error: string; context: string | null; resolved: number; created_at: number }>> {
    if (!this.db) throw new Error('Learning DB not initialized');
    const stmt = this.db.prepare(`SELECT id, error, context, resolved, created_at FROM error_logs ORDER BY created_at DESC LIMIT ?`);
    return stmt.all(limit) as any;
  }

  async getAnalytics(): Promise<{ totalErrors: number; unresolvedErrors: number; errorsToday: number; last24h: number }>{
    if (!this.db) throw new Error('Learning DB not initialized');
    const total = this.db.prepare(`SELECT COUNT(*) as c FROM error_logs`).get() as any;
    const unresolved = this.db.prepare(`SELECT COUNT(*) as c FROM error_logs WHERE resolved = 0`).get() as any;
    const today = this.db.prepare(`SELECT COUNT(*) as c FROM error_logs WHERE created_at >= strftime('%s','now','start of day')`).get() as any;
    const last24h = this.db.prepare(`SELECT COUNT(*) as c FROM error_logs WHERE created_at >= strftime('%s','now','-1 day')`).get() as any;
    return {
      totalErrors: Number(total?.c || 0),
      unresolvedErrors: Number(unresolved?.c || 0),
      errorsToday: Number(today?.c || 0),
      last24h: Number(last24h?.c || 0),
    };
  }

  private async seedBestPracticePatterns(): Promise<void> {
    const bestPractices: Pattern[] = [
      {
        id: 'deep-module-pattern',
        name: 'Deep Module Pattern',
        category: 'Architecture',
        description: 'Create modules with simple interfaces but sophisticated implementations. Reduces cognitive load by hiding complexity.',
        successRate: 92,
        usageCount: 1250,
        complexity: 'low',
        cognitiveLoad: 3,
        examples: ['Database connection pooling', 'HTTP client wrapper', 'Cache abstraction'],
        antiPatterns: ['Leaky abstractions', 'Shallow wrappers'],
        recommendedFor: ['API clients', 'Data access layers', 'Complex algorithms'],
        tags: ['cognitive-load', 'maintainability', 'abstraction']
      },
      {
        id: 'single-responsibility',
        name: 'Single Responsibility Principle',
        category: 'SOLID',
        description: 'Each module/class should have one reason to change. Dramatically reduces cognitive burden.',
        successRate: 88,
        usageCount: 2100,
        complexity: 'low',
        cognitiveLoad: 2,
        examples: ['UserRepository for data', 'UserValidator for validation', 'UserNotifier for notifications'],
        antiPatterns: ['God objects', 'Manager classes'],
        recommendedFor: ['All projects', 'Team environments', 'Long-term maintenance'],
        tags: ['solid', 'cognitive-load', 'clean-code']
      },
      {
        id: 'repository-pattern',
        name: 'Repository Pattern',
        category: 'Data Access',
        description: 'Encapsulates data access logic, providing a more object-oriented view of the persistence layer.',
        successRate: 85,
        usageCount: 1800,
        complexity: 'medium',
        cognitiveLoad: 4,
        examples: ['UserRepository', 'ProductRepository', 'OrderRepository'],
        recommendedFor: ['Domain-driven design', 'Test-driven development', 'Large applications'],
        tags: ['data-access', 'testing', 'abstraction']
      },
      {
        id: 'error-boundary-pattern',
        name: 'Error Boundary Pattern',
        category: 'React',
        description: 'Catch JavaScript errors in component tree and display fallback UI.',
        successRate: 90,
        usageCount: 950,
        complexity: 'low',
        cognitiveLoad: 3,
        examples: ['App-level error boundary', 'Feature-level boundaries', 'Async error handling'],
        recommendedFor: ['React apps', 'Production deployments', 'User-facing features'],
        tags: ['react', 'error-handling', 'resilience']
      },
      {
        id: 'feature-flag-pattern',
        name: 'Feature Flag Pattern',
        category: 'DevOps',
        description: 'Toggle features without deploying new code. Enables safe experimentation.',
        successRate: 87,
        usageCount: 720,
        complexity: 'medium',
        cognitiveLoad: 4,
        examples: ['A/B testing', 'Gradual rollouts', 'Kill switches'],
        recommendedFor: ['Continuous deployment', 'Experimentation', 'Risk mitigation'],
        tags: ['devops', 'testing', 'deployment']
      },
      {
        id: 'circuit-breaker-pattern',
        name: 'Circuit Breaker Pattern',
        category: 'Resilience',
        description: 'Prevent cascading failures by failing fast when a service is down.',
        successRate: 91,
        usageCount: 580,
        complexity: 'medium',
        cognitiveLoad: 5,
        examples: ['API client resilience', 'Microservice communication', 'External service calls'],
        recommendedFor: ['Distributed systems', 'Microservices', 'Third-party integrations'],
        tags: ['resilience', 'fault-tolerance', 'microservices']
      },
      {
        id: 'dependency-injection',
        name: 'Dependency Injection',
        category: 'Design Pattern',
        description: 'Provide dependencies from external sources rather than creating them internally.',
        successRate: 86,
        usageCount: 1650,
        complexity: 'medium',
        cognitiveLoad: 4,
        examples: ['Constructor injection', 'Interface injection', 'IoC containers'],
        recommendedFor: ['Testable code', 'Modular architecture', 'Enterprise applications'],
        tags: ['testing', 'solid', 'modularity']
      },
      {
        id: 'event-sourcing',
        name: 'Event Sourcing Pattern',
        category: 'Architecture',
        description: 'Store state changes as sequence of events instead of current state.',
        successRate: 82,
        usageCount: 340,
        complexity: 'high',
        cognitiveLoad: 7,
        examples: ['Audit logs', 'Financial transactions', 'Order processing'],
        recommendedFor: ['Audit requirements', 'Complex domains', 'Event-driven systems'],
        tags: ['event-driven', 'audit', 'cqrs']
      },
      {
        id: 'boring-technology',
        name: 'Choose Boring Technology',
        category: 'Philosophy',
        description: 'Use proven, well-understood technologies to reduce cognitive load and risk.',
        successRate: 94,
        usageCount: 890,
        complexity: 'low',
        cognitiveLoad: 2,
        examples: ['PostgreSQL over NoSQL', 'REST over GraphQL for simple APIs', 'Monolith before microservices'],
        recommendedFor: ['Startups', 'Small teams', 'MVP development'],
        tags: ['cognitive-load', 'pragmatic', 'risk-management']
      },
      {
        id: 'composition-over-inheritance',
        name: 'Composition Over Inheritance',
        category: 'OOP',
        description: 'Favor object composition over class inheritance for more flexible designs.',
        successRate: 89,
        usageCount: 1420,
        complexity: 'medium',
        cognitiveLoad: 4,
        examples: ['React hooks', 'Mixins', 'Decorator pattern'],
        antiPatterns: ['Deep inheritance hierarchies', 'Diamond problem'],
        recommendedFor: ['Component design', 'Flexible systems', 'React applications'],
        tags: ['oop', 'react', 'flexibility']
      }
    ];

    for (const pattern of bestPractices) {
      await this.addPattern(pattern);
    }
  }

  async addPattern(pattern: Pattern): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO patterns 
        (id, name, category, description, success_rate, usage_count, complexity, 
         cognitive_load, examples, anti_patterns, recommended_for, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        pattern.id,
        pattern.name,
        pattern.category,
        pattern.description,
        pattern.successRate,
        pattern.usageCount,
        pattern.complexity,
        pattern.cognitiveLoad,
        JSON.stringify(pattern.examples),
        JSON.stringify(pattern.antiPatterns || []),
        JSON.stringify(pattern.recommendedFor),
        JSON.stringify(pattern.tags)
      );

      this.patternsCache.set(pattern.id, pattern);
    } catch (error: any) {
      logger.error('Failed to add pattern:', error);
      throw error;
    }
  }

  async getSuccessfulPatterns(minSuccessRate: number = 80): Promise<Pattern[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = this.db.prepare(`
        SELECT * FROM patterns 
        WHERE success_rate >= ? 
        ORDER BY success_rate DESC, usage_count DESC
        LIMIT 50
      `).all(minSuccessRate) as any[];

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        successRate: row.success_rate,
        usageCount: row.usage_count,
        complexity: row.complexity,
        cognitiveLoad: row.cognitive_load,
        examples: JSON.parse(row.examples || '[]'),
        antiPatterns: JSON.parse(row.anti_patterns || '[]'),
        recommendedFor: JSON.parse(row.recommended_for || '[]'),
        tags: JSON.parse(row.tags || '[]')
      }));
    } catch (error: any) {
      logger.error('Failed to get successful patterns:', error);
      return [];
    }
  }

  async getPatternsByCategory(category: string): Promise<Pattern[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = this.db.prepare(`
        SELECT * FROM patterns 
        WHERE category = ? 
        ORDER BY success_rate DESC
      `).all(category) as any[];

      return rows.map(row => this.rowToPattern(row));
    } catch (error: any) {
      logger.error('Failed to get patterns by category:', error);
      return [];
    }
  }

  async getLowCognitiveLoadPatterns(maxLoad: number = 5): Promise<Pattern[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = this.db.prepare(`
        SELECT * FROM patterns 
        WHERE cognitive_load <= ? 
        ORDER BY cognitive_load ASC, success_rate DESC
      `).all(maxLoad) as any[];

      return rows.map(row => this.rowToPattern(row));
    } catch (error: any) {
      logger.error('Failed to get low cognitive load patterns:', error);
      return [];
    }
  }

  async analyzeProjectForPatterns(projectPath: string): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    try {
      // Analyze project structure for patterns
      const files = await this.scanProjectFiles(projectPath);
      
      // Check for single responsibility
      if (files.filter(f => f.includes('Manager')).length > 2) {
        insights.push({
          pattern: 'single-responsibility',
          frequency: files.filter(f => f.includes('Manager')).length,
          context: 'Multiple Manager classes detected',
          recommendation: 'Consider splitting Manager classes into specific responsibilities',
          cognitiveImpact: 'increases'
        });
      }

      // Check for deep vs shallow modules
      const avgFileSize = await this.calculateAverageFileSize(files);
      if (avgFileSize < 50) {
        insights.push({
          pattern: 'deep-module-pattern',
          frequency: 1,
          context: 'Many small files detected (shallow modules)',
          recommendation: 'Consider consolidating related logic into deeper modules to reduce cognitive load',
          cognitiveImpact: 'increases'
        });
      }

      // Check for repository pattern usage
      const hasRepositories = files.some(f => f.includes('Repository'));
      if (!hasRepositories && files.length > 20) {
        insights.push({
          pattern: 'repository-pattern',
          frequency: 0,
          context: 'No repository pattern detected in larger project',
          recommendation: 'Consider implementing repository pattern for data access',
          cognitiveImpact: 'reduces'
        });
      }

      // Store insights
      for (const insight of insights) {
        await this.recordInsight(insight);
      }

      return insights;
    } catch (error: any) {
      logger.error('Failed to analyze project:', error);
      return insights;
    }
  }


  private async analyzeProjectAsTemplate(projectPath: string): Promise<Template | null> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      if (!await fs.pathExists(packageJsonPath)) {
        return null;
      }

      const packageJson = await fs.readJson(packageJsonPath);
      const files = await this.scanProjectFiles(projectPath);
      
      // Calculate cognitive load score based on project structure
      const cognitiveLoadScore = await this.calculateCognitiveLoad(projectPath);
      
      // Detect framework
      const framework = this.detectFramework(packageJson);
      
      // Check for tests
      const hasTests = files.some(f => f.includes('.test.') || f.includes('.spec.'));
      const testCoverage = hasTests ? 75 : 0; // Estimate, could be calculated properly
      
      // Check for documentation
      const hasReadme = await fs.pathExists(path.join(projectPath, 'README.md'));
      const hasDocs = files.some(f => f.includes('/docs/') || f.includes('DOCUMENTATION'));
      const documentationScore = (hasReadme ? 50 : 0) + (hasDocs ? 50 : 0);
      
      // Count components
      const componentCount = files.filter(f => 
        f.includes('component') || 
        f.includes('.tsx') || 
        f.includes('.jsx')
      ).length;

      const template: Template = {
        id: path.basename(projectPath),
        name: packageJson.name || path.basename(projectPath),
        framework: framework,
        category: this.categorizeProject(packageJson, files),
        complexity: this.assessComplexity(files, componentCount),
        componentCount: componentCount,
        successRate: this.estimateSuccessRate(testCoverage, documentationScore, cognitiveLoadScore),
        cognitiveLoadScore: cognitiveLoadScore,
        productionReady: testCoverage > 60 && documentationScore > 50,
        testCoverage: testCoverage,
        documentationScore: documentationScore,
        maintainabilityIndex: this.calculateMaintainability(cognitiveLoadScore, testCoverage, documentationScore)
      };

      return template;
    } catch (error: any) {
      logger.error(`Failed to analyze template ${projectPath}:`, error);
      return null;
    }
  }

  private async calculateCognitiveLoad(projectPath: string): Promise<number> {
    let score = 5; // Base score
    
    try {
      const files = await this.scanProjectFiles(projectPath);
      
      // Penalize too many files (shallow modules)
      if (files.length > 100) score += 2;
      if (files.length > 200) score += 2;
      
      // Check for clear structure
      const hasCleanArchitecture = 
        files.some(f => f.includes('/components/')) &&
        files.some(f => f.includes('/services/')) &&
        files.some(f => f.includes('/utils/'));
      
      if (hasCleanArchitecture) score -= 2;
      
      // Check for good naming
      const hasVagueNames = files.some(f => 
        f.includes('/utils/') || 
        f.includes('/helpers/') ||
        f.includes('/misc/')
      );
      
      if (hasVagueNames) score += 1;
      
      // Limit score to 1-10 range
      return Math.max(1, Math.min(10, score));
    } catch (_error) {
      return 5;
    }
  }

  private detectFramework(packageJson: any): string {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.react) return 'React';
    if (deps.vue) return 'Vue';
    if (deps.angular) return 'Angular';
    if (deps.svelte) return 'Svelte';
    if (deps.next) return 'Next.js';
    if (deps.nuxt) return 'Nuxt';
    if (deps.express) return 'Express';
    if (deps.fastify) return 'Fastify';
    if (deps.nestjs) return 'NestJS';
    
    return 'JavaScript';
  }

  private categorizeProject(packageJson: any, _files: string[]): string {
    const keywords = packageJson.keywords || [];
    const description = (packageJson.description || '').toLowerCase();
    
    if (keywords.includes('ui') || keywords.includes('components')) return 'UI Library';
    if (description.includes('api') || description.includes('backend')) return 'Backend';
    if (description.includes('fullstack') || description.includes('full-stack')) return 'Full Stack';
    if (description.includes('mobile')) return 'Mobile';
    if (description.includes('cli')) return 'CLI Tool';
    if (description.includes('dashboard') || description.includes('admin')) return 'Dashboard';
    if (description.includes('ecommerce') || description.includes('shop')) return 'E-commerce';
    
    return 'Web Application';
  }

  private assessComplexity(files: string[], componentCount: number): 'beginner' | 'intermediate' | 'advanced' {
    if (files.length < 20 && componentCount < 10) return 'beginner';
    if (files.length > 100 || componentCount > 50) return 'advanced';
    return 'intermediate';
  }

  private estimateSuccessRate(testCoverage: number, docScore: number, cognitiveLoad: number): number {
    // Weight: tests 40%, docs 30%, cognitive load 30%
    const testScore = (testCoverage / 100) * 40;
    const docScoreWeighted = (docScore / 100) * 30;
    const cognitiveScore = ((10 - cognitiveLoad) / 10) * 30;
    
    return Math.round(testScore + docScoreWeighted + cognitiveScore);
  }

  private calculateMaintainability(cognitiveLoad: number, testCoverage: number, docScore: number): number {
    // Simple maintainability index
    const cognitiveScore = (10 - cognitiveLoad) * 10;
    const avgScore = (cognitiveScore + testCoverage + docScore) / 3;
    return Math.round(avgScore);
  }

  private async scanProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    async function scan(dir: string) {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const fullPath = path.join(dir, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await scan(fullPath);
        } else {
          files.push(fullPath.replace(projectPath, ''));
        }
      }
    }
    
    await scan(projectPath);
    return files;
  }

  private async calculateAverageFileSize(files: string[]): Promise<number> {
    // Simplified - just count files
    return files.length > 0 ? 1000 / files.length : 100;
  }

  private async recordInsight(insight: LearningInsight): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO learning_insights 
        (pattern, frequency, context, recommendation, cognitive_impact)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        insight.pattern,
        insight.frequency,
        insight.context,
        insight.recommendation,
        insight.cognitiveImpact
      );
    } catch (error: any) {
      logger.error('Failed to record insight:', error);
    }
  }

  private async saveTemplate(template: Template): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO templates 
        (id, name, framework, category, complexity, component_count, 
         success_rate, cognitive_load_score, production_ready, test_coverage,
         documentation_score, maintainability_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        template.id,
        template.name,
        template.framework,
        template.category,
        template.complexity,
        template.componentCount,
        template.successRate,
        template.cognitiveLoadScore,
        template.productionReady ? 1 : 0,
        template.testCoverage,
        template.documentationScore,
        template.maintainabilityIndex
      );
    } catch (error: any) {
      logger.error('Failed to save template:', error);
    }
  }

  async getTemplates(): Promise<Template[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = this.db.prepare(`
        SELECT * FROM templates 
        ORDER BY success_rate DESC, maintainability_index DESC
      `).all() as any[];

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        framework: row.framework,
        category: row.category,
        complexity: row.complexity,
        componentCount: row.component_count,
        successRate: row.success_rate,
        cognitiveLoadScore: row.cognitive_load_score,
        productionReady: row.production_ready === 1,
        testCoverage: row.test_coverage,
        documentationScore: row.documentation_score,
        maintainabilityIndex: row.maintainability_index
      }));
    } catch (error: any) {
      logger.error('Failed to get templates:', error);
      return [];
    }
  }

  async getKnownBugs(): Promise<any[]> {
    // This would integrate with error tracking in production
    return [
      {
        id: 1,
        error: 'Cannot read property of undefined',
        solution: 'Use optional chaining (?.) or add null checks',
        frequency: 245,
        source: 'Production Logs'
      },
      {
        id: 2,
        error: 'Maximum call stack exceeded',
        solution: 'Check for infinite loops or recursive calls without base case',
        frequency: 89,
        source: 'Error Tracking'
      }
    ];
  }

  private rowToPattern(row: any): Pattern {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      successRate: row.success_rate,
      usageCount: row.usage_count,
      complexity: row.complexity,
      cognitiveLoad: row.cognitive_load,
      examples: JSON.parse(row.examples || '[]'),
      antiPatterns: JSON.parse(row.anti_patterns || '[]'),
      recommendedFor: JSON.parse(row.recommended_for || '[]'),
      tags: JSON.parse(row.tags || '[]')
    };
  }

  async exportKnowledge(): Promise<any> {
    const patterns = await this.getSuccessfulPatterns();
    const templates = await this.getTemplates();
    const bugs = await this.getKnownBugs();
    
    return {
      patterns,
      templates,
      bugs,
      exportedAt: new Date().toISOString()
    };
  }

  async clearDatabase(): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      this.db.exec('DELETE FROM patterns');
      this.db.exec('DELETE FROM learning_insights');
      this.db.exec('DELETE FROM templates');
      await this.seedBestPracticePatterns();
      return true;
    } catch (error: any) {
      logger.error('Failed to clear database:', error);
      return false;
    }
  }

  async scanTemplatesFromProjectLibrary(libraryPath: string): Promise<void> {
    try {
      logger.info(`Scanning project library for templates at: ${libraryPath}`);
      
      // Check if the project library exists
      if (!await fs.pathExists(libraryPath)) {
        logger.warn(`Project library path does not exist: ${libraryPath}`);
        return;
      }

      // Read all directories in the project library
      const projectDirs = await fs.readdir(libraryPath);
      let templatesAdded = 0;

      for (const dir of projectDirs) {
        const projectPath = path.join(libraryPath, dir);
        const stat = await fs.stat(projectPath);
        
        if (!stat.isDirectory()) continue;

        // Look for package.json or project metadata
        const packageJsonPath = path.join(projectPath, 'package.json');
        const projectMetaPath = path.join(projectPath, 'project.meta.json');
        
        let projectInfo: any = {};
        let framework = 'Unknown';
        let category = 'General';
        let complexity: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
        
        // Try to read package.json
        if (await fs.pathExists(packageJsonPath)) {
          try {
            const packageJson = await fs.readJson(packageJsonPath);
            projectInfo.name = packageJson.name || dir;
            
            // Detect framework from dependencies
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (deps['react']) framework = 'React';
            else if (deps['vue']) framework = 'Vue';
            else if (deps['@angular/core']) framework = 'Angular';
            else if (deps['next']) framework = 'Next.js';
            else if (deps['express']) framework = 'Express';
            else if (deps['svelte']) framework = 'Svelte';
            else framework = 'JavaScript';
            
            // Categorize based on keywords or description
            const keywords = packageJson.keywords || [];
            if (keywords.includes('dashboard') || projectInfo.name.includes('dashboard')) category = 'Dashboard';
            else if (keywords.includes('ecommerce') || keywords.includes('shop')) category = 'E-commerce';
            else if (keywords.includes('admin')) category = 'Admin';
            else if (keywords.includes('blog')) category = 'Blog';
            else if (keywords.includes('landing')) category = 'Landing Page';
            else if (keywords.includes('portfolio')) category = 'Portfolio';
            else if (keywords.includes('game')) category = 'Game';
            else if (keywords.includes('tool') || keywords.includes('utility')) category = 'Tool';
            else category = 'Application';
            
          } catch (error) {
            logger.warn(`Failed to read package.json for ${dir}:`, error);
          }
        }
        
        // Try to read project metadata if it exists
        if (await fs.pathExists(projectMetaPath)) {
          try {
            const metadata = await fs.readJson(projectMetaPath);
            framework = metadata.framework || framework;
            category = metadata.category || category;
            complexity = metadata.complexity || complexity;
            projectInfo = { ...projectInfo, ...metadata };
          } catch (error) {
            logger.warn(`Failed to read project metadata for ${dir}:`, error);
          }
        }

        // Count components/files
        let componentCount = 0;
        try {
          const srcPath = path.join(projectPath, 'src');
          if (await fs.pathExists(srcPath)) {
            const files = await this.scanProjectFiles(srcPath);
            componentCount = files.filter(f => 
              f.endsWith('.tsx') || f.endsWith('.jsx') || 
              f.endsWith('.vue') || f.endsWith('.svelte')
            ).length;
          }
        } catch (_error) {
          componentCount = 5; // Default if can't scan
        }

        // Create template entry
        const template: Template = {
          id: `template-${dir}`,
          name: projectInfo.name || dir,
          framework,
          category,
          complexity,
          componentCount,
          successRate: projectInfo.successRate || 85,
          cognitiveLoadScore: projectInfo.cognitiveLoadScore || 5,
          productionReady: projectInfo.productionReady !== false,
          testCoverage: projectInfo.testCoverage || 0,
          documentationScore: projectInfo.documentationScore || 70,
          maintainabilityIndex: projectInfo.maintainabilityIndex || 75
        };

        await this.saveTemplate(template);
        templatesAdded++;
      }

      logger.info(`Scanned project library: Added ${templatesAdded} templates`);
    } catch (error: any) {
      logger.error('Failed to scan project library for templates:', error);
    }
  }
}

export default LearningSystem;
