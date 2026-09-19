import { describe, expect, it } from "vitest";
import { createSiftStore, STORAGE_KEY } from "./convergence-store";
import { EXAMPLES } from "./agent/examples";
import { mockConvergence } from "./agent/convergence-mock";
import type { ConvergenceInput, TurnResult } from "@/types/convergence";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
function response(store: ReturnType<typeof createSiftStore>): TurnResult {
  const s = store.getState();
  const token = s.beginRequest()!;
  const input: ConvergenceInput = {
    sessionId: s.sessionId,
    requestId: token.id,
    state: null,
    history: [],
    pendingQuestion: null,
    rawBrief: EXAMPLES[0].brief,
    event: { type: "start" },
  };
  const payload = mockConvergence(input);
  return {
    ...payload,
    state: { ...payload.state, revision: 1 },
    baseRevision: 0,
    sessionId: s.sessionId,
    requestId: token.id,
    mode: "mock",
    model: null,
    history: [],
  };
}

describe("convergence session", () => {
  it("atomically commits a valid response and rejects late responses after reset", () => {
    const store = createSiftStore(memoryStorage());
    const result = response(store);
    expect(store.getState().state).toBeNull();
    expect(store.getState().commitTurn(result)).toBe(true);
    expect(store.getState().state?.revision).toBe(1);
    store.getState().reset();
    expect(store.getState().commitTurn(result)).toBe(false);
    expect(store.getState().state).toBeNull();
  });
  it("failures preserve the question, state, and draft; duplicate submits are blocked", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    const before = store.getState();
    if (before.next?.type !== "ask") throw new Error("Expected ask");
    const draft = {
      questionId: before.next.question.id,
      kind: "custom" as const,
      text: "靠版式",
    };
    store.getState().setDraft(draft);
    const token = store.getState().beginRequest()!;
    expect(store.getState().beginRequest()).toBeNull();
    store.getState().failRequest(token.id, "请求超时");
    expect(store.getState().state).toEqual(before.state);
    expect(store.getState().next).toEqual(before.next);
    expect(store.getState().draft).toEqual(draft);
    expect(store.getState().history).toEqual([]);
  });
  it("only an explicit checkpoint confirmation completes a direction", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    store.getState().confirm();
    expect(store.getState().state?.status).toBe("questioning");
    store.getState().enterCheckpoint();
    expect(store.getState().next).toEqual({
      type: "checkpoint",
      reason: "user_requested",
    });
    expect(store.getState().state?.uncertainties).not.toEqual([]);
    store.getState().confirm();
    expect(store.getState().state?.status).toBe("confirmed");
  });
  it("restores state and drafts without restoring loading or errors", async () => {
    const storage = memoryStorage();
    const store = createSiftStore(storage);
    await store.persist.rehydrate();
    store.getState().setRawBrief(EXAMPLES[0].brief);
    store.getState().commitTurn(response(store));
    const s = store.getState();
    if (s.next?.type !== "ask") throw new Error("Expected ask");
    store
      .getState()
      .setDraft({ questionId: s.next.question.id, kind: "uncertain" });
    store.getState().beginRequest();
    const restored = createSiftStore(storage);
    await restored.persist.rehydrate();
    expect(restored.getState().state).toEqual(s.state);
    expect(restored.getState().draft?.kind).toBe("uncertain");
    expect(restored.getState().activeRequest).toBeNull();
    expect(restored.getState().error).toBeNull();
  });
  it("imports only the legacy raw brief and preserves old storage", async () => {
    const storage = memoryStorage();
    const old = JSON.stringify({
      state: { rawBrief: "旧 Brief", routes: [{ title: "旧方案" }] },
      version: 3,
    });
    storage.setItem("sift-agent-v1", old);
    const store = createSiftStore(storage);
    await store.persist.rehydrate();
    expect(store.getState().rawBrief).toBe("旧 Brief");
    expect(store.getState().state).toBeNull();
    expect(store.getState().importedBrief).toBe(true);
    expect(storage.getItem("sift-agent-v1")).toBe(old);
    store.getState().reset();
    const restored = createSiftStore(storage);
    await restored.persist.rehydrate();
    expect(restored.getState().rawBrief).toBe("");
  });
  it("recovers from corrupt new storage", async () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "broken JSON");
    const store = createSiftStore(storage);
    await store.persist.rehydrate();
    expect(store.getState().state).toBeNull();
    expect(store.persist.hasHydrated()).toBe(true);
    expect(store.getState().storageWarning).toBeTruthy();
  });
  it("ignores a pending response after the user enters checkpoint", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    const token = store.getState().beginRequest()!;
    const before = store.getState();
    store.getState().enterCheckpoint();
    const stale = {
      state: { ...before.state!, revision: 2 },
      next: before.next!,
      history: before.history,
      sessionId: before.sessionId,
      requestId: token.id,
      baseRevision: 1,
      mode: "mock" as const,
      model: null,
    };
    expect(store.getState().commitTurn(stale)).toBe(false);
    expect(store.getState().state?.status).toBe("checkpoint");
  });
  it("does not confirm an empty direction or promote an assumption", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    const s = store.getState().state!;
    store.setState({
      state: {
        ...s,
        direction: { intent: null, priorities: [], avoid: [], criteria: [] },
      },
    });
    store.getState().enterCheckpoint();
    store.getState().confirm();
    expect(store.getState().state?.status).toBe("checkpoint");
    store.setState({
      state: {
        ...store.getState().state!,
        direction: {
          ...s.direction,
          intent: {
            text: "待验证的方向",
            basis: "assumption",
            sourceIds: ["brief"],
          },
        },
      },
    });
    store.getState().confirm();
    expect(store.getState().state?.direction.intent?.basis).toBe("assumption");
  });
});
