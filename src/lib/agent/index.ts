import type {
  AgentAnswer,
  AgentQuestion,
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
import { newRequestId, normalizeQuestions } from "./questions";

export type AgentMode = "live" | "mock";

export function agentInfo(): { mode: AgentMode; model: string | null } {
  if (llmConfigured()) return { mode: "live", model: llmModelName() };
  return { mode: "mock", model: null };
}

export function wrap<T>(
  data: T | null,
  questions: AgentQuestion[],
  sessionVersion: number
) {
  return {
    data,
    questions,
    requestId: newRequestId(),
    sessionVersion,
    ...agentInfo(),
  };
}

export async function parseBrief(raw: string): Promise<{
  brief: Brief;
  questions: AgentQuestion[];
}> {
  if (llmConfigured()) return liveParseBrief(raw);
  const brief = parseOrThrow(BriefSchema, mockParseBrief(raw), "Brief");
  const questions = normalizeQuestions(
    brief.clarifyQuestions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options.map((label, i) => ({ id: `opt_${i + 1}`, label })),
    })),
    "brief",
    "card-brief"
  );
  return { brief, questions };
}

export async function clarifyBrief(
  brief: Brief,
  answers: AgentAnswer[],
  round: number
): Promise<{ brief: Brief; questions: AgentQuestion[]; stall: boolean }> {
  if (llmConfigured()) return liveClarifyBrief(brief, answers, round);
  const preferences = [...brief.preferences];
  const known = [...brief.known];
  for (const a of answers) {
    if (a.kind === "option" || a.kind === "custom") {
      const text = a.custom ?? a.optionId ?? "";
      if (text) preferences.push(text);
    }
  }
  const next = parseOrThrow(
    BriefSchema,
    {
      ...brief,
      known,
      preferences,
      clarifyQuestions: [],
      openQuestions: [],
    },
    "Brief"
  );
  return { brief: next, questions: [], stall: false };
}

export async function generateRoutes(
  brief: Brief,
  startingState: StartingState,
  userInitialIdea: string[]
): Promise<{
  payload: { recommendedRouteId: string | null; routes: ExplorationRoute[] } | null;
  questions: AgentQuestion[];
}> {
  if (llmConfigured()) {
    return liveGenerateRoutes(brief, startingState, userInitialIdea);
  }
  return {
    payload: parseOrThrow(
      RoutesPayloadSchema,
      mockGenerateRoutes(brief, startingState, userInitialIdea),
      "探索路线"
    ),
    questions: [],
  };
}

export async function planPlatforms(
  brief: Brief,
  selectedRoute: ExplorationRoute | undefined,
  activeStep: string
): Promise<{ plan: PlatformPlan | null; questions: AgentQuestion[] }> {
  if (llmConfigured()) {
    return livePlatformPlan(brief, selectedRoute, activeStep);
  }
  return {
    plan: parseOrThrow(
      PlatformPlanSchema,
      mockPlatformPlan(brief, activeStep),
      "平台搜索计划"
    ),
    questions: [],
  };
}
