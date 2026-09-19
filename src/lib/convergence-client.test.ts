import { afterEach, describe, expect, it, vi } from "vitest";
import { createSiftStore } from "./convergence-store";
import { createConvergenceActions } from "./convergence-client";
import { mockConvergence } from "./agent/convergence-mock";
import { EXAMPLES } from "./agent/examples";
import type { ConvergenceInput } from "@/types/convergence";

const memory = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
function serverResponse(body: ConvergenceInput) {
  const result = mockConvergence(body);
  const revision = (body.state?.revision ?? 0) + 1;
  return Response.json({
    ...result,
    state: { ...result.state, revision },
    baseRevision: revision - 1,
    sessionId: body.sessionId,
    requestId: body.requestId,
    history: body.history,
    mode: "mock",
    model: null,
  });
}
afterEach(() => vi.useRealTimers());

describe("convergence requests", () => {
  it("releases loading and retains input when response metadata is wrong", async () => {
    const store = createSiftStore(memory);
    store.getState().setRawBrief(EXAMPLES[0].brief);
    const fetcher = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      return serverResponse({ ...body, sessionId: "another-session" });
    });
    await createConvergenceActions(store, fetcher).start();
    expect(store.getState().activeRequest).toBeNull();
    expect(store.getState().state).toBeNull();
    expect(store.getState().error).toMatch(/不匹配/);
    expect(store.getState().rawBrief).toBe(EXAMPLES[0].brief);
  });

  it("does not submit the same correction twice while it is pending", async () => {
    const store = createSiftStore(memory);
    store.getState().setRawBrief(EXAMPLES[0].brief);
    let finish!: (response: Response) => void;
    let body!: ConvergenceInput;
    const fetcher = vi.fn(async (_url, init) => {
      body = JSON.parse(init.body);
      if (body.event.type === "start") return serverResponse(body);
      return await new Promise<Response>((resolve) => {
        finish = resolve;
      });
    });
    const actions = createConvergenceActions(store, fetcher);
    await actions.start();
    store.getState().setCorrectionDraft("改为通过表面触感体现品质感");
    const pending = actions.correct();
    const token = store.getState().activeRequest;
    void actions.correct();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(store.getState().activeRequest).toEqual(token);
    finish(serverResponse(body));
    await pending;
  });

  it("ignores a response after cancellation even if the transport ignores abort", async () => {
    const store = createSiftStore(memory);
    store.getState().setRawBrief(EXAMPLES[0].brief);
    let finish!: (response: Response) => void;
    let body!: ConvergenceInput;
    const fetcher = vi.fn(async (_url, init) => {
      body = JSON.parse(init.body);
      return await new Promise<Response>((resolve) => {
        finish = resolve;
      });
    });
    const actions = createConvergenceActions(store, fetcher);
    const pending = actions.start();
    actions.cancel();
    finish(serverResponse(body));
    await pending;
    expect(store.getState().state).toBeNull();
    expect(store.getState().error).toBeNull();
  });
  it("keeps the full response body under the client timeout", async () => {
    vi.useFakeTimers();
    const store = createSiftStore(memory);
    store.getState().setRawBrief(EXAMPLES[0].brief);
    const fetcher = vi.fn(
      async (_url, init) =>
        ({
          ok: true,
          text: () =>
            new Promise<string>((_resolve, reject) =>
              init.signal.addEventListener("abort", () =>
                reject(new DOMException("Aborted", "AbortError")),
              ),
            ),
        }) as Response,
    );
    const pending = createConvergenceActions(store, fetcher).start();
    await vi.advanceTimersByTimeAsync(50001);
    await pending;
    expect(store.getState().activeRequest).toBeNull();
    expect(store.getState().error).toMatch(/超时/);
    expect(store.getState().rawBrief).toBe(EXAMPLES[0].brief);
  });
});
