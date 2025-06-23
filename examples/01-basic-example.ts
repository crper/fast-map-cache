// pnpm tsx examples/01-basic-example.ts
import { CachePresets, FastCache, FastCacheWithTTL } from '../src'

console.log('🚀 Fast Map Cache 示例\n')

// === 基础 LRU 缓存示例 ===
console.log('=== 基础 LRU 缓存 ===')
const basicCache = new FastCache<string, string>(3)

// 设置一些值
basicCache.set('🍎', 'Apple')
basicCache.set('🍌', 'Banana')
basicCache.set('🍊', 'Orange')

console.log('📦 初始缓存:', {
  size: basicCache.size,
  content: `(🍎, 🍌, 🍊)`,
})

// 访问 '🍎'，使其成为最近使用的
console.log("👆 访问 '🍎':", basicCache.get('🍎'))

// 添加新值，应该淘汰 '🍌'（最久未使用）
basicCache.set('🍇', 'Grapes')
console.log("✅ 添加 '🍇' 后, '🍌' 应该被淘汰:", basicCache.get('🍌')) // undefined
console.log('📦 当前缓存大小:', basicCache.size)

// 检查统计信息
console.log('📊 缓存统计:', basicCache.getStats())
console.log()

// === TTL 缓存示例 ===
console.log('=== TTL 缓存示例 ===')
const ttlCache = new FastCacheWithTTL<string, string>({
  maxSize: 5,
  ttl: 2000, // 2秒过期
  autoCleanup: false,
})

ttlCache.set('🔑', 'secret_data_1')
ttlCache.set('🔒', 'secret_data_2')

console.log('⏳ 设置会话数据后:', {
  key1: ttlCache.get('🔑'),
  key2: ttlCache.get('🔒'),
  size: ttlCache.size,
})

// 模拟等待过期
console.log('⏱️ 等待 2.5 秒让数据过期...')
setTimeout(() => {
  console.log('💨 过期后检查:', {
    key1: ttlCache.get('🔑'), // undefined
    key2: ttlCache.get('🔒'), // undefined
    size: ttlCache.size,
  })

  console.log()
  continueExamples()
}, 2500)

function continueExamples() {
  // === 批量操作示例 ===
  console.log('=== 批量操作示例 ===')
  const batchCache = new FastCache<string, { id: number; name: string }>(10)

  // 批量设置
  const userData = [
    ['user1', { id: 1, name: 'Alice' }],
    ['user2', { id: 2, name: 'Bob' }],
    ['user3', { id: 3, name: 'Charlie' }],
  ] as [string, { id: number; name: string }][]

  batchCache.setMany(userData)

  // 批量获取
  const result = batchCache.getMany(['user1', 'user2', 'nonexistent'])
  console.log('批量获取结果:')
  result.forEach((value, key) => {
    console.log(`  ${key}:`, value)
  })
  console.log()

  // === 预设缓存示例 ===
  console.log('=== 预设缓存示例 ===')

  // API 响应缓存
  const apiCache = CachePresets.apiCache<{ data: string[]; timestamp: number }>(100)
  apiCache.set('/api/users', {
    data: ['user1', 'user2'],
    timestamp: Date.now(),
  })

  // 计算结果缓存
  const computeCache = CachePresets.computeCache<number>(50)
  computeCache.set('fibonacci_10', 55)
  computeCache.set('prime_check_17', 1) // 1 表示是质数

  console.log('API 缓存:', apiCache.get('/api/users'))
  console.log('计算缓存:', {
    fib10: computeCache.get('fibonacci_10'),
    prime17: computeCache.get('prime_check_17'),
  })
  console.log()

  // === 实际应用场景示例 ===
  console.log('=== 实际应用场景 ===')

  // 场景 1: API 响应缓存
  console.log('📡 API 响应缓存场景:')
  const responseCache = new FastCache<string, { id: string; name: string; email: string }>(200)

  function fetchUserData(userId: string) {
    // 先检查缓存
    const cached = responseCache.get(`user:${userId}`)
    if (cached) {
      console.log(`  缓存命中 - 用户 ${userId}:`, cached)
      return cached
    }

    // 模拟 API 调用
    const userData = { id: userId, name: `User ${userId}`, email: `${userId}@example.com` }
    responseCache.set(`user:${userId}`, userData)
    console.log(`  API 调用 - 用户 ${userId}:`, userData)
    return userData
  }

  fetchUserData('123') // API 调用
  fetchUserData('123') // 缓存命中
  fetchUserData('456') // API 调用

  console.log('API 缓存统计:', responseCache.getStats())
  console.log()

  // 场景 2: 计算结果缓存
  console.log('🧮 计算结果缓存场景:')
  const calcCache = new FastCache<string, number>(100)

  function expensiveCalculation(n: number): number {
    const key = `calc:${n}`

    // 检查缓存
    const cached = calcCache.get(key)
    if (cached !== undefined) {
      console.log(`  缓存命中 - calc(${n}):`, cached)
      return cached
    }

    // 模拟复杂计算
    const result = Math.pow(n, 3) + Math.sqrt(n)
    calcCache.set(key, result)
    console.log(`  计算完成 - calc(${n}):`, result)
    return result
  }

  expensiveCalculation(10) // 计算
  expensiveCalculation(10) // 缓存命中
  expensiveCalculation(20) // 计算

  console.log('计算缓存统计:', calcCache.getStats())
  console.log()

  // === 性能对比示例 ===
  console.log('=== 性能对比 ===')
  const OPERATIONS = 10000

  // FastCache 测试
  console.time('FastCache - 10k 操作')
  const perfCache = new FastCache<number, number>(1000)
  for (let i = 0; i < OPERATIONS; i++) {
    perfCache.set(i, i * 2)
    if (i % 2 === 0) {
      perfCache.get(i)
    }
  }
  console.timeEnd('FastCache - 10k 操作')

  // 原生 Map 测试（手动限制大小）
  console.time('Native Map - 10k 操作')
  const perfMap = new Map<number, number>()
  for (let i = 0; i < OPERATIONS; i++) {
    perfMap.set(i, i * 2)
    if (perfMap.size > 1000) {
      const firstKey = perfMap.keys().next().value
      perfMap.delete(firstKey)
    }
    if (i % 2 === 0) {
      perfMap.get(i)
    }
  }
  console.timeEnd('Native Map - 10k 操作')

  console.log('\n✅ 所有示例完成!')
  console.log('\n📊 最终统计:')
  console.log('FastCache 统计:', perfCache.getStats())
}
