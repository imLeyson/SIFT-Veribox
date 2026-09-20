import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import { EXAMPLES } from "./agent/examples";
import { mockConvergence } from "./agent/convergence-mock";
import type { ConvergenceInput, TurnResult } from "@/types/convergence";

function memoryStorage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) };
}

function response(store: ReturnType<typeof createSiftStore>): TurnResult {
  const s = store.getState();
  const token = s.beginRequest()!;
  const input: ConvergenceInput = { sessionId: s.sessionId, requestId: token.id, state: null, history: [], pendingQuestions: null, rawBrief: EXAMPLES[0].brief, event: { type: "start" } };
  const payload = mockConvergence(input);
  return { ...payload, state: { ...payload.state, revision: 1 }, baseRevision: 0, sessionId: s.sessionId, requestId: token.id, mode: "mock", model: null, history: [] };
}

describe("convergence session", () => {
  it("commits a response and retains batch drafts until commit", () => {
    const store = createSiftStore(memoryStorage());
    const result = response(store);
    expect(store.getState().commitTurn(result)).toBe(true);
    const state = store.getState();
    expect(state.state?.currentHypothesis).toBeTruthy();
    if (state.next?.type !== "ask") throw new Error("Expected ask");
    state.setDrafts(state.next.questions.map((q) => ({ questionId: q.id, kind: "uncertain" as const })));
    expect(store.getState().drafts).toHaveLength(2);
  });

  it("one-click convergence enters an audited checkpoint without changing the direction", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    const before = structuredClone(store.getState().state!);
    const next = store.getState().next;
    if (!next || next.type !== "ask") throw new Error("Expected ask");
    store.getState().setDrafts(
      next.questions.map((question) => ({
        questionId: question.id,
        kind: "uncertain" as const,
      })),
    );

    store.getState().convergeNow();

    const after = store.getState();
    expect(after.next).toEqual({ type: "checkpoint", reason: "user_requested" });
    expect(after.state).toEqual({
      ...before,
      status: "checkpoint",
      revision: before.revision + 1,
    });
    expect(after.state?.status).not.toBe("confirmed");
    expect(after.drafts).toEqual([]);
    expect(after.history.at(-1)).toMatchObject({
      questions: null,
      event: { type: "checkpoint", action: "converge" },
      beforeRevision: before.revision,
      afterRevision: before.revision + 1,
    });
  });

  it("ignores repeated one-click convergence", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    store.getState().convergeNow();
    const afterFirstClick = {
      state: structuredClone(store.getState().state),
      next: structuredClone(store.getState().next),
      history: structuredClone(store.getState().history),
    };

    store.getState().convergeNow();

    expect(store.getState().state).toEqual(afterFirstClick.state);
    expect(store.getState().next).toEqual(afterFirstClick.next);
    expect(store.getState().history).toEqual(afterFirstClick.history);
  });
});
