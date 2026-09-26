import { describe, expect, it, vi } from "vitest";
import { POST as handleImageGen } from "./route";

const req = (body: unknown) =>
  new Request("http://localhost/api/image-gen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/image-gen endpoint", () => {
  it("rejects invalid JSON with 400", async () => {
    const res = await handleImageGen(req("{invalid-json"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("请求格式错误");
  });

  it("rejects empty prompt with 400", async () => {
    const res = await handleImageGen(req({ prompt: "" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("提示词不能为空");
  });

  it("handles image generation success", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        created: 1234567,
        data: [{ url: "https://example.com/test-image.png", revised_prompt: "enhanced prompt" }],
      }),
    } as any);

    try {
      const res = await handleImageGen(
        req({
          prompt: "极简纯白咖啡杯，大理石台面",
          aspectRatio: "3:4",
          stylePreset: "realistic",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toBe("https://example.com/test-image.png");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("returns 502 when upstream API fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: { message: "Model overloaded" } }),
    } as any);

    try {
      const res = await handleImageGen(
        req({
          prompt: "极简纯白咖啡杯",
          aspectRatio: "1:1",
        })
      );
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.error).toContain("Model overloaded");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
