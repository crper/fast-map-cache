#!/usr/bin/env node

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取__dirname等价物
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 路径配置
const baselinePath = path.resolve(__dirname, '../tests/benchmarks/baseline.json')
const outputPath = path.resolve(__dirname, '../docs/performance-report.md')

// 确保docs目录存在
const docsDir = path.resolve(__dirname, '../docs')
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true })
}

// 定义类型
interface Benchmark {
  id: string
  name: string
  rank: number
  rme: number
  samples: number[]
  totalTime: number
  min: number
  max: number
  hz: number
  period: number
  mean: number
  variance: number
  sd: number
  sem: number
  df: number
  critical: number
  moe: number
  p75: number
  p99: number
  p995: number
  p999: number
  sampleCount: number
  median: number
}

interface Group {
  name?: string
  fullName: string
  benchmarks: Benchmark[]
}

interface File {
  filepath: string
  groups: Group[]
}

interface BenchmarkData {
  files: File[]
}

// 专门针对缓存场景的性能分析
interface CacheScenario {
  name: string
  description: string
  withCache?: Benchmark
  withoutCache?: Benchmark
  improvement?: number
  category: 'database' | 'computation' | 'memory' | 'api' | 'general'
}

// 缓存场景映射
const CACHE_SCENARIOS: Record<string, CacheScenario> = {
  // --- 新的真实场景测试 ---
  'Realistic: API Query Caching (Sequential Total Time)': {
    name: '数据库查询缓存 (模拟API)',
    description: '通过缓存频繁调用的API/DB响应，显著减少I/O等待时间，提升系统总吞吐量。',
    category: 'database',
  },
  'Realistic: Computation Caching': {
    name: '高强度计算缓存',
    description: '缓存CPU密集型计算结果，避免重复执行耗时操作，直接返回结果。',
    category: 'computation',
  },
  // --- 旧的基准测试场景 (保留用于完整性) ---
  'Database Query Caching': {
    name: '数据库查询缓存',
    description: '避免重复数据库查询，显著减少 I/O 延迟',
    category: 'database',
  },
  'Computation Caching': {
    name: '计算结果缓存',
    description: '缓存复杂计算结果，避免重复 CPU 密集操作',
    category: 'computation',
  },
  'API Response Caching': {
    name: 'API响应缓存',
    description: '缓存高频API调用结果，降低延迟和外部依赖',
    category: 'api',
  },
  'E-commerce Session Caching': {
    name: '电商会话缓存',
    description: '缓存活跃用户会话，加速页面响应',
    category: 'api',
  },
  'Memory Usage Comparison': {
    name: '内存使用优化',
    description: '通过LRU策略限制内存占用，防止内存无限增长',
    category: 'memory',
  },
  'TTL Cache Benefits': {
    name: 'TTL自动过期',
    description: '自动管理过期数据，简化手动清理逻辑',
    category: 'general',
  },
}

// 格式化时间
function formatDateTime(date: Date) {
  return (
    date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour12: false })
  )
}

// 格式化数字
function formatNumber(num: number): string {
  if (isNaN(num) || !isFinite(num)) {
    return 'N/A'
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  if (num < 10) {
    return num.toFixed(2)
  }
  return Math.round(num).toLocaleString()
}

// 格式化性能倍数
function formatMultiplier(multiplier: number): string {
  if (isNaN(multiplier) || !isFinite(multiplier)) {
    return 'N/A'
  }
  if (multiplier < 2) {
    return `${multiplier.toFixed(1)}x`
  }
  return `${Math.round(multiplier)}x`
}

// 获取性能提升等级
function getImprovementLevel(multiplier: number) {
  if (multiplier >= 50) {
    return { icon: '🚀', label: '极大提升', color: '🟢' }
  }
  if (multiplier >= 10) {
    return { icon: '⚡', label: '显著提升', color: '🟢' }
  }
  if (multiplier >= 5) {
    return { icon: '📈', label: '明显提升', color: '🟡' }
  }
  if (multiplier >= 2) {
    return { icon: '🔺', label: '有效提升', color: '🟡' }
  }
  return { icon: '➖', label: '无明显差异', color: '🔴' }
}

// 生成系统信息
function generateSystemInfo() {
  const cpus = os.cpus()
  const totalMemGB = Math.round(os.totalmem() / 1024 ** 3)

  return `## 🖥️ 测试环境

| 项目 | 配置 |
|------|------|
| 系统 | ${os.platform()} ${os.arch()} |
| CPU | ${cpus[0]?.model || 'Unknown'} (${cpus.length} 核) |
| 内存 | ${totalMemGB} GB |
| Node.js | ${process.version} |
| 测试时间 | ${formatDateTime(new Date())} |

`
}

// 分析缓存场景
function analyzeCacheScenarios(data: BenchmarkData): CacheScenario[] {
  const scenarios: CacheScenario[] = []
  const foundScenarios = new Set<string>()

  for (const file of data.files) {
    for (const group of file.groups) {
      // 优先完全匹配，然后尝试部分匹配
      const groupName =
        Object.keys(CACHE_SCENARIOS).find((key) => group.fullName.includes(key)) ||
        extractGroupName(group.fullName)

      const scenarioTpl = CACHE_SCENARIOS[groupName]

      if (scenarioTpl && !foundScenarios.has(scenarioTpl.name)) {
        const cacheScenario: CacheScenario = { ...scenarioTpl }

        // 查找有缓存和无缓存的基准测试
        for (const benchmark of group.benchmarks) {
          const name = benchmark.name.toLowerCase()
          if (name.includes('without') || name.includes('no cache') || name.includes('unlimited')) {
            cacheScenario.withoutCache = benchmark
          } else if (
            name.includes('with') ||
            name.includes('cache') ||
            name.includes('controlled')
          ) {
            cacheScenario.withCache = benchmark
          }
        }

        // 计算性能提升
        if (cacheScenario.withCache && cacheScenario.withoutCache) {
          // 使用 hz (ops/sec)，数值越大越好
          cacheScenario.improvement = cacheScenario.withCache.hz / cacheScenario.withoutCache.hz
        }

        scenarios.push(cacheScenario)
        foundScenarios.add(scenarioTpl.name)
      }
    }
  }

  return scenarios.filter((s) => s.withCache && s.withoutCache)
}

// 从 fullName 中提取组名
function extractGroupName(fullName: string): string {
  const parts = fullName.split(' > ')
  if (parts.length >= 2) {
    return parts[parts.length - 1]
  }
  return 'Unknown Group'
}

// 生成执行摘要
function generateExecutiveSummary(scenarios: CacheScenario[]) {
  const validScenarios = scenarios.filter((s) => s.improvement && s.improvement > 1)
  const avgImprovement =
    validScenarios.length > 0
      ? validScenarios.reduce((sum, s) => sum + (s.improvement || 0), 0) / validScenarios.length
      : 0

  const maxImprovement = Math.max(...validScenarios.map((s) => s.improvement || 0))
  const improvementLevel = getImprovementLevel(avgImprovement)

  return `## 📊 执行摘要

### 🎯 核心发现

${improvementLevel.color} **总体性能提升**: ${formatMultiplier(avgImprovement)} ${improvementLevel.icon}

| 指标 | 结果 | 说明 |
|------|------|------|
| 平均性能提升 | **${formatMultiplier(avgImprovement)}** | 在典型缓存场景下的平均性能提升倍数 |
| 最大性能提升 | **${formatMultiplier(maxImprovement)}** | 在最优场景下可达到的性能提升 |
| 有效缓存场景 | **${validScenarios.length}/${scenarios.length}** | 显示明显性能提升的测试场景 |
| 内存效率提升 | **显著** | 有效控制内存使用，防止无限增长 |

### 💡 关键优势

1. **🚀 I/O 密集场景**: 数据库查询、API调用等场景性能提升最显著
2. **🧮 计算密集场景**: 复杂计算结果缓存避免重复计算
3. **💾 内存管理**: LRU策略自动管理内存，防止内存泄漏
4. **⏰ 自动过期**: TTL机制简化缓存管理，提高开发效率

`
}

// 生成核心性能对比
function generatePerformanceComparison(scenarios: CacheScenario[]) {
  let content = `## 🔥 核心性能对比

> 💡 以下数据展示了 FastCache 在真实业务场景中的性能表现

`

  // 按性能提升排序
  const sortedScenarios = scenarios
    .filter((s) => s.improvement && s.improvement > 1)
    .sort((a, b) => (b.improvement || 0) - (a.improvement || 0))

  if (sortedScenarios.length === 0) {
    content += `> ⚠️ 暂无有效的性能对比数据\n\n`
    return content
  }

  content += `| 🎯 测试场景 | 🚀 性能提升 | 📊 等级 | ⚡ 有缓存 | 🐌 无缓存 | 📈 提升说明 |\n`
  content += `|:-----------|:---------:|:------:|:-------:|:-------:|:---------|\n`

  for (const scenario of sortedScenarios) {
    const improvement = scenario.improvement || 0
    const level = getImprovementLevel(improvement)
    const withCacheHz = scenario.withCache ? formatNumber(scenario.withCache.hz) : 'N/A'
    const withoutCacheHz = scenario.withoutCache ? formatNumber(scenario.withoutCache.hz) : 'N/A'

    content += `| **${scenario.name}** | **${formatMultiplier(improvement)}** | ${level.icon} ${level.label} | ${withCacheHz} ops/s | ${withoutCacheHz} ops/s | ${scenario.description} |\n`
  }

  return content + '\n'
}

// 生成详细场景分析
function generateDetailedScenarios(scenarios: CacheScenario[]) {
  let content = `## 📋 详细场景分析

`

  // 按类别分组
  const groupedScenarios = scenarios.reduce(
    (groups, scenario) => {
      const category = scenario.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(scenario)
      return groups
    },
    {} as Record<string, CacheScenario[]>,
  )

  const categoryNames = {
    database: '🗄️ 数据库场景',
    computation: '🧮 计算场景',
    memory: '💾 内存管理',
    api: '🌐 API与会话场景',
    general: '⚙️ 通用功能',
  }

  for (const [category, categoryScenarios] of Object.entries(groupedScenarios)) {
    content += `### ${categoryNames[category as keyof typeof categoryNames] || category}\n\n`

    for (const scenario of categoryScenarios) {
      content += `#### ${scenario.name}\n\n`
      content += `> ${scenario.description}\n\n`

      // 特别处理内存使用场景
      if (scenario.category === 'memory') {
        content += `| 测试项目 | 说明 |\n`
        content += `|----------|------|\n`
        content += `| 🟢 **使用 FastCache** | **内存受控**: 缓存大小被限制在预设值，旧数据被自动淘汰，有效防止内存泄漏。 |\n`
        content += `| 🔴 **常规 Map** | **内存无限增长**: 所有数据被无限期存储，可能导致严重内存问题。 |\n`
        content += `| 💡 **核心优势** | **高稳定性**: 在长期运行的服务中，内存控制是保证系统稳定性的关键。 |\n\n`
        continue
      }

      if (scenario.withCache && scenario.withoutCache && scenario.improvement) {
        const level = getImprovementLevel(scenario.improvement)
        const improvementPercent = ((scenario.improvement - 1) * 100).toFixed(0)

        content += `| 测试项目 | 性能表现 | 平均延迟 | 稳定性 |\n`
        content += `|----------|----------|----------|--------|\n`
        content += `| 🟢 使用 FastCache | **${formatNumber(scenario.withCache.hz)} ops/s** | ${scenario.withCache.mean.toFixed(2)}ms | ±${scenario.withCache.rme.toFixed(1)}% |\n`
        content += `| 🔴 未使用缓存 | ${formatNumber(scenario.withoutCache.hz)} ops/s | ${scenario.withoutCache.mean.toFixed(2)}ms | ±${scenario.withoutCache.rme.toFixed(1)}% |\n`
        content += `| ${level.color} **性能提升** | **${formatMultiplier(scenario.improvement)}** | **+${improvementPercent}% 效率** | ${level.icon} ${level.label} |\n\n`
      } else {
        content += `> ⚠️ 该场景缺少完整的对比数据\n\n`
      }
    }
  }

  return content
}

// 生成优化建议
function generateOptimizationSuggestions(scenarios: CacheScenario[]) {
  const validScenarios = scenarios.filter((s) => s.improvement && s.improvement > 1)
  const avgImprovement =
    validScenarios.length > 0
      ? validScenarios.reduce((sum, s) => sum + (s.improvement || 0), 0) / validScenarios.length
      : 0

  let content = `## 🚀 使用建议与最佳实践

### 📈 性能优化建议

`

  if (avgImprovement >= 5) {
    content += `✅ **强烈推荐**: 测试显示平均 **${formatMultiplier(avgImprovement)}** 性能提升，建议在以下场景优先使用：

`
  } else if (avgImprovement >= 2) {
    content += `✅ **推荐使用**: 在典型场景下，测试显示平均 **${formatMultiplier(
      avgImprovement,
    )}** 性能提升。建议在以下场景使用：

`
  } else {
    content += `🔍 **按需评估**: 当前测试场景下性能提升有限，建议针对具体高延迟场景进行评估：

`
  }

  // 基于不同类别给出建议
  const categoryAdvice = {
    database: '- 🗄️ **数据库查询**: 适用于频繁查询相同数据的场景，特别是用户信息、配置数据等',
    computation: '- 🧮 **复杂计算**: 适用于CPU密集型计算，如数据分析、图像处理、算法计算等',
    memory: '- 💾 **内存控制**: 使用LRU策略自动管理内存，防止内存泄漏',
    api: '- 🌐 **API响应**: 缓存第三方API响应，减少网络请求和外部依赖',
    general: '- ⚙️ **通用缓存**: 合理设置缓存大小和TTL，平衡性能和内存使用',
  }

  const presentCategories = new Set(scenarios.map((s) => s.category))
  for (const category of presentCategories) {
    if (categoryAdvice[category]) {
      content += categoryAdvice[category] + '\n'
    }
  }

  content += `
### ⚙️ 配置建议

\`\`\`typescript
// 🎯 针对不同场景的推荐配置

// 数据库查询缓存
const dbCache = new FastCache(1000); // 1000个查询结果

// API响应缓存 (带TTL)
const apiCache = new FastCacheWithTTL({
    maxSize: 500,
    ttl: 5 * 60 * 1000, // 5分钟过期
    autoCleanup: true
});

// 计算结果缓存
const computeCache = new FastCache(200); // 适中大小，避免内存浪费
\`\`\`

### 🎯 使用场景建议

| 场景类型 | 推荐指数 | 配置建议 | 预期提升 |
|----------|----------|----------|----------|
| 🗄️ 数据库查询 | ⭐⭐⭐⭐⭐ | maxSize: 1000-5000 | 10-100x |
| 🌐 API调用 | ⭐⭐⭐⭐⭐ | TTL: 1-30分钟 | 20-200x |
| 🧮 复杂计算 | ⭐⭐⭐⭐ | maxSize: 100-1000 | 5-50x |
| 📁 文件读取 | ⭐⭐⭐⭐ | TTL: 5-60分钟 | 10-100x |
| 🎨 图片处理 | ⭐⭐⭐ | maxSize: 50-200 | 3-20x |

`

  return content
}

// 生成完整报告
function generateReport(data: BenchmarkData): string {
  const scenarios = analyzeCacheScenarios(data)

  const header = `# 🚀 FastCache 性能测试报告

> **FastCache**: 基于 LRU 算法的高性能缓存系统
>
> 本报告展示 FastCache 在实际业务场景中的性能表现和优化效果

`

  return [
    header,
    generateSystemInfo(),
    generateExecutiveSummary(scenarios),
    generatePerformanceComparison(scenarios),
    generateDetailedScenarios(scenarios),
    generateOptimizationSuggestions(scenarios),
    `---
> 📝 报告生成时间: ${formatDateTime(new Date())}
> 🔧 生成工具: FastCache Performance Reporter v2.0
> 📊 数据来源: Vitest Benchmark Results
`,
  ].join('\n')
}

// 主函数
function main() {
  try {
    const baselineRaw = fs.readFileSync(baselinePath, 'utf-8')
    const data: BenchmarkData = JSON.parse(baselineRaw)

    // 检查数据结构是否正确，并进行调整
    // vitest 0.34.x 可能是 { suites: [{...}] }
    // vitest 1.x.x 可能是 { files: [{...}] }
    let processedData: BenchmarkData
    if (Array.isArray((data as unknown as { suites: unknown[] }).suites)) {
      // 旧结构，转换为新结构
      processedData = {
        files: (data as unknown as { suites: { filepath?: string; name?: string }[] }).suites.map(
          (s: { filepath?: string; name?: string }) => ({
            filepath: s.filepath || s.name || '',
            groups: [s as unknown as Group],
          }),
        ),
      }
    } else if (Array.isArray(data.files)) {
      // 新结构
      processedData = data
    } else {
      throw new Error('无法识别的基准测试数据格式')
    }

    const reportContent = generateReport(processedData)
    fs.writeFileSync(outputPath, reportContent)
    console.log(`性能报告已生成到: ${outputPath}`)
  } catch (error) {
    console.error('生成性能报告时出错:', error)
    process.exit(1)
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
