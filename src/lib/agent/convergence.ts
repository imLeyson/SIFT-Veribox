import type {
  ConvergenceInput,
  DesignState,
  HistoryEntry,
  Question,
  TurnPayload,
  TurnResult,
} from "@/types/convergence";
import {
  ConvergenceInputSchema,
  parseContract,
  TurnPayloadSchema,
  TurnResultSchema,
} from "./convergence-schema";
import { llmConfigured, llmModelName } from "./llm";
import { liveConvergence } from "./convergence-live";
import { mockConvergence } from "./convergence-mock";

export function agentInfo() {
  return {
    mode: llmConfigured() ? ("live" as const) : ("mock" as const),
    model: llmConfigured() ? llmModelName() : null,
  };
}

function judgments(state: DesignState) {
  return [
    ...state.constraints,
    ...(state.direction.intent ? [state.direction.intent] : []),
    ...state.direction.priorities,
    ...state.direction.avoid,
    ...state.direction.criteria,
  ];
}

function questionHistory(history: HistoryEntry[]) {
  return history.flatMap((entry) => entry.questions ?? []);
}

function answeredUncertainty(history: HistoryEntry[], uncertaintyId: string) {
  return history.some((entry) => {
    if (entry.event.type !== "answer") return false;
    const answers = entry.event.answers;
    return Boolean(
      entry.questions?.some(
        (question) =>
          question.uncertaintyId === uncertaintyId &&
          answers.some((answer) => answer.kind !== "uncertain"),
      ),
    );
  });
}

function questionKey(question: Question) {
  return question.prompt.replace(/[\s？?，,。]/g, "");
}

function forceFastCheckpoint(payload: TurnPayload): TurnPayload {
  return {
    state: { ...payload.state, status: "checkpoint" },
    next: { type: "checkpoint", reason: "fast_converged" },
  };
}

export async function runConvergenceTurn(
  value: ConvergenceInput,
): Promise<TurnResult> {
  const input = parseContract(ConvergenceInputSchema, value);
  const { event, state: previous } = input;
  const raw = llmConfigured()
    ? ((await liveConvergence(input)) as TurnPayload)
    : mockConvergence(input);
  const result = parseContract(
    TurnPayloadSchema,
    event.type === "fast_start" ? forceFastCheckpoint(raw) : raw,
  );
  if (result.state.status === "confirmed")
    throw new Error("方向必须由用户确认");

  const revision = (previous?.revision ?? 0) + 1;
  const history: HistoryEntry[] = [...input.history];
  if (event.type === "fast_start") {
    history.push({
      id: input.requestId,
      questions: null,
      event: { type: "checkpoint", action: "converge" },
      beforeRevision: previous?.revision ?? 0,
      afterRevision: revision,
    });
  } else if (event.type !== "start") {
    history.push({
      id: input.requestId,
      questions: event.type === "answer" ? input.pendingQuestions : null,
      event,
      beforeRevision: previous!.revision,
      afterRevision: revision,
    });
  }

  const allowedSources = new Set(["brief", ...history.map((h) => h.id), input.requestId]);
  for (const item of judgments(result.state)) {
    item.sourceIds = item.sourceIds.map((id) =>
      allowedSources.has(id) ? id : input.requestId,
    );
    if (!item.sourceIds.length) item.sourceIds = [input.requestId];
  }

  if (previous && event.type === "answer") {
    const answers = event.answers;
    for (const constraint of previous.constraints) {
      const reconsidered = answers.some((answer) => {
        if (answer.kind === "uncertain") return false;
        const question = input.pendingQuestions?.find(
          (item) => item.id === answer.questionId,
        );
        return question?.constraintRefs.includes(constraint.text) ?? false;
      });
      if (
        !reconsidered &&
        !result.state.constraints.some((item) => item.text === constraint.text)
      )
        throw new Error("模型丢失了已有约束，请重试");
    }
    if (answers.every((answer) => answer.kind === "uncertain")) {
      result.state.direction = previous.direction;
      result.state.constraints = previous.constraints;
    }
  }

  const lastCorrection = history.findLastIndex(
    (entry) => entry.event.type === "correct",
  );
  const recent = history.slice(lastCorrection + 1);
  for (const uncertainty of result.state.uncertainties) {
    const uncertainCount = recent.reduce((count, entry) => {
      if (entry.event.type !== "answer") return count;
      const answers = entry.event.answers;
      return (
        count +
        (entry.questions ?? []).filter(
          (question) =>
            question.uncertaintyId === uncertainty.id &&
            answers.some((answer) => answer.kind === "uncertain"),
        ).length
      );
    }, 0);
    if (uncertainCount >= 2) uncertainty.status = "deferred";
  }

  if (result.next.type === "ask") {
    const questions = result.next.questions;
    if (questions.length < 2 || questions.length > 3)
      throw new Error("每轮必须提出 2–3 个高价值问题");
    const ids = new Set<string>();
    const uncertaintyIds = new Set<string>();
    const priorities = { blocking: 0, material: 1, minor: 2 };
    let strongestImpact = 2;
    for (const question of questions) {
      if (ids.has(question.id)) throw new Error("同一轮问题 ID 重复");
      if (uncertaintyIds.has(question.uncertaintyId))
        throw new Error("同一轮不能重复追问同一判断");
      ids.add(question.id);
      uncertaintyIds.add(question.uncertaintyId);
      const target = result.state.uncertainties.find(
        (item) => item.id === question.uncertaintyId,
      );
      if (!target || target.status !== "open" || target.impact === "minor")
        throw new Error("问题必须对应一个值得回答的未决判断");
      strongestImpact = Math.min(strongestImpact, priorities[target.impact]);
      if (answeredUncertainty(history, question.uncertaintyId))
        throw new Error("模型重复询问已处理的判断，请重试");
      if (questionHistory(history).some((old) => old.id === question.id))
        throw new Error("模型重复了已问过的问题，请重试");
      if (
        recent.some((entry) =>
          (entry.questions ?? []).some(
            (old) => questionKey(old) === questionKey(question),
          ),
        )
      )
        throw new Error("模型重复了上一轮问题，请重试");
      if (
        question.constraintRefs.some(
          (ref) => !result.state.constraints.some((item) => item.text === ref),
        )
      )
        throw new Error("问题引用了不存在的约束");
    }
    const skippedStronger = result.state.uncertainties.some(
      (item) =>
        item.status === "open" &&
        item.impact !== "minor" &&
        priorities[item.impact] < strongestImpact &&
        !uncertaintyIds.has(item.id),
    );
    if (skippedStronger) throw new Error("模型跳过了更关键的未决判断，请重试");
  }

  if (
    result.next.type === "checkpoint" &&
    result.next.reason === "ready" &&
    result.state.uncertainties.some(
      (item) => item.impact !== "minor" && item.status === "open",
    )
  ) {
    result.next.reason = "needs_evidence";
  }
  result.state.revision = revision;
  return parseContract(TurnResultSchema, {
    ...result,
    sessionId: input.sessionId,
    requestId: input.requestId,
    baseRevision: previous?.revision ?? 0,
    history,
    ...agentInfo(),
  });
}
