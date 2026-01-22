/**
 * Simple in-memory cache with TTL support
 * Use for short-lived caching of expensive computations (report data, etc.)
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set(key, value, ttlMs) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a specific key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get current cache size
   * @returns {number} - Number of entries in cache
   */
  size() {
    return this.cache.size;
  }
}

// Singleton instance
const cache = new MemoryCache();

/**
 * Get cached value or fetch and cache it
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not cached
 * @param {number} ttlMs - Time to live in milliseconds (default: 10 seconds)
 * @returns {Promise<any>} - Cached or freshly fetched value
 */
const getCachedOrFetch = async (key, fetchFn, ttlMs = 10000) => {
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetchFn();
  cache.set(key, value, ttlMs);
  return value;
};

module.exports = {
  cache,
  getCachedOrFetch,
};
