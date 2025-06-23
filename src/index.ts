// 导入核心类型和实现
import { FastCacheWithTTL } from './fast-cache-ttl.js'
import { FastCache } from './fast-cache.js'
import type { CacheKey, CacheNode, CacheOptions, CacheStats, IFastCache } from './types.js'

// 重新导出核心类型
export type { CacheKey, CacheNode, CacheOptions, CacheStats, IFastCache }

// 重新导出缓存实现
export { FastCache, FastCacheWithTTL }

// 便捷工厂函数
export function createCache<K extends CacheKey, V>(maxSize: number) {
  return new FastCache<K, V>(maxSize)
}

export function createCacheWithTTL<K extends CacheKey, V>(options: CacheOptions) {
  return new FastCacheWithTTL<K, V>(options)
}

// 常用场景的预设
export const CachePresets = {
  // API 响应缓存
  apiCache: <T>(maxSize = 1000) => createCache<string, T>(maxSize),

  // 计算结果缓存
  computeCache: <T>(maxSize = 500) => createCache<string, T>(maxSize),

  // 会话缓存 (30分钟 TTL)
  sessionCache: <T>(maxSize = 100, ttl = 30 * 60 * 1000) =>
    createCacheWithTTL<string, T>({ maxSize, ttl, autoCleanup: true }),

  // 临时缓存 (5分钟 TTL)
  tempCache: <T>(maxSize = 200, ttl = 5 * 60 * 1000) =>
    createCacheWithTTL<string, T>({ maxSize, ttl, autoCleanup: true }),
} as const
