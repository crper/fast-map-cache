[简体中文](README_zh-CN.md) | [English](README.md)

# Fast Map Cache

[![NPM Version](https://img.shields.io/npm/v/fast-map-cache.svg?style=flat)](https://www.npmjs.com/package/fast-map-cache)
[![NPM Downloads](https://img.shields.io/npm/dm/fast-map-cache.svg?style=flat)](https://www.npmjs.com/package/fast-map-cache)
[![License](https://img.shields.io/npm/l/fast-map-cache.svg?style=flat)](https://github.com/crper/fast-map-cache/blob/main/LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/crper/fast-map-cache/test.yml?branch=main&label=tests&style=flat)](https://github.com/crper/fast-map-cache/actions/workflows/test.yml)

一个为 Node.js 和浏览器设计的高性能内存 LRU 缓存库。通过 `Map` 和双向链表实现，所有核心操作的时间复杂度均为 **O(1)**。

## ✨ 性能亮点

在真实业务场景中，`fast-map-cache` 通过有效避免高成本操作，展现出显著的性能优势：

- **🚀 可靠性能**: 在真实的 I/O 和 CPU 密集型场景中，通过避免高成本操作，带来 **2-3 倍** 的性能提升。

详细分析请参阅完整的 [**性能报告**](./docs/performance-report.md)。

## 功能特性

- **🚀 高性能**: `get`, `set`, `delete` 等核心操作的时间复杂度均为 O(1)。
- **🛡️ LRU 策略**: 缓存满时，自动淘汰最久未被使用的数据。
- **⏱️ TTL 支持**: `FastCacheWithTTL` 类提供了对缓存项生命周期 (TTL) 的支持。
- **💪 类型安全**: 完全使用 TypeScript 编写，零外部依赖。
- **🌐 环境通用**: 同时支持 Node.js 和浏览器环境。
- **📊 状态追踪**: 内置命中、未命中和命中率的统计功能。

## 安装

```bash
# pnpm (推荐)
pnpm add fast-map-cache

# npm
npm install fast-map-cache

# yarn
yarn add fast-map-cache
```

## 快速上手

```typescript
import { createCache } from 'fast-map-cache'

// 创建一个最大容量为 2 的缓存实例
const cache = createCache<string, number>(2)

cache.set('a', 1)
cache.set('b', 2)

console.log(cache.get('a')) // 输出: 1

// 添加 'c' 会淘汰最久未使用的 'b'
cache.set('c', 3)

console.log(cache.get('b')) // 输出: undefined
console.log(cache.size) // 输出: 2
```

关于更高级的用法（例如批量操作和预设配置），请参阅完整的示例文件：[`examples/01-basic-example.ts`](./examples/01-basic-example.ts)。您可以直接通过 `pnpm run:example` 命令运行它。

### 带 TTL 的用法

如果缓存项需要在一定时间后过期，请使用 `createCacheWithTTL`。

```typescript
import { createCacheWithTTL } from 'fast-map-cache'

const cache = createCacheWithTTL<string, string>({
  maxSize: 100,
  ttl: 5000, // 5 秒
})

cache.set('key', 'value')

setTimeout(() => {
  console.log(cache.get('key')) // 输出: undefined
}, 6000)
```

> 提示：TTL 以最近一次 `set()` 的时间为基准；`get()` 不会刷新 TTL（非“访问续期”）。

### ❗ Node.js 用户重要提示

在 Node.js 下使用 `autoCleanup: true` 时，内部会使用 `setInterval` 做周期清理；当环境支持时定时器会调用 `unref()`，因此不会单独阻止进程退出。

**仍然建议在应用退出前调用 `destroy()` 主动释放资源**，可避免长生命周期任务或测试环境中的潜在挂起。

```typescript
const cache = createCacheWithTTL({ maxSize: 100, autoCleanup: true, ttl: 60000 })

// ... 你的应用逻辑 ...

// 在应用关闭前:
cache.destroy()
```

## API 参考

由 `createCache` 或 `createCacheWithTTL` 创建的缓存实例均实现了 `IFastCache` 接口。

### `get(key: K): V | undefined`

根据键获取值。如果键不存在或已过期，则返回 `undefined`。此操作会将访问项标记为最近使用。

### `set(key: K, value: V): void`

添加或更新一个键值对。如果键已存在，则更新其值并将其标记为最近使用。如果缓存已满，则淘汰最久未使用的项。

> **注意**：虽然 JavaScript 的 `Map` 允许任何类型作为键，但为了获得最佳的性能和可预测性，推荐使用原始类型 (`string`, `number`, `symbol`, `bigint`)。

### `delete(key: K): boolean`

删除一个键值对。如果键存在且被成功删除，返回 `true`，否则返回 `false`。

### `has(key: K): boolean`

检查一个键是否存在于缓存中，此操作**不会**更新其"最近使用"状态。注意：对于带 TTL 的缓存，如果发现该项已过期，会懒惰地删除它，然后返回 `false`。

### `clear(): void`

清空缓存中的所有项目。

### `getMany(keys: K[]): Map<K, V>`

根据键数组批量获取值。返回一个包含已找到的键值对的 `Map`。

### `setMany(entries: [K, V][]): void`

通过一个条目数组批量添加或更新键值对。

### `size: number` (getter)

返回缓存中当前的项目数量。

### `capacity: number` (getter)

返回缓存的最大容量。

### `getStats(): CacheStats`

返回一个包含缓存统计信息的对象：

```typescript
{
  hits: number;      // 命中次数
  misses: number;    // 未命中次数
  hitRate: number;   // 命中率 (0 到 1 之间)
  size: number;      // 当前大小
  capacity: number;  // 最大容量
  expired?: number; // 已过期数量 (仅限 TTL 缓存)
}
```

### `cleanup(): number` (仅 `FastCacheWithTTL` 可用)

手动触发过期项目的清理。返回被移除的项目数量。

### `destroy(): void` (仅 `FastCacheWithTTL` 可用)

如果开启了 `autoCleanup`，此方法用于清除自动清理定时器。**这对于在 Node.js 中实现优雅停机至关重要。**

## 性能基准

本库为真实场景下的高性能而设计。缓存的核心价值不仅在于 `get`/`set` 操作的原始速度，更在于它能够有效避免昂贵的计算或网络请求。

我们的基准测试显示，在模拟真实世界的 I/O 密集和 CPU 密集场景下，`fast-map-cache` 平均能带来 **2 到 3 倍的性能提升**。实际提升效果取决于被缓存操作的成本。

## 贡献

欢迎任何形式的贡献！请参阅 [贡献指南](CONTRIBUTING.md) 以了解如何开始。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
