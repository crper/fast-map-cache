import type { CacheKey, CacheNode, CacheStats, IFastCache } from './types.js'

/**
 * 高性能 LRU 缓存实现
 * 使用 Map + 双向链表实现 O(1) 复杂度的所有操作
 */
export class FastCache<K extends CacheKey, V> implements IFastCache<K, V> {
  protected readonly cache: Map<K, CacheNode<K, V>>
  protected readonly head: CacheNode<K, V>
  protected readonly tail: CacheNode<K, V>
  protected readonly maxSize: number

  // 统计信息
  protected hits = 0
  protected misses = 0

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('Cache size must be positive')
    }

    this.maxSize = maxSize
    this.cache = new Map()

    // 创建虚拟头尾节点
    this.head = {} as CacheNode<K, V>
    this.tail = {} as CacheNode<K, V>
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  get(key: K): V | undefined {
    const node = this.cache.get(key)

    if (node === undefined) {
      this.misses++
      return undefined
    }

    // 移动到头部（最近访问）
    this.moveToHead(node)
    this.hits++
    return node.value
  }

  set(key: K, value: V): void {
    const existingNode = this.cache.get(key)

    if (existingNode !== undefined) {
      // 更新现有节点
      existingNode.value = value
      this.moveToHead(existingNode)
      return
    }

    // 创建新节点
    const newNode: CacheNode<K, V> = {
      key,
      value,
      prev: null,
      next: null,
    }

    // 检查容量
    if (this.cache.size >= this.maxSize) {
      // 删除最久未使用的节点
      this.removeTail()
    }

    // 添加到头部
    this.cache.set(key, newNode)
    this.addToHead(newNode)
  }

  delete(key: K): boolean {
    const node = this.cache.get(key)

    if (node === undefined) {
      return false
    }

    this.cache.delete(key)
    this.removeNode(node)
    return true
  }

  clear(): void {
    this.cache.clear()
    this.head.next = this.tail
    this.tail.prev = this.head
    this.hits = 0
    this.misses = 0
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  get size(): number {
    return this.cache.size
  }

  get capacity(): number {
    return this.maxSize
  }

  setMany(entries: [K, V][]): void {
    for (const [key, value] of entries) {
      this.set(key, value)
    }
  }

  getMany(keys: K[]): Map<K, V> {
    const result = new Map<K, V>()

    for (const key of keys) {
      const value = this.get(key)
      if (value !== undefined) {
        result.set(key, value)
      }
    }

    return result
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.size,
      capacity: this.capacity,
    }
  }

  // 内部链表操作方法

  protected addToHead(node: CacheNode<K, V>): void {
    node.prev = this.head
    node.next = this.head.next

    this.head.next!.prev = node
    this.head.next = node
  }

  protected removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next
    }
    if (node.next) {
      node.next.prev = node.prev
    }
  }

  protected moveToHead(node: CacheNode<K, V>): void {
    this.removeNode(node)
    this.addToHead(node)
  }

  protected removeTail(): void {
    const lastNode = this.tail.prev
    if (lastNode && lastNode !== this.head) {
      this.cache.delete(lastNode.key)
      this.removeNode(lastNode)
    }
  }
}
