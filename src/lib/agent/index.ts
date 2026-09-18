import type {
  Brief,
  ExplorationRoute,
  PlatformPlan,
  StartingState,
} from "@/types";
import { llmConfigured, llmModelName } from "./llm";
import {
  mockParseBrief,
  mockGenerateRoutes,
  mockPlatformPlan,
} from "./mock";
import {
  liveParseBrief,
  liveClarifyBrief,
  liveGenerateRoutes,
  livePlatformPlan,
} from "./live";
import {
  BriefSchema,
  parseOrThrow,
  PlatformPlanSchema,
  RoutesPayloadSchema,
} from "./schema";

export type AgentMode = "live" | "mock";

export function agentInfo(): { mode: AgentMode; model: string | null } {
  if (llmConfigured()) return { mode: "live", model: llmModelName() };
  return { mode: "mock", model: null };
}

export async function parseBrief(raw: string): Promise<Brief> {
  if (llmConfigured()) return liveParseBrief(raw);
  return parseOrThrow(BriefSchema, mockParseBrief(raw), "Brief");
}

export async function clarifyBrief(
  brief: Brief,
  picks: { id: string; prompt: string; choice: string | null }[],
  round: number
): Promise<{ brief: Brief; ready: boolean }> {
  if (llmConfigured()) return liveClarifyBrief(brief, picks, round);
  const known = [...brief.known];
  for (const pick of picks) {
    if (pick.choice) known.push(pick.choice);
  }
  const next = {
    ...brief,
    known,
    clarifyQuestions: [] as Brief["clarifyQuestions"],
    openQuestions: [] as string[],
  };
  return {
    brief: parseOrThrow(BriefSchema, next, "Brief"),
    ready: true,
  };
}

export async function generateRoutes(
  brief: Brief,
  startingState: StartingState,
  userInitialIdea: string[]
): Promise<{ recommendedRouteId: string | null; routes: ExplorationRoute[] }> {
  if (llmConfigured()) {
    return liveGenerateRoutes(brief, startingState, userInitialIdea);
  }
  return parseOrThrow(
    RoutesPayloadSchema,
    mockGenerateRoutes(brief, startingState, userInitialIdea),
    "探索路线"
  );
}

export async function planPlatforms(
  brief: Brief,
  selectedRoute: ExplorationRoute | undefined,
  activeStep: string
): Promise<PlatformPlan> {
  if (llmConfigured()) {
    return livePlatformPlan(brief, selectedRoute, activeStep);
  }
  return parseOrThrow(
    PlatformPlanSchema,
    mockPlatformPlan(brief, activeStep),
    "平台搜索计划"
  );
}
