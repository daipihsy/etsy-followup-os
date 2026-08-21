# Etsy Listing Follow-up OS — 项目说明书（交付给开发者/Codex）

> 本文件是一份**完整、自足**的产品与技术规格，供开发者（含 AI 编码工具如 Codex）据此从零实现，或在现有参考实现上继续开发。
> 术语约定：界面文案支持中英双语；**数据里存储的枚举值一律用英文**（见下文），中文只作显示。

---

## 0. 一句话定位

一个**本地优先（local-first）的 Etsy 多 Listing 运营跟进软件**。它不是 ERP、不管订单、不培养单个爆款。它解决的是：我同时在跟很多 Listing，容易忘记**对某条链接做过什么、什么时候该回来复盘、哪些已经有起色却被我忽略**。

软件每天帮我回答两件事：
1. **今天我该处理哪些 Listing？**
2. **我对每条 Listing 做了什么改动、它的数据怎么变化？**

并且：**我只负责“最简单地记录”，深度分析交给 AI**——软件接入我自己的大模型 API，基于我记录的数据给出尽可能详细的诊断、趋势解读、今日行动建议（见 §6.8）。分析越详细越好，但**执行永远由我决定**。

---

## 1. 真实使用场景（务必理解，避免做成 ERP）

- 我有很多新品，前期 CTR 通常都不错（≥ 2.5%）。问题不是“找好链接”，而是**同时跟进太多、记不住、跟不上节奏**。
- 我需要：**极低成本地记录“我今天改了什么”**，以及**把 Etsy 后台的数字抄进来看它每天怎么变**。
- 软件负责**记录、提醒、汇总**；最终运营判断永远由我做，软件**不替我自动运营**。

### 关键教训（开发时的红线）
> 这个产品曾经被做得太复杂（像 ERP），也曾被砍得太简单（只剩流水账）。正确的平衡是：
> - **首页必须让我一眼知道“今天要处理什么”**，并能**几秒内记录一条改动或一组数据**。
> - **改动（做了什么）** 和 **数据（Etsy 的数字）** 是两类核心的每日记录，都要能快速录入、都要能按时间回看。
> - **CTR / CVR 不要让我手算**——我只抄 Etsy 给的原始数字，软件自动算百分比。
> - 高级功能（看板、实验、分析矩阵）是加分项，**不能挡在日常记录的路上**。

---

## 2. 核心方法论（产品围绕它设计）

```
CTR 不错 → 进入观察 → 判断转化/订单/ROAS → 发现问题或机会
→ 做一个明确动作 → 设置 Review 日期 → 观察结果
→ 继续优化 / 放大 / 保持 / 停止 → 形成长期运营记录
```

原则：
1. 有信号的 Listing 不要放着不管。
2. 一次尽量只测试一个主要变量（实验）。
3. 每次动作必须留下记录。
4. 重要动作应设置下一次 Review 时间。
5. 系统管理的是“注意力”和“跟进节奏”。
6. **“不动也是一种决策”**——Review 的结论可以是“保持现状”。

---

## 3. 目标平台与技术建议

需求是“做成一个**软件**，方便使用和记录”。建议：

- **首选：桌面应用（Tauri）**。用 Rust 外壳 + 现有的 Web 前端（React/Next 或 Vite+React），得到跨平台、体积小的原生安装包（macOS/Windows）。可直接复用现有 UI 组件与业务逻辑。
- **次选：Electron**（对纯 JS 团队更简单，但体积大）。
- 本地数据存储：桌面版建议用 **SQLite**（通过 Tauri 的 sql 插件或 better-sqlite3）替代浏览器 IndexedDB，schema 见第 5 节；也可继续用 IndexedDB（若沿用现有 Web 实现）。
- 若还想手机上随手记：可把同一套前端做成 **可安装的 PWA**，或后续用 Expo/React Native 出移动端（V1 不强制）。

**现有参考实现（可直接复用/继续开发）**
- 仓库：`https://github.com/daipihsy/etsy-followup-os`（私有代码可公开；数据不在其中）
- 现技术栈：Next.js 14（App Router，静态导出）+ TypeScript + Tailwind CSS + Dexie(IndexedDB) + Recharts。
- 现已部署为网页版（GitHub Pages）作为可运行参照。
- 本说明书 = 现实现的“意图”与完整规格；如与旧代码细节冲突，**以本说明书为准**。

技术栈选择自由，但请保证：**本地优先、离线可用、数据可导出、可选云同步**。

---

## 4. 信息架构（页面）

顶层导航（桌面左侧栏）：**Today / Dashboard / Pipeline / Experiments / Analytics / AI 分析中心 / Settings**。启动默认进入 **Today**。（AI 分析中心 = 今日简报/全店诊断/问答/周报的集中入口，见 §6.8。）

> 备注：若团队希望更“轻”，可将 Today 合并为一个“日志/今日”首页（时间线 + 待办），把 Dashboard 作为总览。但本规格默认保留下述六页。

---

## 5. 数据模型

所有 id 为字符串（uuid）。日期字段：**天粒度**用 `YYYY-MM-DD`（按本地时区），时间戳用 ISO datetime。金额/百分比用 number。

### 5.1 Listing（链接）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| listingName | string | 必填 |
| imageUrl | string? | 缩略图。**支持粘贴/拖入/点击上传**：图片压缩为小尺寸（最长边≈480px）存为 data URL，或存外链 URL。 |
| etsyUrl | string? | Etsy 链接 |
| etsyListingId | string? | 可选 |
| shopName | string? | 店铺 |
| category | string? | 分类（可选，历史字段） |
| publishDate | string? | 发布日期，决定“链龄 Listing Age” |
| currentPrice | number? | |
| discount | number? | 折扣%（可选） |
| adEnabled | boolean | 是否开广告 |
| adStrategy | AdStrategy? | 见枚举 |
| status | ListingStatus | 见枚举 |
| priority | 1..5 | 手动优先级 |
| tags | string[] | 标签 |
| notes | string? | 备注 |
| currentMetrics | Metrics | 最新一份数据快照（由最新 Snapshot 同步而来） |
| nextReviewDate | string? | 下次复盘日期（由动作/复盘写入） |
| createdAt / updatedAt | string | 时间戳 |

> 现版本的“新建/编辑 Listing”表单已**精简**为：名称、图片、Etsy 链接、（可选）店铺、发布日期、价格、状态、优先级、广告开关+策略、备注。**已去掉** Category / Etsy Listing ID / Discount% / Tags 的录入框（字段保留在数据里以兼容，但表单不展示）。Codex 实现时按此精简表单即可。

### 5.2 Action（改动 / 动作）——核心每日记录之一
记录“我对这条链接改了什么”。
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| listingId | string | |
| date | string | 默认今天，**输入框旁必须有“今天”快捷按钮** |
| types | string[] | **多选**“改了什么”，取值见 ActionCategory |
| type | string | = types[0]，兼容/排序用 |
| linkUrl | string? | 可挂一个链接 |
| linkName | string? | 链接的自定义显示名（如“新主图 A/B”） |
| imageUrl | string? | 可选：给这条改动附一张图（同样支持粘贴/拖入/上传） |
| reason | string? | 备注：改了什么、为什么 |
| reviewAfterDays | number? \| null | 设几天后复盘（可为 No Review） |
| reviewDate | string? | = date + reviewAfterDays |
| createdAt | string | |

**ActionCategory（“改了什么”，中文取值，可多选）**：
`价格 / 主图 / 附图 / 视频 / 选项 / 逻辑 / 备注/其他`
（这是用户自定的运营词汇；直接用中文作为存储值即可。旧数据里可能有英文如 `Price/Main Image`，展示时按原样显示。）

**录入体验要求**：选链接 → 勾“改了什么”（芯片多选）→ 写备注 →（可选）挂链接/图 → 选日期（默认今天）→ 保存。**目标 30 秒内完成**。保存后提示“已记录 · 今天第 N 次”（见 §7 计数）。

### 5.3 Snapshot（数据快照）——核心每日记录之二
把 Etsy 后台看到的**原始数字**抄进来；CTR/CVR 由软件自动算。
| 字段 | 类型 | 来源/说明 |
|---|---|---|
| id | string | |
| listingId | string | |
| date | string | 默认今天，带“今天”按钮 |
| views | number? | Etsy Ads 的 **Views**（广告展示） |
| clicks | number? | Etsy Ads 的 **Clicks** |
| visits | number? | 店铺 Stats 的 **Visits**（可留空） |
| orders | number? | Orders / Items sold |
| revenue | number? | 营收 |
| adSpend | number? | Etsy Ads 的 **Spend**（广告花费） |
| roas | number? | Etsy Ads 直接给了就抄；没有则可留空 |
| favorites | number? | 收藏（可选） |
| ctr | number? | **自动**：`clicks / views × 100` |
| cvr | number? | **自动**：`orders / visits × 100`，无 visits 时用 `orders / clicks × 100` |
| notes | string? | 备注 |
| createdAt | string | |

**两类 Etsy 数据来源到字段的映射（务必内置提示“在 Etsy 哪里看”）：**
- **广告页（单条 Listing 的 Etsy Ads）**：Views→views、Clicks→clicks、Orders→orders、Revenue→revenue、Spend→adSpend、ROAS→roas。CTR 自动算（例：Clicks 23 / Views 587 = 3.9%）。
- **店铺 Stats**：Visits→visits、Items sold→orders、Revenue→revenue。CVR 自动算（orders/visits）。

**录入体验**：每个原始数字框下方标注它对应 Etsy 上的哪个字段；下方高亮显示自动算出的 CTR、CVR（只读）。所有字段可留空。**目标 20 秒内完成一次**。保存后把该 Snapshot 同步为 Listing.currentMetrics（取“最新一条”）。

**回看**：Listing 详情页要有一张**按天的“数据变化”表**（每行一天：日期/曝光/点击/CTR/访问/订单/CVR/营收/花费/ROAS），并可有 CTR/CVR/ROAS 的趋势折线图，让我一眼看到变化。

### 5.4 Experiment（实验）
一次只改一个主要变量。
| 字段 | 类型 | 说明 |
|---|---|---|
| id, listingId | string | |
| name | string | |
| hypothesis | string? | 假设 |
| variable | string | 变量（用 ActionCategory 或自由文本） |
| beforeValue / afterValue | string? | 改动前后值 |
| startDate | string | |
| reviewDate | string? | |
| status | ExperimentStatus | Planned/Running/Positive/Neutral/Negative/Cancelled |
| beforeSnapshot / afterSnapshot | Metrics? | 前后数据 |
| conclusion | string? | 结论 |
| decision | string? | 下一步决定（如“保留新价”/“恢复原价”） |
| createdAt / updatedAt | string | |

开始实验时：把 Listing 状态置为 `Testing`，并按 reviewInDays 设下次复盘。结束时展示 **Before / After / Δ** 表（CTR/CVR/ROAS/Orders/Revenue），选 Positive/Neutral/Negative，并填结论与决定。

### 5.5 Review（复盘）——与动作分开
复盘的结论可以是“不改”。
| 字段 | 类型 | 说明 |
|---|---|---|
| id, listingId | string | |
| date | string | 默认今天，带“今天”按钮 |
| decision | ReviewDecision | Continue Observing / Keep Current Setup / Optimize / Scale / Reduce / Hold / Drop |
| note | string? | |
| nextReviewDate | string? | |
| createdAt | string | |
复盘时展示：当前数据、上次数据、上次动作、进行中的实验。某些 decision 会改状态：Scale→Scale、Hold→Hold、Drop→Dropped。

### 5.6 Settings（全局设置，单例 id='app'）
| 字段 | 默认 | 说明 |
|---|---|---|
| positiveCtrThreshold | 2.5 | 好 CTR 阈值(%) |
| positiveCvrThreshold | 3.0 | 好 CVR 阈值(%) |
| positiveRoasThreshold | 2.5 | 好 ROAS 阈值 |
| untouchedWarningDays | 5 | “被忽略赢家”的天数阈值 |
| defaultReviewIntervalDays | 3 | 默认复盘间隔 |
| currency | USD | 货币 |
| defaultShop | '' | |
| theme | dark | dark/light |
| lang | en | en/zh（界面语言） |
| matrixCtrThreshold / matrixCvrThreshold | 2.5 / 3.0 | 商品矩阵象限阈值 |
| aiBaseUrl | https://api.openai.com/v1 | AI endpoint（OpenAI 兼容，可改） |
| aiModel | '' | 模型名（用户手填，如 gpt-5.6-sol） |
| aiKey | '' | AI API Key（仅存本机） |
| aiLang | zh | AI 分析输出语言 |

> AI 配置细节见 §6.8。Key 与 GitHub token 一样：仅存本机、只发所配置 endpoint。

### 5.7 SavedFilter（保存的筛选器）
`{ id, name, filter(序列化的筛选状态), createdAt }`

### 5.10 AiInsight（AI 分析结果，见 §6.8.E 字段表）
保存每次 AI 分析的结果，便于回看、避免重复调用。

### 5.8 枚举
- **AdStrategy**（Etsy 官方措辞）：`Greater visibility` / `Efficient spending` / `Lower click cost`
- **ListingStatus**：`New / Observe / Signal / Testing / Follow-up / Growing / Scale / Winner / Hold / Dropped`（活跃=除 Dropped 外）
- **Priority**：`1..5`
- **ExperimentStatus**：`Planned / Running / Positive / Neutral / Negative / Cancelled`
- **ReviewDecision**：见 5.5

### 5.9 派生量（计算得出，不入库）
- **Listing Age**：从 publishDate（缺则 createdAt）到今天的天数；分段 New(0–7)/Early(8–14)/Growing(15–30)/Mature(30+)。
- **Days Since Last Action**、**Next Review 是否逾期/今日到期**。
- **hasGoodPerformance**：`CTR≥阈值 且 (ROAS≥阈值 或 CVR≥阈值 或 有订单)`。
- **Untouched Winner（被忽略的赢家）**：hasGoodPerformance 且 距上次动作 ≥ untouchedWarningDays，且状态非 Hold/Dropped。
- **Attention Score（今日队列排序）**：逾期 > 今日到期 > Growing > Testing > Signal/Scale > 高 CTR 且有单 > 高 ROAS > 有单 > 被忽略赢家 > 手动高优先级（各自加权求和；不替用户下最终判断，只给“建议关注理由”）。

---

## 6. 页面与功能规格

### 6.1 Today（首页，最重要）
回答“今天该处理谁”。
- 顶部统计卡（可点击当筛选）：**Need Action / Review Due / Overdue / Growing / Testing / Untouched Winners**。
- 一个常驻的 **“今天已记录 N 次”** 徽标（见 §7）。
- **今日跟进队列**：按 Attention Score 排序的卡片。每张卡显示：缩略图、名称、店铺、状态、优先级、链龄、CTR、CVR、ROAS、订单、营收、广告开关+策略、上次动作+日期+距今天数、下次复盘、**“为什么需要关注”**一句话。
- 每张卡的快捷操作：打开详情 / **记录改动** / **记录数据** / 开始实验 / 完成复盘 / 延后复盘（Snooze）。

### 6.2 Dashboard（链接池总览）
- 顶部池统计：Total Active、各状态计数、Review Due、Overdue、No-action ≥ N。
- **高信息密度表格**（默认视图）：缩略图+名称、店铺、链龄、状态、优先级、CTR、CVR、ROAS、订单、营收、广告、上次动作、下次复盘。**列可排序**。
- **强筛选**（可折叠面板）：店铺/分类/状态/优先级/广告开关/广告策略/链龄段/CTR·CVR·ROAS·订单·营收 区间/发布日期/上次动作日期/下次复盘日期/无动作≥N天/标签。**可保存筛选器**，并内置预设（High CTR New Listings、High CTR Low CVR、Untouched Winners）。
- **批量操作**（多选后）：改状态/改优先级/加标签/设复盘日期/设广告开关/设广告策略/移到 Follow-up/移到 Hold。

### 6.3 Pipeline（看板）
- 列为 ListingStatus（New…Dropped）。卡片可**拖拽换状态**，拖完立即保存。卡片显示名称、链龄、CTR/CVR/ROAS/订单、上次动作、下次复盘。

### 6.4 Experiments（实验）
- 列出全部实验（进行中优先），可按 All/进行中/已结束筛选。
- 每个实验展示：名称、所属链接、变量、假设、前后值、开始/复盘日期；已结束的展示 Before/After/Δ 表与结论/决定。
- 进行中的可“结束/填写 Before-After”。

### 6.5 Analytics（分析 / 我的打法库）
- **近 7 天活跃度**：Actions / Reviews / Listings Reviewed / Experiments Started / Experiments Completed 计数。
- **Product Matrix（CTR × CVR 散点）**：每点一个 Listing，阈值线可在设置里调；四象限着色，重点高亮 High CTR·High CVR 与 High CTR·Low CVR。Hover 显示名称/CTR/CVR/ROAS/订单/链龄/状态。
- **Untouched Winners** 区块：表现好但久未动作的清单，提示“考虑复盘”（不强制修改）。
- **My Etsy Playbook**：按变量统计实验（次数、正向率、平均 ΔCTR/ΔCVR/ΔROAS），沉淀“我自己的运营经验数据库”。

### 6.6 Listing 详情
- 头部：缩略图、名称、Etsy 链接、状态/优先级/链龄/广告徽标、编辑/删除。
- 当前指标：CTR/CVR/ROAS/订单/营收/广告花费/收藏。
- **数据变化表 + 趋势图**（见 5.3）。
- 完整时间线（改动/数据/复盘/实验起止/发布），可删除单条。
- 快捷：记录改动 / 记录数据 / 开始实验 / 完成复盘。

### 6.7 Settings
- 阈值（CTR/CVR/ROAS/Untouched 天数/默认复盘间隔）、矩阵阈值、货币、默认店铺、主题、语言。
- **云同步**（见 §9）、**数据备份/恢复**、加载示例数据、清空全部数据（二次确认）。

---

## 6.8 AI 深度分析（接入你的大模型 API，越详细越好）★核心

目标：**我把日常记录做到最简单，分析交给 AI，越详细越好。** 软件接入用户自己的大模型 API（用户当前有 **“GPT 5.6 Sol”** 的 API；实现时**不要写死某个模型**，做成可配置，兼容任意 OpenAI 风格接口）。基于我记录的数据做深度分析、诊断、给建议。
**AI 只分析和建议，不自动改价/改广告/发布**——最终执行仍由我决定（保住“软件建议、我决策”这条主线）。

### A. 接入配置（BYO Key，存本机）
Settings 增加“AI 分析”区块，字段：
- **Base URL**：OpenAI 兼容 endpoint，默认 `https://api.openai.com/v1`，可改成任意兼容服务/自建代理。
- **API Key**：仅存本机（同 GitHub token 的处理方式），只发往所配置 endpoint 的 `Authorization` 头。
- **Model**：模型名，用户手填（例如 `gpt-5.6-sol` 或其它，用户输入什么就用什么）。
- 可选：temperature、max tokens、分析输出语言（中/英）。
- 未配置时，AI 功能隐藏/禁用，其余功能照常。

> **桌面版优势**：Tauri/Electron 从原生/后端侧发请求，**没有浏览器 CORS 限制**，可直接调用任意 API。纯网页版需 endpoint 支持 CORS 或自建代理。**故 AI 分析强烈建议在桌面版实现。**

### B. 请求与落库
- 用 **OpenAI 兼容 Chat Completions**：`POST {baseURL}/chat/completions`，`Authorization: Bearer <key>`，body 含 `model`、`messages`（可加 `response_format: json`/在 system 里约束输出结构，便于解析为“建议卡片”）。可流式显示。
- 软件负责把**结构化上下文**塞进 prompt：所选 Listing 的资料 + 全部数据快照（按时间序）+ 改动记录 + 实验；或全店聚合。**只发所需数据，由用户点击触发。**
- 结果存为 `AiInsight`（见 §5.10），带时间戳，便于回看、避免重复调用、省 token；可“重新分析”。

### C. 分析能力（都要做，越细越好）
1. **单条 Listing 深度诊断**（详情页“AI 分析”按钮）：现状总结；CTR/CVR/ROAS/订单的**趋势解读**（在涨/在跌/波动 + 可能原因）；**诊断**（如“高 CTR 低 CVR → 可能是价格/主图/详情/评价问题”，并结合我最近的改动判断哪次改动起了作用）；**下一步建议（2–4 条，排序）**，每条含理由、预期影响、建议复盘时间，并提醒“一次只改一个变量”。建议输出结构：`{summary, trend, diagnosis, recommendations[], watch, suggestedReviewInDays}`。
2. **今日简报 / 全店分析**（Today 或独立“AI 分析中心”页）：跨所有 Listing 汇总——今天优先处理谁、为什么；谁在涨/在跌；哪些是“被忽略的赢家”；给出**今日行动清单（3–7 条，按优先级）**。这是“简化流程”的核心：不用我盯 Dashboard，AI 直接告诉我今天做什么。
3. **改动效果评估**：取某条改动前后的数据快照，AI 判断“是否见效”，给归因与结论。
4. **实验解读**：读 Before/After，自动写结论 + 建议决定（保留/回退/放大）。
5. **打法库洞察**：挖掘我全部实验，总结“对我的店，改什么最能拉动 CTR/CVR”，形成可复用规律。
6. **问答（Chat）**：对话框，用自然语言问（“为什么这条转化低?”“这周重点做什么?”），AI 基于我记录的数据作答并可引用具体数字。
7. **周报**：一键生成本周运营周报（做了什么、数据怎么变、下周计划）。

### D. 交互与安全
- 每个 AI 入口都**用户点击触发**（不自动、不后台偷偷发数据）。首次调用前提示“将把这条/这批数据发送到你配置的 AI 服务”。
- Key 只存本机、只发所配置 endpoint；不入 URL、不发第三方、不随日志输出。
- 有 loading/流式状态；失败有明确报错（额度/网络/鉴权）。
- 成本提示：按模型计费，建议按需分析。

### E. AiInsight 数据模型（补充到 §5）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| scope | 'listing' \| 'shop' \| 'experiment' \| 'chat' | 分析范围 |
| listingId | string? | 针对单条时 |
| kind | string | diagnosis / daily-brief / change-impact / experiment / playbook / weekly / chat |
| model | string | 使用的模型 |
| inputSummary | string? | 发送了哪些数据（便于审计） |
| content | string | AI 返回（Markdown 或 JSON 文本） |
| structured | json? | 若返回结构化，解析后的对象 |
| createdAt | string | |

---

## 7. “今天已记录 N 次”计数
统计**当天**新增的 Action + Snapshot + Review 的总数。每次记录后弹提示“已记录 · 今天第 N 次”，首页常驻显示。目的：让我有“我今天又跟进了一次”的即时反馈。

---

## 8. 关键交互与速度目标
- **记录改动 ≤ 30 秒**；**记录数据 ≤ 20 秒**；**完成复盘 ≤ 30 秒**。
- 少输入、快记录、快复盘、一眼看重点；大量 Listing 也不乱。
- 所有日期输入框旁都有 **“今天”** 一键按钮。
- 图片：**粘贴（Ctrl/Cmd+V）/ 拖入 / 点击上传** 三种方式，压缩后本地存储（能随同步走），也允许贴外链 URL。
- 键盘友好；尽量减少页面跳转。

---

## 9. 存储 / 同步 / 备份
- **本地优先**：桌面版建议 SQLite（或沿用 IndexedDB）。数据仅存本机。
- **JSON 备份/恢复**：一键导出全部数据为 JSON（文件名含日期）；导入支持 **Merge（按 id 增补）** 与 **Replace（清空后载入，二次确认）**。
- **可选的跨设备同步（GitHub 模式，务必保留）**：
  - 把整库导出为一个 JSON 文件，通过 **GitHub Contents API** 提交到用户的**私有仓库**；其它设备拉取同一文件即同步（类似 Obsidian git sync）。
  - 用户在设置里填：owner、repo、branch、path、**细粒度 Personal Access Token（仅该仓库 Contents 读写）**。Token 只存本机，只发往 `api.github.com` 的 Authorization 头，绝不入 URL、不发第三方。
  - 支持：测试连接 / 立即上传(push) / 拉取覆盖(pull replace) / 拉取合并(merge) / 自动同步（打开时拉取、改动后防抖上传）。
  - 冲突策略：**最后写入者为准**（单人多设备场景）；提示“同一时间只在一台设备编辑”，并保留 JSON 手动备份作为兜底。
  - 注意：网页托管在公开站点也不泄露数据——数据在私有仓库、需 token 才能访问。

---

## 10. 国际化 & 主题
- **中英切换（EN / 中文）**：界面能中文的都中文；**存储的枚举值保持英文**（如 ListingStatus、AdStrategy），仅显示层翻译。ActionCategory 是中文取值（用户词汇），按原样存。语言选择持久化。
- **深色/浅色主题**，深色为默认，选择持久化，首屏无闪烁（应用启动即套用）。

---

## 11. 明确不做（V1）
- Etsy API / 订单同步 / **自动**改价改广告 / 自动发布。
  （注意：**AI 分析与建议是核心功能，见 §6.8**；但 AI 只“分析+建议”，**不自动执行**任何改价/改广告/发布，执行由用户手动完成。）
- 账号系统 / 服务器端鉴权 / 多人实时协作（同步是单人多设备，最后写入者为准）。
- 截图 OCR 自动填数（曾讨论，暂不做；数据由手动抄录，再交给 AI 分析）。

---

## 12. 验收清单（完成后逐项自测）
- [ ] 类型检查、Lint、构建/打包全部通过。
- [ ] Listing 增删改查；图片粘贴/拖入/上传可用。
- [ ] 记录改动（多选类别 + 备注 + 挂链接/图 + “今天”按钮），保存后进入时间线与首页队列，计数 +1。
- [ ] 记录数据（抄原始数字，CTR/CVR 自动算），保存后进入详情“数据变化表”，计数 +1。
- [ ] 完成复盘（含“保持现状”）、开始/结束实验（Before/After/Δ）。
- [ ] Dashboard 排序/筛选/保存筛选器/批量操作。
- [ ] Pipeline 拖拽换状态并保存。
- [ ] Analytics 矩阵/打法库/被忽略赢家/近 7 天活跃度。
- [ ] 备份导出、导入（Merge/Replace）。
- [ ] GitHub 同步：测试连接/上传/拉取/自动同步。
- [ ] 中英切换、深浅主题。
- [ ] **AI 配置**（Base URL/Model/Key）可保存；未配置时 AI 功能隐藏。
- [ ] **AI 单条诊断**：详情页点“AI 分析”，把该 Listing 的数据快照+改动+实验发给模型，返回趋势解读+诊断+排序建议，并存为 AiInsight 可回看。
- [ ] **AI 今日简报**：AI 分析中心生成“今天做什么”的行动清单。
- [ ] **AI 问答**：可基于我的数据自然语言问答。
- [ ] AI 调用有 loading/流式与错误处理；首次发送前有隐私提示；Key 仅本机。
- [ ] 离线可用；数据仅在本机（+ 可选私有同步）。AI 功能需联网+Key，缺失时优雅降级。

---

## 13. 给 Codex 的实现提示
- 优先复用参考仓库的领域逻辑（数据模型、CTR/CVR 计算、Attention Score、Untouched Winner、备份/同步）。
- 若做桌面版：Tauri + 现有 React 组件 + SQLite；把现有 Dexie 仓库层替换为 SQLite 数据访问层，接口保持一致（createListing/addAction/addSnapshot/completeReview/experiment/backup/sync 等）。
- **AI 分析（§6.8）是本次核心新增**：抽象一个 `AiClient`（OpenAI 兼容 chat/completions，可配置 baseURL/model/key），一个 `buildContext(scope)` 把本地数据整理成 prompt，一个 `analyze(kind, scope)` 返回并落库为 `AiInsight`。桌面版从原生/后端发请求以绕开 CORS。先做“单条诊断 + 今日简报 + 问答”，其余（改动效果/实验解读/打法库/周报）复用同一管线。
- 保持“**记录快、回看清、别像 ERP**”这条主线；任何新功能都不能拖慢“记录改动/记录数据”这两个高频动作。**分析可以很重、很详细，但记录必须很轻。**
