import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSiftStore } from "./convergence-store";
import {
  runIndependentBrief,
  runIndependentAskConvergence,
  runIndependentStateRoutes,
} from "./independent-chain-runner";

describe("independent-chain-runner (多链路独立运行与卡片生成引擎)", () => {
  let store: ReturnType<typeof createSiftStore>;

  beforeEach(() => {
    store = createSiftStore();
  });

  it("00 简报卡片独立运行：分水岭提问生成并自动派生 01 视觉抉择节点及连线", async () => {
    const briefId = store.getState().addCustomCard({
      id: "card-brief-test-1",
      type: "brief",
      title: "00 简报解析",
      position: { x: 100, y: 100 },
      data: {
        rawBrief: "高端冷泡茶包装设计",
        briefImages: [],
        status: "idle",
      },
    });

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: "chain-1",
        requestId: "req-1",
        state: { status: "exploring", brief: { goal: "高端冷泡茶" } },
        next: {
          type: "ask",
          questions: [
            {
              id: "q1",
              prompt: "希望突出极致极简特种纸，还是更强调先锋机能冷泡透明容器？",
              options: [
                { id: "opt1", text: "极致极简特种纸" },
                { id: "opt2", text: "先锋机能冷泡容器" },
              ],
            },
          ],
        },
      }),
    });

    const result = await runIndependentBrief({
      briefCardId: briefId,
      rawBrief: "高端冷泡茶包装设计",
      store: store as any,
      fetcher: mockFetcher as any,
    });

    expect(result.next.type).toBe("ask");

    const cards = store.getState().customCards;
    const askCard = cards.find((c) => c.type === "ask");
    expect(askCard).toBeDefined();
    expect(askCard?.data?.parentBriefId).toBe(briefId);
    expect(askCard?.position.x).toBe(100 + 470);
    expect(askCard?.position.y).toBe(100);

    const edges = store.getState().customEdges;
    const edge = edges.find((e) => e.source === briefId && e.target === askCard?.id);
    expect(edge).toBeDefined();
  });

  it("00 简报卡片快速启动：直接收敛策略基准并生成 02 策略卡片与 03 风格主题卡片群", async () => {
    const briefId = store.getState().addCustomCard({
      id: "card-brief-test-2",
      type: "brief",
      title: "00 简报解析",
      position: { x: 60, y: 80 },
      data: {
        rawBrief: "便携女性伴侣个护器物",
        status: "idle",
      },
    });

    const mockFetcher = vi.fn((url: string) => {
      if (url === "/api/brief") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            sessionId: "chain-2",
            requestId: "req-2",
            state: {
              status: "confirmed",
              brief: { goal: "便携女性伴侣个护器物" },
              direction: {
                intent: { text: "圆润亲和与微触感" },
                priorities: [{ text: "便于单手开启" }],
                avoid: [],
                criteria: [],
              },
            },
            next: null,
          }),
        });
      }
      if (url === "/api/routes") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            routes: [
              {
                id: "r1",
                title: "【亲和微弧·触感伴侣】",
                themeName: "亲和微弧·触感伴侣",
                steps: [],
              },
              {
                id: "r2",
                title: "【精密随行·极致便携】",
                themeName: "精密随行·极致便携",
                steps: [],
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error("unknown route"));
    });

    await runIndependentBrief({
      briefCardId: briefId,
      rawBrief: "便携女性伴侣个护器物",
      fastStart: true,
      store: store as any,
      fetcher: mockFetcher as any,
    });

    const cards = store.getState().customCards;
    const stateCard = cards.find((c) => c.type === "state");
    expect(stateCard).toBeDefined();
    expect(stateCard?.position.x).toBe(60 + 470);

    const routeCards = cards.filter((c) => c.type === "route");
    expect(routeCards.length).toBe(2);
    expect(routeCards[0].position.x).toBe(60 + 470 * 2);

    const edges = store.getState().customEdges;
    // Edge from brief to state
    expect(edges.some((e) => e.source === briefId && e.target === stateCard?.id)).toBe(true);
    // Edges from state to routes
    expect(edges.some((e) => e.source === stateCard?.id && e.target === routeCards[0].id)).toBe(true);
    expect(edges.some((e) => e.source === stateCard?.id && e.target === routeCards[1].id)).toBe(true);
  });
});
