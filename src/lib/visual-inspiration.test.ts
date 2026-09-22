import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import {
  RoutesInputSchema,
  PlatformPlanInputSchema,
} from "./agent/routes-schema";
import type { DesignState } from "@/types/convergence";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
}

const confirmedState: DesignState = {
  revision: 3,
  status: "confirmed",
  brief: {
    goal: "冷泡茶包装",
    audience: "都市上班族",
    deliverable: "罐装包装",
  },
  constraints: [
    { text: "只用现成纸盒", basis: "user", sourceIds: ["brief"] },
  ],
  direction: {
    intent: { text: "干净、有仪式感", basis: "user", sourceIds: ["brief"] },
    priorities: [
      { text: "通过表面触感体现品质感", basis: "user", sourceIds: ["r1"] },
    ],
    avoid: [],
    criteria: [],
  },
  currentHypothesis: "以触感建立仪式感",
  validationAction: null,
  uncertainties: [
    {
      id: "hierarchy",
      topic: "包装正面信息主次",
      impact: "material",
      decisionAffected: "茶品还是品牌优先",
      status: "open",
    },
  ],
};

describe("Visual Inspiration Units & Closed-Loop Integration", () => {
  it("initializes with empty visualInspirations", () => {
    const store = createSiftStore(memoryStorage());
    expect(store.getState().visualInspirations).toEqual([]);
  });

  it("can add a visual inspiration unit and auto-sync to itemDecisions", () => {
    const store = createSiftStore(memoryStorage());

    const id = store.getState().addVisualInspiration({
      url: "https://example.com/design-sample.jpg",
      title: "冷泡茶极简白色纸质礼盒",
      sourceType: "external_url",
      palette: ["#F5F5F0", "#1A1A1A", "#8C8275"],
      keywords: ["特种棉纸", "无墨压凹", "冷灰"],
      scope: "global",
      status: "uncertain",
    });

    expect(id).toBeDefined();

    // Check store state
    const all = store.getState().visualInspirations;
    expect(all).toHaveLength(1);
    const insp = all[0];
    expect(insp.id).toBe(id);
    expect(insp.url).toBe("https://example.com/design-sample.jpg");
    expect(insp.palette).toEqual(["#F5F5F0", "#1A1A1A", "#8C8275"]);
    expect(insp.keywords).toEqual(["特种棉纸", "无墨压凹", "冷灰"]);
    expect(insp.status).toBe("uncertain");

    // Check decision sync
    const decision = store.getState().itemDecisions[id];
    expect(decision).toBeDefined();
    expect(decision.type).toBe("image");
    expect(decision.content).toBe("https://example.com/design-sample.jpg");
    expect(decision.label).toBe("冷泡茶极简白色纸质礼盒");
    expect(decision.status).toBe("uncertain");
  });

  it("syncs status changes to confirmed and discarded decisions", () => {
    const store = createSiftStore(memoryStorage());

    const id = store.getState().addVisualInspiration({
      url: "data:image/png;base64,sample_texture_mock",
      title: "再生纤维肌理样块",
      sourceType: "upload",
      scope: "global",
    });

    // Mark as confirmed
    store.getState().setVisualInspirationStatus(id, "confirmed");
    expect(store.getState().visualInspirations[0].status).toBe("confirmed");

    let decision = store.getState().itemDecisions[id];
    expect(decision.status).toBe("confirmed");

    let ctx = store.getState().getDecisionContext();
    expect(ctx.confirmed.some((d) => d.id === id)).toBe(true);
    expect(ctx.uncertain.some((d) => d.id === id)).toBe(false);

    // Mark as discarded (negative aesthetic constraint)
    store.getState().setVisualInspirationStatus(id, "discarded");
    expect(store.getState().visualInspirations[0].status).toBe("discarded");

    decision = store.getState().itemDecisions[id];
    expect(decision.status).toBe("discarded");

    ctx = store.getState().getDecisionContext();
    expect(ctx.discarded.some((d) => d.id === id)).toBe(true);
    expect(ctx.confirmed.some((d) => d.id === id)).toBe(false);
  });

  it("can assign inspiration scope to specific route or step", () => {
    const store = createSiftStore(memoryStorage());

    const id = store.getState().addVisualInspiration({
      url: "https://example.com/route-ref.jpg",
      title: "瑞士理性排版档案",
      sourceType: "external_url",
    });

    // Assign to route
    store.getState().assignVisualInspiration(id, "route", "route_2");
    expect(store.getState().visualInspirations[0].scope).toBe("route");
    expect(store.getState().visualInspirations[0].targetId).toBe("route_2");
    expect(store.getState().itemDecisions[id].sourceNode).toBe("03 主题");

    // Assign to step
    store.getState().assignVisualInspiration(id, "step", "step_2_1");
    expect(store.getState().visualInspirations[0].scope).toBe("step");
    expect(store.getState().visualInspirations[0].targetId).toBe("step_2_1");
    expect(store.getState().itemDecisions[id].sourceNode).toBe("04 视点");
  });

  it("can update palette, keywords, notes, and title", () => {
    const store = createSiftStore(memoryStorage());

    const id = store.getState().addVisualInspiration({
      url: "https://example.com/moodboard.jpg",
      title: "初始标题",
      sourceType: "external_url",
    });

    store.getState().updateVisualInspiration(id, {
      title: "更新后标题",
      palette: ["#222222", "#EAEAEA"],
      keywords: ["极简留白", "哑光黑"],
      notes: "可作为领地一和领地二的核心对比参考",
    });

    const updated = store.getState().visualInspirations[0];
    expect(updated.title).toBe("更新后标题");
    expect(updated.palette).toEqual(["#222222", "#EAEAEA"]);
    expect(updated.keywords).toEqual(["极简留白", "哑光黑"]);
    expect(updated.notes).toBe("可作为领地一和领地二的核心对比参考");

    // Check title updated in decision
    const decision = store.getState().itemDecisions[id];
    expect(decision.label).toBe("更新后标题");
  });

  it("removes inspiration and cleans up synced decision", () => {
    const store = createSiftStore(memoryStorage());

    const id = store.getState().addVisualInspiration({
      url: "https://example.com/temp.jpg",
      title: "临时参考",
      sourceType: "clipboard",
    });

    expect(store.getState().visualInspirations).toHaveLength(1);
    expect(store.getState().itemDecisions[id]).toBeDefined();

    store.getState().removeVisualInspiration(id);

    expect(store.getState().visualInspirations).toHaveLength(0);
    expect(store.getState().itemDecisions[id]).toBeUndefined();
  });

  it("syncs addBriefImage to visualInspirations", () => {
    const store = createSiftStore(memoryStorage());

    store.getState().addBriefImage("data:image/png;base64,image_a");
    store.getState().addBriefImage("data:image/png;base64,image_b");

    expect(store.getState().briefImages).toHaveLength(2);
    expect(store.getState().visualInspirations).toHaveLength(2);
    expect(
      store
        .getState()
        .visualInspirations.some((v) => v.url === "data:image/png;base64,image_a"),
    ).toBe(true);
    expect(
      store
        .getState()
        .visualInspirations.some((v) => v.url === "data:image/png;base64,image_b"),
    ).toBe(true);
  });

  it("validates RoutesInputSchema and PlatformPlanInputSchema with images array", () => {
    const routesInput = {
      sessionId: "test-session",
      requestId: "req-1",
      baseRevision: 1,
      rawBrief: "测试包装设计",
      state: confirmedState,
      images: [
        "https://images.unsplash.com/photo-1544816155-12df9643f363",
        "data:image/png;base64,abcdef",
      ],
    };

    const parsedRoutes = RoutesInputSchema.safeParse(routesInput);
    expect(parsedRoutes.success).toBe(true);
    if (parsedRoutes.success) {
      expect(parsedRoutes.data.images).toHaveLength(2);
    }

    const platformInput = {
      sessionId: "test-session",
      requestId: "req-2",
      state: confirmedState,
      selectedRoute: {
        id: "route_1",
        title: "【特种纸与压凹】极简方案",
        themeName: "素纸微白",
        visualSnapshot: "大面积留白与压凹光影",
        startingPoint: "特种棉纸微触感",
        coreProblem: "放弃繁复装饰",
        purpose: "构建耐看触感",
        pros: "纯净高级",
        cons: "需严控纸张白度",
        recommendedReason: "最契合诉求",
        steps: [
          { id: "step_1", title: "步骤一", question: "问题1", purpose: "意图1" },
          { id: "step_2", title: "步骤二", question: "问题2", purpose: "意图2" },
          { id: "step_3", title: "步骤三", question: "问题3", purpose: "意图3" },
        ],
      },
      currentStep: {
        id: "step_1",
        title: "步骤一",
        question: "问题1",
        purpose: "意图1",
      },
      completedStepIds: [],
      images: ["https://example.com/reference.png"],
    };

    const parsedPlatform = PlatformPlanInputSchema.safeParse(platformInput);
    expect(parsedPlatform.success).toBe(true);
    if (parsedPlatform.success) {
      expect(parsedPlatform.data.images).toHaveLength(1);
    }
  });
});
