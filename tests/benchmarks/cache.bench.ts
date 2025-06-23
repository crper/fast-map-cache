import { bench, describe } from 'vitest'
import { FastCache, FastCacheWithTTL } from '../../src'

describe('Cache Performance Benchmarks', () => {
  const CACHE_SIZE = 1000
  const DATASET_SIZE = 10000

  // 准备测试数据 - 模拟真实应用场景
  const keys = Array.from({ length: DATASET_SIZE }, (_, i) => `user:${i}`)
  const expensiveData = Array.from({ length: DATASET_SIZE }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    profile: {
      age: 20 + (i % 50),
      city: `City ${i % 100}`,
      preferences: Array(10)
        .fill(0)
        .map((_, j) => `pref${j + i}`),
    },
    metadata: {
      created: new Date().toISOString(),
      lastLogin: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      permissions: Array(5)
        .fill(0)
        .map((_, j) => `permission${j}`),
    },
  }))

  // 模拟热点数据访问模式 (80/20 rule)
  const createHotKeys = (totalKeys: number, hotRatio: number) => {
    const hotKeysCount = Math.floor(totalKeys * hotRatio)
    const hotKeys = keys.slice(0, hotKeysCount)
    const coldKeys = keys.slice(hotKeysCount)

    // 生成访问序列：80% 访问热点数据，20% 访问冷数据
    const accessPattern: string[] = []
    for (let i = 0; i < 5000; i++) {
      if (Math.random() < 0.8) {
        accessPattern.push(hotKeys[Math.floor(Math.random() * hotKeys.length)])
      } else {
        accessPattern.push(coldKeys[Math.floor(Math.random() * coldKeys.length)])
      }
    }
    return accessPattern
  }

  const hotAccessPattern = createHotKeys(1000, 0.2) // 20% 热点数据

  // 模拟昂贵的计算或数据库查询
  const expensiveOperation = (key: string) => {
    // 模拟复杂计算（CPU 密集）
    let result = 0
    for (let i = 0; i < 1000; i++) {
      result += Math.sin(i) * Math.cos(i)
    }

    const id = parseInt(key.split(':')[1])
    return {
      ...expensiveData[id % expensiveData.length],
      computedValue: result,
      timestamp: Date.now(),
    }
  }

  describe('Real-world Cache Benefits', () => {
    bench('Without Cache - Expensive Operations', () => {
      // 模拟没有缓存的情况：每次都执行昂贵操作
      const results: unknown[] = []

      for (const key of hotAccessPattern) {
        results.push(expensiveOperation(key))
      }
    })

    bench('With FastCache - Hot Data Access', () => {
      const cache = new FastCache<string, unknown>(CACHE_SIZE)
      const results: unknown[] = []

      for (const key of hotAccessPattern) {
        let data = cache.get(key)
        if (!data) {
          data = expensiveOperation(key)
          cache.set(key, data)
        }
        results.push(data)
      }
    })

    bench('Memory vs Cache Trade-off - Large Dataset', () => {
      // 测试内存使用优化：只缓存热点数据而不是全部数据
      const cache = new FastCache<string, unknown>(200) // 小缓存
      const results: unknown[] = []

      // 访问大量数据，但只缓存最常用的
      for (let i = 0; i < 2000; i++) {
        const key = keys[i % DATASET_SIZE]
        let data = cache.get(key)
        if (!data) {
          data = expensiveOperation(key)
          cache.set(key, data)
        }
        results.push(data)
      }
    })
  })

  describe('Cache Hit Rate Impact', () => {
    const testCacheEfficiency = (hitRate: number, cacheSize: number) => {
      const cache = new FastCache<string, unknown>(cacheSize)
      const totalOperations = 1000
      let hits = 0
      let misses = 0

      // 预填充一些数据
      const prefillCount = Math.floor(cacheSize * 0.8)
      for (let i = 0; i < prefillCount; i++) {
        cache.set(keys[i], expensiveData[i])
      }

      for (let i = 0; i < totalOperations; i++) {
        let key: string
        if (Math.random() < hitRate) {
          // 命中：访问已缓存的数据
          key = keys[Math.floor(Math.random() * prefillCount)]
        } else {
          // 未命中：访问新数据
          key = keys[prefillCount + (i % (DATASET_SIZE - prefillCount))]
        }

        const data = cache.get(key)
        if (data) {
          hits++
        } else {
          misses++
          cache.set(key, expensiveOperation(key))
        }
      }

      return { hits, misses, hitRate: hits / (hits + misses) }
    }

    bench('High Hit Rate Scenario (90%)', () => {
      testCacheEfficiency(0.9, 500)
    })

    bench('Medium Hit Rate Scenario (70%)', () => {
      testCacheEfficiency(0.7, 500)
    })

    bench('Low Hit Rate Scenario (30%)', () => {
      testCacheEfficiency(0.3, 500)
    })
  })

  describe('TTL Cache vs Manual Expiration', () => {
    bench('Manual Cache Invalidation', () => {
      const cache = new FastCache<string, unknown>(CACHE_SIZE)
      const cacheTimestamps = new Map<string, number>()
      const TTL = 5000 // 5秒

      for (let i = 0; i < 1000; i++) {
        const key = keys[i % 100] // 重复访问相同key
        const now = Date.now()

        // 手动检查过期
        const timestamp = cacheTimestamps.get(key)
        let data = cache.get(key)

        if (!data || !timestamp || now - timestamp > TTL) {
          data = expensiveOperation(key)
          cache.set(key, data)
          cacheTimestamps.set(key, now)
        }
      }
    })

    bench('Built-in TTL Cache', () => {
      const cache = new FastCacheWithTTL<string, unknown>({
        maxSize: CACHE_SIZE,
        ttl: 5000,
        autoCleanup: false,
      })

      for (let i = 0; i < 1000; i++) {
        const key = keys[i % 100]

        let data = cache.get(key)
        if (!data) {
          data = expensiveOperation(key)
          cache.set(key, data)
        }
      }
    })
  })

  describe('Batch Operations Efficiency', () => {
    bench('Individual Operations', () => {
      const cache = new FastCache<string, unknown>(CACHE_SIZE)

      // 单个设置操作
      for (let i = 0; i < 1000; i++) {
        cache.set(keys[i], expensiveData[i])
      }

      // 单个获取操作
      const results: unknown[] = []
      for (let i = 0; i < 1000; i++) {
        const data = cache.get(keys[i])
        if (data) {
          results.push(data)
        }
      }
    })

    bench('Batch Operations', () => {
      const cache = new FastCache<string, unknown>(CACHE_SIZE)

      // 批量设置
      const entries: [string, unknown][] = []
      for (let i = 0; i < 1000; i++) {
        entries.push([keys[i], expensiveData[i]])
      }
      cache.setMany(entries)

      // 批量获取
      cache.getMany(keys.slice(0, 1000))
    })
  })

  describe('Memory Efficiency Comparison', () => {
    bench('Unlimited Memory Usage (No Cache)', () => {
      // 模拟无限制的内存使用：存储所有访问过的数据
      const storage = new Map<string, unknown>()

      for (let i = 0; i < 5000; i++) {
        const key = keys[i % DATASET_SIZE]
        if (!storage.has(key)) {
          storage.set(key, expensiveOperation(key))
        }
      }

      // 最终会存储大量数据
    })

    bench('Controlled Memory Usage (With Cache)', () => {
      // 使用缓存控制内存使用：只保留最常用的数据
      const cache = new FastCache<string, unknown>(CACHE_SIZE)

      for (let i = 0; i < 5000; i++) {
        const key = keys[i % DATASET_SIZE]
        let data = cache.get(key)
        if (!data) {
          data = expensiveOperation(key)
          cache.set(key, data)
        }
      }

      // 内存使用被限制在 CACHE_SIZE 范围内
    })
  })

  describe('Cache Performance Scaling', () => {
    const sizes = [100, 500, 1000, 2000, 5000]

    sizes.forEach((size) => {
      bench(`Cache Size ${size} - Real Access Pattern`, () => {
        const cache = new FastCache<string, unknown>(size)
        let totalOperations = 0
        let cacheHits = 0

        // 使用真实的访问模式：热点数据 + 随机访问
        for (let i = 0; i < 2000; i++) {
          const key = hotAccessPattern[i % hotAccessPattern.length]
          totalOperations++

          let data = cache.get(key)
          if (data) {
            cacheHits++
          } else {
            data = expensiveOperation(key)
            cache.set(key, data)
          }
        }

        // 记录命中率信息（在实际测试中可以输出）
        // const hitRate = cacheHits / totalOperations
        // console.log(`Cache size ${size}: Hit rate ${hitRate.toFixed(3)}`)
        void cacheHits
        void totalOperations
      })
    })
  })

  describe('Concurrent Access Simulation', () => {
    bench('High Frequency Access', () => {
      const cache = new FastCache<string, unknown>(CACHE_SIZE)

      // 模拟高频访问场景
      const startTime = Date.now()

      while (Date.now() - startTime < 100) {
        // 100ms 内尽可能多的操作
        const key = keys[Math.floor(Math.random() * 100)] // 访问热点数据

        let data = cache.get(key)
        if (!data) {
          data = expensiveOperation(key)
          cache.set(key, data)
        }
      }
    })

    bench('Cache Stats Monitoring Overhead', () => {
      const cache = new FastCache<string, unknown>(CACHE_SIZE)

      for (let i = 0; i < 1000; i++) {
        const key = keys[i % 100]

        let data = cache.get(key)
        if (!data) {
          data = expensiveOperation(key)
          cache.set(key, data)
        }

        // 定期获取统计信息
        if (i % 100 === 0) {
          const stats = cache.getStats()
          // 在实际应用中可能需要记录或上报这些统计信息
          void stats
        }
      }
    })
  })
})
