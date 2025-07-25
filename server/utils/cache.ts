/**
 * ============================================================================
 * 💾 Rindwa Emergency Platform - Advanced Caching Service
 * ============================================================================
 * Comprehensive caching solution with Redis primary and memory fallback,
 * supporting TTL, patterns, and high-performance operations
 */

// Optional Redis import - fallback to memory-only cache if not available
let Redis: any = null;
try {
  Redis = require('ioredis');
} catch (error) {
  // Redis not available, will use memory cache only
}

import logger from './logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Compress large values
  serialize?: boolean; // Custom serialization
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

export class AdvancedCache {
  private redis: any = null; // Redis instance type
  private memoryCache = new Map<string, { value: any; expires: number }>();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };
  private isRedisConnected = false;
  private readonly maxMemoryCacheSize = 1000; // Max items in memory cache
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRedis();
    this.startMemoryCleanup();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL && Redis) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000
        });

        this.redis.on('connect', () => {
          logger.info('Redis cache connected successfully');
          this.isRedisConnected = true;
        });

        this.redis.on('error', (error: any) => {
          logger.error('Redis cache error:', error);
          this.isRedisConnected = false;
          this.stats.errors++;
        });

        this.redis.on('close', () => {
          logger.warn('Redis cache connection closed');
          this.isRedisConnected = false;
        });

        await this.redis.connect();
      } else {
        logger.info('No REDIS_URL configured or Redis not available, using memory cache only');
      }
    } catch (error: any) {
      logger.error('Failed to initialize Redis cache:', error);
      this.isRedisConnected = false;
    }
  }

  /**
   * Start memory cache cleanup interval
   */
  private startMemoryCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupMemoryCache();
    }, 60000); // Cleanup every minute
  }

  /**
   * Clean up expired memory cache entries
   */
  private cleanupMemoryCache() {
    const now = Date.now();
    let removed = 0;

    // Convert entries to array to avoid iterator issues
    const entries = Array.from(this.memoryCache.entries());
    for (const [key, item] of entries) {
      if (item.expires <= now) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    // If memory cache is too large, remove oldest entries
    if (this.memoryCache.size > this.maxMemoryCacheSize) {
      const remainingEntries = Array.from(this.memoryCache.entries());
      remainingEntries.sort((a, b) => a[1].expires - b[1].expires);
      
      const toRemove = this.memoryCache.size - this.maxMemoryCacheSize;
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(remainingEntries[i][0]);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Serialize value for storage
   */
  private serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Cache serialization error:', error);
      return '';
    }
  }

  /**
   * Deserialize value from storage
   */
  private deserialize(value: string): any {
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache deserialization error:', error);
      return null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.isRedisConnected && this.redis) {
        const value = await this.redis.get(key);
        if (value !== null) {
          this.stats.hits++;
          return this.deserialize(value);
        }
      }

      // Fallback to memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && memoryItem.expires > Date.now()) {
        this.stats.hits++;
        return memoryItem.value;
      }

      // Remove expired memory cache item
      if (memoryItem) {
        this.memoryCache.delete(key);
      }

      this.stats.misses++;
      return null;

    } catch (error) {
      logger.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const { ttl = 3600, serialize = true } = options;
      const serializedValue = serialize ? this.serialize(value) : value;
      const expiresAt = Date.now() + (ttl * 1000);

      // Set in Redis if available
      if (this.isRedisConnected && this.redis) {
        await this.redis.setex(key, ttl, serializedValue);
      }

      // Always set in memory cache as backup
      this.memoryCache.set(key, {
        value: serialize ? value : this.deserialize(serializedValue),
        expires: expiresAt
      });

      this.stats.sets++;
      return true;

    } catch (error) {
      logger.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get or set pattern - get value, or compute and cache if not found
   */
  async getOrSet<T = any>(
    key: string, 
    computeFn: () => Promise<T> | T, 
    ttl: number = 3600
  ): Promise<T> {
    try {
      // Try to get existing value
      const existing = await this.get<T>(key);
      if (existing !== null) {
        return existing;
      }

      // Compute new value
      const newValue = await computeFn();
      
      // Cache the new value
      await this.set(key, newValue, { ttl });
      
      return newValue;

    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;

      // Delete from Redis if available
      if (this.isRedisConnected && this.redis) {
        const result = await this.redis.del(key);
        deleted = result > 0;
      }

      // Delete from memory cache
      const memoryDeleted = this.memoryCache.delete(key);
      deleted = deleted || memoryDeleted;

      if (deleted) {
        this.stats.deletes++;
      }

      return deleted;

    } catch (error) {
      logger.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      let deleted = 0;

      // Delete from Redis if available
      if (this.isRedisConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          deleted += await this.redis.del(...keys);
        }
      }

      // Delete from memory cache
      const regex = new RegExp(pattern.replace('*', '.*'));
      const keys = Array.from(this.memoryCache.keys());
      for (const key of keys) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deleted++;
        }
      }

      this.stats.deletes += deleted;
      return deleted;

    } catch (error) {
      logger.error('Cache deletePattern error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      // Check Redis first
      if (this.isRedisConnected && this.redis) {
        const exists = await this.redis.exists(key);
        if (exists) return true;
      }

      // Check memory cache
      const memoryItem = this.memoryCache.get(key);
      return memoryItem !== undefined && memoryItem.expires > Date.now();

    } catch (error) {
      logger.error('Cache exists error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { memorySize: number; redisConnected: boolean } {
    return {
      ...this.stats,
      memorySize: this.memoryCache.size,
      redisConnected: this.isRedisConnected
    };
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    try {
      // Clear Redis if available
      if (this.isRedisConnected && this.redis) {
        await this.redis.flushdb();
      }

      // Clear memory cache
      this.memoryCache.clear();

      logger.info('Cache cleared successfully');

    } catch (error) {
      logger.error('Cache clear error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results: (T | null)[] = new Array(keys.length).fill(null);

      // Try Redis first
      if (this.isRedisConnected && this.redis && keys.length > 0) {
        const redisResults = await this.redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          if (redisResults[i] !== null) {
            results[i] = this.deserialize(redisResults[i]!);
            this.stats.hits++;
          }
        }
      }

      // Fill missing values from memory cache
      for (let i = 0; i < keys.length; i++) {
        if (results[i] === null) {
          const memoryItem = this.memoryCache.get(keys[i]);
          if (memoryItem && memoryItem.expires > Date.now()) {
            results[i] = memoryItem.value;
            this.stats.hits++;
          } else {
            this.stats.misses++;
          }
        }
      }

      return results;

    } catch (error) {
      logger.error('Cache mget error:', error);
      this.stats.errors++;
      return new Array(keys.length).fill(null);
    }
  }

  /**
   * Set multiple values at once
   */
  async mset(items: { key: string; value: any; ttl?: number }[]): Promise<boolean> {
    try {
      const pipeline = this.redis?.pipeline();
      
      for (const item of items) {
        const { key, value, ttl = 3600 } = item;
        const serializedValue = this.serialize(value);
        const expiresAt = Date.now() + (ttl * 1000);

        // Add to Redis pipeline if available
        if (pipeline) {
          pipeline.setex(key, ttl, serializedValue);
        }

        // Set in memory cache
        this.memoryCache.set(key, {
          value,
          expires: expiresAt
        });

        this.stats.sets++;
      }

      // Execute Redis pipeline
      if (pipeline) {
        await pipeline.exec();
      }

      return true;

    } catch (error) {
      logger.error('Cache mset error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }

      // Clear memory cache
      this.memoryCache.clear();

      logger.info('Cache service shut down gracefully');

    } catch (error) {
      logger.error('Cache shutdown error:', error);
    }
  }
}

/**
 * Higher-order function for caching async functions
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: { 
    keyGenerator: (...args: Parameters<T>) => string;
    ttl?: number;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = options.keyGenerator(...args);
    
    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    const result = await fn(...args);
    await cache.set(cacheKey, result, options.ttl ? { ttl: options.ttl } : undefined);
    return result;
  }) as T;
}

// Export singleton instance
export const cache = new AdvancedCache();

// Graceful shutdown handling
process.on('SIGTERM', () => cache.shutdown());
process.on('SIGINT', () => cache.shutdown());