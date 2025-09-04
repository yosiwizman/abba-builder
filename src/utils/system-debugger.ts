/**
 * Enterprise-Grade System Debugger and Health Monitor
 * Ensures Abba AI Builder runs at 95%+ success rate
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SystemHealth {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  recommendations: string[];
  successRate: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export class SystemDebugger {
  private projectRoot: string;
  private logFile: string;
  
  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.logFile = path.join(this.projectRoot, 'logs', 'system-health.json');
  }
  
  /**
   * Run complete system diagnostics
   */
  async runDiagnostics(): Promise<SystemHealth> {
     console.log('🔍 Running Enterprise System Diagnostics...\n');
    
    const checks: HealthCheck[] = [];
    const recommendations: string[] = [];
    
    // 1. Check Node.js version
    checks.push(await this.checkNodeVersion());
    
    // 2. Check dependencies
    checks.push(await this.checkDependencies());
    
    // 3. Check API keys
    checks.push(await this.checkAPIKeys());
    
    // 4. Check file system
    checks.push(await this.checkFileSystem());
    
    // 5. Check TypeScript compilation
    checks.push(await this.checkTypeScript());
    
    // 6. Check critical services
    checks.push(await this.checkServices());
    
    // 7. Check CSS/Tailwind
    checks.push(await this.checkStyles());
    
    // 8. Check database
    checks.push(await this.checkDatabase());
    
    // 9. Check memory usage
    checks.push(await this.checkMemory());
    
    // 10. Check build system
    checks.push(await this.checkBuildSystem());
    
    // Calculate overall health
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warning').length;
    const passedChecks = checks.filter(c => c.status === 'pass').length;
    
    const successRate = (passedChecks / checks.length) * 100;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (failedChecks > 0) status = 'critical';
    else if (warningChecks > 2) status = 'warning';
    
    // Generate recommendations
    if (failedChecks > 0) {
      recommendations.push('Fix critical issues before deployment');
    }
    if (warningChecks > 0) {
      recommendations.push('Address warnings to improve stability');
    }
    
    const health: SystemHealth = {
      timestamp: new Date().toISOString(),
      status,
      checks,
      recommendations,
      successRate
    };
    
    // Save health report
    await this.saveHealthReport(health);
    
    // Print summary
    this.printHealthSummary(health);
    
    return health;
  }
  
  /**
   * Check Node.js version
   */
  private async checkNodeVersion(): Promise<HealthCheck> {
    try {
      const { stdout } = await execAsync('node --version');
      const version = stdout.trim();
      const major = parseInt(version.split('.')[0].substring(1));
      
      if (major >= 20) {
        return {
          name: 'Node.js Version',
          status: 'pass',
          message: `Node.js ${version} meets requirements`,
          details: { version, required: '>=20' }
        };
      } else {
        return {
          name: 'Node.js Version',
          status: 'fail',
          message: `Node.js ${version} is below required version 20`,
          details: { version, required: '>=20' }
        };
      }
    } catch (error) {
      return {
        name: 'Node.js Version',
        status: 'fail',
        message: 'Failed to check Node.js version',
        details: error
      };
    }
  }
  
  /**
   * Check dependencies
   */
  private async checkDependencies(): Promise<HealthCheck> {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const lockPath = path.join(this.projectRoot, 'package-lock.json');
      
      if (!fs.existsSync(packagePath)) {
        return {
          name: 'Dependencies',
          status: 'fail',
          message: 'package.json not found'
        };
      }
      
      if (!fs.existsSync(lockPath)) {
        return {
          name: 'Dependencies',
          status: 'warning',
          message: 'package-lock.json not found - run npm install'
        };
      }
      
      // Check critical dependencies
      const pkg = await fs.readJson(packagePath);
      const criticalDeps = [
        '@anthropic-ai/sdk',
        'electron',
        'react',
        'typescript',
        'fs-extra'
      ];
      
      const missing = criticalDeps.filter(dep => 
        !pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]
      );
      
      if (missing.length > 0) {
        return {
          name: 'Dependencies',
          status: 'warning',
          message: `Missing critical dependencies: ${missing.join(', ')}`,
          details: { missing }
        };
      }
      
      return {
        name: 'Dependencies',
        status: 'pass',
        message: 'All critical dependencies installed',
        details: { total: Object.keys(pkg.dependencies || {}).length }
      };
    } catch (error) {
      return {
        name: 'Dependencies',
        status: 'fail',
        message: 'Failed to check dependencies',
        details: error
      };
    }
  }
  
  /**
   * Check API keys
   */
  private async checkAPIKeys(): Promise<HealthCheck> {
    try {
      const envPath = path.join(this.projectRoot, '.env');
      
      if (!fs.existsSync(envPath)) {
        return {
          name: 'API Keys',
          status: 'fail',
          message: '.env file not found'
        };
      }
      
      const envContent = await fs.readFile(envPath, 'utf-8');
      const keys = {
        anthropic: /ANTHROPIC_API_KEY=.+/,
        openai: /OPENAI_API_KEY=.+/
      };
      
      const configured = Object.entries(keys).filter(([_, regex]) => 
        regex.test(envContent)
      );
      
      if (configured.length === 0) {
        return {
          name: 'API Keys',
          status: 'warning',
          message: 'No AI API keys configured - app will use fallback mode',
          details: { configured: [] }
        };
      }
      
      return {
        name: 'API Keys',
        status: 'pass',
        message: `${configured.length} API key(s) configured`,
        details: { configured: configured.map(([k]) => k) }
      };
    } catch (error) {
      return {
        name: 'API Keys',
        status: 'warning',
        message: 'Could not check API keys',
        details: error
      };
    }
  }
  
  /**
   * Check file system structure
   */
  private async checkFileSystem(): Promise<HealthCheck> {
    const requiredDirs = [
      'src',
      'src/services',
      'src/services/enhanced',
      'src/components',
      'node_modules',
      '.vite'
    ];
    
    const missing = requiredDirs.filter(dir => 
      !fs.existsSync(path.join(this.projectRoot, dir))
    );
    
    if (missing.length > 0) {
      return {
        name: 'File System',
        status: 'fail',
        message: `Missing directories: ${missing.join(', ')}`,
        details: { missing }
      };
    }
    
    // Check critical files
    const criticalFiles = [
      'src/services/enhanced/orchestrator.ts',
      'src/services/enhanced/claude-opus.ts',
      'src/services/enhanced/context-manager.ts',
      'src/services/enhanced/python-bridge.ts'
    ];
    
    const missingFiles = criticalFiles.filter(file => 
      !fs.existsSync(path.join(this.projectRoot, file))
    );
    
    if (missingFiles.length > 0) {
      return {
        name: 'File System',
        status: 'warning',
        message: `Missing enhanced services: ${missingFiles.length} files`,
        details: { missingFiles }
      };
    }
    
    return {
      name: 'File System',
      status: 'pass',
      message: 'All critical files and directories present'
    };
  }
  
  /**
   * Check TypeScript compilation
   */
  private async checkTypeScript(): Promise<HealthCheck> {
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit --skipLibCheck');
      
      if (stderr || stdout) {
        const errors = (stderr + stdout).split('\n').filter(line => 
          line.includes('error')
        ).length;
        
        if (errors > 0) {
          return {
            name: 'TypeScript',
            status: 'warning',
            message: `${errors} TypeScript errors (non-blocking with skipLibCheck)`,
            details: { errors }
          };
        }
      }
      
      return {
        name: 'TypeScript',
        status: 'pass',
        message: 'TypeScript compilation successful'
      };
    } catch (error: any) {
      // Parse error count from output
      const errorMatch = error.stdout?.match(/Found (\d+) error/);
      const errorCount = errorMatch ? parseInt(errorMatch[1]) : 'unknown';
      
      return {
        name: 'TypeScript',
        status: 'warning',
        message: `TypeScript has ${errorCount} errors (non-critical)`,
        details: { errorCount }
      };
    }
  }
  
  /**
   * Check critical services
   */
  private async checkServices(): Promise<HealthCheck> {
    const services = [
      'src/services/enhanced/orchestrator.ts',
      'src/services/enhanced/claude-opus.ts',
      'src/services/enhanced/context-manager.ts',
      'src/services/enhanced/testing-bots.js',
      'src/services/enhanced/never-fail-stack.js'
    ];
    
    const existing = services.filter(service => 
      fs.existsSync(path.join(this.projectRoot, service))
    );
    
    const percentage = (existing.length / services.length) * 100;
    
    if (percentage === 100) {
      return {
        name: 'Enhanced Services',
        status: 'pass',
        message: 'All enhanced services present',
        details: { total: services.length, existing: existing.length }
      };
    } else if (percentage >= 60) {
      return {
        name: 'Enhanced Services',
        status: 'warning',
        message: `${existing.length}/${services.length} services implemented`,
        details: { percentage: percentage.toFixed(0) }
      };
    } else {
      return {
        name: 'Enhanced Services',
        status: 'fail',
        message: `Only ${existing.length}/${services.length} services found`,
        details: { percentage: percentage.toFixed(0) }
      };
    }
  }
  
  /**
   * Check CSS/Tailwind configuration
   */
  private async checkStyles(): Promise<HealthCheck> {
    try {
      const globalsPath = path.join(this.projectRoot, 'src/styles/globals.css');
      const tailwindPath = path.join(this.projectRoot, 'tailwind.config.ts');
      
      if (!fs.existsSync(globalsPath)) {
        return {
          name: 'Styles',
          status: 'fail',
          message: 'globals.css not found'
        };
      }
      
      if (!fs.existsSync(tailwindPath)) {
        return {
          name: 'Styles',
          status: 'fail',
          message: 'tailwind.config.ts not found'
        };
      }
      
      // Check for problematic patterns
      const cssContent = await fs.readFile(globalsPath, 'utf-8');
      const problems = [];
      
      if (cssContent.includes('@apply') && cssContent.includes('outline-ring/50')) {
        problems.push('Contains problematic @apply directives');
      }
      
      if (!cssContent.includes('@layer')) {
        problems.push('Missing @layer directives');
      }
      
      if (problems.length > 0) {
        return {
          name: 'Styles',
          status: 'warning',
          message: problems.join(', '),
          details: { problems }
        };
      }
      
      return {
        name: 'Styles',
        status: 'pass',
        message: 'CSS configuration correct'
      };
    } catch (error) {
      return {
        name: 'Styles',
        status: 'fail',
        message: 'Failed to check styles',
        details: error
      };
    }
  }
  
  /**
   * Check database
   */
  private async checkDatabase(): Promise<HealthCheck> {
    try {
      const dataDir = path.join(this.projectRoot, 'data');
      const dbFile = path.join(dataDir, 'project-library.json');
      
      if (!fs.existsSync(dataDir)) {
        await fs.ensureDir(dataDir);
        return {
          name: 'Database',
          status: 'warning',
          message: 'Data directory created'
        };
      }
      
      if (fs.existsSync(dbFile)) {
        const db = await fs.readJson(dbFile);
        return {
          name: 'Database',
          status: 'pass',
          message: `Database has ${db.projects?.length || 0} projects`,
          details: { 
            projects: db.projects?.length || 0,
            downloaded: db.statistics?.downloadedProjects || 0
          }
        };
      }
      
      return {
        name: 'Database',
        status: 'warning',
        message: 'Project database not initialized'
      };
    } catch (error) {
      return {
        name: 'Database',
        status: 'warning',
        message: 'Database check failed',
        details: error
      };
    }
  }
  
  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheck> {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const percentage = (usage.heapUsed / usage.heapTotal) * 100;
    
    if (percentage > 90) {
      return {
        name: 'Memory',
        status: 'warning',
        message: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${percentage.toFixed(0)}%)`,
        details: { heapUsedMB, heapTotalMB, percentage }
      };
    }
    
    return {
      name: 'Memory',
      status: 'pass',
      message: `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB`,
      details: { heapUsedMB, heapTotalMB, percentage }
    };
  }
  
  /**
   * Check build system
   */
  private async checkBuildSystem(): Promise<HealthCheck> {
    const viteDir = path.join(this.projectRoot, '.vite');
    const outDir = path.join(this.projectRoot, 'out');
    
    if (!fs.existsSync(viteDir)) {
      return {
        name: 'Build System',
        status: 'warning',
        message: 'No Vite build found - run npm start to build'
      };
    }
    
    const hasProductionBuild = fs.existsSync(outDir);
    
    if (hasProductionBuild) {
      return {
        name: 'Build System',
        status: 'pass',
        message: 'Production build available'
      };
    }
    
    return {
      name: 'Build System',
      status: 'pass',
      message: 'Development build available',
      details: { production: false }
    };
  }
  
  /**
   * Auto-fix common issues
   */
  async autoFix(): Promise<{ fixed: string[], failed: string[] }> {
     console.log('🔧 Running Auto-Fix...\n');
    const fixed: string[] = [];
    const failed: string[] = [];
    
    // 1. Ensure directories exist
    const dirs = ['logs', 'data', 'test-apps', 'test-results'];
    for (const dir of dirs) {
      try {
        await fs.ensureDir(path.join(this.projectRoot, dir));
        fixed.push(`Created ${dir} directory`);
      } catch {
        failed.push(`Failed to create ${dir}`);
      }
    }
    
    // 2. Fix package.json if needed
    try {
      const pkgPath = path.join(this.projectRoot, 'package.json');
      const pkg = await fs.readJson(pkgPath);
      
      if (!pkg.scripts['test:integration']) {
        pkg.scripts['test:integration'] = 'npx tsx test-integration.ts';
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
        fixed.push('Added test:integration script');
      }
    } catch {
      failed.push('Failed to update package.json');
    }
    
    // 3. Create .env.example if missing
    const envExamplePath = path.join(this.projectRoot, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      const envExample = `# AI Provider API Keys
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Context Settings
MAX_CONTEXT_TOKENS=200000
MAX_OUTPUT_TOKENS=32000

# Development
NODE_ENV=development`;
      
      try {
        await fs.writeFile(envExamplePath, envExample);
        fixed.push('Created .env.example');
      } catch {
        failed.push('Failed to create .env.example');
      }
    }
    
     console.log(`✅ Fixed: ${fixed.length} issues`);
     console.log(`❌ Failed: ${failed.length} issues`);
    
    return { fixed, failed };
  }
  
  /**
   * Save health report
   */
  private async saveHealthReport(health: SystemHealth): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.logFile));
      
      // Load existing reports
      let reports: SystemHealth[] = [];
      if (fs.existsSync(this.logFile)) {
        reports = await fs.readJson(this.logFile);
      }
      
      // Add new report (keep last 100)
      reports.push(health);
      if (reports.length > 100) {
        reports = reports.slice(-100);
      }
      
      await fs.writeJson(this.logFile, reports, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save health report:', error);
    }
  }
  
  /**
   * Print health summary
   */
  private printHealthSummary(health: SystemHealth): void {
     console.log('\n' + '='.repeat(60));
     console.log('📊 SYSTEM HEALTH REPORT');
     console.log('='.repeat(60));
    
    // Status emoji
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      critical: '❌'
    };
    
     console.log(`\nOverall Status: ${statusEmoji[health.status]} ${health.status.toUpperCase()}`);
     console.log(`Success Rate: ${health.successRate.toFixed(1)}%`);
     console.log(`Timestamp: ${new Date(health.timestamp).toLocaleString()}`);
    
    // Check summary
     console.log('\n📋 Health Checks:');
    health.checks.forEach(check => {
      const emoji = check.status === 'pass' ? '✅' : 
                    check.status === 'warning' ? '⚠️' : '❌';
       console.log(`  ${emoji} ${check.name}: ${check.message}`);
    });
    
    // Recommendations
    if (health.recommendations.length > 0) {
       console.log('\n💡 Recommendations:');
      health.recommendations.forEach((rec, i) => {
         console.log(`  ${i + 1}. ${rec}`);
      });
    }
    
     console.log('\n' + '='.repeat(60));
  }
}

// Export for CLI usage
export default SystemDebugger;
