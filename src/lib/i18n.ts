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
  New: '新品',
  Observe: '观察',
  'Follow-up': '跟进',
  Winner: '赢家',
  Listing: '商品',
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
};

// English strings for the reverse toggle label etc.
export function makeT(lang: Lang) {
  return (s: string): string => (lang === 'zh' ? ZH[s] ?? s : s);
}
