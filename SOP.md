# oh-my-home - minify-wxml-library-recovery SOP

- Version: 1.0.0
- Status: approved
- Effective date: 2026-08-05
- Owner: ict

## Purpose

恢复微信开发者工具模拟器中菜谱库页面的组件解析能力，排除新增 WXML 压缩配置造成的空白页和 wx://not-found 风险。

## Subject

```json
{
  "type": "defect",
  "target": "微信小程序 project.config.json 中 WXML 压缩开关",
  "boundary": "只改变开发者工具构建期的 WXML 压缩行为；菜谱库的页面路由、数据与业务交互保持不变。"
}
```

## Governance

```json
{
  "authority": true,
  "supersedes": [
    "wheel-spin-animation SOP 1.0.2"
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
- jiayan-miniprogram/project.config.json 的 setting.minifyWXML 配置
- 已授权的 jiayan-tests/ui.test.js 真实模拟器回归
- ui.test.js 在页面重启后的页面引用刷新
- 单元、接口、UI 全量验收与体验版上传

### Excluded
- 业务页面 WXML、JS、WXSS 与菜品数据修改
- 新增依赖、页面路由或项目 appid 修改
- 未授权的任务前脏文件与 RepoNova 产物提交

## Evidence and Open Items

### Evidence
- **EVID-001** 当前工作树 project.config.json 在 setting 内新增 minifyWXML: true；用户明确授权关闭它，并将其列为模拟器菜谱库空白页与 Component is not found wx://not-found 的最大嫌疑。
- **EVID-002** RepoNova check 成功；现有图谱为 108 nodes、102 edges、2 repos，project.config.json 位于配置社区，app.json 将 pages/library/library 声明为 tab 页面。

### Open Items
- N/A

## Roles

- **ROLE-001** 小程序用户通过菜谱库浏览和筛选菜品。

## Requirements

- **REQ-001** setting.minifyWXML 必须被移除或显式设为 false，且 JSON 保持可被微信开发者工具读取。
- **REQ-002** 不得改变 app.json 页面路由、菜谱库业务源码、appid 或其他构建设置。
- **REQ-003** 单元、接口和真实模拟器 UI 全量测试必须通过；菜谱库的想吃筛选必须仍可运行。
- **REQ-004** 验收通过后必须上传体验版，并仅提交本任务修改与任务文档后推送 origin/main。

## Data Rules

- **INV-001** 构建配置边界

## Forward Flow

### FLOW-F-001 加载菜谱库

- Actor: ROLE-001
- Precondition: 开发者工具读取项目配置后编译小程序
- Input: 打开菜谱库标签页
- Action: 导航至 pages/library/library 并渲染页面组件
- Data changes: 无
- Output: 菜谱库显示可筛选的菜品列表，不出现空白页或 wx://not-found 组件错误
- Next state: LIBRARY_READY
- Acceptance: ACC-003

## Reverse Flow

### FLOW-R-001 筛选想吃菜品

- Actor: ROLE-001
- Precondition: 状态为 LIBRARY_READY
- Input: 点击想吃筛选项
- Action: 点击想吃筛选项
- Data changes: 仅更新页面筛选结果
- Output: 列表缩小且每项状态均为想吃
- Next state: LIBRARY_FILTERED
- Acceptance: ACC-003

## Exceptions

- **EXC-001** 体验版上传失败

## UI Rules

- **UI-001** 菜谱库页面在真实模拟器中必须有内容区，筛选后列表可见且没有组件缺失错误。

## Integrations

- N/A

## Acceptance

- **ACC-001** 配置是有效 JSON，minifyWXML 未开启，且配置差异只包含本项开关的关闭。
- **ACC-002** npm run test:unit 与 npm run test:interface 均通过。
- **ACC-003** npm run test:ui 连接真实微信开发者工具模拟器，菜谱库筛选和全套 UI 用例通过。
- **ACC-004** 真实微信开发者工具模拟器中菜谱库页面有可见内容，想吃筛选后的列表可见且无 wx://not-found 组件错误。
- **ACC-005** 体验版上传成功；RepoNova 图谱刷新成功；经独立 diff 审查后任务文件已提交并推送 origin/main。

## Risks

- **RISK-001** Component is not found 也可能来自开发者工具缓存或基础库；关闭压缩后必须用真实模拟器 UI 测试验证，不能只以配置静态检查为结论。
- **RISK-002** miniprogram-automator 在 reLaunch 后可能使旧 page 节点失效；测试只能刷新其页面引用，不得修改被测业务页面。

## Development Handoff

```json
{
  "scope": [
    "jiayan-miniprogram/project.config.json",
    "jiayan-tests/ui.test.js",
    "SOP.json",
    "SOP.md",
    "development-contract.json"
  ],
  "constraints": [
    "仅允许关闭 minifyWXML",
    "ui.test.js 仅允许在 reLaunch 后刷新 automator 当前页面引用",
    "不得新增依赖",
    "不得提交 reponova.yml 或 reponova-out"
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
    "/Users/ict/.hermes/node/bin/reponova build"
  ],
  "risk_level": "medium"
}
```

## Revision History

- **** V1.0：根据任务 codex-20260805-055726-2e346957 的明确授权创建；取代先前与本缺陷无关的转盘动画 SOP。
- **** V1.1：真实模拟器 UI 验收发现 reLaunch 后旧 page 节点失效；依据用户对 ui.test.js 的既有授权，将页面引用刷新纳入测试修复范围。
