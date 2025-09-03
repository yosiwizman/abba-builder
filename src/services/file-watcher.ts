import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import path from 'path';
import log from 'electron-log';

const logger = log.scope('file-watcher');

export interface FileWatcherOptions {
  ignored?: string[];
  persistent?: boolean;
  ignoreInitial?: boolean;
  awaitWriteFinish?: boolean | {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
  depth?: number;
}

export class EnhancedFileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private watchedPaths: Set<string> = new Set();

  constructor(private options: FileWatcherOptions = {}) {
    super();
    
    // Set sensible defaults
    this.options = {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/out/**',
        '**/.vite/**',
        '**/build/**',
        '**/*.log',
        ...((options.ignored || []))
      ],
      persistent: options.persistent !== false,
      ignoreInitial: options.ignoreInitial !== false,
      awaitWriteFinish: options.awaitWriteFinish !== false ? {
        stabilityThreshold: 300,
        pollInterval: 100,
        ...((typeof options.awaitWriteFinish === 'object' ? options.awaitWriteFinish : {}))
      } : false,
      depth: options.depth
    };
  }

  /**
   * Watch a file or directory
   * Replaces buggy fs.watch with robust Chokidar implementation
   */
  watch(paths: string | string[]): void {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    
    logger.info('Starting file watcher for paths:', pathArray);

    // Initialize watcher if not exists
    if (!this.watcher) {
      this.watcher = chokidar.watch([], this.options);
      this.setupEventListeners();
    }

    // Add new paths
    pathArray.forEach(p => {
      if (!this.watchedPaths.has(p)) {
        this.watcher!.add(p);
        this.watchedPaths.add(p);
        logger.debug(`Added path to watcher: ${p}`);
      }
    });
  }

  /**
   * Unwatch specific paths
   */
  unwatch(paths: string | string[]): void {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    
    if (!this.watcher) return;

    pathArray.forEach(p => {
      if (this.watchedPaths.has(p)) {
        this.watcher!.unwatch(p);
        this.watchedPaths.delete(p);
        logger.debug(`Removed path from watcher: ${p}`);
      }
    });
  }

  /**
   * Stop watching all paths and close the watcher
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.watcher) {
        resolve();
        return;
      }

      this.watcher.close().then(() => {
        this.watcher = null;
        this.watchedPaths.clear();
        logger.info('File watcher closed');
        resolve();
      });
    });
  }

  /**
   * Get all currently watched paths
   */
  getWatched(): Record<string, string[]> {
    if (!this.watcher) return {};
    return this.watcher.getWatched();
  }

  private setupEventListeners(): void {
    if (!this.watcher) return;

    // File/Directory added
    this.watcher.on('add', (filePath: string, stats?: any) => {
      logger.debug(`File added: ${filePath}`);
      this.emit('add', filePath, stats);
      this.emit('all', 'add', filePath, stats);
    });

    // File changed
    this.watcher.on('change', (filePath: string, stats?: any) => {
      logger.debug(`File changed: ${filePath}`);
      this.emit('change', filePath, stats);
      this.emit('all', 'change', filePath, stats);
    });

    // File/Directory removed
    this.watcher.on('unlink', (filePath: string) => {
      logger.debug(`File removed: ${filePath}`);
      this.emit('unlink', filePath);
      this.emit('all', 'unlink', filePath);
    });

    // Directory added
    this.watcher.on('addDir', (dirPath: string, stats?: any) => {
      logger.debug(`Directory added: ${dirPath}`);
      this.emit('addDir', dirPath, stats);
      this.emit('all', 'addDir', dirPath, stats);
    });

    // Directory removed
    this.watcher.on('unlinkDir', (dirPath: string) => {
      logger.debug(`Directory removed: ${dirPath}`);
      this.emit('unlinkDir', dirPath);
      this.emit('all', 'unlinkDir', dirPath);
    });

    // Ready event - initial scan complete
    this.watcher.on('ready', () => {
      logger.info('File watcher ready - initial scan complete');
      this.emit('ready');
    });

    // Error handling
    this.watcher.on('error', (error: Error) => {
      logger.error('File watcher error:', error);
      this.emit('error', error);
    });

    // Raw events (for debugging)
    this.watcher.on('raw', (event: string, filePath: string, details: any) => {
      logger.debug(`Raw event: ${event} - ${filePath}`, details);
      this.emit('raw', event, filePath, details);
    });
  }
}

/**
 * Singleton instance for the application
 */
let globalWatcher: EnhancedFileWatcher | null = null;

export function getFileWatcher(options?: FileWatcherOptions): EnhancedFileWatcher {
  if (!globalWatcher) {
    globalWatcher = new EnhancedFileWatcher(options);
  }
  return globalWatcher;
}

/**
 * Utility function to watch for specific file types
 */
export function watchCodeFiles(projectPath: string, callback: (event: string, filePath: string) => void): EnhancedFileWatcher {
  const watcher = new EnhancedFileWatcher({
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.log',
      '**/*.tmp'
    ],
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  const codePatterns = [
    path.join(projectPath, '**/*.{js,jsx,ts,tsx}'),
    path.join(projectPath, '**/*.{json,md}'),
    path.join(projectPath, '**/*.{css,scss,sass}'),
    path.join(projectPath, '**/*.{html,vue,svelte}')
  ];

  watcher.watch(codePatterns);
  watcher.on('all', callback);

  return watcher;
}

/**
 * Watch for configuration changes
 */
export function watchConfigFiles(projectPath: string, callback: (event: string, filePath: string) => void): EnhancedFileWatcher {
  const watcher = new EnhancedFileWatcher({
    ignoreInitial: true,
    awaitWriteFinish: true
  });

  const configPatterns = [
    path.join(projectPath, 'package.json'),
    path.join(projectPath, 'tsconfig*.json'),
    path.join(projectPath, '.env*'),
    path.join(projectPath, '*.config.{js,ts}'),
    path.join(projectPath, '.eslintrc*'),
    path.join(projectPath, '.prettierrc*')
  ];

  watcher.watch(configPatterns);
  watcher.on('all', callback);

  return watcher;
}

export default EnhancedFileWatcher;
