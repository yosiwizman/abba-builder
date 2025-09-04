/**
 * Master Debugger and Error Logger
 * Comprehensive error catching and debugging system for Abba AI Builder
 */

import * as fs from 'fs-extra';
import * as path from 'path';

interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  source: string;
  message: string;
  stack?: string;
  context?: any;
}

export class MasterDebugger {
  private static instance: MasterDebugger;
  private logs: ErrorLog[] = [];
  private logFile: string;
  private isElectron: boolean;
  
  private constructor() {
    this.logFile = path.join(process.cwd(), 'logs', `abba-debug-${Date.now()}.log`);
    this.isElectron = !!(typeof window !== 'undefined' && (window as any).electronAPI);
    this.setupGlobalErrorHandlers();
    this.ensureLogDirectory();
  }
  
  static getInstance(): MasterDebugger {
    if (!MasterDebugger.instance) {
      MasterDebugger.instance = new MasterDebugger();
    }
    return MasterDebugger.instance;
  }
  
  private ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirpSync(logDir);
    }
  }
  
  private setupGlobalErrorHandlers() {
    // Catch unhandled errors
    if (typeof window !== 'undefined') {
      // Browser/Renderer process
      window.addEventListener('error', (event) => {
        this.logError('Window Error', event.message, event.error?.stack, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.logError('Unhandled Promise Rejection', event.reason?.message || String(event.reason), event.reason?.stack);
      });
      
      // React Error Boundary logging
      if ((window as any).React) {
        const originalError = console.error;
        console.error = (...args) => {
          if (args[0]?.includes?.('React')) {
            this.logError('React Error', args.join(' '), new Error().stack);
          }
          originalError.apply(console, args);
        };
      }
    } else {
      // Node.js/Main process
      process.on('uncaughtException', (error) => {
        this.logError('Uncaught Exception', error.message, error.stack);
      });
      
      process.on('unhandledRejection', (reason, promise) => {
        this.logError('Unhandled Rejection', String(reason), (reason as Error)?.stack);
      });
    }
  }
  
  logError(source: string, message: string, stack?: string, context?: any) {
    this.log('error', source, message, stack, context);
  }
  
  logWarning(source: string, message: string, context?: any) {
    this.log('warning', source, message, undefined, context);
  }
  
  logInfo(source: string, message: string, context?: any) {
    this.log('info', source, message, undefined, context);
  }
  
  logDebug(source: string, message: string, context?: any) {
    this.log('debug', source, message, undefined, context);
  }
  
  private log(level: ErrorLog['level'], source: string, message: string, stack?: string, context?: any) {
    const logEntry: ErrorLog = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      stack,
      context
    };
    
    this.logs.push(logEntry);
    
    // Console output with colors
    const colors = {
      error: '\x1b[31m',
      warning: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[37m',
      reset: '\x1b[0m'
    };
    
     console.log(`${colors[level]}[${level.toUpperCase()}] ${source}: ${message}${colors.reset}`);
    if (stack) 
    if (context) 
    
    // Write to file
    this.writeToFile(logEntry);
    
    // Send to main process if in renderer
    if (this.isElectron && typeof window !== 'undefined') {
      (window as any).electronAPI?.send('debug-log', logEntry);
    }
  }
  
  private writeToFile(log: ErrorLog) {
    try {
      const logString = JSON.stringify(log, null, 2) + ',\n';
      fs.appendFileSync(this.logFile, logString);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  async performFullSystemCheck(): Promise<{
    errors: string[];
    warnings: string[];
    info: string[];
    status: 'healthy' | 'warning' | 'critical';
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];
    
    // Check React components
    try {
      const componentFiles = await this.findFiles('**/*.tsx', 'src/components');
      for (const file of componentFiles) {
        const content = await fs.readFile(file, 'utf-8');
        if (!content.includes('import React') && !content.includes('from "react"')) {
          warnings.push(`${file}: Missing React import`);
        }
        if (content.includes('console.error')) {
          warnings.push(`${file}: Contains console.error`);
        }
      }
    } catch (error) {
      errors.push(`Component check failed: ${error.message}`);
    }
    
    // Check CSS imports
    try {
      const mainFiles = ['src/renderer.tsx', 'src/main.tsx', 'src/index.tsx'];
      let cssImported = false;
      for (const file of mainFiles) {
        if (fs.existsSync(file)) {
          const content = await fs.readFile(file, 'utf-8');
          if (content.includes('globals.css') || content.includes('styles.css')) {
            cssImported = true;
            info.push(`CSS imported in ${file}`);
            break;
          }
        }
      }
      if (!cssImported) {
        errors.push('CSS not imported in any main file');
      }
    } catch (error) {
      errors.push(`CSS import check failed: ${error.message}`);
    }
    
    // Check package.json
    try {
      const pkg = await fs.readJson('package.json');
      if (!pkg.dependencies) errors.push('No dependencies in package.json');
      if (!pkg.scripts?.start) errors.push('No start script in package.json');
      if (!pkg.scripts?.build) warnings.push('No build script in package.json');
      
      // Check critical dependencies
      const criticalDeps = ['react', 'react-dom', 'electron', '@vitejs/plugin-react'];
      for (const dep of criticalDeps) {
        if (!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]) {
          errors.push(`Missing critical dependency: ${dep}`);
        }
      }
    } catch (error) {
      errors.push(`Package.json check failed: ${error.message}`);
    }
    
    // Check Vite config
    try {
      const viteConfigs = ['vite.config.ts', 'vite.config.mts', 'vite.renderer.config.mts'];
      let viteFound = false;
      for (const config of viteConfigs) {
        if (fs.existsSync(config)) {
          viteFound = true;
          const content = await fs.readFile(config, 'utf-8');
          if (!content.includes('react')) {
            warnings.push(`${config}: React plugin not configured`);
          }
          info.push(`Vite config found: ${config}`);
        }
      }
      if (!viteFound) {
        errors.push('No Vite configuration found');
      }
    } catch (error) {
      errors.push(`Vite config check failed: ${error.message}`);
    }
    
    // Check Tailwind config
    try {
      if (fs.existsSync('tailwind.config.ts') || fs.existsSync('tailwind.config.js')) {
        info.push('Tailwind configuration found');
        
        // Check PostCSS config
        if (!fs.existsSync('postcss.config.js')) {
          warnings.push('PostCSS configuration missing');
        }
      } else {
        warnings.push('Tailwind configuration missing');
      }
    } catch (error) {
      warnings.push(`Tailwind check failed: ${error.message}`);
    }
    
    // Check for TypeScript errors
    try {
      const tsConfig = await fs.readJson('tsconfig.json');
      if (!tsConfig.compilerOptions) {
        errors.push('Invalid TypeScript configuration');
      }
      info.push('TypeScript configured');
    } catch (error) {
      errors.push(`TypeScript config check failed: ${error.message}`);
    }
    
    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (errors.length > 0) status = 'critical';
    else if (warnings.length > 0) status = 'warning';
    
    return { errors, warnings, info, status };
  }
  
  private async findFiles(pattern: string, dir: string): Promise<string[]> {
    const files: string[] = [];
    
    async function walk(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.includes('node_modules')) {
          await walk(fullPath);
        } else if (entry.isFile() && fullPath.includes('.tsx')) {
          files.push(fullPath);
        }
      }
    }
    
    if (fs.existsSync(dir)) {
      await walk(dir);
    }
    
    return files;
  }
  
  getLogs(): ErrorLog[] {
    return this.logs;
  }
  
  getErrorCount(): number {
    return this.logs.filter(log => log.level === 'error').length;
  }
  
  getWarningCount(): number {
    return this.logs.filter(log => log.level === 'warning').length;
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.getErrorCount(),
        warnings: this.getWarningCount(),
        total: this.logs.length
      },
      logs: this.logs
    };
    
    const reportPath = path.join(process.cwd(), 'logs', `report-${Date.now()}.json`);
    fs.writeJsonSync(reportPath, report, { spaces: 2 });
    
    return reportPath;
  }
}

// Export singleton instance
export const masterDebugger = MasterDebugger.getInstance();
