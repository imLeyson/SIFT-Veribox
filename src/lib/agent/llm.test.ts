import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJson } from "./llm";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

function completion(message: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    text: async () =>
      JSON.stringify({
        choices: [{ finish_reason: "stop", message, ...extra }],
      }),
  };
}

async function loadCompleteJson(fetchImpl: unknown) {
  vi.resetModules();
  vi.stubEnv("LLM_API_KEY", "test-only");
  vi.stubEnv("LLM_REASONING_EFFORT", "medium");
  vi.stubGlobal("fetch", fetchImpl);
  return import("./llm");
}

describe("model JSON extraction", () => {
  it("accepts fenced JSON with a trailing comma and surrounding prose", () => {
    expect(
      extractJson('结果如下：```json\n{"state":{"status":"questioning",},}\n```'),
    ).toEqual({ state: { status: "questioning" } });
  });

  it("accepts an already-parsed object from json_object mode", () => {
    expect(extractJson({ state: { status: "questioning" } })).toEqual({
      state: { status: "questioning" },
    });
  });

  it("reads JSON after think tags and fullwidth braces", () => {
    expect(
      extractJson('<think>先分析任务</think>｛"state":｛"status":"checkpoint"｝｝'),
    ).toEqual({ state: { status: "checkpoint" } });
  });
});

describe("completeJson provider boundary", () => {
  it("times out a stalled body after response headers have arrived", async () => {
    vi.stubEnv("LLM_TIMEOUT_MS", "1000");
    vi.useFakeTimers();
    const { completeJson } = await loadCompleteJson(
      vi.fn(async (_url: string, options: { signal: AbortSignal }) => ({
        ok: true,
        text: () =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      })),
    );
    let error: unknown = null;
    const pending = completeJson("system", "user").catch((e) => {
      error = e;
    });
    await vi.advanceTimersByTimeAsync(1001);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/超时/);
    await pending;
  });

  it("disables thinking even when the env default is medium", async () => {
    const fetchImpl = vi.fn(async () =>
      completion({ content: '{"ok":true}' }),
    );
    const { completeJson } = await loadCompleteJson(fetchImpl);
    await completeJson("system", "user");
    const request = fetchImpl.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    const body = JSON.parse(request[1].body);
    expect(body.reasoning_effort).toBe("none");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("reads JSON from reasoning_content when message.content has no object", async () => {
    const { completeJson } = await loadCompleteJson(
      vi.fn(async () =>
        completion({
          content: "好的，下面给出结果。",
          reasoning_content: '{"state":{"status":"questioning"}}',
        }),
      ),
    );
    await expect(completeJson("system", "user")).resolves.toEqual({
      state: { status: "questioning" },
    });
  });

  it("reads JSON from content part arrays", async () => {
    const { completeJson } = await loadCompleteJson(
      vi.fn(async () =>
        completion({
          content: [{ type: "text", text: '{"ok":true}' }],
        }),
      ),
    );
    await expect(completeJson("system", "user")).resolves.toEqual({ ok: true });
  });

  it("retries when the first completion has no JSON", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(completion({ content: "先分析任务，再输出。" }))
      .mockResolvedValueOnce(completion({ content: '{"ok":true}' }));
    const { completeJson } = await loadCompleteJson(fetchImpl);
    await expect(completeJson("system", "user")).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("structures multi-part content with image_url when images are passed", async () => {
    const fetchImpl = vi.fn(async () =>
      completion({ content: '{"ok":true}' }),
    );
    const { completeJson } = await loadCompleteJson(fetchImpl);
    await completeJson("system", "user-prompt", "none", [
      "data:image/jpeg;base64,123",
      "data:image/png;base64,456",
    ]);
    const request = fetchImpl.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    const body = JSON.parse(request[1].body);
    expect(body.messages[1].content).toEqual([
      { type: "text", text: "user-prompt" },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,123" } },
      { type: "image_url", image_url: { url: "data:image/png;base64,456" } },
    ]);
  });
});
