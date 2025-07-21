import { logger } from './logger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 60000) { // 1 minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  set<T>(key: string, data: T, ttlMs = 300000): void { // 5 minutes default
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    this.cache.set(key, item);
    logger.debug('Cache set', { key, ttl: ttlMs });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      logger.debug('Cache miss', { key });
      return null;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      logger.debug('Cache expired', { key });
      return null;
    }

    logger.debug('Cache hit', { key });
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      logger.debug('Cache deleted', { key });
    }
    return result;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared', { previousSize: size });
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      const isExpired = now - item.timestamp > item.ttl;
      if (isExpired) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.debug('Cache cleanup completed', {
        deletedCount,
        remainingItems: this.cache.size,
      });
    }
  }

  getStats(): {
    size: number;
    keys: string[];
    oldestItem: number | null;
    newestItem: number | null;
  } {
    const keys = Array.from(this.cache.keys());
    const timestamps = Array.from(this.cache.values()).map(item => item.timestamp);
    
    return {
      size: this.cache.size,
      keys,
      oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestItem: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache utility functions
export const cacheGet = <T>(key: string): T | null => cache.get<T>(key);
export const cacheSet = <T>(key: string, data: T, ttlMs?: number): void => cache.set(key, data, ttlMs);
export const cacheDelete = (key: string): boolean => cache.delete(key);
export const cacheHas = (key: string): boolean => cache.has(key);

// Cache decorators for common patterns
export const withCache = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs = 300000
): Promise<T> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = cacheGet<T>(key);
      if (cached !== null) {
        resolve(cached);
        return;
      }

      // Fetch fresh data
      const data = await fetchFn();
      
      // Cache the result
      cacheSet(key, data, ttlMs);
      
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};