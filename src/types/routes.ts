export type RouteStep = {
  id: string;
  title: string;
  question: string;
  purpose: string;
  deliverables?: string[];
  acceptanceCriteria?: string[];
};

export type Route = {
  id: string;
  title: string;
  themeName?: string;
  visualSnapshot?: string;
  startingPoint: string;
  coreProblem: string;
  purpose: string;
  pros: string;
  cons: string;
  recommendedReason: string | null;
  steps: RouteStep[];
  timeframe?: string;
  feasibility?: "high" | "medium" | "challenging";
  focusDimension?: string;
  alignmentScore?: number;
};

export type PlatformKeywordDimension = "form" | "craft" | "mood" | "reality";

export type PlatformKeyword = {
  keyword: string;
  meaning: string;
  language: "zh" | "en";
  searchType?: "moodboard" | "detail" | "consumer" | "benchmark";
  dimension?: PlatformKeywordDimension;
  advancedQuery?: string;
  calibratedQuery?: string;
  hitRateConfidence?: number;
  jevJudgement?: string;
};

export type PlatformSource = {
  id: string;
  platform: string;
  roleTag: string;
  reason: string;
  keywords: PlatformKeyword[];
  searchUrl: string;
  inspirationClues?: {
    lookFor: string;
    avoid: string;
  };
  lensRole?: "benchmark" | "avant_garde" | "proofing";
};

export type PlatformPlan = {
  id: string;
  routeId: string;
  stepId: string;
  primarySources: PlatformSource[];
  alternativeSources: PlatformSource[];
  systemOne?: {
    engine: "jev-cloud" | "jev-native";
    latencyMs: number;
    confidence?: number;
    scores?: Record<string, number>;
    matchPercentages?: Record<string, number>;
  };
};

export type ExplorationStage =
  | "state_confirmed"
  | "routes"
  | "route_selected"
  | "step_active"
  | "platform_ready"
  | "searching";

export type SourceInteraction = {
  skipped?: boolean;
  replacedBy?: string;
  opened?: boolean;
  copiedKeywords?: string[];
};

export function cleanStepLabel(rawTitle: string): string {
  if (!rawTitle) return "视觉切入";
  const cleaned = rawTitle
    .replace(/^Step\s*\d+[:：\s]*/i, "")
    .replace(/^0?\d+[\.、\s]*/, "")
    .replace(/(?:实操|打样|实物|白模|样张|样卡|报告|盲测|测试|检验|评估|设定|筛选|提取|提炼|校准|规范|清单)/g, "")
    .trim();
  const parts = cleaned.split(/[与、和·\/\s]/).filter(Boolean);
  if (parts.length > 0) {
    if (parts[0].length >= 2 && parts[0].length <= 5) return parts[0];
    if (parts[0].length > 5) return parts[0].slice(0, 4);
  }
  return cleaned.slice(0, 4) || rawTitle.replace(/^0?\d+[\.、\s]*/, "").slice(0, 4) || "视觉切入";
}

