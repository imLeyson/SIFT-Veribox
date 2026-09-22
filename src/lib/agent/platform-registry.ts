export type PlatformCategory =
  | "packaging"
  | "typography"
  | "branding"
  | "moodboard"
  | "domestic"
  | "digital"
  | "general";

export type PlatformDefinition = {
  id: string;
  name: string;
  roleTag: string;
  description: string;
  urlTemplate: string;
  category: PlatformCategory;
};

export const PLATFORM_REGISTRY: Record<string, PlatformDefinition> = {
  // --- 1. Packaging & Print Craft (包装与材质微工艺) ---
  dieline: {
    id: "dieline",
    name: "The Dieline",
    roleTag: "全球包装与造型标杆",
    description: "全球商业包装设计标杆、前沿瓶型结构、环保包材与设计方案",
    urlTemplate: "https://thedieline.com/search/{query}",
    category: "packaging",
  },
  bpando: {
    id: "bpando",
    name: "BP&O",
    roleTag: "品牌识别与微工艺档案",
    description: "英国知名品牌与包装设计深度档案，专注特种纸、深压凹、无墨触感与极简微工艺",
    urlTemplate: "https://bpando.org/?s={query}",
    category: "packaging",
  },
  packagingoftheworld: {
    id: "packagingoftheworld",
    name: "Packaging of the World",
    roleTag: "全球包装形态与结构库",
    description: "全球海量包装案例库，涵盖不同材质、开启结构与消费品类的实际成品",
    urlTemplate: "https://packagingoftheworld.com/?s={query}",
    category: "packaging",
  },

  // --- 2. Typography & Grid & Editorial (字体排印与网格秩序) ---
  fontsinuse: {
    id: "fontsinuse",
    name: "Fonts In Use",
    roleTag: "真实排印与字阶档案",
    description: "全球真实商业设计中的中西字体搭配、版式字阶、网格骨架与排印学范例",
    urlTemplate: "https://fontsinuse.com/search?terms={query}",
    category: "typography",
  },
  typewolf: {
    id: "typewolf",
    name: "Typewolf",
    roleTag: "字体搭配与排版风向",
    description: "当代流行字体搭配趋势、小众西文字体、排印设计指南与字重层级",
    urlTemplate: "https://www.typewolf.com/?s={query}",
    category: "typography",
  },

  // --- 3. Comprehensive Branding & Systems (全案系统与品牌重塑) ---
  behance: {
    id: "behance",
    name: "Behance",
    roleTag: "完整全案与系统推演",
    description: "成套品牌案、系统化设计案例、设计推演过程、工艺实拍与完整视觉识别",
    urlTemplate: "https://www.behance.net/search/projects?search={query}",
    category: "branding",
  },
  brandnew: {
    id: "brandnew",
    name: "Brand New",
    roleTag: "品牌重塑与视觉系统",
    description: "权威品牌重塑复盘，深度解析视觉锤、Logo、辅助图形与全套品牌视觉物料",
    urlTemplate: "https://www.underconsideration.com/brandnew/?s={query}",
    category: "branding",
  },

  // --- 4. Curated Moodboards & Avant-Garde (高级调研与情绪板) ---
  arena: {
    id: "arena",
    name: "Are.na",
    roleTag: "总监级视觉调研与溯源",
    description: "资深创意人与研究型设计师的视觉灵感库，去算法化、无低质贴图的高级研究渠道",
    urlTemplate: "https://www.are.na/search/{query}",
    category: "moodboard",
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    roleTag: "意象发散与色彩情绪板",
    description: "意象发散、氛围情绪板、色彩与材质质感、跨品类灵感扩散",
    urlTemplate: "https://www.pinterest.com/search/pins/?q={query}",
    category: "moodboard",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    roleTag: "生活方式与场景切片",
    description: "主理人生活方式、海外先锋小众品牌切片、即时社媒视觉趋势",
    urlTemplate: "https://www.instagram.com/explore/tags/{query}/",
    category: "moodboard",
  },

  // --- 5. Domestic Chinese Market Context (本土消费与工艺质感) ---
  xiaohongshu: {
    id: "xiaohongshu",
    name: "小红书",
    roleTag: "本土消费真实晒单",
    description: "本土真实消费反馈、桌面/生活实际晒单、真实货架陈列与买点评价",
    urlTemplate: "https://www.xiaohongshu.com/search_result?keyword={query}",
    category: "domestic",
  },
  zcool: {
    id: "zcool",
    name: "站酷 (ZCOOL)",
    roleTag: "本土商业设计与工艺案例",
    description: "中国本土顶尖设计团队商业案例、印刷工艺实拍与本土消费品设计范例",
    urlTemplate: "https://www.zcool.com.cn/search/content?word={query}",
    category: "domestic",
  },
  huaban: {
    id: "huaban",
    name: "花瓣 (Huaban)",
    roleTag: "国内电商与灵感采集",
    description: "本土设计师灵感画板，快速采集国内电商、线下实体与本土消费视觉",
    urlTemplate: "https://huaban.com/search?q={query}",
    category: "domestic",
  },

  // --- 6. Digital Product & SaaS (数字界面与交互) ---
  mobbin: {
    id: "mobbin",
    name: "Mobbin",
    roleTag: "真实生产界面与交互流",
    description: "收录全球顶级真实 iOS、Web 与 SaaS 产品完整页面截图与工作流交互",
    urlTemplate: "https://mobbin.com/search?q={query}",
    category: "digital",
  },
  godly: {
    id: "godly",
    name: "Godly",
    roleTag: "先锋网页与微动效美学",
    description: "精选全球顶级现代网页、暗黑科技美学、高质感微动效与排版排式",
    urlTemplate: "https://godly.website/?q={query}",
    category: "digital",
  },
  dribbble: {
    id: "dribbble",
    name: "Dribbble",
    roleTag: "数字组件与概念小样",
    description: "高保真界面组件、动效与微交互、排版小样、图标与图形细节",
    urlTemplate: "https://dribbble.com/search/{query}",
    category: "digital",
  },

  // --- 7. Broad Search & Standards (行业规范与综合验证) ---
  google: {
    id: "google",
    name: "Google / 品牌官网搜索",
    roleTag: "跨品类调研与行业规范",
    description: "品牌官方设计规范、跨品类标杆调研、行业深度分析与专业评测",
    urlTemplate: "https://www.google.com/search?q={query}",
    category: "general",
  },
};

export function buildPlatformSearchUrl(
  platformIdOrName: string,
  keyword: string,
): string {
  const normalized = platformIdOrName.toLowerCase().replace(/[\s\-_()]+/g, "");
  const found = Object.values(PLATFORM_REGISTRY).find((p) => {
    const pId = p.id.toLowerCase().replace(/[\s\-_()]+/g, "");
    const pName = p.name.toLowerCase().replace(/[\s\-_()]+/g, "");
    return (
      pId === normalized ||
      pName === normalized ||
      pName.includes(normalized) ||
      normalized.includes(pId) ||
      normalized.includes(pName)
    );
  });
  const template =
    found?.urlTemplate ?? "https://www.google.com/search?q={query}";
  if (found?.id === "instagram") {
    const cleanTag = keyword.replace(/[\s\-_#]+/g, "");
    return `https://www.instagram.com/explore/tags/${encodeURIComponent(cleanTag)}/`;
  }
  return template.replace("{query}", encodeURIComponent(keyword));
}
