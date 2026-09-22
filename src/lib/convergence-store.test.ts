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

  it("supports submitting custom user input for questions when options do not fit", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    const next = store.getState().next;
    if (!next || next.type !== "ask") throw new Error("Expected ask");

    // User selects option for Q1, but provides custom text for Q2
    const customText = "通过大面积负空间留白与中英文细线排版，突出冷冽克制感";
    store.getState().setDrafts([
      { questionId: next.questions[0].id, kind: "option", optionId: next.questions[0].options[0].id },
      { questionId: next.questions[1].id, kind: "custom", text: customText },
    ]);

    expect(store.getState().drafts).toHaveLength(2);
    expect(store.getState().drafts[1]).toEqual({
      questionId: next.questions[1].id,
      kind: "custom",
      text: customText,
    });

    // Simulate answering with the custom input
    const s = store.getState();
    const token = s.beginRequest()!;
    const input: ConvergenceInput = {
      sessionId: s.sessionId,
      requestId: token.id,
      state: s.state,
      history: s.history,
      pendingQuestions: next.questions,
      rawBrief: EXAMPLES[0].brief,
      event: { type: "answer", answers: s.drafts },
    };
    const payload = mockConvergence(input);
    const baseRev = s.state?.revision ?? 0;
    const turnResult: TurnResult = {
      ...payload,
      state: { ...payload.state, revision: baseRev + 1 },
      baseRevision: baseRev,
      sessionId: s.sessionId,
      requestId: token.id,
      mode: "mock",
      model: null,
      history: s.history,
    };
    expect(store.getState().commitTurn(turnResult)).toBe(true);

    const updatedState = store.getState().state;
    expect(updatedState).toBeTruthy();
    // Verify custom text was ingested into direction priorities
    const customPriority = updatedState?.direction.priorities.find((p) => p.text === customText);
    expect(customPriority).toBeTruthy();
    expect(customPriority?.basis).toBe("user");
  });

  it("handles node collapse, expand all, and collapse completed nodes", () => {
    const store = createSiftStore(memoryStorage());
    expect(store.getState().collapsedNodes).toEqual({});

    // Toggle single node
    store.getState().toggleNodeCollapse("brief");
    expect(store.getState().collapsedNodes["brief"]).toBe(true);
    store.getState().toggleNodeCollapse("brief");
    expect(store.getState().collapsedNodes["brief"]).toBe(false);

    // Explicit set
    store.getState().setNodeCollapse("direction", true);
    expect(store.getState().collapsedNodes["direction"]).toBe(true);

    // Commit turn so state exists
    store.getState().commitTurn(response(store));
    store.getState().collapseCompletedNodes();
    expect(store.getState().collapsedNodes["brief"]).toBe(true);

    // Expand all
    store.getState().expandAllNodes();
    expect(store.getState().collapsedNodes).toEqual({});
  });
});
