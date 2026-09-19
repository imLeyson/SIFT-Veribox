import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJson } from "./llm";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("model JSON extraction", () => {
  it("accepts fenced JSON with a trailing comma and surrounding prose", () => {
    expect(
      extractJson('结果如下：```json\n{"state":{"status":"questioning",},}\n```'),
    ).toEqual({ state: { status: "questioning" } });
  });
});
it("times out a stalled body after response headers have arrived", async () => {
  vi.resetModules();
  vi.stubEnv("LLM_API_KEY", "test-only");
  vi.stubEnv("LLM_TIMEOUT_MS", "1000");
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => ({
      ok: true,
      text: () =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          ),
        ),
    })),
  );
  const { completeJson } = await import("./llm");
  let error: unknown = null;
  const pending = completeJson("system", "user").catch((e) => {
    error = e;
  });
  await vi.advanceTimersByTimeAsync(1001);
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toMatch(/超时/);
  await pending;
});
