# 基于 Cloudflare 的短链接项目

这是一个使用现代技术栈构建的 URL 短链接项目，专为部署在 Cloudflare 生态系统而设计。

## ✨ 功能特性

- **自定义短链**: 创建带有自定义 slug 的简短、易记的链接
- **管理后台**: 一个用于管理链接的简单仪表盘
- **分析统计**: 对每个链接进行基础的点击跟踪
- **边缘部署**: 运行在 Cloudflare 的全球网络上，实现低延迟
- **无服务器**: 使用 Cloudflare Pages Functions 构建，数据存储在 Cloudflare KV 中
- **高性能**: 批量查询点击统计，优化加载速度

## 🚀 技术栈

- **前端**: React 18, Vite, Tailwind CSS
- **后端**: Cloudflare Pages Functions (原生 JavaScript)
- **数据库**: Cloudflare KV
- **部署**: Cloudflare Pages
- **代码仓库**: 使用 npm workspaces 管理的 Monorepo

## 🏗️ 项目结构

```
short-uri-project/
├── apps/
│   ├── web/                 # React 前端应用
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── api/                 # API 工作区 (仅用于构建)
│       └── package.json
├── functions/               # Cloudflare Pages Functions 输出
├── functions-simple.js      # 主要的 API 实现
├── package.json            # 根目录配置
└── README.md
```

## 🛠️ 本地开发

### 1. 前提条件

- Node.js (v20 或更高版本)
- npm
- 一个 Cloudflare 账户

### 2. 安装

克隆仓库并安装依赖：

```bash
git clone https://github.com/your-repo/short-uri-project.git
cd short-uri-project
npm install
```

### 3. 前端开发

启动前端开发服务器：

```bash
npm run dev:web
```

这将启动 Vite 开发服务器，通常地址为 `http://localhost:5173`。

### 4. 本地测试 API

由于项目使用 Cloudflare Pages Functions，本地 API 测试需要部署到 Cloudflare Pages 进行。

## ☁️ 部署

本项目设计用于部署到 Cloudflare Pages。

### 1. 连接你的仓库

在 Cloudflare 仪表盘中，创建一个新的 Pages 项目并连接到你的 GitHub 仓库。

### 2. 配置构建设置

- **构建命令**: `npm run build`
- **构建输出目录**: `apps/web/dist`
- **根目录**: 保持为仓库根目录

### 3. 配置 Functions 和 KV

#### a. Functions

构建流程会自动将 `functions-simple.js` 复制到 `functions/[[path]].js`，作为 Cloudflare Pages Functions 的入口点。

#### b. KV 命名空间绑定

1. 在 Cloudflare 仪表盘中，转到 **Workers & Pages** > **KV**
2. 创建一个新的 KV 命名空间 (例如 `SHORT_URI_KV_PROD`)
3. 进入你的 Pages 项目设置 > **Functions** > **KV namespace bindings**
4. 添加一个新的绑定：
   - **变量名称**: `SHORT_URI_KV`
   - **KV 命名空间**: 选择你创建的命名空间

#### c. 环境变量

在你的 Pages 项目设置中，转到 **Environment Variables** 并为你的生产环境添加以下变量：

- `JWT_SECRET`: 一个长的、随机的、保密的字符串
- `ADMIN_USERNAME`: 你期望的管理员用户名
- `ADMIN_PASSWORD`: 你期望的管理员密码

### 4. 部署

保存你的设置。Cloudflare Pages 将会构建并部署你的项目。任何推送到你连接的分支的新提交都会触发新的部署。

## 📡 API 端点

项目提供以下 API 端点：

- `POST /api/auth/login` - 管理员登录
- `GET /api/links` - 获取链接列表 (按创建时间降序)
- `POST /api/links` - 创建新链接
- `DELETE /api/links/:id` - 删除链接
- `GET /api/analytics/batch` - 批量获取所有链接的点击统计
- `GET /:slug` - 短链接重定向

## 🎯 性能优化

- **批量查询**: 使用 `/api/analytics/batch` 端点一次性获取所有链接的点击统计
- **边缘缓存**: 利用 Cloudflare 的全球 CDN 网络
- **无服务器**: 按需扩展，无需管理服务器

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 启动前端开发服务器
npm run dev:web

# 构建项目
npm run build

# 部署 (通过 Git 集成自动部署)
npm run deploy
```

## 📝 注意事项

- 项目已从 PostgreSQL/Drizzle 迁移到 Cloudflare KV
- 移除了所有数据库相关的依赖和配置
- API 使用原生 JavaScript 实现，无需额外的框架
- 所有功能都经过测试并正常工作
