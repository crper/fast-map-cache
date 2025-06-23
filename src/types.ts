/**
 * 基础类型定义
 */

// 缓存键类型约束
export type CacheKey = string | number | symbol | bigint

// 缓存统计信息
export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  capacity: number
  expired?: number
}

// 缓存配置选项
export interface CacheOptions {
  maxSize: number
  ttl?: number
  autoCleanup?: boolean
  cleanupInterval?: number
}

// 缓存接口
export interface IFastCache<K extends CacheKey, V> {
  // 基础操作
  get(key: K): V | undefined
  set(key: K, value: V): void
  delete(key: K): boolean
  clear(): void
  has(key: K): boolean

  // 实用功能
  readonly size: number
  readonly capacity: number

  // 批量操作（性能优化）
  setMany(entries: [K, V][]): void
  getMany(keys: K[]): Map<K, V>

  // 统计信息
  getStats(): CacheStats

  // 清理
  cleanup?(): number
}

// 内部节点类型
export interface CacheNode<K extends CacheKey, V> {
  key: K
  value: V
  // LRU
  prev: CacheNode<K, V> | null
  next: CacheNode<K, V> | null
  // TTL
  timestamp?: number
  timePrev?: CacheNode<K, V> | null
  timeNext?: CacheNode<K, V> | null
}
