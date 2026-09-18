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
  liveGenerateRoutes,
  livePlatformPlan,
} from "./live";

export type AgentMode = "live" | "mock";

export function agentInfo(): { mode: AgentMode; model: string | null } {
  if (llmConfigured()) return { mode: "live", model: llmModelName() };
  return { mode: "mock", model: null };
}

export async function parseBrief(raw: string): Promise<Brief> {
  if (llmConfigured()) return liveParseBrief(raw);
  return mockParseBrief(raw);
}

export async function generateRoutes(
  brief: Brief,
  startingState: StartingState,
  userInitialIdea: string[]
): Promise<{ recommendedRouteId: string | null; routes: ExplorationRoute[] }> {
  if (llmConfigured()) {
    return liveGenerateRoutes(brief, startingState, userInitialIdea);
  }
  return mockGenerateRoutes(brief, startingState, userInitialIdea);
}

export async function planPlatforms(
  brief: Brief,
  selectedRoute: ExplorationRoute | undefined,
  activeStep: string
): Promise<PlatformPlan> {
  if (llmConfigured()) {
    return livePlatformPlan(brief, selectedRoute, activeStep);
  }
  return mockPlatformPlan(brief, activeStep);
}
