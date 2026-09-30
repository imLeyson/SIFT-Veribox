import { describe, expect, it } from "vitest";
import { POST as handleGlobalChat } from "./route";

const req = (body: unknown) =>
  new Request("http://localhost/api/global-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/global-chat endpoint", () => {
  it("rejects invalid JSON with 400", async () => {
    const res = await handleGlobalChat(req("{invalid-json"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("请求格式错误");
  });

  it("rejects empty messages with 400", async () => {
    const res = await handleGlobalChat(
      req({
        context: { goal: "测试项目" },
        messages: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("generates contextual strategy summary response", async () => {
    const res = await handleGlobalChat(
      req({
        context: {
          goal: "高端便携手冲咖啡器具设计",
          currentHypothesis: "通过克制的几何微倒角与骨瓷材质触感，传达高级静谧感",
          priorities: ["45°立体侧光", "哑光微肌理", "去塑料感"],
          avoid: ["浮夸过度装饰", "廉价样机渲染感"],
          routes: [
            {
              title: "主题01",
              themeName: "纯粹秩序",
              visualSnapshot: "漫反射灰度背景，纯白与金属微倒角转折",
              pros: "现代、纯净、视觉辨识度极高",
              cons: "注意功能工效学",
              isSelected: true,
            },
          ],
        },
        messages: [{ role: "user", content: "请帮我总结当前项目的视觉策略与核心突破点" }],
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBeDefined();
    expect(typeof data.reply).toBe("string");
    expect(data.reply).toContain("高端便携手冲咖啡器具设计");
    expect(data.reply).toContain("纯粹秩序");
  });

  it("generates theme comparison response", async () => {
    const res = await handleGlobalChat(
      req({
        context: {
          goal: "高端智能台灯",
          routes: [
            {
              title: "主题01",
              themeName: "极简几何",
              pros: "利落纯粹",
              cons: "偏冷峻",
            },
            {
              title: "主题02",
              themeName: "温暖人本",
              pros: "亲和温润",
              cons: "辨识度稍弱",
            },
          ],
        },
        messages: [{ role: "user", content: "对比评估这几个主题路线的差异" }],
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toContain("极简几何");
    expect(data.reply).toContain("温暖人本");
  });

  it("defaults old requests to co-create and returns the shared result contract", async () => {
    const res = await handleGlobalChat(req({
      context: { goal: "便携咖啡器具" },
      messages: [{ role: "user", content: "继续探索" }],
    }));
    const data = await res.json();
    expect(data.mode).toBe("co_create");
    expect(data.title).toBeTruthy();
    expect(data.claims).toEqual(expect.any(Array));
    expect(data.suggestedArtifacts).toEqual(expect.any(Array));
  });

  it("rejects unsupported task modes", async () => {
    const res = await handleGlobalChat(req({
      mode: "approve",
      context: {},
      messages: [{ role: "user", content: "比较" }],
    }));
    expect(res.status).toBe(400);
  });

  it("keeps judge results comparative and preserves supplied source ids", async () => {
    const res = await handleGlobalChat(req({
      mode: "judge",
      sourceCardIds: ["route-a", "route-b"],
      context: { routes: [{ title: "方向甲", pros: "轻" }, { title: "方向乙", cons: "成本" }] },
      messages: [{ role: "user", content: "比较方向" }],
    }));
    const data = await res.json();
    expect(data.mode).toBe("judge");
    expect(data.reply).toContain("不替你选择");
    expect(data.reply).not.toContain("当前主推");
    expect(data.claims[0].sourceCardIds).toEqual(["route-a", "route-b"]);
    expect(data).not.toHaveProperty("selectedRouteId");
  });

  it("returns distinguishable synthesize and co-create fallbacks", async () => {
    const base = { context: { goal: "便携咖啡器具", notes: ["保留纸感", "减少塑料感"] }, messages: [{ role: "user" as const, content: "继续" }] };
    const coCreate = await (await handleGlobalChat(req(base))).json();
    const synthesize = await (await handleGlobalChat(req({ ...base, mode: "synthesize" }))).json();
    expect(coCreate.mode).toBe("co_create");
    expect(coCreate.reply).toContain("多个设计假设");
    expect(synthesize.mode).toBe("synthesize");
    expect(synthesize.reply).toContain("保留纸感");
    expect(synthesize.reply).not.toBe(coCreate.reply);
  });
});
