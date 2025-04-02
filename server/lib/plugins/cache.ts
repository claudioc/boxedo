import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

type CacheStorage = Map<string, CacheItem<unknown>>;

export interface Cache {
  get: <T>(key: string) => CacheItem<T> | null;
  set: <T>(key: string, value: T, ttl?: number) => void;
  reset: (key?: string) => void;
}

const cachePlugin: FastifyPluginCallback = async (fastify) => {
  const cache: CacheStorage = new Map();

  const cacheManager: Cache = {
    get: <T>(key: string): CacheItem<T> | null => {
      const item = cache.get(key) as CacheItem<T> | undefined;
      if (!item) return null;

      // Check if item has expired
      if (item.timestamp && Date.now() > item.timestamp) {
        cache.delete(key);
        return null;
      }

      return item;
    },

    set: <T>(key: string, value: T, ttl = 0): void => {
      const timestamp = ttl ? Date.now() + ttl : 0;
      cache.set(key, { data: value, timestamp });
    },

    reset: (key?: string): void => {
      if (key) {
        cache.delete(key);
      } else {
        cache.clear();
      }
    },
  };

  // Decorate fastify instance with our cache manager
  fastify.decorate('cache', cacheManager);

  // Clean up on close
  fastify.addHook('onClose', (_instance, done) => {
    cache.clear();
    done();
  });
};

export default fp(cachePlugin, {
  name: 'cache-manager',
});
