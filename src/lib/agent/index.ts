import type {
  AgentAnswer,
  AgentContext,
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
  mockPlatformQuestions,
  mockRouteQuestions,
} from "./mock";
import {
  liveParseBrief,
  liveClarifyBrief,
  liveGenerateRoutes,
  livePlatformPlan,
} from "./live";
import {
  BriefSchema,
  EnvelopeMetaSchema,
  parseOrThrow,
  PlatformPlanSchema,
  RoutesPayloadSchema,
} from "./schema";
import {
  applyAnswersToBrief,
  newRequestId,
  normalizeQuestions,
} from "./questions";

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
  const info = agentInfo();
  const envelope = {
    data,
    questions: questions.slice(0, 3),
    requestId: newRequestId(),
    sessionVersion,
    ...info,
  };
  parseOrThrow(
    EnvelopeMetaSchema,
    {
      questions: envelope.questions,
      requestId: envelope.requestId,
      sessionVersion: envelope.sessionVersion,
      mode: envelope.mode,
      model: envelope.model,
    },
    "响应"
  );
  return envelope;
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
  round: number,
  questions: AgentQuestion[] = []
): Promise<{ brief: Brief; questions: AgentQuestion[]; stall: boolean }> {
  if (llmConfigured()) return liveClarifyBrief(brief, answers, round, questions);
  const next = parseOrThrow(
    BriefSchema,
    applyAnswersToBrief(brief, answers, questions),
    "Brief"
  );
  const stillUncertain = answers.length > 0 && answers.every((a) => a.kind === "uncertain");
  if (stillUncertain && round < 2) {
    return {
      brief: next,
      questions: questions.slice(0, 3),
      stall: false,
    };
  }
  return { brief: next, questions: [], stall: stillUncertain && round >= 2 };
}

export async function generateRoutes(
  brief: Brief,
  startingState: StartingState,
  userInitialIdea: string[],
  ctx: AgentContext = {}
): Promise<{
  payload: { recommendedRouteId: string | null; routes: ExplorationRoute[] } | null;
  questions: AgentQuestion[];
}> {
  if (llmConfigured()) {
    return liveGenerateRoutes(brief, startingState, userInitialIdea, ctx);
  }
  if (!ctx.force) {
    const questions = mockRouteQuestions(
      brief,
      ctx.answers ?? [],
      ctx.askedQuestions ?? []
    );
    if (questions.length) return { payload: null, questions };
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
  activeStep: string,
  ctx: AgentContext = {}
): Promise<{ plan: PlatformPlan | null; questions: AgentQuestion[] }> {
  if (llmConfigured()) {
    return livePlatformPlan(brief, selectedRoute, activeStep, ctx);
  }
  if (!ctx.force) {
    const questions = mockPlatformQuestions(
      brief,
      ctx.answers ?? [],
      ctx.askedQuestions ?? []
    );
    if (questions.length) return { plan: null, questions };
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
