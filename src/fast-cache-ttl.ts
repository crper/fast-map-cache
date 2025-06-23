import { FastCache } from './fast-cache.js'
import type { CacheKey, CacheNode, CacheOptions, CacheStats } from './types.js'

/**
 * 带 TTL (Time To Live) 支持的高性能缓存实现。
 * 继承自 FastCache，并增加了一个按时间排序的独立链表，
 * 以实现 O(M) 复杂度的过期项目清理（M 为过期数量）。
 *
 * @important 在 Node.js 环境下使用 `autoCleanup: true` 时，
 * 必须在程序退出前手动调用 `destroy()` 方法来清理定时器，
 * 否则定时器会阻止 Node.js 进程正常退出。
 */
export class FastCacheWithTTL<K extends CacheKey, V> extends FastCache<K, V> {
  private readonly ttl: number
  private readonly autoCleanup: boolean
  private cleanupTimer: ReturnType<typeof setInterval> | undefined

  // TTL 链表
  private readonly timeHead: CacheNode<K, V>
  private readonly timeTail: CacheNode<K, V>

  // 统计
  private expired = 0

  constructor(options: CacheOptions) {
    super(options.maxSize)

    if (options.ttl !== undefined && options.ttl <= 0) {
      throw new Error('TTL must be positive')
    }

    this.ttl = options.ttl ?? 0
    this.autoCleanup = options.autoCleanup ?? false

    // 初始化 TTL 链表的哨兵节点
    this.timeHead = {} as CacheNode<K, V>
    this.timeTail = {} as CacheNode<K, V>
    this.timeHead.timeNext = this.timeTail
    this.timeTail.timePrev = this.timeHead

    if (this.autoCleanup && this.ttl > 0) {
      const cleanupInterval = options.cleanupInterval ?? this.ttl
      this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval)
    }
  }

  override get(key: K): V | undefined {
    const node = this.cache.get(key)

    if (node === undefined) {
      this.misses++
      return undefined
    }

    if (this.isExpired(node)) {
      this.delete(key) // Handles removal from both lists
      this.expired++
      this.misses++
      return undefined
    }

    // 调用父类 get 来处理 LRU 逻辑（移动到头部）和统计
    return super.get(key)
  }

  override set(key: K, value: V): void {
    const existingNode = this.cache.get(key)
    const now = this.ttl > 0 ? Date.now() : 0

    // 父类 set 会处理 LRU 链表和 cache map
    super.set(key, value)

    // 从 cache map 获取最新节点引用
    const node = this.cache.get(key)!
    node.timestamp = now

    if (existingNode) {
      this._moveToTimeListTail(node)
    } else {
      this._addToTimeListTail(node)
    }
  }

  override delete(key: K): boolean {
    const node = this.cache.get(key)
    if (node === undefined) {
      return false
    }

    // 从 TTL 链表移除
    this._removeFromTimeList(node)
    // 父类 delete 会处理 LRU 链表和 cache map
    return super.delete(key)
  }

  override clear(): void {
    super.clear() // 清理 LRU 链表和 cache map
    // 清理 TTL 链表
    this.timeHead.timeNext = this.timeTail
    this.timeTail.timePrev = this.timeHead
    this.expired = 0
  }

  override has(key: K): boolean {
    const node = this.cache.get(key)
    if (node === undefined) {
      return false
    }

    if (this.isExpired(node)) {
      this.delete(key) // Lazily remove expired item
      this.expired++
      return false
    }

    return true
  }

  override get size(): number {
    return this.cache.size
  }

  override get capacity(): number {
    return this.maxSize
  }

  override setMany(entries: [K, V][]): void {
    for (const [key, value] of entries) {
      this.set(key, value)
    }
  }

  override getMany(keys: K[]): Map<K, V> {
    const result = new Map<K, V>()

    for (const key of keys) {
      const value = this.get(key)
      if (value !== undefined) {
        result.set(key, value)
      }
    }

    return result
  }

  override getStats(): CacheStats {
    const stats = super.getStats()
    return {
      ...stats,
      expired: this.expired,
    }
  }

  cleanup(): number {
    if (this.ttl === 0) {
      return 0
    }

    let removedCount = 0
    const now = Date.now()
    let currentNode = this.timeHead.timeNext

    while (currentNode && currentNode !== this.timeTail) {
      if (this.isExpired(currentNode, now)) {
        this.delete(currentNode.key) // 统一处理删除
        removedCount++
        this.expired++
        currentNode = this.timeHead.timeNext // 从头开始
      } else {
        // 因为 TTL 链表是按时间排序的，第一个未过期的出现，后续都无需再查
        break
      }
    }
    return removedCount
  }

  /**
   * 清理定时器，防止在 Node.js 环境中进程无法正常退出。
   * 如果开启了 `autoCleanup`，你应当在应用关闭前调用此方法。
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  private isExpired(node: CacheNode<K, V>, now?: number): boolean {
    if (this.ttl === 0 || node.timestamp === undefined) {
      return false
    }
    return (now ?? Date.now()) - node.timestamp > this.ttl
  }

  // --- TTL 链表内部操作 ---

  private _addToTimeListTail(node: CacheNode<K, V>): void {
    const prev = this.timeTail.timePrev!
    prev.timeNext = node
    node.timePrev = prev
    node.timeNext = this.timeTail
    this.timeTail.timePrev = node
  }

  private _removeFromTimeList(node: CacheNode<K, V>): void {
    if (node.timePrev) {
      node.timePrev.timeNext = node.timeNext ?? null
    }
    if (node.timeNext) {
      node.timeNext.timePrev = node.timePrev ?? null
    }
  }

  private _moveToTimeListTail(node: CacheNode<K, V>): void {
    this._removeFromTimeList(node)
    this._addToTimeListTail(node)
  }
}
