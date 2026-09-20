import { describe, expect, it } from "vitest";
import {
  RouteSchema,
  RoutesInputSchema,
  RoutesResultSchema,
  PlatformPlanSchema,
  PlatformPlanInputSchema,
} from "./routes-schema";
import type { DesignState } from "@/types/convergence";

const confirmedState: DesignState = {
  revision: 3,
  status: "confirmed",
  brief: { goal: "冷泡茶包装", audience: "都市上班族", deliverable: "罐装包装" },
  constraints: [{ text: "只用现成纸盒", basis: "user", sourceIds: ["brief"] }],
  direction: {
    intent: { text: "干净、有仪式感", basis: "user", sourceIds: ["brief"] },
    priorities: [{ text: "通过表面触感体现品质感", basis: "user", sourceIds: ["r1"] }],
    avoid: [],
    criteria: [],
  },
  currentHypothesis: "以触感建立仪式感",
  validationAction: null,
  uncertainties: [{
    id: "hierarchy",
    topic: "包装正面信息主次",
    impact: "material",
    decisionAffected: "茶品还是品牌优先",
    status: "open",
  }],
};

const sampleSteps = [
  { id: "s1", title: "解构触感材质", question: "哪些材质适合冷泡？", purpose: "确定触觉体验" },
  { id: "s2", title: "构建信息层级", question: "品牌还是茶品优先？", purpose: "确定视觉动线" },
  { id: "s3", title: "推导开启仪式", question: "开启方式如何体现仪式感？", purpose: "完成结构验证" },
];

const sampleRoute = (id: string, startingPoint: string, title = "反常规材质解构法") => ({
  id,
  title,
  startingPoint,
  coreProblem: "如何在低成本现成盒上实现高级触感？",
  purpose: "探索通过纸张肌理与特种工艺表达品质感",
  pros: "成本可控且触觉记忆深刻",
  cons: "对印刷打样公差要求高",
  recommendedReason: "针对目前尚未确定的信息主次问题，该路线先从材质切入可减少主次纠结",
  steps: sampleSteps,
});

describe("routes contract schema", () => {
  it("validates a standard route with 3 steps and method title", () => {
    const route = sampleRoute("r1", "特种纸肌理");
    expect(RouteSchema.safeParse(route).success).toBe(true);
  });

  it("rejects generic style names as route title", () => {
    const route = sampleRoute("r1", "特种纸肌理", "自然");
    const parsed = RouteSchema.safeParse(route);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/空泛的风格词/);
  });

  it("validates route with optional themeName and visualSnapshot", () => {
    const route = {
      ...sampleRoute("r1", "特种纸肌理"),
      themeName: "素纸微白 · 原生触觉",
      visualSnapshot: "大面积纯白原浆棉纸留白，正面仅单色侧光深压凹，无多余插画装饰。",
    };
    const parsed = RouteSchema.safeParse(route);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.themeName).toBe("素纸微白 · 原生触觉");
      expect(parsed.data.visualSnapshot).toContain("深压凹");
    }
  });

  it("rejects routes with fewer than 3 or more than 5 steps", () => {
    const tooFew = { ...sampleRoute("r1", "起点1"), steps: sampleSteps.slice(0, 2) };
    expect(RouteSchema.safeParse(tooFew).success).toBe(false);

    const tooMany = {
      ...sampleRoute("r1", "起点1"),
      steps: [
        ...sampleSteps,
        { id: "s4", title: "步骤4", question: "问4", purpose: "目4" },
        { id: "s5", title: "步骤5", question: "问5", purpose: "目5" },
        { id: "s6", title: "步骤6", question: "问6", purpose: "目6" },
      ],
    };
    expect(RouteSchema.safeParse(tooMany).success).toBe(false);
  });

  it("rejects duplicate step IDs or titles in a route", () => {
    const dupId = {
      ...sampleRoute("r1", "起点1"),
      steps: [
        sampleSteps[0],
        { ...sampleSteps[1], id: sampleSteps[0].id },
        sampleSteps[2],
      ],
    };
    expect(RouteSchema.safeParse(dupId).success).toBe(false);

    const dupTitle = {
      ...sampleRoute("r1", "起点1"),
      steps: [
        sampleSteps[0],
        { ...sampleSteps[1], title: sampleSteps[0].title },
        sampleSteps[2],
      ],
    };
    expect(RouteSchema.safeParse(dupTitle).success).toBe(false);
  });

  it("validates RoutesResult requires exactly 3 routes with distinct starting points", () => {
    const routes = [
      sampleRoute("r1", "材质工艺与开启仪式"),
      sampleRoute("r2", "信息网格与排版秩序"),
      sampleRoute("r3", "真实工位消费场景切片"),
    ];
    const valid = RoutesResultSchema.safeParse({
      sessionId: "s1",
      requestId: "req1",
      routes,
      recommendedRouteId: "r1",
      mode: "mock",
      model: null,
    });
    expect(valid.success).toBe(true);

    // Rejects duplicate starting point
    const dupStarting = RoutesResultSchema.safeParse({
      sessionId: "s1",
      requestId: "req1",
      routes: [routes[0], { ...routes[1], startingPoint: routes[0].startingPoint }, routes[2]],
      recommendedRouteId: "r1",
      mode: "mock",
      model: null,
    });
    expect(dupStarting.success).toBe(false);
    expect(dupStarting.error?.issues[0].message).toMatch(/探索起点必须不同/);

    // Rejects if count is not 3
    const twoRoutes = RoutesResultSchema.safeParse({
      sessionId: "s1",
      requestId: "req1",
      routes: routes.slice(0, 2),
      recommendedRouteId: null,
      mode: "mock",
      model: null,
    });
    expect(twoRoutes.success).toBe(false);
  });

  it("rejects unconfirmed state in RoutesInputSchema", () => {
    const unconfirmed = {
      ...confirmedState,
      status: "questioning" as const,
    };
    const parsed = RoutesInputSchema.safeParse({
      sessionId: "s1",
      requestId: "req1",
      baseRevision: 1,
      rawBrief: "测试Brief",
      state: unconfirmed,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/方向确认后/);
  });
});

describe("platform plan contract schema", () => {
  const sampleSource = (id: string, platform: string, roleTag: string) => ({
    id,
    platform,
    roleTag,
    reason: "用于视觉扩散与情绪板搭建",
    keywords: [
      { keyword: "minimal tea packaging", meaning: "极简茶包装案例", language: "en" as const },
      { keyword: "冷泡茶 纸盒触感", meaning: "搜寻中文纸盒实际案例", language: "zh" as const },
    ],
    searchUrl: "https://www.pinterest.com/search/pins/?q=test",
  });

  it("validates platform plan with 3 primary sources of distinct roles and 2 alternative sources", () => {
    const plan = {
      id: "plan-1",
      routeId: "r1",
      stepId: "s1",
      primarySources: [
        sampleSource("src1", "Pinterest", "视觉扩散"),
        sampleSource("src2", "Behance", "完整项目验证"),
        sampleSource("src3", "小红书", "中文语境与消费场景"),
      ],
      alternativeSources: [
        sampleSource("src4", "Instagram", "场景和趋势参考"),
        sampleSource("src5", "Google", "品牌验证与跨品类检索"),
      ],
    };
    expect(PlatformPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("rejects primary sources with duplicated role tags", () => {
    const plan = {
      id: "plan-1",
      routeId: "r1",
      stepId: "s1",
      primarySources: [
        sampleSource("src1", "Pinterest", "视觉扩散"),
        sampleSource("src2", "Instagram", "视觉扩散"), // duplicate role
        sampleSource("src3", "小红书", "中文语境与消费场景"),
      ],
      alternativeSources: [
        sampleSource("src4", "Behance", "完整项目验证"),
        sampleSource("src5", "Google", "品牌验证与跨品类检索"),
      ],
    };
    const parsed = PlatformPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/角色必须互不相同/);
  });

  it("rejects platform plan input when state is not confirmed", () => {
    const route = sampleRoute("r1", "起点1");
    const parsed = PlatformPlanInputSchema.safeParse({
      sessionId: "s1",
      requestId: "req1",
      state: { ...confirmedState, status: "questioning" },
      selectedRoute: route,
      currentStep: route.steps[0],
      completedStepIds: [],
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toMatch(/方向确认后/);
  });
});
