/**
 * Python Bridge for Validation Engine
 * Connects Node.js to Python validation scripts
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

interface ValidationResult {
  success: boolean;
  output?: string;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
  line?: number;
}

export class PythonBridge {
  private pythonPath: string = 'python';
  private validationScriptPath: string;
  
  constructor() {
    this.validationScriptPath = path.join(__dirname, 'validation_engine.py');
    this.checkPythonAvailability();
  }
  
  /**
   * Check if Python is available
   */
  private async checkPythonAvailability(): Promise<void> {
    try {
      const pythonCommands = ['python3', 'python', 'py'];
      
      for (const cmd of pythonCommands) {
        try {
          const result = await this.executeCommand(cmd, ['--version']);
          if (result.includes('Python')) {
            this.pythonPath = cmd;
             console.log(`✅ Python found: ${cmd}`);
            return;
          }
        } catch {
          // Try next command
        }
      }
      
      console.warn('⚠️ Python not found - validation will be limited');
    } catch (error) {
      console.error('Failed to check Python availability:', error);
    }
  }
  
  /**
   * Execute a command and return output
   */
  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let output = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error || 'Command failed'));
        }
      });
      
      process.on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Validate code using Python validation engine
   */
  async validateCode(code: string, language: string): Promise<ValidationResult> {
    // First try Python validation
    try {
      if (!fs.existsSync(this.validationScriptPath)) {
        console.warn('Validation script not found, using fallback');
        return this.fallbackValidation(code, language);
      }
      
      return await this.pythonValidation(code, language);
    } catch (error: any) {
      console.warn('Python validation failed, using fallback:', error.message);
      return this.fallbackValidation(code, language);
    }
  }
  
  /**
   * Python-based validation
   */
  private async pythonValidation(code: string, language: string): Promise<ValidationResult> {
    return new Promise((resolve, reject) => {
      // Write code to temp file to avoid argument length issues
      const tempFile = path.join(__dirname, `temp_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, code);
      
      const process = spawn(this.pythonPath, [
        this.validationScriptPath,
        tempFile,
        language
      ]);
      
      let output = '';
      let error = '';
      
      // Watchdog to prevent hung subprocesses (30s)
      const killTimer = setTimeout(() => {
        try {
          process.kill('SIGKILL');
        } catch {}
      }, 30000);
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        clearTimeout(killTimer);
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // Ignore cleanup errors
        }
        
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            resolve({
              success: false,
              error: 'Failed to parse validation result'
            });
          }
        } else {
          resolve({
            success: false,
            error: error || 'Validation failed'
          });
        }
      });
      
      process.on('error', (err) => {
        clearTimeout(killTimer);
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // Ignore cleanup errors
        }
        
        reject(err);
      });
    });
  }
  
  /**
   * Fallback validation using Node.js
   */
  private async fallbackValidation(code: string, language: string): Promise<ValidationResult> {
    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          return this.validateJavaScript(code);
        
        case 'typescript':
        case 'ts':
          return this.validateTypeScript(code);
        
        case 'json':
          return this.validateJSON(code);
        
        case 'html':
          return this.validateHTML(code);
        
        case 'css':
          return this.validateCSS(code);
        
        default:
          return {
            success: true,
            output: 'Language validation not available, assuming valid',
            warnings: ['No validation available for ' + language]
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validate JavaScript code
   */
  private async validateJavaScript(code: string): Promise<ValidationResult> {
    try {
      // Basic syntax check using Function constructor
      new Function(code);
      
      // Check for common issues
      const warnings: string[] = [];
      
      if (code.includes('var ')) {
        warnings.push('Consider using let/const instead of var');
      }
      
      if (!code.includes('use strict') && !code.includes('"use strict"')) {
        warnings.push('Consider adding "use strict"');
      }
      
      return {
        success: true,
        output: 'JavaScript syntax valid',
        warnings
      };
    } catch (error: any) {
      const match = error.message.match(/at position (\d+)/);
      return {
        success: false,
        error: error.message,
        line: match ? parseInt(match[1]) : undefined,
        suggestions: ['Check for syntax errors', 'Verify bracket matching']
      };
    }
  }
  
  /**
   * Validate TypeScript code (basic)
   */
  private async validateTypeScript(code: string): Promise<ValidationResult> {
    // For now, validate as JavaScript
    // Full TypeScript validation requires tsc
    const jsResult = await this.validateJavaScript(
      code.replace(/:\s*\w+/g, '') // Remove type annotations
    );
    
    if (jsResult.success) {
      return {
        ...jsResult,
        output: 'TypeScript syntax appears valid (basic check)',
        warnings: [...(jsResult.warnings || []), 'Full TypeScript validation requires tsc']
      };
    }
    
    return jsResult;
  }
  
  /**
   * Validate JSON
   */
  private validateJSON(code: string): ValidationResult {
    try {
      JSON.parse(code);
      return {
        success: true,
        output: 'Valid JSON'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        suggestions: ['Check for missing commas', 'Verify quote usage', 'Ensure proper bracket matching']
      };
    }
  }
  
  /**
   * Validate HTML (basic)
   */
  private validateHTML(code: string): ValidationResult {
    const warnings: string[] = [];
    
    if (!code.includes('<!DOCTYPE') && !code.includes('<!doctype')) {
      warnings.push('Missing DOCTYPE declaration');
    }
    
    if (!code.includes('<html') && !code.includes('<HTML')) {
      warnings.push('Missing html tag');
    }
    
    // Check for unclosed tags
    const tagPattern = /<(\w+)[^>]*>/g;
    const openTags: string[] = [];
    let match;
    
    while ((match = tagPattern.exec(code)) !== null) {
      const tagName = match[1].toLowerCase();
      if (!['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName)) {
        openTags.push(tagName);
      }
    }
    
    const closePattern = /<\/(\w+)>/g;
    while ((match = closePattern.exec(code)) !== null) {
      const tagName = match[1].toLowerCase();
      const index = openTags.lastIndexOf(tagName);
      if (index !== -1) {
        openTags.splice(index, 1);
      }
    }
    
    if (openTags.length > 0) {
      warnings.push(`Possibly unclosed tags: ${openTags.join(', ')}`);
    }
    
    return {
      success: true,
      output: 'HTML structure appears valid',
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Validate CSS (basic)
   */
  private validateCSS(code: string): ValidationResult {
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      return {
        success: false,
        error: `Mismatched braces: ${openBraces} open, ${closeBraces} close`,
        suggestions: ['Check for missing closing braces']
      };
    }
    
    return {
      success: true,
      output: 'CSS syntax appears valid'
    };
  }
  
  /**
   * Run code in sandbox (for testing)
   */
  async runInSandbox(code: string, language: string): Promise<any> {
    // This would require a proper sandbox implementation
    // For now, just validate
    return this.validateCode(code, language);
  }
}

// Export singleton instance
const pythonBridge = new PythonBridge();
export default pythonBridge;
