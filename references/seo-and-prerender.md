# SEO 与预渲染实现细节

## 为什么必须预渲染

站点是纯 SPA，原始 HTML 只有一个空 `<div id="root">`。Googlebot 会执行 JS，但 Baiduspider、360Spider、DeepSeek Fetch 等不执行——拿到 0 正文字符，等同 404。`npm run build` 已把预渲染串进流水线。

## 构建流水线

```
npm run build
  ├─ tsc -b                                   # 类型检查（project references）
  ├─ vite build                               # 产出 dist/（含 closeBundle 阶段写 sitemap）
  └─ node scripts/prerender.mjs               # 逐页预渲染，覆盖 dist/**/index.html
```

### prerender.mjs 行为

- 读 `dist/sitemap.xml` 的 `<loc>` 得到 URL 清单；无清单直接报错（说明没先 build）
- 起 `vite preview --port 4180 --host 127.0.0.1 --strictPort`（**必须带 --host 127.0.0.1**，否则只监听 IPv6 `::1`，探活永久超时）
- Playwright 逐页打开，等 `#root` 内文本 ≥200 字符（不是等 networkidle，图片懒加载会让它迟迟不到），再等 300ms 稳定
- 抽查正文 <200 字符即判失败，宁可不写也不写空壳
- 输出：`/` → `dist/index.html`；其余 → `dist/<path>/index.html`
- 支持试点：`npm run prerender -- /products /zh/products`
- chromium 查找顺序：`~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/...` → `chrome-mac/Chromium` → 交给 playwright 自己解析

### sitemap.ts 行为

- `apply: 'build'`，在 `closeBundle` 写 `dist/sitemap.xml`
- 路由 = 7 个静态路由 + 从 `products.ts`/`cases.ts` 用正则抽出的 ID（`/products/:id`、`/cases/:id`）
- 每个逻辑路由输出两条（en + /zh），中文 priority 自动 -0.1 避免与英文站争词
- 每条 `<url>` 带：`<mobile:mobile type="pc,mobile"/>`（百度移动适配）、lastmod（构建日）、changefreq、priority、3 个 `<xhtml:link hreflang>`（en / zh-CN / x-default，每条都要列全含自身）
- **`public/sitemap.xml` 若存在会在拷贝阶段覆盖插件产物——必须保证 public/ 里没有**

## 校验（verify-prerender.mjs）

```bash
cd dist && python3 -m http.server 4173 &
VERIFY_BASE=http://127.0.0.1:4173 VERIFY_FULL=1 npm run verify:prerender
# 线上同样适用
VERIFY_BASE=https://www.quarkdairy.cn VERIFY_FULL=1 npm run verify:prerender
```

**A. 静态模式（javaScriptEnabled:false，爬虫视角）**——每页必须：
- 正文字符 ≥300（否则视为预渲染没生效）
- title / h1 非空
- canonical 恰好 1 个且等于 `https://www.quarkdairy.cn<path>`
- hreflang 恰好 en / zh-CN / x-default 各 1 个
- description 恰好 1 个且非空；og:url 恰好 1 个且正确
- `html lang` 为 `en` 或 `zh-CN`
- 语言纯度：中文页 title 含中文、正文汉字占比 ≥20%；英文页 title 无中文、汉字占比 ≤30%

**B. 客户端模式（抽样路由 × 两语言 × 桌面/移动）**——确认 React 接管后：
- 0 console error、无横向溢出、正文已渲染
- canonical 仍唯一且正确（防止预渲染 + Helmet 双重输出）
- hreflang = 3；首页 `"Organization"` 恰好 1 次；html lang 正确

`VERIFY_FULL=1` 时从站点 sitemap 取全量 URL；sitemap 读取失败会自动退化为抽样。退出码非 0 可直接当部署卡点。

已知脆弱点：脚本硬编码 `chromium-1223` 路径，playwright 升级后需同步修改。

## robots.txt

`public/robots.txt` 是手写文件（不是插件生成）：
- `Disallow: /admin`、`/api/`、`/uploads/`（PII）
- AI 搜索/训练 bot 全部 Allow（B2B 获客需要被 AI 引用）：DeepSeekBot、OAI-SearchBot、ChatGPT-User、Claude-*、Perplexity*、Google-Extended、Bytespider、Applebot-Extended、YouBot
- 中文引擎单独分组：Baiduspider、360Spider、Sogou、YandexBot、DuckDuckBot
- **每个具名 User-agent 组不继承 `*` 的规则**，所以每组的 Disallow 都必须重写一遍
- `Sitemap: https://www.quarkdairy.cn/sitemap.xml`

## 百度主动推送

```bash
BAIDU_TOKEN=<16位token> npm run push:baidu            # 推送 dist/sitemap.xml 全部 URL
BAIDU_TOKEN=... npm run push:baidu -- --dry-run       # 只打印
```

- 端点 `http://data.zz.baidu.com/urls?site=&token=`，每批最多 2000 条自动分片
- 返回解析 success / remain / not_same_site / not_valid
- 部分成功即 exit 1（避免部署脚本误判）
- token 来自 ziyuan.baidu.com「普通收录 → API 提交」，站点需先验证

## 页面级 SEO（Helmet）

- 用 `src/components/seo/SEO.tsx` 传 title / description / canonical / 多语言 alternate / og
- canonical 与 og:url 必须是绝对 URL，域名 `https://www.quarkdairy.cn`
- 结构化数据在 `src/utils/jsonld.ts`；首页 Organization 节点只能出现一次
- `index.html` 里首屏也预置了一套 meta/title（无 JS 的兜底），改动时两边保持一致
