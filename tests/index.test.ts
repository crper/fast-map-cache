// mini-scaffold/tests/index.test.ts
import { beforeEach, describe, expect, test } from 'vitest'
import {
  CachePresets,
  FastCache,
  FastCacheWithTTL,
  createCache,
  createCacheWithTTL,
} from '../src/index'

describe('FastCache (LRU)', () => {
  let cache: FastCache<string, number>

  beforeEach(() => {
    cache = new FastCache<string, number>(3)
  })

  test('should set and get values', () => {
    cache.set('key1', 1)
    cache.set('key2', 2)

    expect(cache.get('key1')).toBe(1)
    expect(cache.get('key2')).toBe(2)
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  test('should respect capacity limit', () => {
    cache.set('key1', 1)
    cache.set('key2', 2)
    cache.set('key3', 3)
    cache.set('key4', 4) // 这应该淘汰 key1

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBe(2)
    expect(cache.get('key3')).toBe(3)
    expect(cache.get('key4')).toBe(4)
    expect(cache.size).toBe(3)
  })

  test('should implement LRU eviction correctly', () => {
    cache.set('key1', 1)
    cache.set('key2', 2)
    cache.set('key3', 3)

    // 访问 key1，使其成为最近使用的
    cache.get('key1')

    // 添加新项，应该淘汰 key2（最久未使用）
    cache.set('key4', 4)

    expect(cache.get('key1')).toBe(1) // 仍然存在
    expect(cache.get('key2')).toBeUndefined() // 被淘汰
    expect(cache.get('key3')).toBe(3)
    expect(cache.get('key4')).toBe(4)
  })

  test('should update existing values', () => {
    cache.set('key1', 1)
    cache.set('key1', 10) // 更新值

    expect(cache.get('key1')).toBe(10)
    expect(cache.size).toBe(1)
  })

  test('should delete values', () => {
    cache.set('key1', 1)
    cache.set('key2', 2)

    expect(cache.delete('key1')).toBe(true)
    expect(cache.delete('nonexistent')).toBe(false)
    expect(cache.get('key1')).toBeUndefined()
    expect(cache.size).toBe(1)
  })

  test('should clear all values', () => {
    cache.set('key1', 1)
    cache.set('key2', 2)

    cache.clear()

    expect(cache.size).toBe(0)
    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBeUndefined()
  })

  test('should check if key exists', () => {
    cache.set('key1', 1)

    expect(cache.has('key1')).toBe(true)
    expect(cache.has('nonexistent')).toBe(false)
  })

  test('should handle batch operations', () => {
    const entries: [string, number][] = [
      ['key1', 1],
      ['key2', 2],
      ['key3', 3],
    ]
    cache.setMany(entries)

    expect(cache.size).toBe(3)

    const result = cache.getMany(['key1', 'key2', 'nonexistent'])
    expect(result.size).toBe(2)
    expect(result.get('key1')).toBe(1)
    expect(result.get('key2')).toBe(2)
    expect(result.has('nonexistent')).toBe(false)
  })

  test('should provide correct statistics', () => {
    cache.set('key1', 1)
    cache.set('key2', 2)

    // 产生命中和未命中
    cache.get('key1') // 命中
    cache.get('key1') // 命中
    cache.get('nonexistent') // 未命中

    const stats = cache.getStats()
    expect(stats.hits).toBe(2)
    expect(stats.misses).toBe(1)
    expect(stats.hitRate).toBe(2 / 3)
    expect(stats.size).toBe(2)
    expect(stats.capacity).toBe(3)
  })
})

describe('FastCacheWithTTL', () => {
  let cache: FastCacheWithTTL<string, number>

  beforeEach(() => {
    cache = new FastCacheWithTTL<string, number>({
      maxSize: 3,
      ttl: 100, // 100ms
      autoCleanup: false,
    })
  })

  test('should expire items after TTL', async () => {
    cache.set('key1', 1)

    expect(cache.get('key1')).toBe(1)

    // 等待过期
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  test('should not expire items within TTL', async () => {
    cache.set('key1', 1)

    // 在 TTL 内访问
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(cache.get('key1')).toBe(1)
  })

  test('should update TTL on set', async () => {
    cache.set('key1', 1)

    // 在接近过期时更新值
    await new Promise((resolve) => setTimeout(resolve, 80))
    cache.set('key1', 10) // 重置 TTL

    // 等待原来的 TTL 时间
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(cache.get('key1')).toBe(10) // 仍然有效
  })

  test('should manually cleanup expired items', async () => {
    cache.set('key1', 1)
    cache.set('key2', 2)

    await new Promise((resolve) => setTimeout(resolve, 150))

    const removedCount = cache.cleanup()
    expect(removedCount).toBe(2)
    expect(cache.size).toBe(0)
  })

  test('should handle has() with TTL', async () => {
    cache.set('key1', 1)

    expect(cache.has('key1')).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(cache.has('key1')).toBe(false)
  })
})

describe('Factory functions and presets', () => {
  test('should create cache with factory function', () => {
    const cache = createCache<string, number>(10)
    cache.set('key1', 1)

    expect(cache.get('key1')).toBe(1)
    expect(cache.capacity).toBe(10)
  })

  test('should create TTL cache with factory function', () => {
    const cache = createCacheWithTTL<string, number>({
      maxSize: 5,
      ttl: 1000,
    })

    cache.set('key1', 1)
    expect(cache.get('key1')).toBe(1)
    expect(cache.capacity).toBe(5)
  })

  test('should use preset caches', () => {
    const apiCache = CachePresets.apiCache<{ data: string }>(50)
    const computeCache = CachePresets.computeCache<number>(25)

    apiCache.set('api1', { data: 'test' })
    computeCache.set('calc1', 42)

    expect(apiCache.get('api1')).toEqual({ data: 'test' })
    expect(computeCache.get('calc1')).toBe(42)
    expect(apiCache.capacity).toBe(50)
    expect(computeCache.capacity).toBe(25)
  })
})

describe('Edge cases and error handling', () => {
  test('should throw error for invalid cache size', () => {
    expect(() => new FastCache(0)).toThrow('Cache size must be positive')
    expect(() => new FastCache(-1)).toThrow('Cache size must be positive')
  })

  test('should throw error for invalid TTL', () => {
    expect(() => new FastCacheWithTTL({ maxSize: 10, ttl: -1 })).toThrow('TTL must be positive')
  })

  test('should handle cache with size 1', () => {
    const cache = new FastCache<string, number>(1)

    cache.set('key1', 1)
    cache.set('key2', 2) // 应该淘汰 key1

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBe(2)
    expect(cache.size).toBe(1)
  })

  test('should handle multiple updates to same key', () => {
    const cache = new FastCache<string, number>(2)

    cache.set('key1', 1)
    cache.set('key1', 2)
    cache.set('key1', 3)

    expect(cache.get('key1')).toBe(3)
    expect(cache.size).toBe(1)
  })
})
