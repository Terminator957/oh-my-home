# oh-my-home - wheel-spin-animation SOP

- Version: 1.0.2
- Status: approved
- Effective date: 2026-08-04
- Owner: ict

## Purpose

优化抽一道页面的转盘反馈，使抽取过程有清晰的加速、匀速和减速节奏，并在停下后突出展示已抽中的菜品。

## Subject

```json
{
  "type": "feature",
  "target": "微信小程序 pages/wheel 的抽菜转盘交互",
  "boundary": "仅负责从点击“转”到结果可确认的前端呈现；随机结果和 addToday 持久化保持现有契约。"
}
```

## Governance

```json
{
  "authority": true,
  "supersedes": [],
  "derived_contracts": [
    "development-contract.json"
  ],
  "conflicts": [],
  "change_policy": "merge-back-required"
}
```

## Scope

### Included
- pages/wheel/wheel.js 的动画状态和完成时机
- pages/wheel/wheel.wxml 的进行中和结果展示
- pages/wheel/wheel.wxss 的转盘和结果动画
- 转盘相关回归验证

### Excluded
- 候选菜品池、随机选择规则和今日菜单存储逻辑
- 页面导航、全局主题、任务开始前已修改的 project.config.json 与 ui.test.js
- 新增第三方动画依赖或改变其他页面

## Evidence and Open Items

### Evidence
- **EVID-001** wheel.js 当前以 2.4 秒 transform transition 和 2.45 秒 setTimeout 完成抽取；wxml 仅在旋转时显示省略号。
- **EVID-002** RepoNova build: 39 files, 107 nodes, 101 edges；wheel.js 为转盘入口，当前插件未覆盖 WXML/WXSS 关系。

### Open Items
- N/A

## Roles

- **ROLE-001** 用餐决策用户点击转盘、查看结果并选择确认或重新抽取。

## Requirements

- **REQ-001** 用户点击中心转盘按钮后，盘面必须有可见的完整旋转并在选中扇区正对固定指针时停止；旋转期间不得重复触发新的抽取。
- **REQ-002** 旋转期间必须给出进行中反馈；停止后必须以视觉动画突出选中菜名和结果区域。
- **REQ-003** 动画只能使用 transform、opacity 等合成属性；系统设置 prefers-reduced-motion 时必须缩短或取消装饰性动画，同时保持结果正确可用。
- **REQ-004** 原有随机范围、候选池、确认写入今日菜单、未抽取时确认提示和重新抽取能力必须保持。

## Data Rules

- **INV-001** 结果状态一致性

## Forward Flow

### FLOW-F-001 开始抽取

- Actor: ROLE-001
- Precondition: spinning 为 false
- Input: 点击中心转盘按钮
- Action: 生成候选索引和目标角度，清除旧结果并置 spinning=true
- Data changes: angle 增加至少四整圈；wheelIdx 置 -1
- Output: 转盘开始并显示进行中反馈
- Next state: SPINNING
- Acceptance: ACC-001, ACC-002

### FLOW-F-002 展示结果

- Actor: 系统
- Precondition: 旋转时长结束
- Input: 本轮预先锁定的候选索引
- Action: 尝试触觉反馈并写入 wheelIdx、菜名和元数据
- Data changes: spinning 置 false，wheelIdx 置候选索引
- Output: 结果区域以揭示动画显示菜品
- Next state: RESULT_READY
- Acceptance: ACC-001, ACC-002

## Reverse Flow

### FLOW-R-001 再次抽取

- Actor: ROLE-001
- Precondition: 状态为 RESULT_READY
- Input: 再次点击中心转盘按钮
- Action: 执行新一轮开始抽取流程
- Data changes: 旧结果被清除，新随机索引锁定
- Output: 显示新一轮进行中反馈
- Next state: SPINNING
- Acceptance: ACC-001, ACC-002

### FLOW-R-002 拒绝未抽取确认

- Actor: ROLE-001
- Precondition: wheelIdx 小于 0
- Input: 点击确认按钮
- Action: 显示“先转一下”提示且不调用 addToday
- Data changes: 无
- Output: 用户留在转盘页面
- Next state: IDLE
- Acceptance: ACC-003

## Exceptions

- **EXC-001** 旋转期间重复点击
- **EXC-002** 触觉反馈不可用

## UI Rules

- **UI-001** 保留现有暖色纸本视觉、圆形转盘与固定红色指针，不改变页面信息层级。
- **UI-002** 转盘减速与结果揭示使用明确、短暂的缓动；禁止布局属性动画和无限装饰循环。
- **UI-003** 375px 宽度下目标控件和菜名不得溢出或覆盖；prefers-reduced-motion 下装饰性动画最小化。

## Integrations

- N/A

## Acceptance

- **ACC-001** 转盘可启动、旋转时锁定、停止后给出有效结果，且目标角度仍与随机索引匹配。
- **ACC-002** 进行中、结果揭示和减少动态效果规则均存在，且动画只使用合成属性。
- **ACC-003** 单元和接口回归通过，且未抽取确认不写入今日菜单。

## Risks

- **RISK-001** 微信开发者工具与真机的 CSS animationend 触发可能不同；结果落定仍以受控计时器为准。
- **RISK-002** ui.test.js 是任务前脏文件，不能修改；若补充断言，只新增独立任务测试文件。

## Development Handoff

```json
{
  "scope": [
    "wheel 页面及独立新增的转盘回归测试文件"
  ],
  "constraints": [
    "不得编辑任务基线脏文件",
    "不得新增第三方依赖",
    "不得改变业务随机与存储逻辑",
    "使用原生微信小程序能力"
  ],
  "acceptance_ids": [
    "ACC-001",
    "ACC-002",
    "ACC-003"
  ],
  "validation_commands": [
    "cd jiayan-tests && npm run test:unit",
    "cd jiayan-tests && npm run test:interface",
    "cd jiayan-tests && npm run test:ui"
  ],
  "risk_level": "medium"
}
```

## Revision History

- **** V1.0：基于任务 codex-20260804-195130-a63dafdc 的明确实现请求创建；范围无冲突。
- **** V1.0.1：第一轮实现验收发现 20fps setData 逐帧方案偏离已批准的原生多阶段动画方向，且 reducedMotion 状态无有效来源；要求改用 wx.createAnimation，并保留 WXSS 的减少动态装饰规则。
- **** V1.0.2：以微信小程序的实际主要 375px 模拟器为可执行视觉验收目标；记录三项关键验收均已通过。
