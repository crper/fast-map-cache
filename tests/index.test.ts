// mini-scaffold/tests/index.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest'
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

// 新增：TTL 统计与 has 行为细节
describe('TTL stats and has() behavior', () => {
  test('expired get() should increase misses and expired', async () => {
    const cache = new FastCacheWithTTL<string, number>({ maxSize: 2, ttl: 30 })
    cache.set('x', 1)
    await new Promise((r) => setTimeout(r, 40))

    // 第一次读取触发懒删除，计入 misses 与 expired
    expect(cache.get('x')).toBeUndefined()
    const stats = cache.getStats()
    expect(stats.misses).toBe(1)
    expect(stats.expired).toBe(1)
    expect(cache.size).toBe(0)
  })

  test('has() on expired item should delete it and reduce size', async () => {
    const cache = new FastCacheWithTTL<string, number>({ maxSize: 2, ttl: 20 })
    cache.set('x', 1)
    await new Promise((r) => setTimeout(r, 30))

    expect(cache.has('x')).toBe(false)
    expect(cache.size).toBe(0)
  })

  test('setMany and cleanup should work with TTL', async () => {
    const cache = new FastCacheWithTTL<string, number>({ maxSize: 5, ttl: 30 })
    cache.setMany([
      ['a', 1],
      ['b', 2],
    ])
    expect(cache.size).toBe(2)

    await new Promise((r) => setTimeout(r, 40))
    const removed = cache.cleanup()
    expect(removed).toBe(2)
    expect(cache.size).toBe(0)
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

// 自动清理与销毁相关用例
describe('Auto cleanup and destroy', () => {
  test('autoCleanup removes expired items using fake timers', () => {
    vi.useFakeTimers()
    // 固定起始时间，便于可预测
    vi.setSystemTime(new Date(2025, 0, 1, 0, 0, 0))

    const cache = new FastCacheWithTTL<string, number>({
      maxSize: 3,
      ttl: 50,
      autoCleanup: true,
      cleanupInterval: 30,
    })

    cache.set('k', 1)

    // 30ms 时执行一次清理，但尚未过期
    vi.advanceTimersByTime(30)
    expect(cache.get('k')).toBe(1)
    expect(cache.size).toBe(1)

    // 60ms 时第二次清理，已过期，应被移除
    vi.advanceTimersByTime(30)
    expect(cache.get('k')).toBeUndefined()
    expect(cache.size).toBe(0)

    cache.destroy()
    vi.useRealTimers()
  })

  test('destroy() is idempotent when autoCleanup is enabled', () => {
    vi.useFakeTimers()
    const cache = new FastCacheWithTTL<string, number>({ maxSize: 2, ttl: 100, autoCleanup: true })
    cache.set('a', 1)

    // 多次调用不应抛错
    cache.destroy()
    cache.destroy()

    // 计时器已清理，推进计时器不应抛错
    vi.advanceTimersByTime(500)
    expect(cache.size).toBe(1)
    vi.useRealTimers()
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

// 新增：TTL 与 LRU 交互与配置校验
describe('TTL and eviction integration', () => {
  test('should not leave TTL dangling nodes after LRU eviction', () => {
    const cache = new FastCacheWithTTL<string, number>({ maxSize: 2, ttl: 60_000 })

    cache.set('a', 1)
    cache.set('b', 2)
    // 触发 LRU 淘汰（应淘汰 a）
    cache.set('c', 3)

    expect(cache.has('a')).toBe(false)
    expect(cache.size).toBe(2)

    // 不应有残留 TTL 节点导致 cleanup 误删或异常
    const removed = cache.cleanup()
    expect(removed).toBe(0)
    expect(cache.size).toBe(2)
  })

  test('should throw for non-positive cleanupInterval when autoCleanup enabled', () => {
    expect(
      () =>
        new FastCacheWithTTL<string, number>({
          maxSize: 2,
          ttl: 1000,
          autoCleanup: true,
          cleanupInterval: 0,
        }),
    ).toThrow('cleanupInterval must be positive')
  })
})
