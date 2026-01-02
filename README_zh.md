# 小白的开心消消乐

这是一个基于 Web 技术开发的经典三消游戏，支持用户注册、登录、游戏进度保存以及全球排行榜功能。

## 项目简介

该项目采用原生 JavaScript 开发前端逻辑，结合 Cloudflare Workers (Functions) 处理后端逻辑，并使用 Cloudflare D1 作为持久化数据库。游戏具有平滑的动画效果、动态难度调整以及特殊的“超级方块”消除机制。

## 核心功能

- **游戏玩法**：经典的点击交换或滑动交换消除模式。
- **动态难度**：随着关卡提升，方块种类增加、目标分数提高，挑战性逐步增强。
- **超级方块**：低概率生成的特殊方块，消除时可清除整行和整列。
- **账户系统**：支持玩家注册与登录，本地 `localStorage` 自动登录。
- **进度存档**：实时同步游戏关卡和总得分到云端数据库。
- **排行榜**：展示全球玩家的闯关进度和累计最高得分。
- **个人设置**：支持修改昵称、密码以及安全退出。
- **响应式设计**：适配 PC 端与移动端设备。

## 技术栈

- **前端**：HTML5, CSS3 (Flexbox, Grid, CSS Variables, Animations), Vanilla JavaScript (ES6+)。
- **后端**：Cloudflare Workers (Pages Functions)。
- **数据库**：Cloudflare D1 (SQLite-based SQL database)。

## 项目结构

```text
d:/A_project_01/xiaoxiaole
├── index.html              # 游戏主入口及 UI 结构
├── style.css               # 游戏视觉样式及动画定义
├── script.js               # 核心游戏逻辑及 API 通信
├── schema.sql              # 数据库初始化脚本
├── functions/              # Cloudflare Workers API 逻辑
│   └── api/
│       ├── login.js        # 登录处理
│       ├── register.js     # 注册处理
│       ├── rank.js         # 排行榜获取
│       ├── save_progress.js # 进度保存
│       └── update_profile.js# 用户资料更新
└── _redirects              # Cloudflare Pages 路由重定向配置
```

## 数据库设计

项目使用两张主要表：
1. `users`: 存储用户信息（用户名、加密后的密码、创建时间）。
2. `user_progress`: 存储玩家的游戏进度（关卡、累计得分、更新时间）。

## 环境搭建与部署

本项目基于 Cloudflare 全家桶（Pages + Workers + D1）开发，以下是详细的部署与本地开发步骤。

### 1. 环境准备
- 安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本)。
- 注册一个 [Cloudflare](https://dash.cloudflare.com/) 账号。
- 安装 Cloudflare CLI 工具 Wrangler：
  ```bash
  npm install -g wrangler
  ```

### 2. 创建并配置 D1 数据库
1. 在 Cloudflare 控制台创建 D1 数据库，或使用命令行创建：
   ```bash
   npx wrangler d1 create xiaoxiaole-db
   ```
2. **本地开发绑定**：在项目根目录创建 `wrangler.toml` (如果使用 Pages 则在控制台配置)，确保 API 能够访问数据库。
3. **初始化表结构**：
   ```bash
   # 本地环境初始化
   npx wrangler d1 execute xiaoxiaole-db --local --file=./schema.sql
   
   # 线上环境初始化
   npx wrangler d1 execute xiaoxiaole-db --remote --file=./schema.sql
   ```

### 3. 本地开发调试
1. **启动预览服务器**：
   Cloudflare Pages 支持本地模拟 Workers 和 D1：
   ```bash
   npx wrangler pages dev . --d1 xiaoxiaole-db
   ```
2. 访问 `http://localhost:8788` 即可在本地进行游戏开发和接口调试。

### 4. 线上部署
1. **关联 GitHub (推荐)**：
   - 将代码推送到 GitHub 仓库。
   - 在 Cloudflare Pages 后台新建项目，选择该仓库。
   - 在“设置” -> “函数” -> “D1 数据库绑定”中，添加绑定：
     - **变量名称**: `DB` (必须与代码中 `env.DB` 保持一致)
     - **D1 数据库**: 选择刚才创建的 `xiaoxiaole-db`
2. **命令行部署 (可选)**：
   ```bash
   npx wrangler pages deploy . --project-name xiaoxiaole
   ```

## D1 数据库管理维护

在开发过程中，如果需要直接操作数据库（如删除用户、重置进度等），可以使用 `wrangler` 命令行工具。

### 常用管理命令

> 请将 `<database-name>` 替换为你实际的 D1 数据库名称。

- **删除特定用户**：
  ```bash
  # 删除用户账号及其进度
  npx wrangler d1 execute <database-name> --command="DELETE FROM users WHERE username = '玩家昵称';"
  npx wrangler d1 execute <database-name> --command="DELETE FROM user_progress WHERE username = '玩家昵称';"
  ```

- **重置所有玩家进度**：
  ```bash
  # 将所有玩家的关卡重置为1，得分重置为0
  npx wrangler d1 execute <database-name> --command="UPDATE user_progress SET level = 1, total_score = 0;"
  ```

- **清空排行榜（清空所有进度数据）**：
  ```bash
  npx wrangler d1 execute <database-name> --command="DELETE FROM user_progress;"
  ```

- **清空所有用户数据（危险操作）**：
  ```bash
  npx wrangler d1 execute <database-name> --command="DELETE FROM user_progress; DELETE FROM users;"
  ```

- **查询当前注册用户数**：
  ```bash
  npx wrangler d1 execute <database-name> --command="SELECT COUNT(*) FROM users;"
  ```

- **查看排行榜数据**：
  ```bash
  npx wrangler d1 execute <database-name> --command="SELECT * FROM user_progress ORDER BY total_score DESC LIMIT 10;"
  ```

## 游戏规则

1. **基础消除**：将三个或更多相同的方块连成一线即可消除。
2. **超级方块**：带有 `🌟` 标识的方块，参与消除时会引发十字形大范围爆炸。
3. **过关条件**：在规定的步数内达到目标分数。
4. **死局处理**：当棋盘上没有可消除的组合时，系统会自动洗牌。

---
*祝你玩得开心！*
