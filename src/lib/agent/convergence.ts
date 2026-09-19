import type { ConvergenceInput, DesignState, HistoryEntry, TurnResult } from "@/types/convergence";
import { ConvergenceInputSchema, parseContract, TurnPayloadSchema, TurnResultSchema } from "./convergence-schema";
import { llmConfigured, llmModelName } from "./llm";
import { liveConvergence } from "./convergence-live";
import { mockConvergence } from "./convergence-mock";

export function agentInfo() {
  return { mode: llmConfigured() ? "live" as const : "mock" as const, model: llmConfigured() ? llmModelName() : null };
}

function judgments(state: DesignState) {
  return [...state.constraints, ...(state.direction.intent ? [state.direction.intent] : []), ...state.direction.priorities, ...state.direction.avoid, ...state.direction.criteria];
}

export async function runConvergenceTurn(value: ConvergenceInput): Promise<TurnResult> {
  const input = parseContract(ConvergenceInputSchema, value);
  const { event, state: previous } = input;
  const result = parseContract(TurnPayloadSchema, llmConfigured() ? await liveConvergence(input) : mockConvergence(input));
  if (result.state.status === "confirmed") throw new Error("方向必须由用户确认");
  const revision = (previous?.revision ?? 0) + 1;
  const history: HistoryEntry[] = [...input.history];
  if (event.type !== "start") {
    history.push({ id: input.requestId, question: event.type === "answer" ? input.pendingQuestion : null, event, beforeRevision: previous!.revision, afterRevision: revision });
  }
  const allowedSources = new Set(["brief", ...history.map(h => h.id)]);
  if (judgments(result.state).some(j => j.sourceIds.some(id => !allowedSources.has(id)))) {
    throw new Error("状态引用了不存在的回答，请重试");
  }
  if (previous && event.type === "answer") {
    for (const constraint of previous.constraints) {
      if (!result.state.constraints.some(c => c.text === constraint.text)) throw new Error("模型丢失了已有约束，请重试");
    }
    if (event.answer.kind === "uncertain") {
      // Uncertainty is not permission to invent a preference, even if the model does so.
      result.state.direction = previous.direction;
      result.state.constraints = previous.constraints;
      const pending = previous.uncertainties.find(u => u.id === input.pendingQuestion!.uncertaintyId);
      if (pending && !result.state.uncertainties.some(u => u.id === pending.id)) result.state.uncertainties.push({ ...pending });
    }
  }
  const lastCorrection = history.findLastIndex(h => h.event.type === "correct");
  const recent = history.slice(lastCorrection + 1);
  for (const u of result.state.uncertainties) {
    if (recent.filter(h => h.question?.uncertaintyId === u.id && h.event.type === "answer" && h.event.answer.kind === "uncertain").length >= 2) u.status = "deferred";
  }
  if (result.next.type === "ask") {
    const q = result.next.question;
    const repeats = recent.filter(h => h.question?.uncertaintyId === q.uncertaintyId);
    if (repeats.some(h => h.event.type === "answer" && h.event.answer.kind !== "uncertain") || repeats.length >= 2) {
      throw new Error("模型重复询问已处理的判断，请重试或先确认当前状态");
    }
    if (repeats.some(h => h.question?.prompt === q.prompt) || history.some(h => h.question?.id === q.id)) {
      throw new Error("模型重复了上一题，请重试");
    }
    const priorities = { blocking: 0, material: 1, minor: 2 };
    const target = result.state.uncertainties.find(u => u.id === q.uncertaintyId)!;
    if (result.state.uncertainties.some(u => u.status === "open" && priorities[u.impact] < priorities[target.impact])) {
      throw new Error("模型跳过了更关键的未决判断，请重试");
    }
  }
  if (result.next.type === "checkpoint" && result.next.reason === "ready" && result.state.uncertainties.some(u => u.impact !== "minor")) {
    throw new Error("仍有重要未决判断，不能标记为已就绪");
  }
  result.state.revision = revision;
  return parseContract(TurnResultSchema, { ...result, sessionId: input.sessionId, requestId: input.requestId, baseRevision: previous?.revision ?? 0, history, ...agentInfo() });
}
