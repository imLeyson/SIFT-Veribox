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

export type PlatformKeyword = {
  keyword: string;
  meaning: string;
  language: "zh" | "en";
  searchType?: "moodboard" | "detail" | "consumer" | "benchmark";
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
