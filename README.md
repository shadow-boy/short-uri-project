# 基于 Cloudflare 的短链接项目

这是一个使用现代技术栈构建的 URL 短链接项目，专为部署在 Cloudflare 生态系统而设计。

## ✨ 功能特性

- **自定义短链**: 创建带有自定义 slug 的简短、易记的链接。
- **管理后台**: 一个用于管理链接的简单仪表盘。
- **分析统计**: 对每个链接进行基础的点击跟踪。
- **边缘部署**: 运行在 Cloudflare 的全球网络上，实现低延迟。
- **无服务器**: 使用 Cloudflare Pages 和 Workers 构建，数据存储在 Cloudflare KV 中。

## 🚀 技术栈

- **前端**: React, Vite, Tailwind CSS
- **后端**: Hono on Cloudflare Pages Functions
- **数据库**: Cloudflare KV
- **代码仓库**: 使用 npm workspaces 管理的 Monorepo。

## 🏗️ 项目结构

本项目是一个 Monorepo，包含两个主要包：

- `apps/web`: 基于 React 的前端应用。
- `apps/api`: 作为 Cloudflare Pages Function 运行的 Hono API。

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

### 3. 前端 (`apps/web`)

前端应该可以直接运行。要启动开发服务器：

```bash
npm run dev:web
```

这将启动 Vite 开发服务器，通常地址为 `http://localhost:5173`。

### 4. 后端 (`apps/api`)

后端使用 Wrangler 在本地运行 Cloudflare Workers。

#### a. 配置环境变量

在 `apps/api` 目录下创建一个 `.dev.vars` 文件。该文件供 Wrangler 在本地开发时使用。

**文件: `apps/api/.dev.vars`**
```ini
JWT_SECRET="a-very-secret-and-strong-key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-local-password"
```

> **注意**: 不要将 `.dev.vars` 文件提交到版本控制中。

#### b. 运行 API

为 API 启动本地开发服务器：

```bash
npm run dev:api
```

这将启动一个本地 Wrangler 服务器，通常地址为 `http://localhost:8787`。它还会在本地创建一个 `.wrangler` 目录来模拟 KV 存储。

## ☁️ 部署

本项目设计用于部署到 Cloudflare Pages。

### 1. 连接你的仓库

在 Cloudflare 仪表盘中，创建一个新的 Pages 项目并连接到你的 GitHub 仓库。

### 2. 配置构建设置

- **构建命令**: `npm run build`
- **构建输出目录**: `apps/web/dist`
- **根目录**: 保持为仓库根目录。

### 3. 配置 Functions 和 KV

#### a. Functions

我们的构建流程 (`npm run build`) 会自动将 `apps/api` 工作区的 API 代码编译并输出到项目根目录下的 `/functions/[[path]].js` 文件中。这个文件作为 Cloudflare Pages Functions 的入口点，处理所有的 API 路由。

#### b. KV 命名空间绑定

1.  在 Cloudflare 仪表盘中，转到 **Workers & Pages** > **KV**。
2.  创建一个新的 KV 命名空间 (例如 `SHORT_URI_KV_PROD`)。
3.  进入你的 Pages 项目设置 > **Functions** > **KV namespace bindings**。
4.  添加一个新的绑定：
    - **变量名称**: `SHORT_URI_KV`
    - **KV 命名空间**: 选择你创建的命名空间。

#### c. 环境变量

在你的 Pages 项目设置中，转到 **Environment Variables** 并为你的生产环境添加以下变量：

- `JWT_SECRET`: 一个长的、随机的、保密的字符串。
- `ADMIN_USERNAME`: 你期望的管理员用户名。
- `ADMIN_PASSWORD`: 你期望的管理员密码。

### 4. 部署

保存你的设置。Cloudflare Pages 将会构建并部署你的项目。任何推送到你连接的分支的新提交都会触发新的部署。

### 5. 故障排除

如果遇到 "No routes found" 错误，请确保：
- 构建命令正确设置为 `npm run build`
- 项目根目录包含生成的 `functions` 目录
- KV 命名空间绑定正确配置
