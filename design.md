# Ontario University Application Helper — Design Doc

> 一个帮助安大略省高中生规划大学申请的网站：记录成绩与课外活动、筛选符合先修课要求的 program、给出保底 / 匹配 / 冲刺推荐、自动生成申请日历，并汇总 Reddit 上的申请经验。Program 数据由爬虫定期从各大学官网自动同步。
>
> - 开发者：1 人
> - 界面语言：English
> - 课程：ICS4U

---

## 1. 目标与范围

### 核心功能
1. 账号注册 / 登录，数据保存在个人账号下
2. 新用户引导（onboarding）：录入 12 年级课程、11 年级成绩
3. Program 浏览：搜索（program 名称 / 大学）、筛选、详情页、官网链接
4. 先修课筛选：只列出满足 prerequisite 的 program（并提示"差一门"的）
5. 推荐：推荐方向 + 保底 / 匹配 / 冲刺 program
6. 红心收藏 program
7. Profile：12 年级课程（状态 + assessment 成绩 + 自动平均分）、Extracurricular
8. 日历：自动标注收藏 program 的关键日期 + 用户自定义事件
9. Tips：手动整理的 Reddit 面试 / AIF / 申请建议
10. **爬虫**：每周自动从安省各大学官网抓取 program 信息并更新网站数据

### 不做
- OUAC program code（不需要）
- 爬取 OUInfo（robots.txt 禁止）和 OUAC（有反爬保护，申请系统需登录）
- 用户打开页面时实时爬取（改为每周定时同步，见第 5 节）
- 爬取 Reddit（改为手动整理）
- College 申请（只做 university / OUAC 101）

---

## 2. 技术栈

| 层 | 选择 | 说明 |
|---|---|---|
| 前端框架 | **React + Vite** | 组件化、开发快、热更新 |
| 路由 | React Router | 多页面导航 |
| 样式 | Tailwind CSS | 快速写出统一、好看的 UI |
| 登录 | **Firebase Authentication** | Email/密码 + Google 登录，无需自己写后端 |
| 用户数据 | **Firebase Firestore** | 云端数据库，存 profile / 成绩 / 收藏 / 日历事件 |
| 静态数据 | `src/data/*.json` | programs（爬虫生成）、tips、dates、courses |
| 日历 | FullCalendar (React) | 月 / 周视图、事件颜色、点击添加 |
| **爬虫** | **Node.js + cheerio**（必要时 Playwright） | cheerio 解析普通 HTML；Playwright 用于需要运行 JavaScript 才显示内容的网站 |
| **定时任务** | **GitHub Actions**（cron，每周一次） | 免费；运行爬虫 → 提交更新后的 JSON → 自动重新部署 |
| 部署 | Firebase Hosting | 免费公开网址；由 GitHub Actions 自动部署 |

> **部署上线**：把网站放到互联网服务器上，得到一个公开网址，任何人打开就能用，而不需要在你的电脑上运行。

---

## 3. 页面与导航

```
[Logo]  Dashboard | Programs | For You | Calendar | Tips | Profile      [Avatar ▾ / Log in]
```

| 路由 | 页面 | 需登录 | 内容 |
|---|---|---|---|
| `/` | Landing / Dashboard | 否 / 是 | 未登录：介绍页。已登录：当前平均分、收藏数、最近截止日期倒计时、快捷入口 |
| `/login`, `/signup` | 登录 / 注册 | 否 | Email + 密码，或 Google |
| `/onboarding` | 新用户引导 | 是 | Step 1 选 12 年级课程 → Step 2 填 11 年级成绩 → Step 3 完成 |
| `/programs` | Program 列表 | 否 | 搜索栏 + 筛选 + 卡片列表 |
| `/programs/:id` | Program 详情 | 否 | 完整信息 + 官网链接 + 红心 + 你的匹配情况 + "Last synced" 时间 |
| `/for-you` | 推荐 | 是 | 推荐方向 + 保底 / 匹配 / 冲刺三栏 |
| `/calendar` | 日历 | 是 | 自动事件 + 自定义事件 |
| `/tips` | 申请经验 | 否 | 按分类 / 学校筛选的 tips 卡片 |
| `/profile` | 个人资料 | 是 | Tabs: Courses · Grade 11 · Extracurriculars · Favourites · Account |
| `/profile/courses/:courseId` | 单门课详情 | 是 | Assessment 列表 + 加权平均 |

未登录用户访问需要登录的页面 → 跳转到 `/login`。

---

## 4. 静态数据

### 4.1 `programs.json`（爬虫生成 + 手动覆盖）

```json
{
  "id": "waterloo-computer-science",
  "name": "Computer Science",
  "university": "University of Waterloo",
  "universityId": "waterloo",
  "faculty": "Faculty of Mathematics",
  "field": ["Computer Science / Math"],
  "degree": "BCS / BMath",
  "campus": "",
  "prerequisites": {
    "required": ["ENG4U", "MHF4U", "MCV4U"],
    "choose": [],
    "minimums": {},
    "rawText": "Six Grade 12 U and/or M courses including Advanced Functions, Calculus and Vectors, ..."
  },
  "admissionRange": {
    "low": 90, "high": 96,
    "rawText": "Individual selection from the low to mid-90s"
  },
  "supplementary": {
    "required": true,
    "type": "Admission Information Form (AIF)",
    "rawText": "The Admission Information Form is required for admission."
  },
  "keyDates": [
    { "label": "AIF deadline", "date": "2027-02-01" }
  ],
  "coop": true,
  "officialUrl": "https://uwaterloo.ca/future-students/programs/computer-science",
  "source": "scraper",
  "lastSynced": "2026-10-28",
  "needsReview": false
}
```

- `id`：`大学id-program名称` 自动生成（UofT 加校区：`toronto-st-george-computer-science`），作为网址和收藏的主键
- `campus`：校区（UofT 的 St. George / Mississauga / Scarborough 各算一个 program），其它大学为空
- `required`：必须全部修过
- `choose`：多选 N，如 `[{ "count": 2, "courses": ["SBI4U","SCH4U","SPH4U"] }]` 表示三门里修两门
- `minimums`：单科最低分，如 `{ "MCV4U": 70 }`
- `admissionRange.low/high` 为 `null` 表示官网没有公布（UofT 不公布录取分数）
- `rawText`：保留官网原文，详情页同时显示原文和解析结果，解析错了用户也能看到原文
- `source`：`scraper` / `manual`；`needsReview`：解析不确定时为 true，页面显示提示

### 4.2 `dates.json`（OUAC 通用日期，每年手动更新一次）
```json
[
  { "label": "Equal consideration deadline", "date": "2027-01-15", "type": "ouac" },
  { "label": "Latest date universities can require a response", "date": "2027-06-01", "type": "ouac" }
]
```
> 安省大学不会要求 101 申请人在 6 月 1 日之前回复 offer。具体日期以 OUAC 官网为准。

### 4.3 `tips.json`（手动整理）
```json
{
  "id": "tip-001",
  "title": "Waterloo AIF: be specific about projects",
  "category": "AIF / Supplementary",
  "universities": ["waterloo"],
  "summary": "Written in my own words...",
  "kind": "reddit",
  "source": "r/OntarioGrade12s",
  "sourceUrl": "https://www.reddit.com/r/OntarioGrade12s/comments/...",
  "posted": "2026-05"
}
```
- `kind`：`reddit`（来自具体帖子，必须有原帖 `sourceUrl` 和发帖月份 `posted`，卡片显示 "From r/… · May 2026"）或 `general`（网站自己写的通用建议，`source` 为 "General advice"，没有链接）
分类：`Interview` · `AIF / Supplementary` · `General Application` · `Grades & Averages` · `Offers & Decisions`
来源：r/OntarioGrade12s、r/uwaterloo、r/UofT、r/McMaster 等。写自己的摘要并附原帖链接，不整段复制。

> 目前有 35 条 `general` tips 和 14 条 `reddit` tips（来自 r/OntarioGrade12s 的具体帖子，主要是 Waterloo / UofT 的录取案例）。Reddit 上的经验只是个案，摘要里会说明哪些说法没有官方证实。

### 4.4 `courses.json`
安省 12 年级 U/M 课程代码表，并附带常见名称别名（供爬虫把课程名转换成代码）：
```json
{ "code": "MCV4U", "name": "Calculus and Vectors", "type": "U", "aliases": ["Calculus & Vectors", "Calculus"] }
```

---

## 5. 爬虫设计

### 5.1 目标大学（安省 OUAC 101 大学）
Algoma · Brock · Carleton · Guelph · Lakehead · Laurentian · McMaster · Nipissing · OCAD U · Ontario Tech · Ottawa · Queen's · Toronto Metropolitan (TMU) · Toronto (St. George / Scarborough / Mississauga) · Trent · Waterloo · Western · Wilfrid Laurier · Windsor · York

**分批完成**：先做 Waterloo、UofT、Western，跑通整个流程，再逐所添加。还没写爬虫的大学，其 program 不显示（或用少量手动数据）。

> **McMaster**：robots.txt 明确屏蔽 Anthropic / Claude 的爬虫（`ClaudeBot`、`Claude-Web`、`anthropic-ai`），所以开发时不用 Claude 访问其网站。待定：换成其它大学，或由开发者本人编写 McMaster adapter。
>
> **UofT**：总览页（future.utoronto.ca）没有录取分数，爬虫会进入各校区详情页补充：
> - Scarborough（utsc.utoronto.ca）："Approximate grade requirements"，含单科最低分 ✅
> - Mississauga（utm.utoronto.ca）："Competitive Average" ✅
> - St. George Arts & Science（artsci.utoronto.ca）：有 JavaScript 反爬验证，不破解 ❌
> - St. George Engineering：program 页面没有分数，但 [Engineering FAQ](https://discover.engineering.utoronto.ca/faqs/) 有分数段表格，以及 Engineering Supplemental Application 的日期（12 月 1 日提前考虑、1 月 15 日截止）。爬虫开始前先读 FAQ（adapter 的 `prepare()`），再按专业名称匹配 ✅
>
> 没有分数的 program，`admissionRange` 为空，推荐功能中不参与保底/匹配/冲刺分类。
>
> **robots.txt 处理**：按 RFC 9309，robots.txt 返回 4xx 视为无限制，5xx 视为全部禁止。遇到 JavaScript 验证页面（bot challenge）直接停止，不尝试破解。
>
> **第七阶段新增**（数据来源各不相同，每个 adapter 文件开头有说明）：
> - Carleton：按学位（BCS、BEng…）公布要求；选择 program 后网站把选择存在 cookie 里，爬虫发送同样的 cookie ✅
> - uOttawa：先修课查询页背后有公开的 JSON API（`/api/uottawa_art_api`）✅
> - York：program 页面包含所有省份的要求，取 `data-shortcode="on"`（安省），每个学位一条 ✅
> - Queen's：一个页面列出所有 program 的先修课（文字句子），录取分数在另一页的表格里，用 OUAC 代码对应 ✅
> - TMU：program-status 页列出所有 program；"Grades-Plus" 表示需要补充材料 ✅
> - Wilfrid Laurier：sitemap 找 program 页，同一页可能有 BA / BSc 两套要求 ✅
> - Brock、Nipissing：robots.txt 返回 403（疑似反爬保护），暂不爬
> - 尚未完成：Guelph、Ontario Tech、Windsor、Trent、Lakehead、Laurentian、Algoma、OCAD U（robots.txt 均允许）

### 5.2 流程
```
GitHub Actions（每周日凌晨）
  └─ node scraper/run.js
       for 每所大学 adapter:
         1. listPrograms()     找到所有 program 页面网址（program 目录页或 sitemap.xml）
         2. fetch 每个页面     （遵守 robots.txt，每 2 秒 1 个请求，缓存未变化页面）
         3. parseProgram(html) 提取原文：名称、faculty、先修课、录取分数、补充材料、co-op、日期
         4. normalize()        原文 → 结构化数据（5.4）
       5. validate()           检查数据合法性（5.5）
       6. merge(overrides)     手动修正优先
       7. 写入 src/data/programs.json，生成变化报告
  └─ 有变化 → git commit → 自动部署 Firebase Hosting
```

### 5.3 Adapter（每所大学一个文件）
```
scraper/universities/waterloo.js
  export const id = "waterloo"
  export async function listPrograms(fetchPage) → [url, ...]
  export function parseProgram(html, url)       → [{ id, name, campus, faculty, degree, requirementItems,
                                                     averageText, supplementarySentences, coop, description, officialUrl }]
                                                   （UofT 一个页面可能返回多个校区；不是 program 的页面返回 []）
```
所有 adapter 接口相同，添加一所新大学 = 新写一个文件，不改其它代码。

### 5.4 文字 → 结构化数据（规则解析）
| 原文 | 规则 | 结果 |
|---|---|---|
| "Advanced Functions, Calculus and Vectors, a Grade 12 U English" | 用 `courses.json` 的名称 + 别名匹配 | `["MHF4U","MCV4U","ENG4U"]` |
| "one of Biology, Chemistry, or Physics" | 识别 "one of / either / or" 句式 | `oneOf: [["SBI4U","SCH4U","SPH4U"]]` |
| "low 80s" / "mid 80s" / "high 80s" | low = x0–x3，mid = x4–x6，high = x7–x9 | 80–83 / 84–86 / 87–89 |
| "low to mid-90s" | 取首段的下限、末段的上限 | 90–96 |
| "80%" / "80+" / "minimum 75%" | 直接取数字 | low = 80 |
| program 名称 | 关键词 → 领域（Engineering、Health…） | `field` |

解析不出来的字段：保留 `rawText`，结构化字段留空，标记 `needsReview: true`。

> 可选增强：用 Claude API 把原文转换成 JSON，能适应各种写法，大幅减少每所大学的规则代码。需要 API key（按用量付费，只在页面内容变化时调用，费用很低）。

### 5.5 安全与容错
- 遵守每个网站的 robots.txt；User-Agent 写明项目名称；限速；每周只运行一次
- 网站返回 403 或有反爬保护 → **不绕过**，该大学改为手动数据
- 某所大学本次爬到的 program 数量比上次少 30% 以上 → 判定 adapter 失效，**保留上次数据**，并在 GitHub Actions 中报错提醒
- 单个页面解析失败 → 保留该 program 上次的数据
- `scraper/overrides.json`：手动修正某个 program 的某个字段，优先级高于爬虫结果

---

## 6. 用户数据模型（Firestore）

```
users/{uid}
  ├─ displayName, email, createdAt, onboardingDone: bool
  ├─ grade12Courses/{courseId}
  │     code: "MCV4U"
  │     status: "completed" | "in_progress" | "next_semester"
  │     finalMark: number | null
  │     assessments: [ { name: "Unit 1 Test", mark: 88, outOf: 100, weight: 15 } ]
  ├─ grade11Marks/{id}
  │     code: "MCR3U", mark: 92
  ├─ extracurriculars/{id}
  │     category: "Arts" | "Sports" | "Community Involvement" | "Clubs"
  │             | "Student Government" | "Employment" | "Awards"
  │             | "Academic Enrichment Program"
  │     title, description
  │     role?, startDate?, endDate?, hoursPerWeek?
  ├─ favorites/{programId}
  │     addedAt
  └─ events/{id}
        title, date, endDate?, notes?, color?
```

安全规则：每个用户只能读写 `users/{自己的 uid}` 下的数据。

---

## 7. 核心逻辑

### 7.1 单门课平均分（加权）
```
courseAverage = Σ (mark/outOf × weight) / Σ weight × 100   (weight is optional: a missing weight counts as the mean of the given ones, so no weights = plain average)
```
只计算已录入的 assessment；有 `finalMark` 时优先使用。

### 7.2 录取平均分（Top 6）—— 针对某个 program
1. 先放入该 program 的所有 `required` 课程，每个 `choose` 组取分最高的 `count` 门
2. 再从剩余的 4U/4M 课程中按分数从高到低补齐到 6 门
3. 6 门取平均
4. 某门课还没有 12 年级成绩 → 用对应的 11 年级课程估算（如 MCV4U ← MCR3U），结果标记为 **Estimated**

> 各大学计算方式略有不同，本网站使用最常见的 Top 6 规则作为近似值，并在页面上说明。

### 7.3 先修课筛选
```
eligible = required ⊆ userCourses 且 每个 choose 组命中至少 count 门
missing  = 未满足的课程
```
显示：✅ Eligible · ⚠️ Missing 1 course（列出缺哪门）· ❌ Not eligible（默认隐藏）
先修课未能解析（`needsReview`）的 program 显示 "Check requirements on official site"。

### 7.4 保底 / 匹配 / 冲刺
`avg` = 该 program 的 Top 6 平均分，`low` / `high` = 录取分数段：

| 分类 | 条件 |
|---|---|
| **Safety 保底** | `avg > high + 1` |
| **Match 匹配** | `high − 1 ≤ avg ≤ high + 1`（录取分数段最高分的上下 1% 以内） |
| **Reach 冲刺** | `low − 5 ≤ avg < high − 1` |
| 不推荐 | `avg < low − 5` |

- 需要面试 / 补充材料的 program 最高只算 **Match**
- 没有分数段数据的 program 不参与分类
- 阈值写成常量，方便调整

### 7.5 推荐方向
根据课程组合给每个领域打分，取前 3：

| 领域 | 关键课程 |
|---|---|
| Engineering | MCV4U, MHF4U, SPH4U, SCH4U |
| Computer Science / Math | MCV4U, MHF4U, MDM4U, ICS4U |
| Life Sciences / Health | SBI4U, SCH4U, MHF4U |
| Physical Sciences / Environment | SCH4U, SPH4U, SES4U, MCV4U |
| Business / Commerce | MHF4U, MCV4U, MDM4U, BBB4M, BAT4M |
| Social Sciences / Humanities | ENG4U, CHY4U, CGW4U, HSB4U |
| Arts / Design | AVI4M, AMU4M, ADA4M |

### 7.6 搜索
- 不区分大小写，同时匹配 program 名称、大学名称、领域关键词
- 输入时实时过滤（约 200ms 防抖）
- 筛选项：University · Field · Co-op · Supplementary required · Only eligible（登录后可用）

### 7.7 日历事件来源
| 来源 | 颜色 | 可编辑 |
|---|---|---|
| OUAC 通用日期 (`dates.json`) | 灰 | 否 |
| 收藏 program 的 `keyDates` | 红 | 否（取消收藏后自动消失） |
| 用户自定义 `events` | 蓝（可选色） | 是 |

Dashboard 显示接下来 30 天内的事件倒计时。

---

## 8. 项目结构

```
university_application_project/
├─ design.md
├─ package.json, vite.config.js, index.html
├─ firebase.json, firestore.rules
├─ .github/workflows/
│   ├─ scrape.yml                  # 每周运行爬虫并提交数据
│   └─ deploy.yml                  # main 分支有更新 → 部署
├─ scraper/
│   ├─ run.js                      # 入口：依次运行所有 adapter
│   ├─ fetch.js                    # 限速、robots.txt 检查、缓存
│   ├─ normalize.js                # 5.4 文字 → 结构化
│   ├─ validate.js                 # 5.5 检查与容错
│   ├─ overrides.json              # 手动修正
│   └─ universities/               # waterloo.js, toronto.js, mcmaster.js, western.js, ...
└─ src/
   ├─ main.jsx, App.jsx
   ├─ firebase.js
   ├─ data/                        # programs.json, tips.json, dates.json, courses.json
   ├─ lib/                         # average.js, eligibility.js, recommend.js, search.js
   ├─ hooks/                       # useAuth, useUserData, useFavorites ...
   ├─ components/                  # Navbar, ProgramCard, HeartButton, SearchBar, CourseSelect ...
   └─ pages/                       # Dashboard, Programs, ProgramDetail, ForYou, Calendar, Tips, Profile, Onboarding, Login
```

`src/lib/` 和 `scraper/normalize.js` 都是纯函数，用 Vitest 写单元测试。

---

## 9. 开发阶段

| 阶段 | 内容 | 完成标志 |
|---|---|---|
| **1. 基础** | Vite + React + Tailwind；Navbar + 路由；手动写 20 个示例 program；Programs 列表 + 搜索 + 详情页 | 不登录也能搜索、浏览 program |
| **2. 爬虫 v1** | 爬虫框架；Waterloo、UofT、Western 三个 adapter；normalize + validate；测试 | 运行一次就能生成这三所大学的 programs.json |
| **3. 账号** | Firebase Auth；登录 / 注册；Onboarding；Profile 的课程 / 11 年级成绩 / assessment / 平均分 | 注册后能录入成绩，刷新后数据还在 |
| **4. 推荐** | 先修课筛选；Top 6 平均分；保底 / 匹配 / 冲刺；推荐方向；红心收藏 | For You 页给出三栏推荐 |
| **5. 日历 + 活动** | FullCalendar；自动 + 自定义事件；Extracurricular；Dashboard | 收藏 program 的日期出现在日历上 |
| **6. 上线 + 自动化** | GitHub 仓库；Firebase Hosting；GitHub Actions 每周爬取 + 自动部署 | 有公开网址，每周自动更新数据 |
| **7. 扩充** | 逐所添加剩余大学的 adapter；整理 30+ 条 tips；UI 打磨、手机适配 | 覆盖尽可能多的安省大学 |

---

## 10. 风险与注意事项

- **爬虫会失效**：大学官网改版后 adapter 会坏 → validate 自动拦截，保留旧数据并报错；修复只需改对应的 adapter 文件
- **解析不准确**：官网写法千变万化 → 详情页同时显示官网原文；`needsReview` 提示；overrides 手动修正
- **网站访问限制**：遵守 robots.txt，限速，不绕过反爬保护
- **推荐只是参考**：分数段是往年数据，补充材料 / 面试影响很大 → 推荐页加 disclaimer
- **隐私**：Firestore 规则限制只有本人能读写自己的数据
- **工作量**：一个人做，全部大学的 adapter 是最大的工作量 → 放在最后一个阶段逐步增加，不影响其它功能完成
