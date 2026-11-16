# 项目结构映射

## 目录树（源码部分）

```
website/
├── index.html              # 静态模板：基础 meta + 首屏预置 SEO 标签（Helmet 会接管）
├── vite.config.ts          # react + sitemap 插件；注入 __BUILD_DATE_* 常量
├── tailwind.config.js      # 品牌色/字体/自定义组件类
├── CONSTRAINTS.md          # 业务+合规+设计权威约束（改动前必读）
├── public/                 # 直接拷贝到 dist：图片、PDF、视频、robots.txt、favicon
├── src/
│   ├── config.ts           # WHATSAPP_NUMBER / LINKEDIN_URL / CONTACT_EMAIL / API_BASE（VITE_* 环境变量）
│   ├── i18n/               # en.json + zh.json（各 304 键，扁平 snake_case）+ index.ts（按 URL 定语言）
│   ├── data/               # products.ts(40) / cases.ts(9) / solutions.ts(7)
│   ├── types/product.ts    # Product / StockStatus / ProductCategory 等类型
│   ├── utils/              # jsonld.ts（结构化数据）、locale.ts（语言判断）
│   ├── pages/              # 页面级组件（见下表）
│   └── components/
│       ├── common/         # Icons / InquiryForm / CaseCards / ProductImage / VideoModal / LocalizedLink / LocaleSync ...
│       ├── layout/         # Header / Footer / Layout
│       ├── home/           # Hero / CategoryGrid / CustomSolutions / Pasture / QuarkAtAGlance
│       ├── products/       # ProductCard / ProductFilter
│       ├── about/          # CompanyOverview
│       ├── contact/        # ContactFAQ / ProcessTimeline / PromiseBadges / StageSelector / TrustAnchors
│       └── seo/            # SEO.tsx（Helmet）、SeoLinks.tsx、types.ts
├── scripts/                # prerender.mjs / verify-prerender.mjs / baidu-push.mjs / 图片与 logo 工具
├── server/                 # Express：index.ts（路由）/ db.ts（SQLite）/ mailer.ts（SMTP）
├── vite-plugins/sitemap.ts # 构建期生成 dist/sitemap.xml
├── deploy.sh               # 服务器端一键部署（装依赖、查 .env、试启动）
└── start.sh                # 宝塔 Node 项目启动脚本（tsx server/index.ts）
```

## 路由 ↔ 页面 ↔ 数据

| 路由 | 页面组件 | 主要数据来源 |
|---|---|---|
| `/` | `HomePage` | products（品类统计）、solutions、cases |
| `/products` | `ProductsPage` | `products.ts` + `ProductFilter`（品类 & Halal） |
| `/products/:id` | `ProductDetailPage` | `products.ts` 单条 + 规格表 |
| `/solutions` | `CustomSolutionsPage` | `solutions.ts` |
| `/cases/:id` | `CaseDetailPage` | `cases.ts` |
| `/about` | `AboutPage` | 静态文案（i18n）+ 案例 |
| `/contact` | `ContactPage` | `InquiryForm` → 后端 `/api/inquiry` |
| `/privacy` `/terms` | `PrivacyPage` / `TermsPage` | 纯 i18n 文案 |
| `/admin` | `AdminPage` | 后端 `/api/admin/*`，需 Bearer token（页面不对外宣传） |
| `*` | `NotFoundPage` | — |

## 数据文件写法要点

- 每条记录第一行是 `id: 'xxx'`（行首），sitemap 插件靠这个正则抽取 ID
- 产品字段必须完整实现 `src/types/product.ts` 的 `Product`：`name_en/name_zh`、`short_desc_en/zh`、`category`、`isHalal`、`application_tags`、`specs[]`、`isCustomizable`、`stockStatus`
- 六大数据品类：dairy / plant-extract / syrup / jam / savory / custom（以 `types/product.ts` 为准）

## 样式约定（Tailwind）

- 自定义类定义在 `src/index.css`：`.gradient-hero` `.gradient-cta` `.section-cream` `.section-green-tint` `.section-orange-tint` `.card` `.btn-primary` `.btn-outline` `.btn-ghost` `.badge` `.input-glass`
- 优先用这些既有类，不要现场拼一堆 utility 破坏节奏
- Section 交替韵律：深绿 → 奶油 → 浅绿 → 奶油 → 深绿
