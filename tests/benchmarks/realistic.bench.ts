import { bench, describe } from 'vitest'
import { createCache } from '../../src'

// --- SCENARIO 1: I/O-Bound Task (API/DB Query) ---
// Simulates a non-blocking, slow I/O operation. Let's make it a bit slower to show a bigger impact.
const simulateSlowApiCall = (
  key: string,
  durationMs = 10,
): Promise<{ id: string; data: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: key, data: `data for ${key}` })
    }, durationMs)
  })
}

// Generates a realistic access pattern following the 80/20 rule
const generateAccessPattern = (
  totalKeys: number,
  hotRatio: number,
  accessCount: number,
): string[] => {
  const hotKeyCount = Math.floor(totalKeys * hotRatio)
  const hotKeys = Array.from({ length: hotKeyCount }, (_, i) => `hot_key_${i}`)
  const coldKeys = Array.from({ length: totalKeys - hotKeyCount }, (_, i) => `cold_key_${i}`)

  const pattern: string[] = []
  for (let i = 0; i < accessCount; i++) {
    if (Math.random() < 0.8) {
      pattern.push(hotKeys[Math.floor(Math.random() * hotKeys.length)])
    } else {
      pattern.push(coldKeys[Math.floor(Math.random() * coldKeys.length)])
    }
  }
  return pattern
}

// Test parameters - reduced access count for reasonable benchmark time
const ACCESS_COUNT = 200 // Total number of simulated API calls
const TOTAL_KEYS = 100 // Total unique items in the dataset
const HOT_RATIO = 0.2 // 20% of items are "hot"
const CACHE_SIZE = Math.floor(TOTAL_KEYS * HOT_RATIO) // Cache size covers all hot keys

describe('Realistic: API Query Caching (Sequential Total Time)', () => {
  bench(
    'Without Cache: Total time for all sequential API calls',
    async () => {
      // Create a new instance for each run to be fair
      const localPattern = generateAccessPattern(TOTAL_KEYS, HOT_RATIO, ACCESS_COUNT)
      for (const key of localPattern) {
        await simulateSlowApiCall(key)
      }
    },
    { time: 20000, iterations: 5 },
  )

  bench(
    'With FastCache: Total time with hot data served from cache',
    async () => {
      const cache = createCache<string, unknown>(CACHE_SIZE)
      const localPattern = generateAccessPattern(TOTAL_KEYS, HOT_RATIO, ACCESS_COUNT)
      for (const key of localPattern) {
        let data = cache.get(key)
        if (data === undefined) {
          data = await simulateSlowApiCall(key)
          cache.set(key, data)
        }
      }
    },
    { time: 20000, iterations: 5 },
  )
})

// --- SCENARIO 2: CPU-Bound Task (Complex Calculation) ---
// Simulates a synchronous, CPU-intensive calculation.
const heavyComputation = (n: number): number => {
  if (n < 2) {
    return n
  }
  return heavyComputation(n - 1) + heavyComputation(n - 2)
}

const computationPattern = Array.from({ length: 20 }, () => Math.floor(28 + Math.random() * 5)) // More variety

describe('Realistic: Computation Caching', () => {
  bench(
    'Without Cache: Every call re-runs the expensive calculation',
    () => {
      computationPattern.forEach((n) => heavyComputation(n))
    },
    { time: 10000, iterations: 10 },
  )

  bench(
    'With FastCache: Expensive results are memoized',
    () => {
      const cache = createCache<number, number>(10)
      computationPattern.forEach((n) => {
        let result = cache.get(n)
        if (result === undefined) {
          result = heavyComputation(n)
          cache.set(n, result)
        }
      })
    },
    { time: 10000, iterations: 10 },
  )
})
