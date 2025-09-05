/**
 * Redis configuration module
 * Provides Redis connection settings and client management
 */

import log from "electron-log";

const logger = log.scope("redis-config");

// Redis connection URL from environment variable
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Redis availability check state
let redisAvailable = false;
let redisClient: any = null;

/**
 * Get the Redis URL
 */
export function getRedisUrl(): string | null {
  if (!process.env.REDIS_URL && !process.env.NODE_ENV?.includes("production")) {
    // In development, Redis is optional
    return null;
  }
  return REDIS_URL;
}

/**
 * Initialize Redis connection (if available)
 */
export async function initializeRedis(): Promise<void> {
  try {
    // Try to import ioredis dynamically
    const Redis = await import("ioredis").catch(() => null);

    if (!Redis) {
      logger.info("Redis module not installed, skipping initialization");
      redisAvailable = false;
      return;
    }

    if (redisClient) {
      logger.debug("Redis already initialized");
      return;
    }

    const url = getRedisUrl();
    if (!url) {
      logger.info("No Redis URL configured, skipping initialization");
      redisAvailable = false;
      return;
    }

    // Create Redis client
    redisClient = new Redis.default(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.info("Redis connection attempts exceeded");
          return null;
        }
        return Math.min(times * 50, 2000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    // Test connection
    await redisClient.connect();
    await redisClient.ping();

    redisAvailable = true;
    logger.info("Redis initialized successfully");
  } catch (error: any) {
    logger.info(
      `Redis initialization failed (${error.message}), continuing without Redis`,
    );
    redisAvailable = false;
    redisClient = null;
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  if (!redisAvailable || !redisClient) {
    return false;
  }

  try {
    await redisClient.ping();
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}

/**
 * Get Redis client instance (if available)
 */
export function getQueueClient(): any | null {
  return redisClient;
}

/**
 * Shutdown Redis connection
 */
export async function shutdownRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info("Redis connection closed");
    } catch (error) {
      logger.warn("Error closing Redis connection:", error);
    } finally {
      redisClient = null;
      redisAvailable = false;
    }
  }
}
