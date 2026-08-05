# 家宴小本子

微信小程序项目，包含菜谱库、今日菜单、转盘抽菜和客人点菜；`jiayan-tests` 提供回归测试，`reponova-out` 提供离线项目图谱。

## 快速使用

1. 在微信开发者工具中导入 `jiayan-miniprogram/`，使用其中的项目配置编译并预览。
2. 安装并运行回归测试：

   ```bash
   cd jiayan-tests
   npm ci
   npm run test:unit
   npm run test:interface
   npm run test:ui
   ```

   `test:ui` 需要本机已安装微信开发者工具，并通过其自动化端口启动或由测试脚本启动。

3. 查看项目全视图：在项目根目录运行 `reponova check`；直接在浏览器打开 `reponova-out/graph.html`，社区视图位于 `reponova-out/graph_communities.html`，架构摘要位于 `reponova-out/report.md`。

4. 每次完成新增或修改源码的提交后，必须刷新图谱：

   ```bash
   reponova build
   reponova check
   ```

   本仓库使用 `reponova.yml`，覆盖 `jiayan-miniprogram` 和 `jiayan-tests`。新成员每次源码提交后都必须运行上述命令，审查并提交生成的图谱、报告、索引、节点概要和 outlines；`reponova-out/.cache/` 是本地缓存，不提交。

## 项目结构与关键路径

| 路径 | 职责 |
| --- | --- |
| `jiayan-miniprogram/app.json` | 小程序入口和页面/标签栏路由 |
| `jiayan-miniprogram/pages/` | 菜谱库、抽菜转盘、菜单等页面逻辑 |
| `jiayan-miniprogram/utils/data.js` | 菜品数据和本地存储接口；是页面数据流核心 |
| `jiayan-tests/` | Node 单元/接口测试及真实模拟器 UI 回归 |
| `reponova-out/` | 由 RepoNova 生成的可离线查看图谱和检索索引 |

页面从 `app.json` 的 `pages` 和 `tabBar` 进入，页面通过 `utils/data.js` 读取菜品和写入微信本地存储；测试工程以跨仓导入覆盖这些数据层和 UI 路径。RepoNova 当前的 JS/JSON 图谱不解析 WXML/WXSS，因此页面模板和样式仍由真实模拟器 UI 测试兜底。

## 版本控制边界

不要提交 `.deepseek-*-state*.json` 这类会话临时状态，也不要提交 `reponova-out/.cache/`。其余受版本控制的 `reponova-out` 文件是可复现的项目基线，刷新后应与源码变更一并审查。
