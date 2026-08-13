# oh-my-home / jiayan-miniprogram - 小程序本地数据迁移至自托管服务端 SOP

- Version: 1.1.0
- Status: approved
- Effective date: 2026-08-14
- Owner: Codex

## Purpose

在不改变小程序页面 UI 或既有 data.js 调用语义的前提下，将四类现有本地 Storage 数据增量接入已部署的 Node、Express、SQLite 服务端；网络、认证或同步失败时必须保持原有离线本地可用行为。

## Subject

```json
{
  "type": "migration",
  "target": "jiayan-miniprogram 的四类 Storage 数据与 server /api/auth/wechat、/api/sync 之间的离线优先同步适配层",
  "boundary": "客户端 utils、启动入口、customDishes 调用接线和 Node mock 测试；服务端仅作为既有 HTTP JSON 契约进行验证，不改变其实现。"
}
```

## Governance

```json
{
  "authority": true,
  "supersedes": [
    "SOP.json 1.0.0 服务端单独交付范围"
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
- jiayan-miniprogram/utils/data.js 的登录、令牌缓存、启动拉取、合并与异步同步层
- 启动时调用数据层初始化，正式 wx.login 与 WECHAT_TEST_MODE 测试 code 均可用
- 保持既有页面行为，仅将 customDishes 的直接 Storage 读写改接到同名 data.js 接口
- jiayan-tests 中基于 wx mock 与 wx.request mock 的 utils 层回归测试
- 现有 server/ API 的回归验证和 RepoNova 项目图谱刷新

### Excluded
- 页面 UI、WXML、WXSS、交互流程或现有 data.js 导出接口签名的变更
- 服务端 API、数据库结构、云服务器部署、真实微信 AppSecret 或生产 code2session 联调
- analysisData、libTab 等不在服务端 sync API 中的本地状态同步
- 冲突版本控制、后台同步队列、跨设备实时合并或多用户协作

## Evidence and Open Items

### Evidence
- **EVID-001** RepoNova 2026-08-14 build 成功：52 文件、171 节点、175 边、48 跨文件边；data.js 是 14 度中心节点。
- **EVID-002** 实时源码确认 server POST /api/auth/wechat 在 WECHAT_TEST_MODE 接受 test_ 前缀 code 并返回 token；GET /api/sync 与 PUT /api/sync/:resource 已保护四类资源。
- **EVID-003** 实时源码确认 todayMenu、guestCart、ratings 已通过 data.js 写入；customDishes 仅由 library/analysis 页面直接 Storage 读写，需最小接线。

### Open Items
- N/A

## Roles

- **ROLE-001** 小程序用户：离线或在线使用菜单、购物车、评分与自定义菜品。
- **ROLE-002** 自托管服务：验证 token 并保存按用户隔离的同步资源。

## Requirements

- **REQ-007** 数据层初始化时，在已有有效 token 可复用时先获取四类服务端数据；无 token 时使用测试模式随机 test_openid_ code 或 wx.login code 登录，成功后缓存 token。
- **REQ-008** 首次拉取采用本地优先合并：本地已有的非空资源不得被服务端默认空值覆盖；本地空资源可采用服务端值，并将合并结果保留到现有 Storage。
- **REQ-009** setToday、setGuestCart、setRating、setCustomDishes 等写操作须先同步写本地 Storage，再异步 PUT 对应全量资源；失败静默重试恰好一次，绝不阻塞 UI 或抛出给页面。
- **REQ-010** 无 wx.request、网络失败、登录失败或服务端未配置时，所有读取和写入必须保持纯本地 Storage 的原有语义与默认值。
- **REQ-011** 不得修改页面 UI、WXML、WXSS，且既有 data.js 导出函数的参数、返回同步性和调用方式不得被破坏。
- **REQ-012** utils mock 测试必须覆盖无网络本地回退、登录并缓存 token、写后同步、失败重试一次；现有服务端接口测试必须回归通过。
- **REQ-013** 任何源代码或运行时拓扑改动后必须重新执行 RepoNova build，提交仅包含本任务受控文件，不纳入基线未跟踪状态文件和 docs。

## Data Rules

- **DATA-006** {"id": "DATA-006", "source": "REQ-008", "assertion": "同步资源限定为 customDishes、ratings、todayMenu、guestCart；本地数据优先，服务端只补充本地空值，ratings 合并以本地条目覆盖同名服务端条目。"}
- **DATA-007** {"id": "DATA-007", "source": "REQ-009", "assertion": "写入先持久化本地再发起非阻塞请求；每次请求失败最多追加一次同 payload 重试，不改变已经写入的本地值。"}
- **DATA-008** {"id": "DATA-008", "source": "REQ-007", "assertion": "JWT 仅缓存于小程序 Storage 并仅以 Authorization Bearer header 发送；不得记录或硬编码真实密钥。"}

## Forward Flow

### FLOW-F-005 启动认证并拉取

- Actor: ROLE-001
- Precondition: 小程序启动且 wx.request 可用
- Input: 已缓存 token 或 wx.login/test code
- Action: 登录或复用 token，GET /api/sync，并按本地优先规则合并四类资源。
- Data changes: 仅更新既有本地 Storage 和 token 缓存
- Output: 在线数据补充到离线可用本地状态
- Next state: synchronized-or-local
- Acceptance: ACC-005, ACC-006

### FLOW-F-006 本地写后异步同步

- Actor: ROLE-001
- Precondition: 页面调用既有 data.js setter
- Input: 完整资源的新值
- Action: 同步写 Storage，随后以 token PUT /api/sync/:resource。
- Data changes: 本地立即持久化，远端最终替换式写入
- Output: 页面无等待地完成既有操作
- Next state: sync-pending-or-complete
- Acceptance: ACC-007, ACC-009

## Reverse Flow

### FLOW-R-003 离线回退

- Actor: ROLE-001
- Precondition: 无网络、缺 request、登录失败或同步失败
- Input: 任意数据层读取或写入
- Action: 吞掉网络层错误并保留本地数据；失败的 PUT 使用原 payload 再尝试一次。
- Data changes: 只改变本地 Storage，远端失败不回滚
- Output: 原有页面行为和离线数据继续可用
- Next state: local-only
- Acceptance: ACC-008

### FLOW-R-004 重新初始化

- Actor: ROLE-001
- Precondition: 后续启动时网络恢复
- Input: 本地存量与有效或新 token
- Action: 重新执行启动同步；本地数据仍优先于服务端默认或同名值。
- Data changes: 合并后的本地 Storage 可再次上送
- Output: 离线期间的数据不因失败丢失
- Next state: synchronized-or-local
- Acceptance: ACC-005, ACC-008

## Exceptions

- **EXC-005** {"id": "EXC-005", "trigger": "wx.request 不存在或请求失败", "handling": "静默回退；setter 的 PUT 仅重试一次且不等待。", "final_state": "local-only", "assertion": "读取默认值和本地写入与改造前一致。", "acceptance_ids": ["ACC-008"]}
- **EXC-006** {"id": "EXC-006", "trigger": "登录响应缺 token、wx.login 失败或 GET /api/sync 非 2xx", "handling": "不写坏 token，不清除本地资源，不阻塞启动。", "final_state": "local-only", "assertion": "未认证请求不会导致页面异常。", "acceptance_ids": ["ACC-006", "ACC-008"]}
- **EXC-007** {"id": "EXC-007", "trigger": "PUT /api/sync/:resource 首次失败", "handling": "对同一 URL、token 和 payload 异步重试一次；第二次结果静默结束。", "final_state": "local-only-or-complete", "assertion": "请求总数恰为两次且 Storage 保持新值。", "acceptance_ids": ["ACC-007"]}

## UI Rules

- N/A

## Integrations

- **API-003** 客户端使用 wx.request 调用可配置的 HTTP(S) 基地址；测试模式发 test_openid_<随机>，正式模式使用 wx.login 返回的 code。
- **API-004** Authorization 头为 Bearer JWT；GET /api/sync 返回四类资源，PUT /api/sync/:resource body 为资源本体。

## Acceptance

- **ACC-005** 启动同步获得 token 并合并四类数据，本地既有非空值优先且服务端值补充本地空值。
- **ACC-006** 测试和正式登录路径及初始化错误均不破坏本地数据。
- **ACC-007** 四类 setter 本地写后发送带 Bearer token 的 PUT，首个失败后恰好重试一次。
- **ACC-008** 无网络时读取默认值并完成写入，不抛错、不等待且不改坏 Storage。
- **ACC-009** 既有 data.js 导出及同步返回语义保留，页面只有 customDishes 必要接线，未改 UI 资产。
- **ACC-010** utils 层 mock 测试完整通过。
- **ACC-011** 既有 server API 集成测试回归通过。
- **ACC-012** 实现后 RepoNova 图谱成功重建且提交隔离基线脏文件。

## Risks

- **RISK-004** 小程序开发工具必须关闭合法域名校验或配置实际服务端域名；本地单测不能替代真实设备域名/HTTPS 联调。
- **RISK-005** 本地优先策略有意避免离线数据被服务端空值覆盖，但不解决两台设备同时改同一资源的冲突。
- **RISK-006** 服务端当前 JWT 有效期与线上可达性由已部署系统控制；本任务只验证已声明 API 契约的客户端适配。

## Development Handoff

```json
{
  "scope": [
    "SOP.json、SOP.md、development-contract.json",
    "jiayan-miniprogram/app.js",
    "jiayan-miniprogram/utils/data.js",
    "jiayan-miniprogram/pages/library/library.js",
    "jiayan-miniprogram/pages/analysis/analysis.js",
    "jiayan-tests/data-sync.test.js",
    "jiayan-tests/package.json（仅必要时增加测试脚本）"
  ],
  "constraints": [
    "本地 Storage 优先且同步 API 失败不影响 UI",
    "所有既有 data.js 导出签名与同步调用方式不变",
    "使用 wx.request，不新增网络依赖",
    "每次 PUT 失败最多重试一次",
    "不得修改 server/、WXML、WXSS、docs/、reponova-out/ 或基线 .deepseek 状态文件",
    "只允许 DeepSeek 在批准后编辑，GPT 负责独立验收"
  ],
  "acceptance_ids": [
    "ACC-005",
    "ACC-006",
    "ACC-007",
    "ACC-008",
    "ACC-009",
    "ACC-010",
    "ACC-011",
    "ACC-012"
  ],
  "validation_commands": [
    "cd jiayan-tests && npm test",
    "cd server && npm test",
    "git diff --check",
    "git diff --stat",
    "git diff --numstat",
    "/Users/ict/.hermes/node/bin/reponova build"
  ],
  "risk_level": "medium"
}
```

## Revision History

- **** {"version": "1.0.0", "date": "2026-08-06", "change": "服务端独立交付 SOP。"}
- **** {"version": "1.1.0", "date": "2026-08-14", "change": "根据用户明确需求将范围扩展为小程序离线优先同步迁移；保留既有服务端并新增客户端验收。"}
