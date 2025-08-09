# fast-map-cache

## 1.1.0

### Minor Changes

- - docs(readme): clarify TTL semantics (get() does not refresh TTL) and Node.js timer behavior (uses unref); recommend calling destroy() on shutdown
  - tests(ttl): add autoCleanup with fake timers, destroy() idempotence, TTL stats increments, has() lazy deletion, batch+TTL behaviors
  - chore: centralize deletion path; ensure TTL/LRU deletion sync via deleteNode() override

## 1.0.1

### Patch Changes

- 重新发布：解决 npm 删除包后的 24 小时冷却期问题

## 1.0.0

### Major Changes

- # 🎉 Fast Map Cache v1.0.0 - 首次发布

  高性能 TypeScript LRU 缓存库，支持可选的 TTL (Time To Live) 功能，适用于 Node.js 和浏览器环境。

  ## ✨ 核心特性

  ### 🚀 高性能 LRU 缓存
  - **O(1) 复杂度**: 所有操作（get、set、delete）均为 O(1) 时间复杂度
  - **内存高效**: 使用 Map + 双向链表实现，内存占用最优
  - **容量控制**: 自动淘汰最久未使用的项目

  ### ⏰ TTL 支持
  - **灵活过期**: 支持基于时间的自动过期
  - **自动清理**: 可选的后台自动清理过期项
  - **惰性清理**: 访问时自动清理过期项

  ### 🛠️ 开发者友好
  - **TypeScript 原生支持**: 完整的类型定义和类型安全
  - **批量操作**: 支持 `setMany()` 和 `getMany()` 批量操作
  - **统计信息**: 内置命中率、缓存大小等统计功能
  - **预设配置**: 提供常用场景的预设缓存配置

  ### 🎯 使用场景
  - API 响应缓存
  - 计算结果缓存
  - 会话数据缓存
  - 临时数据存储

  ## 📦 安装使用

  ```bash
  npm install fast-map-cache
  # 或
  pnpm add fast-map-cache
  ```

  ## 🔧 基本用法

  ```typescript
  import { FastCache, FastCacheWithTTL, CachePresets } from 'fast-map-cache'

  // 基础 LRU 缓存
  const cache = new FastCache<string, any>(1000)
  cache.set('key', 'value')
  console.log(cache.get('key')) // 'value'

  // 带 TTL 的缓存
  const ttlCache = new FastCacheWithTTL({
    maxSize: 500,
    ttl: 5 * 60 * 1000, // 5分钟
    autoCleanup: true,
  })

  // 使用预设
  const apiCache = CachePresets.apiCache(1000)
  ```

  ## 🏃‍♂️ 性能表现

  基准测试显示相比原生实现有显著性能提升：
  - 热数据访问：4.27x 更快
  - 计算结果缓存：4.21x 更快
  - 高命中率场景：8.16x 更快

  ## 🔒 类型安全

  完全使用 TypeScript 编写，启用严格模式，提供完整的类型推导和检查。

  ***

  这是一个全新的库，专为现代 JavaScript/TypeScript 应用设计。
