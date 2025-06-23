[简体中文](README_zh-CN.md) | English

# Fast Map Cache

[![NPM Version](https://img.shields.io/npm/v/fast-map-cache.svg?style=flat)](https://www.npmjs.com/package/fast-map-cache)
[![NPM Downloads](https://img.shields.io/npm/dm/fast-map-cache.svg?style=flat)](https://www.npmjs.com/package/fast-map-cache)
[![License](https://img.shields.io/npm/l/fast-map-cache.svg?style=flat)](https://github.com/crper/fast-map-cache/blob/main/LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/crper/fast-map-cache/test.yml?branch=main&label=tests&style=flat)](https://github.com/crper/fast-map-cache/actions/workflows/test.yml)

A high-performance in-memory LRU cache for Node.js and browsers, implemented with a `Map` and a doubly linked list to achieve **O(1)** time complexity for all core operations.

## ✨ Performance Highlights

In real-world scenarios, `fast-map-cache` demonstrates significant performance gains by preventing expensive operations:

- **🚀 Proven Performance**: Delivers a **2x to 3x** performance boost in real-world I/O and CPU-bound scenarios by preventing expensive operations.

For a detailed analysis, see the full [**Performance Report**](./docs/performance-report.md).

## Features

- **🚀 High Performance**: O(1) time complexity for `get`, `set`, and `delete`.
- **🛡️ LRU Strategy**: Automatically evicts the least recently used items when the cache is full.
- **⏱️ TTL Support**: `FastCacheWithTTL` provides support for time-to-live expiration of cache items.
- **💪 Type-Safe**: Written entirely in TypeScript with zero dependencies.
- **🌐 Universal**: Works in both Node.js and browser environments.
- **📊 Stats Tracking**: Built-in tracking for hits, misses, and hit rate.

## Installation

```bash
# pnpm (recommended)
pnpm add fast-map-cache

# npm
npm install fast-map-cache

# yarn
yarn add fast-map-cache
```

## Quick Start

```typescript
import { createCache } from 'fast-map-cache'

// Create a cache with a maximum size of 2
const cache = createCache<string, number>(2)

cache.set('a', 1)
cache.set('b', 2)

console.log(cache.get('a')) // Output: 1

// Adding 'c' will evict the least recently used item ('b')
cache.set('c', 3)

console.log(cache.get('b')) // Output: undefined
console.log(cache.size) // Output: 2
```

### Usage with TTL

For caches that require items to expire after a certain period, use `createCacheWithTTL`.

```typescript
import { createCacheWithTTL } from 'fast-map-cache'

const cache = createCacheWithTTL<string, string>({
  maxSize: 100,
  ttl: 5000, // 5 seconds
})

cache.set('key', 'value')

setTimeout(() => {
  console.log(cache.get('key')) // Output: undefined
}, 6000)
```

### ❗ Important Note for Node.js Users

When using `FastCacheWithTTL` with the `autoCleanup: true` option in a Node.js environment, a `setInterval` is used to periodically clean up expired items. This timer will prevent the Node.js process from exiting gracefully on its own.

**You must manually call the `destroy()` method before your application exits to clear the timer.**

```typescript
const cache = createCacheWithTTL({ maxSize: 100, autoCleanup: true, ttl: 60000 })

// ... your application logic ...

// Before shutting down your application:
cache.destroy()
```

For more advanced use cases, including batch operations and presets, please see the full example file in [`examples/01-basic-example.ts`](./examples/01-basic-example.ts). You can run it directly with `pnpm run:example`.

## API Reference

The cache instance, created by `createCache` or `createCacheWithTTL`, implements the `IFastCache` interface.

### `get(key: K): V | undefined`

Retrieves the value for a given key. Returns `undefined` if the key does not exist or has expired. This operation marks the item as recently used.

### `set(key: K, value: V): void`

Adds or updates a key-value pair. If the key already exists, its value is updated and it is marked as recently used. If the cache is full, the least recently used item is evicted.

> **Note**: While JavaScript's `Map` allows any type as a key, it is recommended to use primitive types (`string`, `number`, `symbol`, `bigint`) for better performance and predictability.

### `delete(key: K): boolean`

Deletes a key-value pair. Returns `true` if the key existed and was deleted, `false` otherwise.

### `has(key: K): boolean`

Checks if a key exists in the cache without updating its "recently used" status. Note: For TTL caches, this will lazily delete the item if it's found to be expired, and then return `false`.

### `clear(): void`

Clears all items from the cache.

### `getMany(keys: K[]): Map<K, V>`

Retrieves multiple values for an array of keys. Returns a `Map` containing the found key-value pairs.

### `setMany(entries: [K, V][]): void`

Adds or updates multiple key-value pairs from an array of entries.

### `size: number` (getter)

Returns the current number of items in the cache.

### `capacity: number` (getter)

Returns the maximum number of items the cache can hold.

### `getStats(): CacheStats`

Returns an object with cache statistics:

```typescript
{
  hits: number;
  misses: number;
  hitRate: number; // A value between 0 and 1
  size: number;
  capacity: number;
  expired?: number; // Only for TTL caches
}
```

### `cleanup(): number` (For `FastCacheWithTTL` only)

Manually triggers the cleanup of expired items. Returns the number of items that were removed.

### `destroy(): void` (For `FastCacheWithTTL` only)

Clears the automatic cleanup timer if `autoCleanup` was enabled. **Crucial for graceful shutdown in Node.js.**

## Benchmark

This library is designed for high performance in real-world scenarios. The core value of a cache is not just the raw speed of its `get`/`set` operations, but its ability to prevent expensive computations or network requests.

Our benchmarks show that in realistic I/O-bound and CPU-bound scenarios, `fast-map-cache` provides a **2x to 3x performance boost on average**. The actual improvement depends heavily on the cost of the operation being cached.

## Contributing

Contributions are welcome! Please see the [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

This project is licensed under the [MIT License](LICENSE).
