# qdii-website-skill

Quark Dairy（QDII）官网的 Agent Skill —— 把官网的构建、预渲染、SEO、i18n、询盘后端和发布流程固化下来，让 AI 助手不用每次重新摸索。

适用于 [Qoder](https://qoder.com) / Claude Code 等支持 `SKILL.md` 的 agent 环境。

## 安装

**方式一：装到官网项目内（推荐，随仓库走）**

```bash
mkdir -p <官网项目>/.qoder/skills
cp -R qdii-website-skill <官网项目>/.qoder/skills/qdii-website
```

**方式二：装到用户级（所有项目可用）**

```bash
cp -R qdii-website-skill ~/.qoder/skills/qdii-website
```

装好后执行 `/skills reload`（或重启会话），用 `/qdii-website` 调用；提及"官网"、"prerender"、"sitemap"、"发布"等词也会自动命中。

## 内容

| 文件 | 作用 |
|---|---|
| `SKILL.md` | 触发条件、常用命令、改动流程、硬性红线、i18n/SEO/后端规则、发布与常见坑 |
| `references/project-map.md` | 目录结构、路由 ↔ 页面 ↔ 数据映射、样式约定 |
| `references/seo-and-prerender.md` | 预渲染、sitemap、robots、百度推送的实现细节与校验项 |
| `references/backend-and-ops.md` | 询盘 API、环境变量清单、宝塔部署、GitHub 发布与密钥卫生 |
| `scripts/audit-i18n.mjs` | 校验 en/zh 键对齐、空值、疑似漏翻 |
| `scripts/preflight.sh` | 类型检查 + i18n 校验，默认再跑构建与预渲染校验 |

## 脚本

两个脚本都会从**当前目录向上查找项目根**（含 `src/i18n/en.json`），所以在官网项目目录内任意位置运行都行：

```bash
# 快检：类型 + i18n
bash <skill>/scripts/preflight.sh --fast

# 全流程：类型 + i18n + 构建 + 预渲染抽样校验
bash <skill>/scripts/preflight.sh

# 单独跑 i18n 校验
node <skill>/scripts/audit-i18n.mjs
```

`preflight.sh` 依赖官网项目里已安装的依赖（`npm install`）和 playwright 的 chromium。

## 注意

- Skill 内容针对 Quark Dairy 官网（Vite + React + TS、双语、SPA 预渲染），其他项目直接套用意义有限
- 仓库中不含任何密钥、token 或服务器地址；凭据相关操作只在本地环境执行
