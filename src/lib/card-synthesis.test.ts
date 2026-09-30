import { describe, it, expect } from "vitest";
import {
  blendThemes,
  evolveTheme,
  deriveThemeFromStrategy,
  deriveStepsFromTheme,
  derivePlanFromTheme,
  derivePlanFromStep,
  deriveNoteFromNode,
  synthesizeCardFromInputs,
  extractThemeDimensionQueries,
  generateMockConceptSvg,
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

    expect(blended.title).not.toContain("跨界融合");
    expect(blended.title).not.toContain("×");
    expect(blended.themeName).toMatch(/^《[^》]+》$/);
    expect(blended.steps).toHaveLength(3);
    expect(blended.steps[0].title).not.toContain("母题杂交");
    expect(blended.steps[1].title).not.toContain("工艺衔接");
    expect(blended.steps[2].title).not.toContain("感官验证");
    expect(blended.alignmentScore).toBeGreaterThanOrEqual(95);
    expect(blended.sensoryMetaphor).toBeTruthy();
    expect(blended.visualSnapshot).toBeTruthy();
  });

  it("changes the creative naming and proposition when the same inputs are regenerated", () => {
    const first = blendThemes(mockThemeA, mockThemeB);
    const second = blendThemes(mockThemeA, mockThemeB);

    expect(first.themeName).not.toMatch(/[A-Z]{3,}/);
    expect(second.themeName).not.toMatch(/[A-Z]{3,}/);
    expect(first.title).not.toBe(second.title);
    expect(first.steps.map((step) => step.title).join("|")).not.toBe(
      second.steps.map((step) => step.title).join("|"),
    );
  });

  it("authentically blends 《掌心凹谷》 PALM VALLEY and 《卵石序列》 PEBBLE SEQUENCE into a single unified theme", () => {
    const palmValley: Route = {
      id: "route-palm",
      themeName: "《掌心凹谷》 PALM VALLEY",
      title: "哑光亲肤弹性体包覆 × 整块雕塑弧面掌心凹槽",
      focusDimension: "整块雕塑弧面掌心凹槽",
      startingPoint: "以整块雕塑弧面掌心凹槽为切入点",
      coreProblem: "如何平衡曲面与贴合感？",
      purpose: "掌心凹谷造型探索",
      pros: "人机极佳",
      cons: "分型工艺要求高",
      recommendedReason: null,
      alignmentScore: 92,
      steps: [],
    };
    const pebbleSequence: Route = {
      id: "route-pebble",
      themeName: "《卵石序列》 PEBBLE SEQUENCE",
      title: "灰蓝哑光微触感 × 刷头刷颈刷柄三段体量渐变",
      focusDimension: "三段体量渐变",
      startingPoint: "以卵石序列为切入点",
      coreProblem: "如何平衡序列比例？",
      purpose: "卵石序列造型探索",
      pros: "体量轻盈",
      cons: "接缝精度高",
      recommendedReason: null,
      alignmentScore: 90,
      steps: [],
    };

    const blended = blendThemes(palmValley, pebbleSequence);

    // Concept name is a single Chinese creative cue; English studio codes are omitted.
    expect(blended.themeName).toMatch(/^《[^》]+》$/);
    expect(blended.themeName).not.toContain("与《");
    expect(blended.themeName).not.toContain("复合变奏");

    // Title is a natural language design proposition rather than a fixed CMF × Structure formula.
    expect(blended.title).not.toContain("【跨界融合】");
    expect(blended.title).not.toContain("×");
    expect(blended.title).not.toContain("与《");

    // Steps must be 3 coherent verification steps
    expect(blended.steps).toHaveLength(3);
  });

  it("evolves a single theme into form & craft variations", () => {
    const evolved = evolveTheme(mockThemeA);

    expect(evolved.title).toContain("原生木质纤维");
    expect(evolved.title).not.toContain("形态与工艺变奏");
    expect(evolved.themeName).not.toContain("变奏探索");
    expect(evolved.themeName).toContain("·");
    expect(evolved.steps.length).toBeGreaterThanOrEqual(2);
    expect(evolved.sensoryMetaphor).toBeTruthy();
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
    expect(derived.sensoryMetaphor).toBeTruthy();
    expect(derived.visualSnapshot).toBeTruthy();
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

  it("derives noise-reduced platform plan directly from theme (Card 3 to Card 4)", () => {
    const plan = derivePlanFromTheme(mockThemeA);
    expect(plan.primarySources.length).toBeGreaterThanOrEqual(3);
    expect(plan.routeId).toBe(mockThemeA.id);
    const dezeen = plan.primarySources.find((s) => s.platform === "dezeen");
    expect(dezeen).toBeDefined();
    expect(dezeen?.reason).toContain("原生木质纤维");
    const behance = plan.primarySources.find((s) => s.platform === "behance");
    expect(behance).toBeDefined();
    const pinterest = plan.primarySources.find((s) => s.platform === "pinterest");
    expect(pinterest).toBeDefined();

    // Direct synthesis from Card 3 (Route) to Card 4 (PlatformPlan)
    const synthesized = synthesizeCardFromInputs("platformPlan", [
      { id: "route-a", type: "route", data: { route: mockThemeA } },
    ]);
    expect(synthesized.title).toContain("原生木质纤维 · 灵感检索");
    expect(synthesized.data?.plan?.primarySources.length).toBe(3);
  });

  it("derives structured notes from different upstream node types", () => {
    const routeNote = deriveNoteFromNode(mockThemeA, "route");
    expect(routeNote.title).toContain("原生木质纤维");
    expect(routeNote.content).toContain("【主题探索要点】");
    expect(routeNote.color).toBe("amber");

    const stepNote = deriveNoteFromNode(mockThemeA.steps[0], "step");
    expect(stepNote.title).toContain("探索验证手记");
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
    expect(synthesized.data?.route?.title).not.toContain("跨界融合");
  });

  it("synthesizeCardFromInputs router automatically triggers theme evolution when 1 route is connected", () => {
    const synthesized = synthesizeCardFromInputs(
      "route",
      [{ id: "route-a", type: "route", data: { route: mockThemeA } }],
      { routes: [mockThemeA] },
    );

    expect(synthesized.data?.isEvolved).toBe(true);
    expect(synthesized.data?.isEmpty).toBe(false);
    expect(synthesized.data?.route?.themeName).toContain("·");
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

  it("extractThemeDimensionQueries extracts domain-specific bilingual queries", () => {
    const woodQueries = extractThemeDimensionQueries(mockThemeA);
    expect(woodQueries.reality.keyword).toContain("wood fiber");
    expect(woodQueries.reality.meaning).toContain("木质");
    expect(woodQueries.form.keyword).toContain("curved monolithic");
    expect(woodQueries.craft.keyword).toContain("raw timber");

    const functionalQueries = extractThemeDimensionQueries(mockThemeB);
    expect(functionalQueries.reality.keyword).toContain("translucent functional");
    expect(functionalQueries.form.keyword).toContain("skeletal");
  });

  it("keeps narrative rain-parade inspiration tied to the brief instead of generic CMF", () => {
    const parade: Route = {
      ...mockThemeA,
      id: "route-parade",
      themeName: "雨中游行队伍",
      title: "虚构角色在八片平面上绕圈行进",
      focusDimension: "雨滴沿骨架放射排布",
      visualSnapshot: "雨滴按骨架放射排布，虚构角色在平面上连续行进",
    };
    const queries = extractThemeDimensionQueries(parade, {
      rawBrief: "为一支雨中游行队伍寻找连续行进的视觉灵感",
      strategy: "通过雨滴节奏建立队伍的共同动作",
    });
    expect(queries.reality.query).toContain("rain parade procession");
    expect(queries.form.query).toContain("rain drop radial rhythm");
    expect(queries.craft.query).not.toContain("matte surface");
    expect(queries.mood.query).toContain("procession");
  });

  it("synthesizeCardFromInputs router handles Ask and State card derivation", () => {
    const askSynth = synthesizeCardFromInputs("ask", [
      { id: "brief", type: "brief", data: { rawBrief: "极简智能音箱" } },
    ]);
    expect(askSynth.title).toBe("关键视觉抉择");
    expect(askSynth.data?.questions.length).toBeGreaterThan(0);
    expect(askSynth.data?.status).toBe("active");

    const stateSynth = synthesizeCardFromInputs("state", [
      { id: "ask-1", type: "ask", data: { rawBrief: "极简智能音箱", state: { status: "confirmed" } } },
    ]);
    expect(stateSynth.title).toBe("核心策略基准");
    expect(stateSynth.data?.status).toBe("confirmed");
  });

  it("generateMockConceptSvg supports all aspect ratios and prompt-responsive palettes", () => {
    // 9:16 portrait
    const svg916 = generateMockConceptSvg("极简茶壶", "暗黑钛金属哑光磨砂", "9:16", 0);
    const decoded916 = decodeURIComponent(svg916);
    expect(decoded916).toContain("viewBox=\"0 0 450 800\"");
    expect(decoded916).toContain("9:16");
    expect(decoded916).toContain("#18181b");

    // Warm palette
    const svgWarm = generateMockConceptSvg("陶艺茶壶", "暖橙色陶土拼贴", "16:9", 1);
    const decodedWarm = decodeURIComponent(svgWarm);
    expect(decodedWarm).toContain("viewBox=\"0 0 800 450\"");
    expect(decodedWarm).toContain("#ea580c");

    // 1:1 square
    const svgSquare = generateMockConceptSvg("概念耳机", "海洋冰蓝透光", "1:1", 2);
    const decodedSquare = decodeURIComponent(svgSquare);
    expect(decodedSquare).toContain("viewBox=\"0 0 600 600\"");
    expect(decodedSquare).toContain("#2563eb");
  });
});
