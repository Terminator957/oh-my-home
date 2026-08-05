# oh-my-home - repository-baseline-release SOP

- Version: 1.2.1
- Status: approved
- Effective date: 2026-08-05
- Owner: ict

## Purpose

将已验证的小程序修复、可复现的项目基线和 RepoNova 项目全视图提交并推送至 origin/main，同时提供简洁使用说明。

## Subject

```json
{
  "type": "tooling",
  "target": "oh-my-home 的版本化项目基线与 RepoNova 图谱发布",
  "boundary": "仅整理已存在且经验证的修复、项目说明和图谱产物；不改变小程序运行时业务行为。"
}
```

## Governance

```json
{
  "authority": true,
  "supersedes": [
    "minify-wxml-library-recovery SOP 1.1"
  ],
  "derived_contracts": [
    "development-contract.json"
  ],
  "conflicts": [],
  "change_policy": "merge-back-required"
}
```

## Scope

### Included
- 既有的转盘动画与 WXML 压缩修复提交
- 根目录 README.md 使用说明
- reponova.yml 和 reponova-out 中可复现的图谱产物
- RepoNova 缓存忽略规则
- jiayan-tests/ui.test.js 的微信自动化端口兼容修复
- 本 SOP 与由其生成的 SOP.md、development-contract.json

### Excluded
- DeepSeek 临时状态文件
- reponova-out/.cache 中的可再生缓存
- 新的业务功能、依赖、页面路由、appid 或数据模型变更

## Evidence and Open Items

### Evidence
- **EVID-001** main 比 origin/main 超前两个已验证提交：转盘交互增强及 minifyWXML 修复与 UI 路径适配。
- **EVID-002** RepoNova 使用 reponova.yml 配置，当前输出覆盖 jiayan-miniprogram 与 jiayan-tests 两个仓库；check 已通过。
- **EVID-003** 用户明确要求将项目基线和生成的 RepoNova 信息提交，并补充简洁使用步骤。

### Open Items
- N/A

## Roles

- **ROLE-001** 项目维护者克隆仓库、运行小程序测试并查看项目图谱。

## Requirements

- **REQ-001** README 必须给出小程序打开方式、三类测试命令、RepoNova 构建与查看方式，以及不提交缓存和临时状态的边界。
- **REQ-002** 版本库必须纳入 reponova.yml 及可离线查看的图谱、报告、索引、节点概要和向量产物；reponova-out/.cache 必须被忽略。
- **REQ-003** 既有修复和新基线必须通过适用的 Node 测试、RepoNova build/check 与 Git 差异检查；UI 测试必须使用 CLI 自动化端口而非普通 IDE HTTP 端口。
- **REQ-004** 只提交用户授权的任务文件，保留三个任务前 DeepSeek 临时状态文件未跟踪，并将完成结果推送到 origin/main。

## Data Rules

- **INV-001** 图谱版本化边界

## Forward Flow

### FLOW-F-001 复现项目基线

- Actor: ROLE-001
- Precondition: 已克隆仓库并安装 Node.js 与微信开发者工具
- Input: 按 README 命令运行测试和 RepoNova
- Action: 打开 jiayan-miniprogram，运行 jiayan-tests，并构建或查看 reponova-out 图谱
- Data changes: RepoNova 刷新输出，缓存可在本地生成
- Output: 维护者获得可运行小程序、回归证据与离线项目视图
- Next state: BASELINE_READY
- Acceptance: ACC-001, ACC-003

## Reverse Flow

### FLOW-R-001 刷新图谱

- Actor: ROLE-001
- Precondition: 源码有更新
- Input: 运行 reponova build
- Action: 使用 reponova.yml 重建 reponova-out
- Data changes: 更新图谱产物，忽略 .cache
- Output: 新的项目视图可被复核后提交
- Next state: GRAPH_REFRESHED
- Acceptance: ACC-002, ACC-003

## Exceptions

- **EXC-001** 远端 main 在推送前发生变化

## UI Rules

- N/A

## Integrations

- N/A

## Acceptance

- **ACC-001** 根目录 README 的命令和路径覆盖打开小程序、安装测试依赖、三类测试与 RepoNova 图谱查看。
- **ACC-002** RepoNova 输出包含配置、图谱、报告、社区视图、搜索索引、节点概要与 outlines，且 .cache 被忽略。
- **ACC-003** 单元、接口、真实模拟器 UI 测试，以及 RepoNova check 全部通过；UI 测试能通过 CLI 自动化端口启动并执行页面断言。
- **ACC-004** git diff --check 无错误；暂存区仅含既有修复、README、RepoNova 配置和非缓存产物、SOP 派生文档与 .gitignore。
- **ACC-005** 新提交已创建并被 origin/main 接收。

## Risks

- **RISK-001** RepoNova 的 JS/JSON 插件不分析 WXML/WXSS；页面模板和样式关系须以源码和真实模拟器测试补充验证。
- **RISK-002** 图谱缓存与 DeepSeek 状态属于本机再生或会话状态，提交它们会制造噪声并可能混入任务状态。

## Development Handoff

```json
{
  "scope": [
    "README.md",
    ".gitignore",
    "reponova.yml",
    "reponova-out 非缓存产物",
    "jiayan-tests/ui.test.js",
    "SOP.json",
    "SOP.md",
    "development-contract.json"
  ],
  "constraints": [
    "ui.test.js 仅可修复自动化启动/端口兼容性，不得弱化页面断言",
    "不修改三个 DeepSeek 临时状态文件",
    "不提交 reponova-out/.cache",
    "不改变小程序业务源码",
    "只在 ACCEPT 后提交并推送"
  ],
  "acceptance_ids": [
    "ACC-001",
    "ACC-002",
    "ACC-003",
    "ACC-004",
    "ACC-005"
  ],
  "validation_commands": [
    "cd jiayan-tests && npm run test:unit",
    "cd jiayan-tests && npm run test:interface",
    "cd jiayan-tests && npm run test:ui",
    "/Users/ict/.hermes/node/bin/reponova build",
    "/Users/ict/.hermes/node/bin/reponova check"
  ],
  "risk_level": "low"
}
```

## Revision History

- **** V1.2.0：依据任务 codex-20260805-093938-147c739e 的明确请求，发布已验证修复、项目基线和 RepoNova 图谱；替代此前仅覆盖 WXML 压缩修复的 SOP。
- **** V1.2.1：运行时证据显示 ui.test.js 错将普通 IDE HTTP 端口用作自动化 WebSocket；纳入仅限启动/端口兼容性的测试修复，保留全部页面断言。
