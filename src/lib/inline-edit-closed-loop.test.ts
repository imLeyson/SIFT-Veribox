import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import { mockConvergence } from "./agent/convergence-mock";
import { EXAMPLES } from "./agent/examples";
import type { ConvergenceInput, TurnResult } from "@/types/convergence";
import type { Route, PlatformPlan } from "@/types/routes";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
}

describe("Inline Card Editing & Downstream Generation Closed Loop", () => {
  it("Loop A: updateRawBrief updates brief and records confirmed decision", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().setRawBrief("原始需求：冷泡茶包装");
    expect(store.getState().rawBrief).toBe("原始需求：冷泡茶包装");

    // Double-click edit
    store.getState().updateRawBrief("修改后需求：冷泡茶高端特种纸微触感包装，避免塑料");
    expect(store.getState().rawBrief).toBe("修改后需求：冷泡茶高端特种纸微触感包装，避免塑料");

    const ctx = store.getState().getDecisionContext();
    expect(ctx.confirmed.some((d) => d.content.includes("冷泡茶高端特种纸微触感"))).toBe(true);
  });

  it("Loop B: StateNode edits update state direction, increment revision, and feed into route generation", () => {
    const store = createSiftStore(memoryStorage());
    const token = store.getState().beginRequest()!;
    const input: ConvergenceInput = {
      sessionId: store.getState().sessionId,
      requestId: token.id,
      state: null,
      history: [],
      pendingQuestions: null,
      rawBrief: EXAMPLES[0].brief,
      event: { type: "start" },
    };
    const payload = mockConvergence(input);
    const turnResult: TurnResult = {
      ...payload,
      state: { ...payload.state, revision: 1 },
      baseRevision: 0,
      sessionId: store.getState().sessionId,
      requestId: token.id,
      mode: "mock",
      model: null,
      history: [],
    };
    store.getState().commitTurn(turnResult);

    const initialRev = store.getState().state!.revision;

    // 1. Edit Intent
    store.getState().updateStateIntent("极简纸构 · 无墨深压凹");
    expect(store.getState().state!.direction.intent?.text).toBe("极简纸构 · 无墨深压凹");
    expect(store.getState().state!.revision).toBe(initialRev + 1);

    // 2. Edit Priority
    store.getState().updateStatePriority(0, "必须使用原浆特种纸微肌理");
    expect(store.getState().state!.direction.priorities[0].text).toBe("必须使用原浆特种纸微肌理");
    expect(store.getState().state!.revision).toBe(initialRev + 2);

    // 3. Edit Avoid
    store.getState().updateStateAvoid(0, "严禁大面积艳俗纯金");
    expect(store.getState().state!.direction.avoid[0].text).toBe("严禁大面积艳俗纯金");
    expect(store.getState().state!.revision).toBe(initialRev + 3);

    // 4. Edit Visual Keyword
    store.getState().updateVisualKeyword(0, "特种原浆纸");
    expect(store.getState().state!.visualKeywords?.[0]).toBe("特种原浆纸");
    expect(store.getState().state!.revision).toBe(initialRev + 4);

    // 5. Check decisions registered
    const ctx = store.getState().getDecisionContext();
    expect(ctx.confirmed.some((d) => d.content === "极简纸构 · 无墨深压凹")).toBe(true);
    expect(ctx.confirmed.some((d) => d.content === "必须使用原浆特种纸微肌理")).toBe(true);
    expect(ctx.confirmed.some((d) => d.content === "严禁大面积艳俗纯金")).toBe(true);
    expect(ctx.confirmed.some((d) => d.content === "特种原浆纸")).toBe(true);
  });

  it("Loop C: RouteNode edits update route themeName and visualSnapshot for platform plan", () => {
    const store = createSiftStore(memoryStorage());
    const mockRoute: Route = {
      id: "route_1",
      title: "【原生纸构】素白意象",
      themeName: "素白意象 · 原生纸构",
      visualSnapshot: "素白纸张与细线排版，呈现冷冽日常感",
      startingPoint: "特种棉纸微肌理",
      coreProblem: "放弃复杂装潢",
      purpose: "以纸张本真构建质感",
      pros: "克制耐看",
      cons: "留白过大需把握层次",
      recommendedReason: "最契合日常冷泡茶",
      steps: [
        {
          id: "step_1",
          title: "纸张触感观察",
          question: "围绕「原浆纸微肌理」找图",
          purpose: "观察侧光下纸张的微絮质感",
        },
      ],
    };

    store.getState().setRoutes([mockRoute], "route_1");
    store.getState().selectRoute("route_1");

    // Double-click edit themeName and visualSnapshot
    store.getState().updateRoute("route_1", {
      themeName: "日式枯山水 · 素白纸构",
      visualSnapshot: "微颗粒特种纸深压凹，搭配日式细线网格，极度留白",
    });

    const updatedRoute = store.getState().routes.find((r) => r.id === "route_1")!;
    expect(updatedRoute.themeName).toBe("日式枯山水 · 素白纸构");
    expect(updatedRoute.visualSnapshot).toBe("微颗粒特种纸深压凹，搭配日式细线网格，极度留白");

    // Check decisions
    const ctx = store.getState().getDecisionContext();
    expect(ctx.confirmed.some((d) => d.content.includes("日式枯山水"))).toBe(true);
  });

  it("Loop D: StepNode edits update step question and purpose for search generation", () => {
    const store = createSiftStore(memoryStorage());
    const mockRoute: Route = {
      id: "route_1",
      title: "【原生纸构】",
      themeName: "原生纸构",
      visualSnapshot: "素白纸张",
      startingPoint: "棉纸",
      coreProblem: "放弃装饰",
      purpose: "以质感呈现",
      pros: "耐看",
      cons: "注意留白",
      recommendedReason: null,
      steps: [
        {
          id: "step_1",
          title: "纸张观察",
          question: "围绕「材质」找图",
          purpose: "观察光影",
        },
      ],
    };

    store.getState().setRoutes([mockRoute], "route_1");
    store.getState().selectRoute("route_1");

    // Double-click edit step question & purpose
    store.getState().updateRouteStep("route_1", "step_1", {
      title: "特种纸开箱折痕观察",
      question: "围绕「特种纸开箱阻尼感与卡扣折痕」找图",
      purpose: "观察开启时的结构与阴影层级",
    });

    const updatedStep = store.getState().routes[0].steps[0];
    expect(updatedStep.title).toBe("特种纸开箱折痕观察");
    expect(updatedStep.question).toBe("围绕「特种纸开箱阻尼感与卡扣折痕」找图");
    expect(updatedStep.purpose).toBe("观察开启时的结构与阴影层级");
  });

  it("Loop E: PlatformPlanNode edits update search keywords and register decisions", () => {
    const store = createSiftStore(memoryStorage());
    const mockPlan: PlatformPlan = {
      id: "plan_1",
      routeId: "route_1",
      stepId: "step_1",
      primarySources: [
        {
          id: "behance",
          platform: "Behance",
          roleTag: "包装全案",
          reason: "顶级商业全案",
          searchUrl: "https://www.behance.net/search/projects?search=minimal+tea",
          keywords: [
            {
              keyword: "minimal tea packaging",
              meaning: "极简茶包装",
              language: "en",
              calibratedQuery: "minimal tea packaging",
            },
          ],
        },
      ],
      alternativeSources: [],
    };

    store.getState().setPlatformPlan(mockPlan);

    // Double click edit keyword
    store.getState().updatePlatformKeyword(
      "step_1",
      "behance",
      0,
      "japanese paper tea box deboss",
    );

    const updatedKw =
      store.getState().platformPlans[0].primarySources[0].keywords[0];
    expect(updatedKw.keyword).toBe("japanese paper tea box deboss");
    expect(updatedKw.calibratedQuery).toBe("japanese paper tea box deboss");

    const ctx = store.getState().getDecisionContext();
    expect(
      ctx.confirmed.some((d) => d.content === "japanese paper tea box deboss"),
    ).toBe(true);
  });
});
