# Short URI Project

一个可直接部署到 Vercel 的短链生成与管理项目：
- 前端：React + Vite + TailwindCSS（`apps/web`）
- 后端：Node.js + Express + Drizzle ORM + PostgreSQL（`apps/api`）
- 数据库：Supabase（仅 DB 托管）
- 部署：前后端分别部署至 Vercel，数据库使用 Supabase Connection Pooling（PgBouncer）

> 推荐 Node 20 LTS（本地与 Vercel 都建议使用 Node 20）。

## 目录结构（Monorepo）

```
short-uri-project/
  apps/
    api/        # Express 后端（Serverless 友好）
    web/        # React + Vite 前端
  packages/
    db/         # Drizzle schema & SQL 迁移
  scripts/
    apply-migrations.mjs  # 简单 SQL 迁移执行脚本
  drizzle.config.ts
  .gitignore
  package.json
  tsconfig.base.json
```

## 功能概览
- 管理员登录系统（基于环境变量的固定账号）
- 创建/列表/删除短链（需登录后操作）
- 短链点击量统计与分析
- 访问 `/:slug` 跳转（后端 302）
- `slug` 全小写；前端新建时自动生成 8 位随机 `slug`

## 前置要求
- Node 20 LTS + npm 10+
- Supabase 项目（获取 Connection Pooling DSN）

## 环境变量

根目录 `.env`（不会提交到 Git）：

```
DATABASE_URL=postgresql://<user>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require

# 管理员账号配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

- 必须使用 Supabase Connection Pooling（PgBouncer）DSN，端口通常为 `6543`，并附加 `sslmode=require`。
- 管理员账号密码可自定义，默认为 `admin/admin123456`
- 生产环境（Vercel）在项目设置的 Environment Variables 中设置所有变量。

前端（`apps/web`）支持（构建时变量）：

```
VITE_API_BASE_URL=https://your-api.vercel.app
```

- 若未配置该变量，构建产物会回退为 `http://localhost:3001`，用于本地开发。
- 生产强烈建议配置为后端线上域名；或在 web 项目添加 rewrite 代理 `/api/*` 到后端。

## 安装与本地开发

1) 安装依赖

```
npm install
```

2) 配置数据库连接
- 在项目根创建 `.env`，填入 Supabase Pooling DSN（见上）

3) 初始化数据库（建表）

- 方式 A（控制台执行 SQL）：
  - 打开 Supabase Dashboard → SQL Editor，执行 `packages/db/migrations/0000_init.sql`

- 方式 B（本地运行脚本）：
  - （仅用于本地开发）
  ```bash
  node scripts/apply-migrations.mjs
  ```

4) 启动后端与前端

```
# 后端（默认 http://localhost:3001）
npm run dev:api

# 前端（默认 http://localhost:5173）
npm run dev:web
```

5) 访问
- 管理端：`http://localhost:5173`（使用 admin/admin123456 登录）
- 短链跳转：`http://localhost:3001/{slug}`（302 到目标地址）

## API 速览

- POST `/api/auth/login` 管理员登录
  - 请求体：`{ username: string, password: string }`
  - 成功：`200 { token, user }`
- POST `/api/links` 创建短链（需认证）
  - 请求体：`{ slug: string, destinationUrl: string }`（slug 小写）
  - 成功：`201 { slug }`
- GET `/api/links` 列表（需认证）
- GET `/api/links/:id` 详情（需认证）
- PUT `/api/links/:id` 更新（需认证）
- DELETE `/api/links/:id` 删除（需认证）
- GET `/api/analytics/:linkId/basic` 点击量统计（需认证）
- GET `/:slug` 跳转（公开，记录点击）

## 部署到 Vercel

前后端建议分成两个 Vercel 项目（需要在 Vercel 部署两次，同一个 Git 仓库分别创建两个项目）：

- Web（React + Vite）
  - Root Directory: `apps/web`
  - 环境变量：`VITE_API_BASE_URL=https://your-api.vercel.app`
  - 绑定域名（例如 `app.yourdomain.com`）

- API（Express）
  - Root Directory: `apps/api`
  - 环境变量：
    - `DATABASE_URL=Supabase Pooling DSN（带 sslmode=require）`
    - `ADMIN_USERNAME=admin`（可自定义）
    - `ADMIN_PASSWORD=your-secure-password`（强烈建议修改）
    - `JWT_SECRET=your-super-secret-jwt-key`（必须修改）
  - 绑定短链域名（例如 `s.yourdomain.com`）

> 若不想在前端配置 `VITE_API_BASE_URL`，可在 Web 项目加 `vercel.json` 将 `/api/*` 重写到 API 域名。

## 常见问题（FAQ）

- 线上构建后前端依然请求 `http://localhost:3001`？
  - 因为 `VITE_API_BASE_URL` 未在构建时提供，产物使用了默认回退值。请在 Web 项目环境变量设置该值并重新部署。

- 数据库连接报错 `Connection terminated unexpectedly`？
  - 使用 Supabase Connection Pooling DSN（端口 6543 + `sslmode=require`）。
  - 本地建议使用 Node 20 LTS。

- 证书错误 `self-signed certificate in certificate chain`？
  - 确保 DSN 带 `sslmode=require`。
  - 某些环境需要提供 CA 证书，生产环境请勿关闭 TLS 验证。

- 端口占用 `EADDRINUSE: :3001`？
  - 本地已有进程占用 3001，结束占用或更换端口。

## 开发备注
- `slug` 强制小写，前端创建时自动生成 8 位随机字符串。
- 前端样式使用 TailwindCSS，可根据需要调整 `tailwind.config.js` 与 `src/index.css`。
- ORM 使用 Drizzle，schema 在 `packages/db/schema.ts`，可扩展统计与多租户字段。

---
如需接入 Supabase Auth、统计查询接口、限流、或 Vercel 配置重写文件等，我可以继续补充。
