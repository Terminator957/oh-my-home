# oh-my-home / jiayan-miniprogram - 家宴小本子服务端 SOP

- Version: 1.0.0
- Status: approved
- Effective date: 2026-08-06
- Owner: ict（需求授权）/ Codex（交付负责人）

## Purpose

为当前仅使用 wx.setStorageSync 的家宴小本子提供可自托管的轻量服务端，使经微信登录认证的用户可跨设备保存家用级菜品与菜单数据，并提供受控菜品、统计和可分享直达菜单。

## Subject

```json
{
  "type": "feature",
  "target": "jiayan-miniprogram 的独立 server/ 服务端",
  "boundary": "HTTP JSON API、SQLite 数据文件和部署脚本；客户端保持未改，所有持久化数据必须通过认证用户隔离。"
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
- server/ 下 Node.js、Express 与 SQLite 服务端及数据库初始化
- 微信 wx.login code 到 code2session 的服务端交换、用户创建和 Bearer 令牌鉴权
- customDishes、ratings、todayMenu、guestCart 的按用户云同步
- 受控菜品查询、用户自定义菜品写入、统计分析和分享令牌接口
- 本地自动化接口测试、健康检查和 Linux 云服务器一键部署脚本

### Excluded
- 修改小程序页面、wx.request 接入或现有本地 storage 行为
- 微信开放平台资质配置、真实 AppSecret 提供和生产 code2session 联调
- 在未提供 SSH 地址、账号、域名与 DNS 控制权时连接或修改用户云服务器
- 云开发、云函数、支付、多人协作权限和通用后台管理界面

## Evidence and Open Items

### Evidence
- **EVID-001** 现有 data.js 将 todayMenu、guestCart 与 ratings 写入 wx storage；analysis.js 写入 customDishes。
- **EVID-002** 现有 app.json 有 13 个小程序页面；guest.js 已提供页面直达分享。
- **EVID-003** RepoNova 2026-08-05 图谱包含 110 节点、106 边；utils/data.js 为最高耦合数据模块，图谱尚无服务端节点。

### Open Items
- **TBD-001** 实际部署需用户在目标 Linux 主机提供 SSH 可达性、域名 DNS、微信小程序 AppID/AppSecret；实现仅提供安全的环境变量入口与部署脚本。

## Roles

- **ROLE-001** {"id": "ROLE-001", "name": "登录用户", "responsibility": "只能访问自己的同步数据、统计和分享资源。"}
- **ROLE-002** {"id": "ROLE-002", "name": "服务端", "responsibility": "验证令牌、持久化数据、校验输入、生成分享令牌并记录受控菜品。"}

## Requirements

- **REQ-001** 服务端提供基于微信 code2session 的登录端点，在测试模式允许显式 mock code，且不得将 AppSecret 返回给客户端。
- **REQ-002** 服务端使用 Bearer 令牌保护除健康检查和登录外的业务端点，并按用户隔离数据。
- **REQ-003** 服务端支持 customDishes、ratings、todayMenu、guestCart 的全量读取和幂等替换式同步。
- **REQ-004** 服务端提供内置受控菜品查询及用户自定义菜品创建、读取、更新、删除。
- **REQ-005** 服务端提供用户统计和分享直达菜单：创建分享、匿名读取有效分享、过期或撤销后拒绝访问。
- **REQ-006** 服务端提供可复现的本地测试、健康检查、环境变量样例和可在常见 Linux/麒麟发行版执行的部署命令。

## Data Rules

- **DATA-001** {"id": "DATA-001", "source": "REQ-001", "assertion": "users 以微信 openid 唯一；只保存 openid、会话键加密摘要或空值、昵称、创建与更新时间，不保存客户端 AppSecret。"}
- **DATA-002** {"id": "DATA-002", "source": "REQ-003", "assertion": "user_sync 以每用户每资源键保存 JSON、版本和更新时间；PUT 完整替换同一资源是幂等的。"}
- **DATA-003** {"id": "DATA-003", "source": "REQ-003", "assertion": "同步结构与查询均按 user_id 过滤，任一用户不能读取或写入另一个用户的数据。"}
- **DATA-004** {"id": "DATA-004", "source": "REQ-004", "assertion": "dishes 为服务端受控内置菜品，用户自定义菜品不允许覆盖内置菜品。"}
- **DATA-005** {"id": "DATA-005", "source": "REQ-005", "assertion": "shares 使用不可预测令牌、可选过期时间和撤销状态；匿名只可读取创建时的菜单快照。"}

## Forward Flow

### FLOW-F-001 微信登录

- Actor: ROLE-001
- Precondition: 客户端已取得 wx.login code
- Input: 微信登录 code
- Action: POST /api/auth/wechat，服务端 code2session 后创建或更新用户并签发 JWT。
- Data changes: 创建或更新 users 记录
- Output: 不含密钥的令牌与用户摘要
- Next state: authenticated
- Acceptance: ACC-002

### FLOW-F-002 同步资源

- Actor: ROLE-001
- Precondition: Bearer JWT 有效
- Input: 四类同步资源的完整 JSON
- Action: GET /api/sync 获取四类数据，PUT /api/sync/:resource 原子替换校验后的资源。
- Data changes: 写入当前用户对应 user_sync 资源与版本
- Output: 按当前用户隔离的数据与版本
- Next state: synchronized
- Acceptance: ACC-002

### FLOW-F-003 管理菜品与查看统计

- Actor: ROLE-001
- Precondition: Bearer JWT 有效
- Input: 菜品属性或统计查询
- Action: 读取内置菜品，管理个人菜品，读取统计聚合。
- Data changes: 仅创建或更新当前用户 custom_dishes
- Output: 受控菜品、个人菜品和统计结果
- Next state: data-managed
- Acceptance: ACC-002

### FLOW-F-004 创建分享

- Actor: ROLE-001
- Precondition: Bearer JWT 有效且存在菜单
- Input: 可选的分享有效期
- Action: POST /api/shares 保存 todayMenu 快照；访客按 token 读取。
- Data changes: 写入当前用户的不可预测分享令牌与菜单快照
- Output: 可直达的分享令牌和菜单快照
- Next state: shared
- Acceptance: ACC-002

## Reverse Flow

### FLOW-R-001 删除个人菜品

- Actor: ROLE-001
- Precondition: Bearer JWT 有效且目标菜品属于该用户
- Input: 当前用户的菜品 ID
- Action: DELETE /api/custom-dishes/:id。
- Data changes: 删除当前用户的 custom_dishes 记录
- Output: 204；不存在或跨用户 ID 返回 404
- Next state: custom-dish-deleted
- Acceptance: ACC-002

### FLOW-R-002 撤销分享

- Actor: ROLE-001
- Precondition: Bearer JWT 有效且目标分享属于该用户
- Input: 当前用户的分享 ID
- Action: DELETE /api/shares/:id。
- Data changes: 将当前用户 shares 记录置为 revoked
- Output: 204；匿名读取随即返回 404
- Next state: share-revoked
- Acceptance: ACC-002

## Exceptions

- **EXC-001** {"id": "EXC-001", "trigger": "缺失或无效 Authorization，或资源不属于当前用户", "handling": "分别返回 401 或 404", "final_state": "request-rejected", "assertion": "不泄露其他用户存在或数据", "acceptance_ids": ["ACC-002"]}
- **EXC-002** {"id": "EXC-002", "trigger": "微信网络、微信响应错误或生产配置缺失", "handling": "返回 502 或配置错误，不创建用户", "final_state": "login-failed", "assertion": "不返回 AppSecret", "acceptance_ids": ["ACC-002"]}
- **EXC-003** {"id": "EXC-003", "trigger": "非法 JSON、未知同步资源、过大数组或无效菜品字段", "handling": "返回 400；内部数据库错误返回通用 500", "final_state": "validation-failed", "assertion": "不会写入部分或未校验的数据", "acceptance_ids": ["ACC-002"]}
- **EXC-004** {"id": "EXC-004", "trigger": "客户端重试相同完整同步请求", "handling": "在 SQLite 事务中替换同一用户同一资源", "final_state": "synchronized", "assertion": "不产生重复记录", "acceptance_ids": ["ACC-002"]}

## UI Rules

- N/A

## Integrations

- **API-001** 小程序以 wx.request 调用 HTTPS API；本任务仅交付服务端契约，客户端接线后续进行。
- **API-002** 微信 code2session URL 由服务端通过 WECHAT_APP_ID 和 WECHAT_APP_SECRET 配置，不硬编码密钥。

## Acceptance

- **ACC-001** 服务端可用 npm start 启动，GET /health 返回 200 与数据库就绪信息。
- **ACC-002** 接口测试覆盖登录、认证拒绝、四类同步、用户隔离、菜品 CRUD、统计和分享创建/读取/撤销。
- **ACC-003** 配置和部署文档不含真实密钥，提供 env 示例与 Linux systemd/Nginx 部署流程或等价一键脚本。
- **ACC-004** RepoNova 在服务端新增后成功重建，图谱反映 server 节点与测试。

## Risks

- **RISK-001** 真实微信 code2session 和生产部署依赖外部密钥、域名、DNS 与服务器访问；本地 mock 测试不能替代真实联调。
- **RISK-002** SQLite 适合家用级单实例；多实例扩展需改用共享数据库。
- **RISK-003** 旧客户端继续写本地 storage，须在后续小程序改造中显式处理首次上传、冲突策略和离线重试。

## Development Handoff

```json
{
  "scope": [
    "新增 server/ 及其测试、部署资料",
    "新增 SOP.json、SOP.md、development-contract.json"
  ],
  "constraints": [
    "Node.js + Express + SQLite",
    "无云函数/云开发",
    "只修改本任务新增文件",
    "不得提交现有脏的 reponova-out 或 .deepseek 状态文件"
  ],
  "acceptance_ids": [
    "ACC-001",
    "ACC-002",
    "ACC-003",
    "ACC-004"
  ],
  "validation_commands": [
    "cd server && npm ci && npm test",
    "cd server && npm start",
    "curl -fsS http://127.0.0.1:3000/health",
    "bash -n server/deploy.sh",
    "/Users/ict/.hermes/node/bin/reponova build"
  ],
  "risk_level": "medium"
}
```

## Revision History

- **** {"version": "1.0.0", "date": "2026-08-06", "change": "由用户明确服务端需求、技术约束及交付授权创建。"}
