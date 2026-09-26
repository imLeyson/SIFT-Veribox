import { describe, expect, it, vi } from "vitest";
import { POST as handleCardChat } from "./route";

const req = (body: unknown) =>
  new Request("http://localhost/api/card-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/card-chat endpoint", () => {
  it("rejects invalid JSON with 400", async () => {
    const res = await handleCardChat(req("{invalid-json"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("请求格式错误");
  });

  it("rejects invalid cardType with 400", async () => {
    const res = await handleCardChat(
      req({
        cardType: "invalidType",
        messages: [{ role: "user", content: "hello" }],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("generates contextual response and suggestedAction for imageGen", async () => {
    const res = await handleCardChat(
      req({
        cardType: "imageGen",
        cardTitle: "画面生成",
        cardData: { prompt: "极简白瓷杯" },
        upstreamContext: { themeName: "重构秩序" },
        messages: [{ role: "user", content: "增强哑光骨瓷阻尼触感和柔和漫反射" }],
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBeDefined();
    expect(typeof data.reply).toBe("string");
    expect(data.suggestedAction).toBeDefined();
    expect(data.suggestedAction.type).toBe("update_prompt");
    expect(data.suggestedAction.patch.prompt).toContain("骨瓷");
  });

  it("generates contextual response for platformPlan", async () => {
    const res = await handleCardChat(
      req({
        cardType: "platformPlan",
        cardTitle: "灵感检索",
        cardData: {},
        upstreamContext: { themeName: "重构秩序" },
        messages: [{ role: "user", content: "补充专业合模分型线与真实工业 CMF 去噪检索词" }],
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBeDefined();
    expect(data.suggestedAction).toBeDefined();
    expect(data.suggestedAction.type).toBe("update_keywords");
  });
});
