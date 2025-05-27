// Cache utility functions
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, any> = new Map();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Set item in localStorage with TTL
  setLocalStorage<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn(`Failed to set localStorage for key ${key}:`, error);
    }
  }

  // Get item from localStorage with TTL check
  getLocalStorage<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const item: CacheItem<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if expired
      if (now - item.timestamp > item.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn(`Failed to get localStorage for key ${key}:`, error);
      return null;
    }
  }

  // Remove item from localStorage
  removeLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove localStorage for key ${key}:`, error);
    }
  }

  // Clear all items matching pattern from localStorage
  clearLocalStoragePattern(pattern: string): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn(`Failed to clear localStorage pattern ${pattern}:`, error);
    }
  }

  // Memory cache methods (for session-only data)
  setMemory<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    this.memoryCache.set(key, item);

    // Auto cleanup after TTL
    setTimeout(() => {
      this.memoryCache.delete(key);
    }, ttl);
  }

  getMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key) as CacheItem<T>;
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.data;
  }

  removeMemory(key: string): void {
    this.memoryCache.delete(key);
  }

  clearMemory(): void {
    this.memoryCache.clear();
  }

  // Get cache statistics
  getCacheStats(): {
    localStorage: { keys: number; size: string };
    memory: { keys: number };
  } {
    let localStorageKeys = 0;
    let localStorageSize = 0;

    try {
      localStorageKeys = Object.keys(localStorage).length;
      localStorageSize = JSON.stringify(localStorage).length;
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error);
    }

    return {
      localStorage: {
        keys: localStorageKeys,
        size: `${(localStorageSize / 1024).toFixed(2)} KB`,
      },
      memory: {
        keys: this.memoryCache.size,
      },
    };
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Specific cache keys for the application
export const CACHE_KEYS = {
  AUTOMATION_FLOWS: 'automation_flows_cache',
  DEVICE_LIST: 'device_list_cache',
  METRICS: 'metrics_cache',
  SYSTEM_STATUS: 'system_status_cache',
} as const;

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,     // 1 minute
  MEDIUM: 5 * 60 * 1000,    // 5 minutes
  LONG: 15 * 60 * 1000,     // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;
