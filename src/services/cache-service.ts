import { app } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import Database from 'better-sqlite3';
import log from 'electron-log';

const logger = log.scope('cache-service');

export interface CacheEntry {
  key: string;
  value: string;
  expires_at: number;
  created_at: number;
  category: string;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  categories: Record<string, number>;
}

class CacheService {
  private db: Database.Database | null = null;
  private cacheDir: string;
  private dbPath: string;
  private totalHits: number = 0;
  private totalMisses: number = 0;

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'cache');
    this.dbPath = path.join(this.cacheDir, 'api_cache.db');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.ensureDir(this.cacheDir);

      // Initialize SQLite database
      this.db = new Database(this.dbPath);
      
      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          category TEXT NOT NULL,
          hits INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_expires_at ON cache(expires_at);
        CREATE INDEX IF NOT EXISTS idx_category ON cache(category);
      `);

      // Clean up expired entries on startup
      this.cleanupExpired();

      logger.info('Cache service initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.db) {
      logger.warn('Cache service not initialized');
      return null;
    }

    try {
      const now = Date.now();
      
      // Get entry and check expiration
      const row = this.db.prepare(`
        SELECT value, expires_at, hits FROM cache WHERE key = ?
      `).get(key) as any;

      if (!row) {
        this.totalMisses++;
        return null;
      }

      if (row.expires_at < now) {
        // Entry expired, delete it
        this.db.prepare('DELETE FROM cache WHERE key = ?').run(key);
        this.totalMisses++;
        return null;
      }

      // Update hit count
      this.db.prepare('UPDATE cache SET hits = hits + 1 WHERE key = ?').run(key);
      this.totalHits++;

      return JSON.parse(row.value) as T;
    } catch (error: any) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, category: string = 'general', ttlSeconds: number = 3600): Promise<void> {
    if (!this.db) {
      logger.warn('Cache service not initialized');
      return;
    }

    try {
      const now = Date.now();
      const expiresAt = now + (ttlSeconds * 1000);
      const serializedValue = JSON.stringify(value);

      // Insert or replace entry
      this.db.prepare(`
        INSERT OR REPLACE INTO cache (key, value, expires_at, created_at, category, hits)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(key, serializedValue, expiresAt, now, category);

    } catch (error: any) {
      logger.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.db) return;

    try {
      this.db.prepare('DELETE FROM cache WHERE key = ?').run(key);
    } catch (error: any) {
      logger.error('Cache delete error:', error);
    }
  }

  async clear(category?: string): Promise<void> {
    if (!this.db) return;

    try {
      if (category) {
        this.db.prepare('DELETE FROM cache WHERE category = ?').run(category);
      } else {
        this.db.prepare('DELETE FROM cache').run();
      }
      logger.info(`Cache cleared${category ? ` for category: ${category}` : ''}`);
    } catch (error: any) {
      logger.error('Cache clear error:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    if (!this.db) {
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        categories: {}
      };
    }

    try {
      // Get total entries
      const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM cache').get() as any;
      const totalEntries = totalRow.count;

      // Get size
      const sizeRow = this.db.prepare('SELECT SUM(LENGTH(value)) as size FROM cache').get() as any;
      const totalSize = sizeRow.size || 0;

      // Get categories
      const categoryRows = this.db.prepare(`
        SELECT category, COUNT(*) as count 
        FROM cache 
        GROUP BY category
      `).all() as any[];

      const categories: Record<string, number> = {};
      for (const row of categoryRows) {
        categories[row.category] = row.count;
      }

      // Calculate hit rate
      const totalRequests = this.totalHits + this.totalMisses;
      const hitRate = totalRequests > 0 ? (this.totalHits / totalRequests) * 100 : 0;

      return {
        totalEntries,
        totalSize,
        hitRate,
        categories
      };
    } catch (error: any) {
      logger.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        categories: {}
      };
    }
  }

  private cleanupExpired(): void {
    if (!this.db) return;

    try {
      const now = Date.now();
      const result = this.db.prepare('DELETE FROM cache WHERE expires_at < ?').run(now);
      if ((result as any).changes > 0) {
        logger.info(`Cleaned up ${(result as any).changes} expired cache entries`);
      }
    } catch (error: any) {
      logger.error('Failed to cleanup expired entries:', error);
    }
  }

  // Helper methods for specific data types

  async getCachedGitHubRepo(owner: string, repo: string): Promise<any | null> {
    const key = `github:repo:${owner}/${repo}`;
    return this.get(key);
  }

  async setCachedGitHubRepo(owner: string, repo: string, data: any): Promise<void> {
    const key = `github:repo:${owner}/${repo}`;
    await this.set(key, data, 'github', 86400); // Cache for 24 hours
  }

  async getCachedStackOverflowQuestions(tag: string, sort: string): Promise<any | null> {
    const key = `stackoverflow:questions:${tag}:${sort}`;
    return this.get(key);
  }

  async setCachedStackOverflowQuestions(tag: string, sort: string, data: any): Promise<void> {
    const key = `stackoverflow:questions:${tag}:${sort}`;
    await this.set(key, data, 'stackoverflow', 3600); // Cache for 1 hour
  }

  async getCachedProjectLibrary(): Promise<any | null> {
    return this.get('project:library:all');
  }

  async setCachedProjectLibrary(data: any): Promise<void> {
    await this.set('project:library:all', data, 'projects', 1800); // Cache for 30 minutes
  }

  // Periodic cleanup (run every hour)
  startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 3600000); // Every hour
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;
