export type PlatformDefinition = {
  id: string;
  name: string;
  roleTag: string;
  description: string;
  urlTemplate: string;
};

export const PLATFORM_REGISTRY: Record<string, PlatformDefinition> = {
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    roleTag: "视觉扩散",
    description: "意象发散、氛围情绪板、色彩与材质质感、跨品类灵感扩散",
    urlTemplate: "https://www.pinterest.com/search/pins/?q={query}",
  },
  behance: {
    id: "behance",
    name: "Behance",
    roleTag: "完整项目验证",
    description: "成套品牌案、系统化落地案例、设计推演过程、工艺细节",
    urlTemplate: "https://www.behance.net/search/projects?search={query}",
  },
  xiaohongshu: {
    id: "xiaohongshu",
    name: "小红书",
    roleTag: "中文语境与消费场景",
    description: "本土真实消费反馈、桌面/生活实际晒单、流行卖点与竞品评价",
    urlTemplate: "https://www.xiaohongshu.com/search_result?keyword={query}",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    roleTag: "场景和趋势参考",
    description: "主理人生活方式、海外先锋小众品牌切片、即时社媒视觉趋势",
    urlTemplate: "https://www.instagram.com/explore/tags/{query}/",
  },
  dribbble: {
    id: "dribbble",
    name: "Dribbble",
    roleTag: "数字产品与界面参考",
    description: "高保真界面组件、动效与微交互、排版小样、图标与图形细节",
    urlTemplate: "https://dribbble.com/search/{query}",
  },
  google: {
    id: "google",
    name: "Google / 品牌官网搜索",
    roleTag: "品牌验证与跨品类检索",
    description: "品牌官方设计规范、跨品类标杆调研、行业深度分析与专业评测",
    urlTemplate: "https://www.google.com/search?q={query}",
  },
};

export function buildPlatformSearchUrl(
  platformIdOrName: string,
  keyword: string,
): string {
  const normalized = platformIdOrName.toLowerCase();
  const found = Object.values(PLATFORM_REGISTRY).find(
    (p) =>
      p.id === normalized ||
      p.name.toLowerCase() === normalized ||
      p.name.toLowerCase().includes(normalized),
  );
  const template =
    found?.urlTemplate ?? "https://www.google.com/search?q={query}";
  // For tags-based URL like Instagram, remove spaces if query is tag-based, or fallback to Google query
  if (found?.id === "instagram") {
    const cleanTag = keyword.replace(/[\s\-_]+/g, "");
    return `https://www.instagram.com/explore/tags/${encodeURIComponent(cleanTag)}/`;
  }
  return template.replace("{query}", encodeURIComponent(keyword));
}
