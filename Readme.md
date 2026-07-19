
<div align="center">

# 📖 巴别图书馆 · The Library of Babel
*A Personal Blog Inspired by Borges*

一座以博尔赫斯同名短篇小说为灵感的个人博客。图书馆由无限延伸的六边形回廊构成，收录随笔、读书笔记与思辨——每一卷都早已写好，我们只是在翻阅。

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_6-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white)

</div>

> "宇宙（别人管它叫图书馆）由一个数目不定的、也许是无限的六边形回廊组成，每个回廊各有四面书架……"
> 
> *—— 豪·路·博尔赫斯*

---

## ❖ 项目愿景

以博尔赫斯《巴别图书馆》为概念的个人博客。图书馆由无限延伸的六边形回廊构成，包含一切可能的书籍。博客将文章称为**"卷册"**，分类称为**"六边形回廊"**，搜索称为**"检索目录"**，并内置一个"巴别生成器"——根据地址确定性生成图书馆中某一页的内容（已移除）。

## ❖ 隐喻映射

文学与现实在此交汇：

| 博尔赫斯隐喻 | 应用概念 | 示例 |
| :--- | :--- | :--- |
| 🏛️ **六边形回廊** | 博客分类 | 随笔、读书笔记、思辨、札记、书信 |
| 📜 **卷册** | 博客文章 | "在午夜图书馆里的一场梦" |
| 🔍 **检索目录** | 全文搜索 | 跨所有卷册搜索 |
| 🧑‍🏫 **图书管理员** | 作者 / 管理员 | 默认作者 |
| ✍️ **批注** | 评论 & 高亮 | 读者在卷册上的标注 |

## ❖ 功能概览

- 📜 **卷册阅读器** — Markdown 渲染、首字下沉、阅读进度条、目录（滚动高亮）、字号调整
- 🗂️ **六边形回廊** — 按分类浏览，每个回廊有专属页面与封面
- 🔍 **检索目录** — 全文目录搜索 + 基于标签的相似卷册推荐
- 💾 **阅读记忆** — 自动保存阅读位置，首页"继续阅读"卡片一键恢复
- 🖍️ **文本高亮与页边批注** — 选中文本高亮、添加批注，数据存储在浏览器 localStorage
- 🧭 **SPA 导航** — Zustand 驱动的视图切换，所有页面在 `/` 路由下完成，URL 永不改变
- 🌗 **三重主题** — 暗色（墨水/午夜）、亮色（羊皮纸）、烛光模式
- ⌨️ **命令面板** — `⌘K` 快速导航，`⌘1-8` 视图切换
- ✍️ **撰写 / 管理后台** — 在线撰写、编辑、删除卷册，管理员令牌认证
- 📡 **RSS 订阅** — `/api/rss` 输出 Atom Feed

## ❖ 技术栈

| 层级 | 技术选型 |
| :--- | :--- |
| ⚙️ **框架** | Next.js 16 (App Router) + TypeScript |
| 🎨 **样式** | Tailwind CSS 4 + shadcn/ui |
| 🗄️ **数据库** | PostgreSQL (Prisma 6 ORM) |
| 🧠 **状态管理** | Zustand（SPA 视图路由） |
| 📝 **Markdown** | react-markdown |
| ✨ **动画** | Framer Motion |
| 🏃 **运行时** | Bun |

## ❖ 快速开始

### 环境要求
- Node.js 18+ 或 Bun
- PostgreSQL 数据库

### 安装与配置

```bash
# 1. 克隆仓库
git clone https://github.com/Azad-sl/The-Library-of-Babel.git
cd The-Library-of-Babel

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入以下内容：
# DATABASE_URL="postgresql://user:password@localhost:5432/babel_library"
# ADMIN_PASSWORD="your-secret-admin-password"  # 可选，保护写入/删除端点
```

### 初始化数据库

```bash
# 推送 Schema 到数据库
bun run db:push

# （可选）填充种子数据 — 10 篇中文文学散文
bun run db:seed
```

### 启动开发服务器

```bash
bun dev
```

打开 `http://localhost:3000` 即可看到图书馆。

首次访问时，可通过命令面板 (`⌘K`) 选择"填充图书馆"来导入示例数据，或直接进入撰写视图 (`⌘7`) 写下第一卷。

## ❖ 键盘快捷键

| 快捷键 | 功能 |
| :---: | :--- |
| <kbd>⌘ K</kbd> | 命令面板 |
| <kbd>⌘ 1</kbd> | 首页 |
| <kbd>⌘ 2</kbd> | 书库 |
| <kbd>⌘ 3</kbd> | 六边形回廊 |
| <kbd>⌘ 4</kbd> | 检索目录 |
| <kbd>⌘ 5</kbd> | 关于 |
| <kbd>⌘ 7</kbd> | 执笔 |
| <kbd>⌘ 8</kbd> | 馆长办公室 |

## ❖ 数据模型

| 模型 | 用途 |
| :--- | :--- |
| `User` | 作者 / 管理员（预留） |
| `Post` | 卷册（博客文章） |
| `Comment` | 读者评论（公开、只追加） |
| `BabelBookmark` | 巴别生成器书签 |

---

<details>
<summary><h2>📂 查看项目结构</h2></summary>

```bash
src/
├── app/
│   ├── api/              # RESTful API 路由（文章、评论、搜索、认证……）
│   ├── globals.css       # 主题变量、纹理、动画
│   ├── layout.tsx        # 根布局（字体、主题提供者）
│   └── page.tsx          # 唯一页面入口（SPA 宿主）
├── components/
│   ├── library/          # 业务组件（视图、阅读器、侧边栏……）
│   └── ui/               # shadcn/ui 基础组件
├── hooks/                # 自定义 Hooks（阅读记忆、高亮、异步加载……）
├── store/
│   └── library-store.ts  # Zustand SPA 视图路由
└── lib/
    ├── api.ts            # 类型化 API 客户端
    ├── babel.ts          # 确定性页面生成工具
    ├── types.ts          # TypeScript 类型定义
    └── utils.ts          # 通用工具函数
prisma/
├── schema.prisma         # 数据模型（Post, Comment, User, BabelBookmark）
└── seed.ts               # 种子数据脚本
```
</details>

<details>
<summary><h2>🚀 部署指南 (Vercel / VPS)</h2></summary>

### 部署到 Vercel

项目专为 Vercel + 托管 PostgreSQL 设计，`next.config.ts` 已默认使用 Vercel 构建输出格式（不需要 `output: "standalone"`）。

**第一步：创建数据库**
推荐使用 **Neon**（免费额度足够个人博客使用）：
1. 前往 [neon.tech](https://neon.tech) 注册并创建一个项目
2. 创建完成后，在 Dashboard 中复制连接串，格式类似：
   `postgresql://neondb_owner:xxxxx@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. 记下这个值，后面要用作 `DATABASE_URL`

> 也可以使用 [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) 或 [Supabase](https://supabase.com)，流程类似。

**第二步：推送代码到 GitHub**
```bash
git init
git add .
git commit -m "init: 巴别图书馆"
git remote add origin https://github.com/<你的用户名>/The-Library-of-Babel.git
git push -u origin main
```

**第三步：在 Vercel 导入项目**
1. 前往 [vercel.com](https://vercel.com) 并登录
2. 点击 **Add New... → Project**
3. 选择刚推送到 GitHub 的仓库，点击 **Import**
4. 在 **Configure Project** 页面，不要修改 Build Command 和 Output Directory（Vercel 会自动识别 Next.js）

**第四步：配置环境变量**
在同一页面的 **Environment Variables** 区域，添加以下变量：

| Key | Value | 说明 |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://neondb_owner:xxxxx@...` | 第一步中复制的 PostgreSQL 连接串 |
| `ADMIN_PASSWORD` | `your-secret-password` | **可选**。馆长办公室登录口令，不设则写入端点无保护 |

> ⚠️ `ADMIN_PASSWORD` 建议设置。如果不设，任何人都可以通过 API 创建、修改、删除文章。

点击 **Deploy**，等待构建完成（约 1-2 分钟）。

**第五步：填充初始数据**
部署成功后，有两种方式导入示例数据：

- **方式 A：通过命令面板（推荐）** — 打开你的线上站点，按 `⌘K` 打开命令面板，选择 **"填充图书馆"**。
- **方式 B：通过 API** — `curl -X POST https://你的域名.vercel.app/api/seed`

> 种子脚本是幂等的：如果已有 ≥8 篇文章，不会重复创建。

**第六步：验证**
- 🏠 访问首页，确认六边形徽章、推荐卷册、统计栏正常显示
- 📖 点击任意卷册，确认阅读进度条、目录、排版正常
- 🔐 按 `⌘8` 进入馆长办公室，输入 `ADMIN_PASSWORD` 验证登录
- ✍️ 按 `⌘7` 打开撰写视图，试着写一卷新文章

**后续更新**
每次 `git push` 到 `main` 分支，Vercel 会自动重新构建部署。如果修改了 Prisma Schema，`bun run build` 会自动执行 `prisma generate && prisma db push`，无需手动操作数据库。

---

### 自建服务器部署（VPS / Docker）

如果你不用 Vercel，需要把 `next.config.ts` 中的 `output: "standalone"` 加回来：

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};
```

然后执行构建并运行：
```bash
bun run build
node .next/standalone/server.js
```

项目根目录的 `Caddyfile` 提供了 Caddy 反向代理配置示例（默认代理到 `localhost:3000`）。

</details>

---

## ❖ 致谢

灵感源自豪尔赫·路易斯·博尔赫斯的短篇小说《巴别图书馆》。感谢 `vibe coding` 的力量。

<div align="center">

*"如果有天堂，天堂应该是图书馆的模样。"*
*—— 博尔赫斯*

</div>
