import { defineConfig } from 'vitest/config'

export default defineConfig({
  // 测试运行配置
  test: {
    // 启用全局变量，无需在每个测试文件中导入 describe, it, expect 等
    globals: true,

    // 测试运行环境 - Node.js 环境，适合 SDK 测试
    environment: 'node',

    // 代码覆盖率配置
    coverage: {
      // 使用 V8 引擎的覆盖率收集器，性能更好
      provider: 'v8',

      // 覆盖率报告格式 - 支持多种格式同时输出
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],

      // 覆盖率报告输出目录
      reportsDirectory: './coverage',

      // 排除不需要覆盖率统计的文件和目录
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        'examples/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.bench.*', // 排除基准测试文件
      ],

      // 包含在覆盖率统计中的文件
      include: ['src/**/*.ts'],

      // 覆盖率阈值 - 确保代码质量
      thresholds: {
        global: {
          branches: 80, // 分支覆盖率 80%
          functions: 80, // 函数覆盖率 80%
          lines: 80, // 行覆盖率 80%
          statements: 80, // 语句覆盖率 80%
        },
      },

      // 当覆盖率不达标时显示报告
      reportOnFailure: true,

      // 包含所有文件，即使没有测试覆盖
      all: true,
    },

    // 测试超时时间（毫秒）
    testTimeout: 10000,

    // 使用线程池并行运行测试，提高性能
    pool: 'threads',

    // 线程池配置选项
    poolOptions: {
      threads: {},
    },

    // 测试序列配置
    sequence: {
      // 钩子函数执行顺序：'stack'（栈式）或 'list'（列表式）
      hooks: 'stack',
    },

    // Benchmark 性能测试配置 - 在 Vitest 3.2.0+ 中移到 test 配置内部
    benchmark: {
      // 性能测试结果输出文件
      outputJson: 'tests/benchmarks/baseline.json',

      // 基准对比文件 - 用于性能回归检测
      compare: 'tests/benchmarks/baseline.json',

      // 报告器配置 - verbose 提供详细的性能指标
      reporters: ['default'],

      // 包含的 benchmark 文件模式
      include: ['tests/benchmarks/**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

      // 排除的文件和目录
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    },
  },
})
