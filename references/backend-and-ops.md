# 后端、部署与发布

## 询盘后端（server/）

### 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/inquiry` | multipart/form-data；字段 name/company/email 必填，phone/productInterest/message 可选，`photos` 最多 5 张（jpg/png/webp，单张 ≤5MB） |
| GET | `/api/health` | 健康检查，返回 status/uptime |
| GET | `/api/admin/inquiries` | 列表（Bearer ADMIN_TOKEN） |
| GET | `/api/admin/inquiries/export.csv` | CSV 导出（带 BOM） |
| GET | `/api/admin/inquiries/export.xlsx` | XLSX 导出（列宽+冻结+筛选） |
| DELETE | `/api/admin/inquiries/:id` | 删除记录并清理关联图片 |

- 入库：`server/data/inquiries.db`（better-sqlite3，WAL 模式）；旧 `inquiries.json` 首次启动自动迁移并改名为 `.bak`
- 上传图：`server/uploads/`，静态暴露在 `/uploads/*`
- 邮件通知：`server/mailer.ts`，SMTP 未配置时只告警不致错；模板含询盘号、客户信息、图片链接
- 表单提交是 fire-and-forget 发邮件：邮件失败不影响接口成功返回

### 环境变量（`.env`，本地已有；线上部署时按需重建）

| 变量 | 用途 |
|---|---|
| `PORT` | 后端端口，默认 3001 |
| `BASE_URL` | 拼图片绝对链接，生产为站点域名 |
| `ADMIN_TOKEN` | 管理端 Bearer token，生产必须重新生成 |
| `ARK_AK` / `ARK_SK` / `ARK_API_KEY` / `ARK_BASE_URL` / `ARK_PROJECT` | 火山引擎 ARK（图片生成相关） |
| `GRSAI_API_KEY` | 图片服务 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | 询盘邮件通知（QQ 邮箱示例：smtp.qq.com:465 SSL） |
| `NOTIFY_EMAIL` | 询盘通知收件人 |
| `VITE_WHATSAPP_NUMBER` / `VITE_LINKEDIN_URL` / `VITE_CONTACT_EMAIL` / `VITE_API_BASE` | 前端构建期变量（VITE_ 前缀才会打进包） |

`.env.production.example` 是模板（已脱敏为占位符）；**真实值只存在于 `.env` 和本机 `.env.production.example.bak`，两者都不进仓库**。

### 本地联调

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm run server           # http://localhost:3001
curl -s localhost:3001/api/health
```

## 前端部署

### 静态站（预渲染产物）

- 产物在 `dist/`，包含每路由的 `<path>/index.html`
- Caddy 配置关键行：`try_files {path} {path}/index.html /index.html`——目录形式命中预渲染文件，无需别的重写规则
- 必须部署 `npm run build` 的产物；部署 `build:noprerender` 的产物搜索引擎会集体失明

### Vercel（备选）

仓库 devDependency 已含 `vercel`；有 `.vercel-tmp` 历史痕迹。若走 Vercel，注意它默认 SPA 重写会绕过预渲染目录文件，需要在配置里保证静态文件优先。

## 后端部署（宝塔 Node 项目）

`deploy.sh` 在服务器上执行：

1. 检查 Node ≥ v20（用到 Node 20.12+ 的 `process.loadEnvFile`）
2. `npm install --omit=dev`
3. `chmod +x start.sh`
4. 没有 `.env` 时从 `.env.production.example` 复制并提示编辑
5. 试启动 10 秒验证

宝塔面板配置：网站 → 添加站点 → Node 项目 → **传统模式**
- Node 版本 v20.x｜启动文件 `start.sh`｜运行目录项目根｜参数/环境变量留空

`start.sh` 直接 `exec node_modules/.bin/tsx server/index.ts`（不依赖全局 npx），并设 `NODE_ENV=production`。

## 发布到 GitHub

- 仓库：`https://github.com/katelinzhang/official-website`（公开，默认分支 main）
- 权限：仅 owner 可写；ruleset `protect-main` 禁删除、禁强推，无 bypass
- 本机：`gh` 在 `~/.local/bin/gh`，登录账号 `katelinzhang`（token 存 macOS keyring）
- 网络：github.com 直连不通，**所有请求走 `http://127.0.0.1:7897`**；仓库已设 `git config http.proxy`，gh 命令需 `export HTTPS_PROXY=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897`

### 推送前检查清单

```bash
git status                                   # 确认无意外文件
git diff --cached --name-only | grep -E '(^|/)\.env' | grep -v '\.example$'   # 应无输出
# 确认 server/data、server/uploads、*.pptx、*.bak 未被跟踪
git ls-files | grep -E '(inquiries\.(db|json)|uploads/|\.pptx$|\.bak$)'      # 应无输出
```

`.gitignore` 已覆盖：`node_modules/`、`dist/`、`.env`、`.env.*.local`、`.env.production.example.bak`、`.vercel-tmp/`、`.DS_Store`、`*.tsbuildinfo`、`server/data/`、`server/uploads/*`（保留 `.gitkeep`）、`scripts/fix-express.sh`、`*.pptx`。
### 密钥卫生

- ARK key / ADMIN_TOKEN 曾以明文躺在 `.env.production.example` 中，已改为占位符；真实值需在控制台轮换后更新 `.env` 与 `.bak`
- 任何新文件进仓库前，用真实值做一次 `git grep --cached -F "<值>"` 自查
- 本 skill 目录随仓库公开，**不要在 skill 或代码注释里写密钥、服务器 IP、后台 token**
