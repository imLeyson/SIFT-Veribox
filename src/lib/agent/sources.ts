import type { Brief, PlatformSource } from "@/types";

export type SourceCapability =
  | "视觉扩散"
  | "跨品类参考"
  | "完整项目验证"
  | "国内语境"
  | "品牌官网验证"
  | "历史收藏回看";

export interface SourceDef {
  name: string;
  capabilities: SourceCapability[];
  language: "zh" | "en" | "mixed";
  role: SourceCapability;
  searchUrl: (query: string) => string;
}

export const SOURCE_CATALOG: SourceDef[] = [
  {
    name: "Pinterest",
    capabilities: ["视觉扩散"],
    language: "en",
    role: "视觉扩散",
    searchUrl: (q) =>
      `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Are.na",
    capabilities: ["跨品类参考"],
    language: "en",
    role: "跨品类参考",
    searchUrl: (q) => `https://www.are.na/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Behance",
    capabilities: ["完整项目验证"],
    language: "en",
    role: "完整项目验证",
    searchUrl: (q) =>
      `https://www.behance.net/search/projects?search=${encodeURIComponent(q)}`,
  },
  {
    name: "小红书",
    capabilities: ["国内语境"],
    language: "zh",
    role: "国内语境",
    searchUrl: (q) =>
      `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`,
  },
  {
    name: "品牌官网",
    capabilities: ["品牌官网验证"],
    language: "mixed",
    role: "品牌官网验证",
    searchUrl: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(`${q} official site`)}`,
  },
  {
    name: "收集箱",
    capabilities: ["历史收藏回看"],
    language: "mixed",
    role: "历史收藏回看",
    searchUrl: () => "#",
  },
  {
    name: "Savee",
    capabilities: ["视觉扩散"],
    language: "en",
    role: "视觉扩散",
    searchUrl: (q) => `https://savee.it/search/?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Cosmos",
    capabilities: ["跨品类参考"],
    language: "en",
    role: "跨品类参考",
    searchUrl: (q) => `https://www.cosmos.so/search/${encodeURIComponent(q)}`,
  },
  {
    name: "Designspiration",
    capabilities: ["完整项目验证"],
    language: "en",
    role: "完整项目验证",
    searchUrl: (q) =>
      `https://www.designspiration.com/search/saves/?q=${encodeURIComponent(q)}`,
  },
];

export const SOURCE_REGISTRY = SOURCE_CATALOG.map((s) => s.name);

const STEP_WEIGHT: Record<string, Partial<Record<SourceCapability, number>>> = {
  风格: { 视觉扩散: 3, 跨品类参考: 2, 完整项目验证: 1 },
  调性: { 视觉扩散: 3, 国内语境: 2, 跨品类参考: 1 },
  气质: { 视觉扩散: 3, 跨品类参考: 2 },
  摄影: { 视觉扩散: 3, 跨品类参考: 2, 完整项目验证: 1 },
  画面: { 视觉扩散: 3, 完整项目验证: 2 },
  字体: { 完整项目验证: 3, 视觉扩散: 2 },
  图形: { 完整项目验证: 3, 视觉扩散: 2 },
  色彩: { 视觉扩散: 3, 完整项目验证: 1 },
  竞品: { 品牌官网验证: 3, 国内语境: 2, 完整项目验证: 2 },
  同类: { 品牌官网验证: 3, 国内语境: 3, 完整项目验证: 2 },
  品类: { 国内语境: 3, 品牌官网验证: 2, 完整项目验证: 1 },
  行业: { 国内语境: 3, 品牌官网验证: 2 },
  材质: { 完整项目验证: 3, 跨品类参考: 2, 视觉扩散: 1 },
  结构: { 完整项目验证: 3, 品牌官网验证: 2 },
  场景: { 国内语境: 3, 视觉扩散: 2 },
  包装: { 完整项目验证: 3, 国内语境: 2, 品牌官网验证: 2 },
  首页: { 完整项目验证: 3, 国内语境: 2, 品牌官网验证: 2 },
  页面: { 完整项目验证: 3, 国内语境: 2 },
  流程: { 品牌官网验证: 3, 完整项目验证: 2, 国内语境: 2 },
  空状态: { 完整项目验证: 3, 视觉扩散: 2 },
  组件: { 完整项目验证: 3, 视觉扩散: 2 },
  交互: { 完整项目验证: 3, 品牌官网验证: 2 },
  动效: { 视觉扩散: 3, 完整项目验证: 2 },
  官网: { 品牌官网验证: 3, 国内语境: 2 },
};

function scoreSource(source: SourceDef, step: string, brief: Brief): number {
  let score = 0;
  for (const [key, weights] of Object.entries(STEP_WEIGHT)) {
    if (!step.includes(key)) continue;
    for (const cap of source.capabilities) {
      score += weights[cap] ?? 0;
    }
  }
  if (brief.constraints.some((c) => /国内|本土|中国/.test(c))) {
    if (source.role === "国内语境") score += 2;
  }
  if (brief.unknown.some((u) => /竞品|同类|行业/.test(u))) {
    if (source.role === "品牌官网验证") score += 2;
  }
  if (score === 0) {
    score = source.role === "视觉扩散" ? 1 : 0;
  }
  return score;
}

export function rankSources(step: string, brief: Brief): SourceDef[] {
  return [...SOURCE_CATALOG].sort((a, b) => {
    const diff = scoreSource(b, step, brief) - scoreSource(a, step, brief);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export function withSearchUrl(source: PlatformSource): PlatformSource {
  const def = SOURCE_CATALOG.find((s) => s.name === source.name);
  const firstQuery = source.queries[0]?.query ?? source.name;
  return {
    ...source,
    searchUrl: def ? def.searchUrl(firstQuery) : source.searchUrl,
  };
}

export function findSource(name: string): SourceDef | undefined {
  return SOURCE_CATALOG.find((s) => s.name === name);
}
