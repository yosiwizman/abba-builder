import Redis from 'ioredis';

export class RedisService {
  private static instance: RedisService;
  private client: Redis | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private constructor() {}

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
//       console.log('Attempting to connect to Redis at:', redisUrl);
      
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          if (times > this.maxReconnectAttempts) {
            console.error('Max Redis reconnection attempts reached. Using in-memory fallback.');
            return null;
          }
          const delay = Math.min(times * 500, 3000);
//           console.log(`Retrying Redis connection in ${delay}ms...`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
//         console.log('✅ Redis connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('error', (err) => {
        console.error('Redis connection error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
//         console.log('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.reconnectAttempts++;
//         console.log(`Reconnecting to Redis (attempt ${this.reconnectAttempts})...`);
      });

      await this.client.connect();
      
      // Test the connection
      await this.client.ping();
      
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
//       console.log('Will use in-memory fallback for caching');
      this.client = null;
      this.isConnected = false;
      // Don't throw - allow app to work without Redis
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  // Cache operations with fallback
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      return this.getFromMemory(key);
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return this.getFromMemory(key);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      return this.setInMemory(key, value, ttl);
    }
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis SET error:', error);
      this.setInMemory(key, value, ttl);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return this.deleteFromMemory(key);
    }
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      this.deleteFromMemory(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return this.existsInMemory(key);
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return this.existsInMemory(key);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      // Memory cache doesn't support expiry updates
      return;
    }
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
    }
  }

  // In-memory fallback storage
  private memoryCache = new Map<string, { value: string; expires?: number }>();

  private getFromMemory(key: string): string | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    if (item.expires && Date.now() > item.expires) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return item.value;
  }

  private setInMemory(key: string, value: string, ttl?: number): void {
    const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.memoryCache.set(key, { value, expires });
  }

  private deleteFromMemory(key: string): void {
    this.memoryCache.delete(key);
  }

  private existsInMemory(key: string): boolean {
    return this.memoryCache.has(key);
  }

  // Helper to check if Redis is available
  isRedisAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  // Session management helpers
  async setSession(sessionId: string, data: any, ttl = 3600): Promise<void> {
    const value = JSON.stringify(data);
    await this.set(`session:${sessionId}`, value, ttl);
  }

  async getSession(sessionId: string): Promise<any | null> {
    const value = await this.get(`session:${sessionId}`);
    return value ? JSON.parse(value) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Token blacklist for JWT invalidation
  async blacklistToken(token: string, ttl = 7200): Promise<void> {
    await this.set(`blacklist:${token}`, '1', ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return await this.exists(`blacklist:${token}`);
  }
}
