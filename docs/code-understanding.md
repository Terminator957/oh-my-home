# 家宴小本子 代码理解报告（DeepSeek harness 2026-08-10）

# 家宴小本子 · 代码理解分析

## 1. 架构总览

### 页面结构（13 页）
```
TabBar 4 页：home（小本子）/ library（菜谱库）/ add（添一道）/ us（我们）
功能页 9 页：dish / today / wheel / swipe / mood / guest / guest-cart / host-order / analysis
```

### 数据流
```
utils/data.js（静态常量 + Storage 读写）
        ↓
各页面 JS（require 引入 → 读取/写入 → setData 渲染）
        ↓
WXML 模板（展示 + 交互事件）
```

### 模块划分
| 模块 | 页面 | 职责 |
|------|------|------|
| 首页聚合 | home | 今日推荐、快捷入口、统计概览 |
| 菜谱管理 | library / dish / add / analysis | 浏览、详情、新增、热量分析 |
| 决策工具 | wheel / swipe / mood | 转盘、滑卡、按心情选菜 |
| 今日菜单 | today | 定餐、购物清单、热量汇总 |
| 家宴场景 | guest / guest-cart / host-order | 客人点菜、购物车、主厨收单 |
| 个人中心 | us | 统计、设置入口 |

---

## 2. 数据模型（utils/data.js）

### Storage 存储结构

| Key | 格式 | 作用 |
|-----|------|------|
| `todayMenu` | `string[]`（菜名数组） | 今日菜单，默认 `['冬瓜排骨汤','麻婆豆腐','白灼菜心']` |
| `guestCart` | `string[]`（菜名数组） | 客人点菜购物车，默认 `['红烧肉','酸菜鱼','蒜蓉粉丝虾']` |
| `ratings` | `object`（`{菜名: 星级}`） | 用户自定义评分，覆盖默认星级 |
| `customDishes` | `object[]`（自定义菜品） | 用户新增菜品，字段同 DISHES |
| `analysisData` | `object` | 热量分析暂存数据（name/status/flavors/ings/kcal） |
| `libTab` | `string` | 菜谱库 Tab 跳转暂存（'想吃'/'做过'） |

### 静态常量
- **DISHES**：12 道内置菜，含 name/status/cat/ing/ingFull/time/level/made/stars/kcal/flavor/log/img
- **MOOD_MAP**：6 种心情 → 推荐菜名映射
- **IMGS**：菜名 → 图片路径映射

---

## 3. 核心业务流程：今天吃什么

### 全链路
```
入口（4 种方式）
├─ home 今日推荐 → pickRec → addToday → today
├─ wheel 转盘 → spin → confirm → addToday → today
├─ swipe 滑卡 → like/skip → settle → setToday → today
└─ mood 按心情 → choose → addToday → today
        ↓
today 页面
├─ 展示菜单（含图片/热量/标签）
├─ 计算总热量、人均、预计时间
├─ 生成购物清单（食材拼接）
├─ 可移除菜品（× 按钮）
└─ 开始做饭（Toast 提示）
```

### 关键逻辑
- **addToday**：去重后追加到 todayMenu
- **setToday**：整体覆盖（swipe 场景）
- **today 默认值**：无数据时自动填充 DEFAULT_MENU 并持久化

---

## 4. 页面职责表

| 页面 | 职责 | 入口 | 依赖 |
|------|------|------|------|
| **home** | 今日推荐、快捷入口、统计、最近做过 | TabBar | DISHES, addToday |
| **library** | 菜谱列表、搜索、Tab 筛选 | TabBar | DISHES, starText |
| **add** | 拍照/选图、填菜名/食材/口味、热量估算 | TabBar | 无（写 analysisData） |
| **us** | 个人统计、设置入口、分享 | TabBar | 无 |
| **dish** | 菜品详情、评分、加入今日 | library/home 点击 | findDish, getRating, setRating, addToday |
| **today** | 今日菜单、热量汇总、购物清单 | 各决策页跳转 | findDish, getToday, setToday |
| **wheel** | 转盘随机选菜 | home 入口 | DISHES, addToday |
| **swipe** | 滑卡选菜（左滑跳过/右滑想吃） | home 入口 | DISHES, setToday |
| **mood** | 按心情推荐 | home 入口 | MOOD_MAP, findDish, addToday |
| **guest** | 客人点菜（分类筛选、加入购物车） | home 家宴按钮/分享 | DISHES, getGuestCart, setGuestCart |
| **guest-cart** | 已点清单、备注、提交 | guest 跳转 | getGuestCart, setGuestCart |
| **host-order** | 主厨收单、采购清单、导出 | guest-cart 提交 | 静态数据 ORDERS |
| **analysis** | 热量分析展示、保存入库 | add 跳转 | 读 analysisData |

---

## 5. 现状痛点

### 纯本地存储局限
1. **数据不可同步**：换设备/清缓存即丢失，无法多端共享
2. **无用户体系**：无法区分主厨/客人身份，guest 场景是伪多人
3. **静态数据硬编码**：DISHES 写死在代码里，新增菜品仅存本地
4. **统计造假**：home 页 `+14`、`+55`、`+69` 等魔法数字拼凑，非真实数据
5. **无法分享实时数据**：分享出去的 guest 页是静态快照，客人点菜主厨看不到

### 代码质量问题
1. **魔法数字泛滥**：`+14`、`+55`、`+69`、`+9` 等硬编码统计
2. **mock 数据混入**：home 的 recent/bars、host-order 的 ORDERS、analysis 的 contrib 均为写死数据
3. **页面职责不清**：home 同时承担推荐、统计、入口、图表多种职责
4. **无状态管理**：页面间通过 Storage 传参，耦合度高
5. **重复代码**：菜品卡片渲染逻辑在 library/guest/mood/swipe 多处重复
6. **无错误处理**：Storage 读写无 try-catch，wx API 调用无 fail 回调

---

## 6. 与后端对接建议

### 需上云的数据

| 数据 | 当前存储 | 建议接口 | 说明 |
|------|----------|----------|------|
| 菜品库 | DISHES 常量 + customDishes | `GET /dishes` `POST /dishes` | 核心数据，支持增删改查 |
| 今日菜单 | todayMenu | `GET/PUT /today-menu` | 按日期维度存储 |
| 评分 | ratings | `PUT /dishes/:id/rating` | 用户维度 |
| 客人点菜 | guestCart | `POST /events/:id/orders` | 家宴事件维度 |
| 家宴事件 | 无（静态） | `POST /events` `GET /events/:id` | 支持创建/分享/加入 |
| 用户信息 | 无 | `GET /user` | 微信登录 openid |
| 统计 | 魔法数字 | `GET /stats` | 真实聚合数据 |

### 接口映射建议

```
前端页面 → 后端接口
─────────────────────────────
home        → GET /stats, GET /today-menu, GET /dishes/recommend
library     → GET /dishes?status=&keyword=
dish        → GET /dishes/:id, PUT /dishes/:id/rating
add/analysis→ POST /dishes/analyze, POST /dishes
today       → GET/PUT /today-menu
wheel/swipe → GET /dishes?status=想吃,常做
mood        → GET /dishes?flavor=
guest       → GET /events/:id, POST /events/:id/orders
guest-cart  → PUT /events/:id/orders
host-order  → GET /events/:id/orders, GET /events/:id/shopping-list
us          → GET /user/stats
```

### 架构演进建议
1. **阶段一**：云开发（微信云托管）快速替换 Storage，保留现有页面结构
2. **阶段二**：引入状态管理（如 MobX），页面间共享数据
3. **阶段三**：重构为「家宴事件」模型，支持多人实时协作（WebSocket 或云函数轮询）
