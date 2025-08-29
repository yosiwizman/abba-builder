/**
 * Context Manager for Smart File Aggregation
 * Manages 200K context window efficiently
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

// Try to load Anthropic tokenizer for precise token counts (falls back gracefully)
type TokenizerModule = { countTokens?: (text: string) => number };
let tokenizerModule: TokenizerModule | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  tokenizerModule = require('@anthropic-ai/tokenizer') as TokenizerModule;
} catch {
  // Optional dependency; we'll fallback to heuristic if unavailable
}

interface FileInfo {
  path: string;
  content: string;
  tokens: number;
  score?: number;
  size: number;
  extension: string;
}

interface ProjectContext {
  files: FileInfo[];
  totalFiles: number;
  totalTokens: number;
  projectStructure: string;
  packageJson?: any;
  readme?: string;
}

export class ContextManager {
  private maxTokens = 120000; // Leave larger headroom for prompts/refinement to avoid 200k cap
  private tokenEstimateRatio = 4; // Characters per token estimate
  
  /**
   * Aggregate project context intelligently
   */
  async aggregateProjectContext(
    projectPath: string, 
    userRequest: string
  ): Promise<ProjectContext> {
    console.log('📊 Aggregating project context...');
    
    // Scan all project files
    const allFiles = await this.scanProjectFiles(projectPath);
    console.log(`Found ${allFiles.length} files in project`);
    
    // Score files by relevance
    const scoredFiles = this.scoreFileRelevance(allFiles, userRequest);
    
    // Select files within token limit
    const selectedFiles = this.selectWithinTokenLimit(scoredFiles);
    console.log(`Selected ${selectedFiles.length} most relevant files`);
    
    // Get project structure
    const projectStructure = await this.getProjectStructure(projectPath);
    
    // Load package.json if exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = fs.existsSync(packageJsonPath) 
      ? await fs.readJson(packageJsonPath)
      : null;
    
    // Load README if exists
    const readmePath = path.join(projectPath, 'README.md');
    const readme = fs.existsSync(readmePath)
      ? await fs.readFile(readmePath, 'utf-8')
      : '';
    
    return {
      files: selectedFiles,
      totalFiles: selectedFiles.length,
      totalTokens: this.countTokens(selectedFiles),
      projectStructure,
      packageJson,
      readme
    };
  }
  
  /**
   * Scan project files with smart filtering
   */
  private async scanProjectFiles(projectPath: string): Promise<FileInfo[]> {
    const patterns = [
      '**/*.{js,jsx,ts,tsx}',  // JavaScript/TypeScript
      '**/*.{json,yml,yaml}',   // Config files
      '**/*.{css,scss,less}',   // Styles
      '**/*.{html,md}',         // Markup
      '**/package.json',        // Dependencies
      '**/.env.example'         // Environment examples
    ];
    
    const ignore = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.map',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/.vite/**',
      '**/out/**',
      // Avoid scanning very large backup libraries bundled in this repo
      '**/project-library-backup/**',
      // Skip e2e and testing fixtures that are not relevant to generation context
      '**/e2e-tests/**',
      '**/testing/**'
    ];
    
    const files: FileInfo[] = [];
    
    for (const pattern of patterns) {
      try {
        const filePaths = await glob(pattern, {
          cwd: projectPath,
          ignore,
          absolute: false
        });
        
        for (const filePath of filePaths) {
          try {
            const fullPath = path.join(projectPath, filePath);
            const stats = await fs.stat(fullPath);
            
            // Skip files larger than 1MB
            if (stats.size > 1024 * 1024) continue;
            
            const content = await fs.readFile(fullPath, 'utf-8');
            const tokens = this.countTextTokens(content);
            
            files.push({
              path: filePath,
              content,
              tokens,
              size: stats.size,
              extension: path.extname(filePath)
            });
          } catch (error) {
            // Skip files that can't be read
            continue;
          }
        }
      } catch (error) {
        console.warn(`Pattern ${pattern} failed:`, error);
      }
    }
    
    return files;
  }
  
  /**
   * Score files by relevance to user request
   */
  private scoreFileRelevance(files: FileInfo[], request: string): FileInfo[] {
    const keywords = this.extractKeywords(request);
    
    return files.map(file => {
      let score = 0;
      const lowerPath = file.path.toLowerCase();
      const lowerContent = file.content.toLowerCase();
      
      // Score based on path relevance
      keywords.forEach(keyword => {
        if (lowerPath.includes(keyword)) score += 20;
      });
      
      // Score based on content relevance
      keywords.forEach(keyword => {
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
        score += Math.min(matches * 2, 20); // Cap at 20 points per keyword
      });
      
      // Boost scores for important files
      if (file.path.includes('main')) score += 15;
      if (file.path.includes('app')) score += 10;
      if (file.path.includes('index')) score += 10;
      if (file.path.includes('config')) score += 8;
      if (file.path.includes('service')) score += 8;
      if (file.path.includes('component')) score += 5;
      
      // Boost for specific extensions
      if (file.extension === '.ts' || file.extension === '.tsx') score += 5;
      if (file.extension === '.json') score += 3;
      
      // Penalize test files unless specifically requested
      if (!request.includes('test') && file.path.includes('test')) score -= 10;
      
      return {
        ...file,
        score
      };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
  }
  
  /**
   * Extract keywords from user request
   */
  private extractKeywords(request: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
      'need', 'create', 'make', 'build', 'add', 'implement', 'fix', 'update'
    ]);
    
    const words = request.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Add technology-specific keywords
    const techKeywords: string[] = [];
    if (request.includes('react')) techKeywords.push('react', 'component', 'jsx', 'tsx');
    if (request.includes('api')) techKeywords.push('api', 'endpoint', 'route', 'controller');
    if (request.includes('database')) techKeywords.push('db', 'database', 'model', 'schema');
    if (request.includes('auth')) techKeywords.push('auth', 'login', 'user', 'session');
    
    return [...new Set([...words, ...techKeywords])];
  }
  
  /**
   * Select files within token limit
   */
  private selectWithinTokenLimit(files: FileInfo[]): FileInfo[] {
    const selected: FileInfo[] = [];
    let totalTokens = 0;
    
    // Always include critical files if they exist
    const criticalFiles = files.filter(f => 
      f.path === 'package.json' || 
      f.path === 'tsconfig.json' ||
      f.path.endsWith('/index.ts') ||
      f.path.endsWith('/main.ts')
    );
    
    for (const file of criticalFiles) {
      if (totalTokens + file.tokens <= this.maxTokens) {
        selected.push(file);
        totalTokens += file.tokens;
      }
    }
    
    // Add remaining files by score
    for (const file of files) {
      if (selected.includes(file)) continue;
      
      if (totalTokens + file.tokens <= this.maxTokens) {
        selected.push(file);
        totalTokens += file.tokens;
      } else {
        // Try to include a truncated version of important files
        const remainingTokens = this.maxTokens - totalTokens;
        if (remainingTokens > 1000 && (file.score || 0) > 50) {
          const truncatedCore = this.truncateToTokenLimit(file.content, remainingTokens);
          const truncatedTokens = this.countTextTokens(truncatedCore);
          selected.push({
            ...file,
            content: truncatedCore + '\n... [file truncated]',
            tokens: truncatedTokens
          });
          totalTokens += truncatedTokens;
          break;
        }
      }
    }
    
    return selected;
  }
  
  /**
   * Get project structure overview
   */
  private async getProjectStructure(projectPath: string): Promise<string> {
    try {
      const structure: string[] = [];
      const maxDepth = 3;
      
      const buildTree = async (dir: string, prefix = '', depth = 0) => {
        if (depth > maxDepth) return;
        
        const items = await fs.readdir(dir);
        const filtered = items.filter(item => 
          !item.startsWith('.') && 
          item !== 'node_modules' && 
          item !== 'dist' && 
          item !== 'build'
        );
        
        for (let i = 0; i < filtered.length && structure.length < 50; i++) {
          const item = filtered[i];
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);
          const isLast = i === filtered.length - 1;
          const connector = isLast ? '└── ' : '├── ';
          
          structure.push(prefix + connector + item + (stats.isDirectory() ? '/' : ''));
          
          if (stats.isDirectory()) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            await buildTree(itemPath, newPrefix, depth + 1);
          }
        }
      };
      
      await buildTree(projectPath);
      return structure.join('\n');
    } catch (error) {
      console.error('Failed to build project structure:', error);
      return 'Unable to determine project structure';
    }
  }
  
  /**
   * Count total tokens in selected files
   */
  private countTokens(files: FileInfo[]): number {
    return files.reduce((sum, file) => sum + file.tokens, 0);
  }

  /**
   * Precise token counting for a string using Anthropic tokenizer when available.
   * Falls back to a conservative 4-chars-per-token heuristic if not installed.
   */
  private countTextTokens(text: string): number {
    try {
      const fn = (tokenizerModule as any)?.countTokens;
      if (typeof fn === 'function') {
        return fn(text);
      }
    } catch {
      // ignore and use fallback
    }
    return Math.ceil(text.length / this.tokenEstimateRatio);
  }

  /**
   * Truncate text to a maximum number of tokens, using binary search when precise
   * tokenization is available. Falls back to character-based approximation.
   */
  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const hasTokenizer = typeof (tokenizerModule as any)?.countTokens === 'function';
    if (!hasTokenizer) {
      const approxChars = Math.floor(maxTokens * this.tokenEstimateRatio);
      return text.slice(0, Math.min(approxChars, text.length));
    }

    let lo = 0;
    let hi = text.length;
    let best = 0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = text.slice(0, mid);
      const tokens = this.countTextTokens(candidate);
      if (tokens <= maxTokens) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return text.slice(0, best);
  }
  
  /**
   * Build a summary context for quick reference
   */
  async buildSummaryContext(projectPath: string): Promise<string> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = fs.existsSync(packageJsonPath) 
      ? await fs.readJson(packageJsonPath)
      : {};
    
    const structure = await this.getProjectStructure(projectPath);
    
    return `
## Project: ${packageJson.name || 'Unknown'}
## Description: ${packageJson.description || 'No description'}
## Version: ${packageJson.version || '0.0.0'}

### Dependencies:
${Object.keys(packageJson.dependencies || {}).slice(0, 10).join(', ')}

### Project Structure:
${structure}
`;
  }
}

// Export singleton instance
const contextManager = new ContextManager();
export default contextManager;




