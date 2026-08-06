# 家宴小本子服务端

为「家宴小本子」微信小程序提供的自托管轻量服务端，基于 Node.js + Express + SQLite。

## 功能

- **微信登录**：通过 `wx.login` code 换取 openid，签发 JWT Bearer 令牌
- **数据同步**：跨设备同步 `customDishes`、`ratings`、`todayMenu`、`guestCart`
- **菜品管理**：内置 12 道受控菜品（只读）+ 用户自定义菜品 CRUD
- **统计分析**：用户菜品、评分聚合统计
- **分享直达**：生成可分享的菜单令牌，匿名读取，支持过期和撤销

## 快速开始

### 本地开发

```bash
cd server

# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，测试模式设置 WECHAT_TEST_MODE=true

# 2. 安装依赖
npm install

# 3. 启动服务
npm start

# 4. 健康检查
curl http://127.0.0.1:3000/health
```

### 运行测试

```bash
npm test
```

测试覆盖：健康检查、登录认证、认证拦截、四类同步、用户隔离、菜品 CRUD、统计、分享创建/读取/撤销。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `JWT_SECRET` | JWT 签名密钥 | `change-me`（生产环境必须修改） |
| `WECHAT_APP_ID` | 微信小程序 AppID | 生产必填 |
| `WECHAT_APP_SECRET` | 微信小程序 AppSecret | 生产必填 |
| `WECHAT_TEST_MODE` | 测试模式开关 | `false` |
| `DB_PATH` | SQLite 数据库路径 | `./data/jiayan.db` |
| `JWT_EXPIRES_IN` | JWT 有效期 | `7d` |
| `SHARE_EXPIRES_IN_DAYS` | 分享默认有效期（天） | `7` |

### 测试模式

设置 `WECHAT_TEST_MODE=true` 后，无需真实微信环境即可测试登录。客户端以 `test_` 开头的 code 直接登录：

```json
POST /api/auth/wechat
{ "code": "test_openid_alice" }
```

响应包含 JWT token，可用于后续认证请求。**生产环境必须关闭测试模式。**

## API 文档

### 无需认证

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `POST` | `/api/auth/wechat` | 微信登录 |
| `GET` | `/api/shares/:token` | 匿名读取分享 |

### 需 Bearer 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sync` | 获取全部同步数据 |
| `PUT` | `/api/sync/:resource` | 幂等替换指定资源 |
| `GET` | `/api/dishes` | 内置菜品列表 |
| `GET` | `/api/custom-dishes` | 用户自定义菜品列表 |
| `POST` | `/api/custom-dishes` | 创建自定义菜品 |
| `PUT` | `/api/custom-dishes/:id` | 更新自定义菜品 |
| `DELETE` | `/api/custom-dishes/:id` | 删除自定义菜品 |
| `GET` | `/api/stats` | 用户统计 |
| `POST` | `/api/shares` | 创建分享 |
| `DELETE` | `/api/shares/:id` | 撤销分享 |

### 同步资源类型

- `customDishes` — JSON 数组，元素含 `name` 必填
- `ratings` — JSON 对象 `{ "菜品名": 评分(0-5) }`
- `todayMenu` — 字符串数组
- `guestCart` — 字符串数组

## 部署

### 一键部署（Linux）

```bash
# 1. 配置 .env（从 .env.example 复制并填写）
cp .env.example .env
vim .env

# 2. 执行部署脚本
chmod +x deploy.sh
sudo ./deploy.sh
```

脚本自动完成：
- Node.js 20+ 和 Nginx 安装
- 应用部署到 `/opt/jiayan-server`
- systemd 服务注册与启动
- Nginx 反向代理配置（HTTP，域名需自行替换）

### 手动部署

```bash
# 安装依赖
npm ci --omit=dev

# 创建 systemd 服务
sudo cp jiayan-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jiayan-server

# 配置 Nginx 反向代理（参考 deploy.sh 中的模板）
```

## 技术栈

- **运行时**：Node.js 20+
- **框架**：Express 4
- **数据库**：SQLite (better-sqlite3)
- **认证**：JWT (jsonwebtoken)
- **测试**：node:test + supertest

## 文件结构

```
server/
├── server.js           # 入口文件
├── db.js               # 数据库初始化与种子数据
├── middleware/
│   └── auth.js         # JWT 认证中间件
├── routes/
│   ├── auth.js         # POST /api/auth/wechat
│   ├── sync.js         # GET/PUT /api/sync
│   ├── dishes.js       # 内置菜品 + 自定义菜品 CRUD
│   ├── stats.js        # GET /api/stats
│   └── shares.js       # 分享创建/读取/撤销
├── test/
│   └── api.test.js     # 接口测试套件
├── .env.example        # 环境变量示例
├── .env.test           # 测试环境变量
├── deploy.sh           # 一键部署脚本
├── package.json
└── README.md
```

## 安全说明

- `.env` 文件包含敏感信息，请勿提交到版本控制
- 生产环境必须设置强随机 `JWT_SECRET`
- 生产环境必须关闭 `WECHAT_TEST_MODE`
- AppSecret 绝不会返回给客户端
- 所有用户数据按 `user_id` 隔离

## 许可证

本项目为家宴小本子配套服务端，仅供个人/家庭使用。
