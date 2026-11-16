---
name: qdii-website
description: 维护与发布 Quark Dairy（QDII）B2B 官网（Vite+React+TS 双语营销站）。当任务涉及改页面/组件/文案、新增产品或案例、改 SEO 元信息、跑构建或预渲染校验、部署服务器、推送 GitHub 时使用。Triggers: 官网, 官网改版, products.ts, cases.ts, en.json/zh.json, prerender, sitemap, 百度推送, inquiry 询盘, 部署, 发布, official-website.
---

# QDII 官网（Quark Dairy）维护与发布

## 概述

官网是面向海外市场的 B2B 获客站：英文为主（`/`）、中文为辅（`/zh`）。构建链路是 SPA + 构建期预渲染——**预渲染是 SEO 的命门**，不执行 JS 的爬虫（Baiduspider、DeepSeek Fetch、360Spider）只能读静态 HTML。后端是独立的 Express 服务，收询盘入 SQLite 并发邮件通知。

权威约束在仓库根目录 `CONSTRAINTS.md`（业务、合规、设计红线），本 skill 不重复它，只补充"怎么干活"。

## 环境准备

本机 node 在 nvm 下，非交互 shell 默认没加载，先补 PATH：

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
```

依赖已装；需要重装时 `npm install`（`better-sqlite3` 要编译，慢属正常）。

## 常用命令

```bash
npm run dev                    # 前端 dev server
npm run server                 # 询盘后端 :3001（读 .env，缺文件会警告）
npm run build                  # tsc -b + vite build + 全量预渲染（发布用这个）
npm run build:noprerender      # 仅构建 —— 绝不能用于线上
npm run prerender -- /products # 只补渲染指定路径（试点/救急）
npm run verify:prerender       # 预渲染双模式校验，详见下文
npm run push:baidu             # 百度主动推送，需 BAIDU_TOKEN 环境变量
```

## 改动流程（必须按序）

1. 改代码/数据，遵守 `CONSTRAINTS.md` 红线
2. 类型检查：`npx tsc -b`（项目是 project references，不是 `tsc --noEmit`）
3. i18n 校验：`node <skill>/scripts/audit-i18n.mjs`（在项目目录内运行）
4. 构建：`npm run build`
5. 预渲染校验（本地起静态服务器，端口别用 4190，它在 fetch 的 blocked port 列表里）：

```bash
cd dist && python3 -m http.server 4173 &
VERIFY_BASE=http://127.0.0.1:4173 VERIFY_FULL=1 npm run verify:prerender
kill %1
```

6. 部署（见 references/backend-and-ops.md）

一键快检：`bash <skill>/scripts/preflight.sh --fast`（类型 + i18n）；去掉 `--fast` 会跑完整构建 + 抽样预渲染校验。两个脚本都会从当前目录向上找项目根，装在 `~/.qoder/skills/` 或项目 `.qoder/skills/` 都能用，只需在官网项目目录内运行。

## 硬性红线（违反会被判返工）

- **文案禁止硬编码**：中英文都必须走 `src/i18n/en.json` / `zh.json`；EN 是 authoritative，新增 key 两边同时加
- **禁止 emoji 当图标**：全部用 `src/components/common/Icons.tsx` 里的 SVG 组件
- **禁白底**：页面/卡片/输入框底色用 `brand-cream`（#FFF8EA）或浅绿；Header 用深绿渐变
- **品牌色不可改**：orange #FF9536、green #121A18、support-green #73B839、charcoal #252525
- **猪肉产品不得标 Halal**：`isHalal` 字段必须准确，Halal 筛选时猪肉产品不得出现
- **去标识化**：禁止提及"华宝""Kerisom""IBT"等关联企业；案例隐去客户品牌与 Logo
- **证书不公开**：COA/HACCP/ISO/BRC 只走表单留资，页面只展示规格参数
- **不改核心配置**：`tsconfig.json` / `vite.config.ts` / `tailwind.config.js` 慎动
- **图片不内嵌文字**，正式图用 WebP，命名 `{category}-{slug}.webp`

## 数据与内容

- 产品 40 条：`src/data/products.ts`；案例 9 条：`src/data/cases.ts`；方案 7 条：`src/data/solutions.ts`
- sitemap 插件用正则从数据文件抽 ID，**`id: 'xxx'` 必须写在行首**（不要包在对象里一行写全），否则该 URL 不进 sitemap
- 新增产品/案例后必须重跑 `npm run build`，sitemap 和预渲染才会包含新页面
- 路由：`/` `/products` `/products/:id` `/solutions` `/cases/:id` `/about` `/contact` `/privacy` `/terms`，中文加 `/zh` 前缀

## i18n 规则

- 语言由 URL 决定（`/zh` 前缀 = 中文），**不用浏览器语言探测**——SEO 要求 URL 与语言一一对应
- 当前 en/zh 各 304 个键，必须保持一致；缺 key 会让页面显示 fallback 英文
- `src/utils/locale.ts` + `LocaleSync` 负责 SPA 内切换；新链接用 `LocalizedLink`

## SEO 关键机制

- **sitemap 是插件生成的**（`vite-plugins/sitemap.ts`），不是静态文件；`public/sitemap.xml` 若存在会覆盖它，必须删掉
- 每个逻辑路由输出 en + zh 两条，各带 3 个 hreflang（en / zh-CN / x-default）和百度 `<mobile:mobile>`
- 页面级 SEO 用 `src/components/seo/SEO.tsx`（Helmet）：canonical 必须是绝对地址 `https://www.quarkdairy.cn...`
- 首页 JSON-LD Organization 必须且只能出现 1 次
- `verify:prerender` 的静态模式会校验：正文 ≥300 字符、title/h1 非空、canonical 唯一且正确、hreflang 三个齐全、description 唯一、og:url 正确、html lang、中英文页语言纯度（中文页汉字占比 ≥20%，英文页 ≤30%）

## 后端与隐私（PII 红线）

- 询盘：`POST /api/inquiry`（multipart，最多 5 张图 / 5MB，仅 jpg/png/webp）→ `server/data/inquiries.db`
- 通知邮件：`server/mailer.ts`，SMTP 未配置时跳过（不报错）
- 管理端：`/admin` 页面 + `ADMIN_TOKEN` Bearer 鉴权，支持 CSV/XLSX 导出、删除
- **`server/data/`、`server/uploads/`、`.env` 永远不进仓库**（客户姓名/邮箱/电话/图片）
- `ADMIN_TOKEN` 生产环境必须 `openssl rand -hex 32` 重新生成

## 发布到 GitHub

- 公开仓库 `katelinzhang/official-website`，只有 owner 能写；`protect-main` 规则禁止强推和删除
- 本机 `gh` 在 `~/.local/bin/gh`；github.com 直连不通，**必须走代理**（仓库已配 `http.proxy=http://127.0.0.1:7897`，gh 命令需 `export HTTPS_PROXY=http://127.0.0.1:7897`）
- 推送前自查：`git status` 确认没有 `.env*`（除 `.env.production.example`）、`server/data`、`server/uploads`、`*.pptx`
- 关于 `.qoder/skills/`：本 skill 与仓库一起公开，所以**不要在 skill 或代码里写密钥、服务器 IP、token**

## 部署

详见 references/backend-and-ops.md。要点：服务器用宝塔 Node「传统模式」+ `start.sh` 起 `tsx server/index.ts`；静态站由 Caddy `try_files {path} {path}/index.html /index.html` 命中预渲染产物；前端构建产物在 `dist/`，也可走 Vercel（devDependency 已含）。

## 常见坑

- `vite preview` 必须显式 `--host 127.0.0.1`，否则只监听 IPv6 `::1`，脚本里的 fetch 探活会超时
- 预渲染脚本从 `dist/sitemap.xml` 取 URL 清单——没 build 过就没有清单
- `scripts/verify-prerender.mjs` 硬编码了 playwright chromium 版本路径（`chromium-1223`），playwright 升级后要同步改
- 端口 4190 被 fetch 禁用，校验脚本默认 4173
- 预渲染写入 `dist/<path>/index.html`，SPA 路由靠目录 index 命中，不需要改服务器重写规则

## 资源

- `references/project-map.md` — 目录结构、页面/组件清单、路由与数据对应关系
- `references/seo-and-prerender.md` — 预渲染、sitemap、robots、百度推送的实现细节与校验项
- `references/backend-and-ops.md` — 询盘后端 API、环境变量清单、部署步骤、GitHub 发布细节
- `scripts/audit-i18n.mjs` — en/zh key 对齐、空值、疑似未翻译检查
- `scripts/preflight.sh` — 类型检查 + i18n +（可选）构建/预渲染校验
