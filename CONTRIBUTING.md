# 贡献指南

感谢您对本项目的兴趣并愿意贡献代码！本指南将帮助您了解如何设置开发环境、提交代码、报告问题和提交拉取请求。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
  - [报告 Bug](#报告-bug)
  - [提交功能请求](#提交功能请求)
  - [提交代码](#提交代码)
- [开发环境设置](#开发环境设置)
- [提交消息规范](#提交消息规范)
- [拉取请求指南](#拉取请求指南)

## 行为准则

我们致力于营造一个开放和友好的社区。作为贡献者和维护者，我们承诺使参与我们的项目和社区成为所有人的无骚扰体验，无论其年龄、体型、可见或不可见的残疾、种族、民族、经验水平、教育程度、社会经济地位、国籍、个人外貌、种姓、宗教或性身份和性取向如何。我们承诺以不评判和尊重的态度行事和互动。所有贡献者都应遵守此行为准则。

## 如何贡献

### 报告 Bug

如果您发现了一个 bug，请首先在 [GitHub Issues](https://github.com/crper/fast-map-cache/issues) 中搜索，确认是否已被报告。如果尚未报告，请创建一个新的 Issue，并尽可能提供详细的信息，包括：

- 复现步骤
- 预期行为
- 实际行为
- 错误截图或日志
- 您的环境信息 (操作系统、Node.js 版本、pnpm 版本等)

### 提交功能请求

如果您有新的功能想法，也请在 [GitHub Issues](https://github.com/crper/fast-map-cache/issues) 中提交功能请求。请描述您的想法，并说明为什么您认为它对项目有价值。

### 提交代码

1.  **分叉 (Fork) 仓库**：点击 GitHub 页面右上角的 "Fork" 按钮，将本仓库分叉到您的个人账户。
2.  **克隆 (Clone) 仓库**：将分叉后的仓库克隆到您的本地机器：
    ```bash
        git clone https://github.com/crper/fast-map-cache.git
    cd fast-map-cache
    ```
3.  **安装依赖**：
    ```bash
    pnpm install
    ```
4.  **创建新分支**：为您的更改创建一个新的分支。请使用描述性的分支名称，例如 `feature/add-new-function` 或 `fix/button-bug`。
    ```bash
    git checkout -b feature/your-feature-name
    ```

## 开发环境设置

本项目使用以下工具来保证代码质量和开发效率：

- **pnpm**：包管理器。请确保您已安装 `pnpm` (`npm install -g pnpm`)。
- **TypeScript**：类型安全的 JavaScript 超集。
- **tsdown**：用于 TypeScript 项目的构建工具。
- **oxlint**：用于代码 Linting。
- **Prettier**：用于代码格式化。
- **Vitest**：测试框架。
- **simple-git-hooks**：用于 Git 钩子管理。
- **commitlint**：用于规范提交信息。

在开始编码之前，请确保所有依赖已安装 (`pnpm install`)，并且您的编辑器已配置为遵循项目的 `.editorconfig` 和 Prettier 规则。

## 提交消息规范

本项目遵循 [Angular 提交消息规范](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)。每次提交都应该包含 `type(scope): subject` 格式的消息。

**常见的 `type` 类型包括：**

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档变更
- `style`: 代码风格（不影响代码运行的更改，如空格、格式、缺少分号等）
- `refactor`: 代码重构（不增加新功能或修复 bug 的更改）
- `perf`: 性能优化
- `test`: 添加缺失的测试或纠正现有测试
- `build`: 影响构建系统或外部依赖的更改（例如，pnpm, tsdown）
- `ci`: CI 配置文件和脚本的更改
- `chore`: 其他不修改 `src` 或 `test` 文件的更改
- `revert`: 撤销以前的提交

**示例：**

```
feat(parser): add support for array literals
fix(button): prevent double click on submit
docs(readme): update installation instructions
```

在提交代码时，`simple-git-hooks` 会自动运行 `commitlint` 来验证您的提交消息。请确保您的消息符合规范，否则提交将被拒绝。

## 拉取请求指南

当您完成代码更改并希望将其合并到主仓库时，请提交一个 Pull Request (PR)。请确保您的 PR 满足以下条件：

1.  **代码质量**：您的代码应遵循项目编码规范，并通过 Linting (`pnpm lint`) 和格式化 (`pnpm format`)。
2.  **测试**：所有新功能和 bug 修复都应有相应的单元测试 (`pnpm test`)，确保测试通过。
3.  **文件对应关系**：为了保持项目结构的一致性，当您在 `src/` 目录中添加或修改源文件时，请确保在 `tests/`、`examples/` 和 `benchmarks/` 目录（如果适用）中创建或更新相应的测试、示例和基准测试文件。
4.  **提交历史**：您的提交历史应清晰整洁，每个提交都遵循 [提交消息规范](#提交消息规范)。必要时，可以使用 `git rebase -i` 来整理提交。
5.  **PR 描述**：提供清晰的 PR 描述，说明您所做的更改、解决的问题或实现的功能。
6.  **更新文档**：如果您的更改影响到功能或使用方式，请更新相关的文档 (如 `README.md`、`ARCHITECTURE.md` 或其他文档)。

在您提交 PR 后，项目维护者将对其进行审查并提供反馈。感谢您的贡献！
