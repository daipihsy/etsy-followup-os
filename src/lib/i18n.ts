// Lightweight i18n. Keys are the English source strings themselves, so wrapping
// a string in t('...') is enough; English mode returns the source unchanged and
// Chinese mode looks it up in ZH (falling back to the source if missing).

export type Lang = 'en' | 'zh';

export const ZH: Record<string, string> = {
  // Brand / nav
  'Etsy Follow-up': 'Etsy 跟进',
  'Listing Operations OS': 'Listing 运营系统',
  Today: '今天',
  Dashboard: '仪表盘',
  Pipeline: '流水线',
  Experiments: '实验',
  Analytics: '分析',
  Settings: '设置',
  'Dark mode': '深色模式',
  'Light mode': '浅色模式',

  // Common buttons / words
  '+ New Listing': '+ 新建 Listing',
  Cancel: '取消',
  Save: '保存',
  'Add Listing': '添加 Listing',
  Edit: '编辑',
  Open: '打开',
  Delete: '删除',
  Loading: '加载中',
  'Loading…': '加载中…',
  'Clear filter': '清除筛选',
  'Clear all': '全部清除',
  None: '无',
  'None yet': '还没有',
  'Not set': '未设置',
  'Start empty': '从空白开始',
  'Load Demo Data': '加载示例数据',

  // First-run
  'Welcome to Etsy Listing Follow-up OS': '欢迎使用 Etsy Listing 跟进系统',
  'Your database is empty. Load a sample pool of listings to explore every feature, or add your first listing.':
    '你的数据库是空的。加载一批示例 listing 来体验全部功能,或直接新建你的第一个 listing。',

  // Today
  'The listings that need your attention right now, in priority order.':
    '现在最需要你处理的 listing,按优先级排列。',
  'Need Action': '待处理',
  'Review Due': '今日复盘',
  Overdue: '逾期',
  Growing: '上升中',
  Testing: '测试中',
  'Untouched Winners': '被忽略的赢家',
  'Today’s Follow-up Queue': '今日跟进队列',
  'Nothing needs attention right now': '当前没有需要处理的',
  'Nothing in this view': '这个视图下没有内容',
  'No overdue reviews, no reviews due today, and nothing flagged. Add a listing or check the Dashboard.':
    '没有逾期复盘、今天没有到期复盘,也没有被标记的。可以新建 listing 或看看仪表盘。',
  'Try another stat or clear the filter.': '换一个指标,或清除筛选。',
  'Last Action': '上次动作',
  'Days Since Action': '距上次动作',
  'Next Review': '下次复盘',
  Experiment: '实验',
  Age: '链龄',
  Revenue: '营收',
  Orders: '订单',
  'Why: ': '原因: ',

  // Dashboard
  Active: '在跟进',
  New: '新建',
  Observe: '观察',
  'Follow-up': '跟进',
  Winner: '赢家',
  Listing: '链接',
  Shop: '店铺',
  Prio: '优先',
  Status: '状态',
  Ads: '广告',
  'No listings match': '没有匹配的 listing',
  'Adjust your filters or add a listing.': '调整筛选,或新建一个。',

  // Filters
  'Search name, shop, category, tag, id…': '搜索名称、店铺、标签、ID…',
  Filters: '筛选',
  'Presets:': '预设:',
  'Saved:': '已存:',
  Priority: '优先级',
  'Age stage': '链龄阶段',
  Category: '分类',
  'Ad strategy': '广告策略',
  'Tags (all)': '标签(全含)',
  Any: '全部',
  On: '开',
  Off: '关',
  'Save current filter': '保存当前筛选',
  'High CTR New Listings': '高CTR新品',
  'High CTR Low CVR': '高CTR低CVR',

  // Pipeline
  'Drag a listing between stages. Changes save immediately.': '拖动 listing 切换阶段,改动立即保存。',
  'Due today': '今日到期',
  'No action': '无动作',

  // Experiments
  'One variable at a time. Capture before/after and record what you learned.':
    '一次只改一个变量。记录前后数据和你学到的东西。',
  All: '全部',
  'In progress': '进行中',
  Concluded: '已结束',
  'No experiments yet': '还没有实验',
  'Open a listing (or use its Quick Actions) and choose “Experiment” to start one.':
    '打开一个 listing(或用它的快捷按钮)选择"实验"来开始。',

  // Analytics
  'Your Etsy playbook — what you’ve tried and what has worked.': '你的 Etsy 打法库 — 你试过什么、什么有效。',
  'Activity — last 7 days': '活跃度 — 近 7 天',
  Actions: '动作',
  Reviews: '复盘',
  'Listings Reviewed': '复盘的 listing',
  'Experiments Started': '新开实验',
  'Experiments Completed': '完成实验',
  'Product Matrix — CTR × CVR': '商品矩阵 — CTR × CVR',
  'My Etsy Playbook': '我的 Etsy 打法库',
  'No concluded experiments yet': '还没有结束的实验',
  'Conclude a few experiments to build your win-rate history by variable.':
    '结束几个实验,按变量积累你的胜率记录。',

  // Settings
  'Signal Thresholds': '信号阈值',
  'Product Matrix Quadrants': '商品矩阵象限',
  General: '通用',
  Currency: '货币',
  'Default Shop': '默认店铺',
  Theme: '主题',
  Dark: '深色',
  Light: '浅色',
  'Data & Backup': '数据与备份',
  'Save Settings': '保存设置',
  'Export All Data (JSON)': '导出全部数据 (JSON)',
  'Import Backup…': '导入备份…',
  'Reset All Data': '清空全部数据',
  'Cloud Sync (GitHub)': '云同步 (GitHub)',
  Language: '语言',

  // Listing form
  'New Listing': '新建 Listing',
  'Edit Listing': '编辑 Listing',
  'Listing Name *': '名称 *',
  'Etsy URL': 'Etsy 链接',
  'Publish Date': '发布日期',
  'Drives Listing Age': '决定链龄',
  Price: '价格',
  'Ads enabled': '开启广告',
  'Ad Strategy': '广告策略',
  Notes: '备注',
  '图片 (Image)': '图片',
  '拖入图片 / 粘贴 (Ctrl+V) / 点击上传': '拖入图片 / 粘贴 (Ctrl+V) / 点击上传',
  '处理中…': '处理中…',
  移除: '移除',
  '拖入 / 粘贴 / 点击上传,或在下方粘贴图片链接': '拖入 / 粘贴 / 点击上传,或在下方粘贴图片链接',
  '或粘贴图片链接 https://…': '或粘贴图片链接 https://…',

  // Quick actions
  Action: '记录',
  Snapshot: '快照',
  Review: '复盘',

  // Snapshot / metrics input
  'Add Snapshot': '记录快照',
  'Save Snapshot': '保存快照',
  Date: '日期',
  'Just copy the numbers Etsy shows you — every field is optional. CTR and CVR are calculated for you.':
    '把 Etsy 上看到的数字抄进来即可,每项都可留空;CTR、CVR 会自动帮你算好。',
  Views: '曝光 Views',
  Clicks: '点击 Clicks',
  Visits: '访问 Visits',
  'Ad Spend': '广告花费 Spend',
  Favorites: '收藏',
  'From Etsy Ads “Views”': '广告页的 "Views"(展示)',
  'From Etsy Ads “Clicks”': '广告页的 "Clicks"',
  'From Shop Stats “Visits” (optional)': '店铺 Stats 的 "Visits"(可留空)',
  'Orders / Items sold': '订单 / Items sold',
  'Total revenue': '总营收',
  'From Etsy Ads “Spend”': '广告页的 "Spend"',
  'Copy from Etsy Ads if shown': '广告页直接给了就抄,没有留空',
  Optional: '可留空',
  'Auto-computed': '自动算出',
  'Auto = Clicks ÷ Views': '自动 = 点击 ÷ 曝光',
  'Auto = Orders ÷ Visits (or Clicks)': '自动 = 订单 ÷ 访问(或点击)',

  // Statuses (badge display)
  Signal: '信号',
  Scale: '放量',
  Hold: '暂缓',
  Dropped: '放弃',

  // Age stages
  Early: '早期',
  Mature: '成熟',

  // Ads
  'Ads off': '广告关',

  // Experiment statuses
  Planned: '计划',
  Running: '进行中',
  Positive: '正向',
  Neutral: '中性',
  Negative: '负向',
  Cancelled: '取消',

  // Review decisions
  'Continue Observing': '继续观察',
  'Keep Current Setup': '保持现状',
  Optimize: '优化',
  Reduce: '缩减',
  Drop: '放弃',

  // Snooze
  Snooze: '延后',

  // ---- Simplified journal app ----
  Journal: '日志',
  'My Listings': '我的链接',
  'What you changed, day by day.': '你每天改了什么,一目了然。',
  'Nothing logged yet': '还没有记录',
  'Tap “Record” to note what you changed on a listing today.': '点"记录",记下今天改了哪个链接的什么。',

  // Listing form
  Add: '添加',
  Name: '名称',
  Image: '图片',
  'Etsy link': 'Etsy 链接',
  'e.g. UK shop confetti basket': '例如:英国店彩点篮子',
  'Please enter a name': '请填名称',
  'Listing added': '已添加链接',
  Saved: '已保存',
  Note: '备注',

  // Image picker
  'Could not read that image': '无法读取该图片',
  'Processing…': '处理中…',
  'Drag / paste (Ctrl+V) / click to upload': '拖入 / 粘贴 (Ctrl+V) / 点击上传',
  Remove: '移除',
  'or paste an image link https://…': '或粘贴图片链接 https://…',

  // Entry modal
  'Record a change': '记录改动',
  'Edit entry': '编辑记录',
  Record: '记录',
  '— select —': '— 选择 —',
  'What changed': '改了什么',
  'Tick any that apply': '相关的都可以勾',
  'What did you change and why…': '改了什么、为什么…',
  'Link name': '链接名称',
  'e.g. new main image': '例如:新主图',
  'Link (URL)': '链接 (URL)',
  'Image (optional)': '图片(可选)',
  'Pick a listing first': '请先选一个链接',
  'Tick what changed, or write a note': '勾一下改了什么,或写句备注',
  Recorded: '已记录',
  '#{n} today': '今天第 {n} 条',

  // Entry actions / card
  'Delete?': '确认删除?',
  '(deleted)': '(已删除)',

  // Listings page
  'No listings yet': '还没有链接',
  'Add a listing, then record what you change on it over time.': '先添加一个链接,之后随时记录你对它做的改动。',
  changes: '条改动',
  last: '最近',
  'no changes yet': '暂无改动',

  // Listing detail
  Back: '返回',
  'Open on Etsy ↗': '在 Etsy 打开 ↗',
  'Delete listing': '删除链接',
  'Delete this listing and all its entries? This cannot be undone.': '删除这个链接及其全部记录?此操作不可撤销。',
  'Change history': '改动历史',
  'No entries yet': '还没有记录',
  'Tap “Record” to add the first one.': '点"记录"添加第一条。',
  'Listing not found': '找不到该链接',

  // Settings (simplified)
  'Everything is stored only in this browser. Export a backup now and then.':
    '所有数据只存在这个浏览器里,记得偶尔导出备份。',
  listings: '个链接',
  entries: '条记录',
  'Export backup (JSON)': '导出备份 (JSON)',
  'Import backup…': '导入备份…',
  'Load sample data': '加载示例数据',
  'This adds some sample listings and entries so you can see how it works. Continue?':
    '会添加一些示例链接和记录,方便你看效果。继续?',
  Load: '加载',
  'Sample data loaded': '已加载示例数据',
  'Reset all data': '清空全部数据',
  'This permanently deletes ALL listings and entries in this browser. Export a backup first. This cannot be undone.':
    '将永久删除这个浏览器里的全部链接和记录。请先导出备份。此操作不可撤销。',
  'Delete everything': '删除全部',
  'All data reset': '已清空全部数据',
  'Import backup': '导入备份',
  Merge: '合并(保留现有,按 id 增补)',
  'Replace all data': '替换全部数据',
  'Replace wipes your current data and loads only the backup. This cannot be undone. Continue?':
    '替换会清空当前数据,只载入备份内容。不可撤销。继续?',
  Replace: '替换(清空后载入)',
  'Backup exported': '已导出备份',
  'Invalid backup file': '备份文件无效',
  'Could not read file': '无法读取文件',
  Imported: '已导入',
  'Language: use the EN / 中文 switch at the bottom of the sidebar.': '语言:用左侧边栏底部的 EN / 中文 切换。',
};

// English strings for the reverse toggle label etc.
export function makeT(lang: Lang) {
  return (s: string): string => (lang === 'zh' ? ZH[s] ?? s : s);
}
