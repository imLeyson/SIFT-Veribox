import { describe, it, expect } from "vitest";
import {
  blendThemes,
  evolveTheme,
  deriveThemeFromStrategy,
  deriveStepsFromTheme,
  derivePlanFromStep,
  deriveNoteFromNode,
  synthesizeCardFromInputs,
} from "./card-synthesis";
import type { Route, RouteStep } from "@/types/routes";

const mockThemeA: Route = {
  id: "route-a",
  title: "【原生木质纤维】温暖触感",
  themeName: "原生木质纤维",
  focusDimension: "原生木纹与纤维微触感",
  startingPoint: "以原生环保木质纤维为切入点",
  coreProblem: "如何平衡木质纤维的亲和力与生产工艺精度？",
  purpose: "打造温润亲和的视觉与触觉双重体验",
  pros: "亲和力极佳，具有强烈的自然原生物质感",
  cons: "模具公差要求苛刻",
  recommendedReason: "主打天然亲和",
  alignmentScore: 94,
  steps: [
    {
      id: "a-s1",
      title: "核心母题与造型骨架试验",
      question: "造型如何传达亲和力？",
      purpose: "提炼圆润自然形体",
    },
    {
      id: "a-s2",
      title: "物料工艺与表面触感试验",
      question: "选用何种木质微孔处理？",
      purpose: "深化微触感",
    },
    {
      id: "a-s3",
      title: "场景交互与整体系统试验",
      question: "在生活桌面中如何融入？",
      purpose: "验证全案延展",
    },
  ],
};

const mockThemeB: Route = {
  id: "route-b",
  title: "【现代透明机能】精密结构",
  themeName: "现代透明机能",
  focusDimension: "高透聚合物与精工卡扣",
  startingPoint: "展现内部微型齿轮与精工卡扣美学",
  coreProblem: "如何防止机能结构在视觉上过于冰冷繁杂？",
  purpose: "建立未来先锋且富有理性秩序的美学语言",
  pros: "视觉科技感拉满，结构透明可视",
  cons: "抗指纹与长期耐磨性需严格把控",
  recommendedReason: null,
  alignmentScore: 90,
  steps: [
    {
      id: "b-s1",
      title: "精密透光骨架试验",
      question: "如何控制透光率？",
      purpose: "确立透明机能",
    },
  ],
};

describe("Card Synthesis & Upstream Blending", () => {
  it("blends two themes into a hybrid cross-over theme with merged steps and badge metadata", () => {
    const blended = blendThemes(mockThemeA, mockThemeB);

    expect(blended.title).toContain("跨界融合");
    expect(blended.title).toContain("原生木质纤维");
    expect(blended.title).toContain("现代透明机能");
    expect(blended.themeName).toBe("原生木质纤维与现代透明机能复合变奏");
    expect(blended.focusDimension).toContain("原生木纹与纤维微触感 × 高透聚合物与精工卡扣");
    expect(blended.steps).toHaveLength(3);
    expect(blended.steps[0].title).toContain("双主题母题杂交与造型骨架试验");
    expect(blended.steps[1].title).toContain("复合材质微触感与表面过渡试验");
    expect(blended.steps[2].title).toContain("场景共生与整体系统验证试验");
    expect(blended.alignmentScore).toBeGreaterThanOrEqual(95);
  });

  it("evolves a single theme into form & craft variations", () => {
    const evolved = evolveTheme(mockThemeA);

    expect(evolved.title).toContain("原生木质纤维");
    expect(evolved.title).toContain("变奏");
    expect(evolved.themeName).toContain("变奏");
    expect(evolved.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("derives theme from Strategy Benchmark when upstream is state/direction", () => {
    const mockState = {
      brief: { goal: "新一代智能极简水杯" },
      direction: {
        intent: { text: "克制极简，原生触感与金属边缘收口" },
        priorities: ["保持极高亲和力", "使用环保循环材料"],
        avoid: ["避免花哨渐变塑料"],
      },
    };

    const derived = deriveThemeFromStrategy(mockState);
    expect(derived.themeName).toContain("克制极简");
    expect(derived.title).toContain("新一代智能极简水杯");
    expect(derived.steps).toHaveLength(3);
  });

  it("derives viewpoint steps from theme", () => {
    const steps = deriveStepsFromTheme(mockThemeA);
    expect(steps).toHaveLength(3);
    expect(steps[0].title).toBe("核心母题与造型骨架试验");
  });

  it("derives noise-reduced platform plan from step and theme", () => {
    const plan = derivePlanFromStep(mockThemeA.steps[0], mockThemeA);
    expect(plan.primarySources.length).toBeGreaterThanOrEqual(3);
    const dezeen = plan.primarySources.find((s) => s.platform === "dezeen");
    expect(dezeen).toBeDefined();
    expect(dezeen?.keywords.length).toBeGreaterThan(0);
    expect(dezeen?.keywords[0].calibratedQuery).toBeDefined();
  });

  it("derives structured notes from different upstream node types", () => {
    const routeNote = deriveNoteFromNode(mockThemeA, "route");
    expect(routeNote.title).toContain("原生木质纤维");
    expect(routeNote.content).toContain("【主题探索要点】");
    expect(routeNote.color).toBe("amber");

    const stepNote = deriveNoteFromNode(mockThemeA.steps[0], "step");
    expect(stepNote.title).toContain("视点观察手记");
    expect(stepNote.content).toContain("【当前切入视点】");
    expect(stepNote.color).toBe("rose");
  });

  it("synthesizeCardFromInputs router automatically triggers theme blending when 2 routes are connected", () => {
    const synthesized = synthesizeCardFromInputs(
      "route",
      [
        { id: "route-a", type: "route", data: { route: mockThemeA } },
        { id: "route-b", type: "route", data: { route: mockThemeB } },
      ],
      { routes: [mockThemeA, mockThemeB] },
    );

    expect(synthesized.data?.isBlended).toBe(true);
    expect(synthesized.data?.isEmpty).toBe(false);
    expect(synthesized.data?.route?.title).toContain("跨界融合");
  });

  it("synthesizeCardFromInputs router automatically triggers theme evolution when 1 route is connected", () => {
    const synthesized = synthesizeCardFromInputs(
      "route",
      [{ id: "route-a", type: "route", data: { route: mockThemeA } }],
      { routes: [mockThemeA] },
    );

    expect(synthesized.data?.isEvolved).toBe(true);
    expect(synthesized.data?.isEmpty).toBe(false);
    expect(synthesized.data?.route?.themeName).toContain("变奏");
  });

  it("synthesizeCardFromInputs router handles Step and PlatformPlan card synthesis", () => {
    const stepSynth = synthesizeCardFromInputs(
      "step",
      [{ id: "route-a", type: "route", data: { route: mockThemeA } }],
    );
    expect(stepSynth.data?.route).toBeDefined();
    expect(stepSynth.data?.stepId).toBeDefined();
    expect(stepSynth.data?.isEmpty).toBe(false);

    const planSynth = synthesizeCardFromInputs(
      "platformPlan",
      [{ id: "step-1", type: "step", data: { route: mockThemeA, stepId: mockThemeA.steps[0].id } }],
    );
    expect(planSynth.data?.plan).toBeDefined();
    expect(planSynth.data?.isEmpty).toBe(false);
  });
});
