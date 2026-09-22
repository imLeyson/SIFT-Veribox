import { describe, expect, it, vi } from "vitest";
import { runRoutesGeneration } from "./routes";
import { normalizeLiveRoutesPayload } from "./routes-live";
import { EXAMPLES } from "./examples";
import type { DesignState } from "@/types/convergence";
import { cleanStepLabel } from "@/types/routes";

vi.mock("./llm", () => ({
  llmConfigured: () => false,
  llmModelName: () => "test-model",
  completeJson: vi.fn(),
}));

const confirmedState: DesignState = {
  revision: 3,
  status: "confirmed",
  brief: { goal: EXAMPLES[0].brief, audience: "都市上班族", deliverable: "罐装茶包装" },
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

describe("routes agent generation", () => {
  it("generates exactly 3 routes with distinct starting points for tea packaging", async () => {
    const result = await runRoutesGeneration({
      sessionId: "s1",
      requestId: "req1",
      baseRevision: 3,
      rawBrief: EXAMPLES[0].brief,
      state: confirmedState,
    });

    expect(result.routes).toHaveLength(3);
    const startings = new Set(result.routes.map((r) => r.startingPoint));
    expect(startings.size).toBe(3);

    expect(result.recommendedRouteId).toBeTruthy();
    const recommended = result.routes.find((r) => r.id === result.recommendedRouteId);
    expect(recommended?.recommendedReason).toMatch(/未决判断|包装正面信息主次/);

    for (const route of result.routes) {
      expect(route.steps.length).toBeGreaterThanOrEqual(3);
      expect(route.steps.length).toBeLessThanOrEqual(5);
      expect(route.title.length).toBeGreaterThan(4);
      expect(route.pros).toBeTruthy();
      expect(route.cons).toBeTruthy();
    }
  });

  it("generates 3 routes for skincare and SaaS briefs", async () => {
    const skincareState: DesignState = {
      ...confirmedState,
      brief: { goal: "敏感肌修护乳包装与品牌视觉", audience: "年轻女性", deliverable: "护肤视觉" },
    };
    const skinRes = await runRoutesGeneration({
      sessionId: "s1",
      requestId: "req2",
      baseRevision: 3,
      rawBrief: "敏感肌修护乳护肤品牌设计",
      state: skincareState,
    });
    expect(skinRes.routes).toHaveLength(3);

    const saasState: DesignState = {
      ...confirmedState,
      brief: { goal: "协同软件官网与系统界面", audience: "中小团队", deliverable: "SaaS 视觉" },
    };
    const saasRes = await runRoutesGeneration({
      sessionId: "s1",
      requestId: "req3",
      baseRevision: 3,
      rawBrief: "SaaS 官网和产品视觉设计",
      state: saasState,
    });
    expect(saasRes.routes).toHaveLength(3);
  });

  it("rejects unconfirmed design state", async () => {
    const unconfirmed = { ...confirmedState, status: "questioning" as const };
    await expect(
      runRoutesGeneration({
        sessionId: "s1",
        requestId: "req4",
        baseRevision: 2,
        rawBrief: "测试Brief",
        state: unconfirmed,
      }),
    ).rejects.toThrow(/方向确认后/);
  });

  it("normalizes live LLM output with missing step IDs and generic titles", () => {
    const raw = {
      routes: [
        {
          id: "",
          title: "自然",
          startingPoint: "天然材质",
          steps: [
            { id: "", title: "", question: "", purpose: "" },
          ],
        },
      ],
      recommendedRouteId: "route_1",
    };
    const normalized = normalizeLiveRoutesPayload(raw, {
      sessionId: "s1",
      requestId: "req5",
      baseRevision: 1,
      rawBrief: "测试Brief",
      state: confirmedState,
    });

    expect(normalized.routes).toHaveLength(3);
    expect(normalized.routes[0].title).not.toBe("自然");
    expect(normalized.routes[0].title).toMatch(/视觉表现与灵感演绎/);
    expect(normalized.routes[0].focusDimension).toBeTruthy();
    expect(normalized.routes[0].feasibility).toBe("high");
    expect(normalized.routes[0].steps.length).toBeGreaterThanOrEqual(3);
    for (const step of normalized.routes[0].steps) {
      expect(step.deliverables && step.deliverables.length > 0).toBe(true);
      expect(step.acceptanceCriteria && step.acceptanceCriteria.length > 0).toBe(true);
    }
  });

  it("sanitizes leaked variable names and enforces single recommended theme", () => {
    const rawWithLeakedVariables = {
      routes: [
        {
          id: "r1",
          themeName: "素纸微白 · 原生触觉",
          title: "【特种棉纸与深压凹】极端克制纸感",
          visualSnapshot: "大面积纯白原浆棉纸留白，正面仅单色侧光深压凹",
          startingPoint: "特种纸微触感与无墨压凹",
          coreProblem: "放弃多色插画装饰",
          purpose: "以大面积素雅纸感构建耐看品质",
          pros: "大留白视觉真空",
          cons: "考验排版字距精度",
          recommendedReason: "针对 uncertainties 中 quality_source 的未决纠结，通过特种纸解决顾虑",
          steps: [
            { id: "s1", title: "步骤1", question: "问题1", purpose: "目的1" },
            { id: "s2", title: "步骤2", question: "问题2", purpose: "目的2" },
            { id: "s3", title: "步骤3", question: "问题3", purpose: "目的3" },
          ],
        },
        {
          id: "r2",
          title: "【瑞士网格与严谨字阶】档案式清晰信息",
          startingPoint: "双栏网格与微字阶层级",
          coreProblem: "建立极度理性的文字骨架",
          purpose: "呈现专业克制感",
          pros: "一目了然",
          cons: "容易沦为说明书",
          // LLM mistakenly returned a recommendedReason on non-recommended route
          recommendedReason: "针对 uncertainties 里的考量给出备选",
          steps: [
            { id: "s2_1", title: "步骤1", question: "问题1", purpose: "目的1" },
            { id: "s2_2", title: "步骤2", question: "问题2", purpose: "目的2" },
            { id: "s2_3", title: "步骤3", question: "问题3", purpose: "目的3" },
          ],
        },
        {
          id: "r3",
          title: "【极简几何色块与视觉锤】高辨识度符号",
          startingPoint: "几何符号隐喻",
          coreProblem: "打造工位静物感",
          purpose: "高辨识度符号",
          pros: "年轻群体认可度高",
          cons: "容易浮躁",
          recommendedReason: null,
          steps: [
            { id: "s3_1", title: "步骤1", question: "问题1", purpose: "目的1" },
            { id: "s3_2", title: "步骤2", question: "问题2", purpose: "目的2" },
            { id: "s3_3", title: "步骤3", question: "问题3", purpose: "目的3" },
          ],
        },
      ],
      recommendedRouteId: "r1",
    };

    const normalized = normalizeLiveRoutesPayload(rawWithLeakedVariables, {
      sessionId: "s1",
      requestId: "req6",
      baseRevision: 1,
      rawBrief: "测试Brief",
      state: confirmedState,
    });

    // 1. themeName & visualSnapshot are populated
    expect(normalized.routes[0].themeName).toBe("素纸微白 · 原生触觉");
    expect(normalized.routes[0].visualSnapshot).toContain("深压凹");
    // r2 lacked explicit themeName, auto-extracted from title
    expect(normalized.routes[1].themeName).toBeTruthy();
    expect(normalized.routes[1].visualSnapshot).toBeTruthy();

    // 2. Leaked variable names are sanitized cleanly
    expect(normalized.routes[0].recommendedReason).not.toContain("uncertainties");
    expect(normalized.routes[0].recommendedReason).not.toContain("quality_source");
    expect(normalized.routes[0].recommendedReason).toContain("针对前期的核心诉求与待定考量");

    // 3. Strict single recommended theme rule: ONLY r1 has recommendedReason, r2 is wiped to null
    expect(normalized.recommendedRouteId).toBe("r1");
    expect(normalized.routes[0].recommendedReason).toBeTruthy();
    expect(normalized.routes[1].recommendedReason).toBeNull();
    expect(normalized.routes[2].recommendedReason).toBeNull();
  });

  it("generates pet-anchored fallback routes and steps for pet visual briefs", () => {
    const petNormalized = normalizeLiveRoutesPayload(
      { routes: [] },
      {
        sessionId: "s_pet",
        requestId: "req_pet",
        baseRevision: 1,
        rawBrief: "宠物视觉提案",
        state: {
          ...confirmedState,
          brief: { goal: "宠物视觉提案", audience: "年轻养宠群体", deliverable: "品牌视觉全案" },
        },
      },
    );

    expect(petNormalized.routes).toHaveLength(3);
    // Theme names should be pet-adaptive, not hardcoded tea/paper mill
    expect(petNormalized.routes[0].themeName).toBe("温润陪伴 · 治愈微触感");
    expect(petNormalized.routes[1].themeName).toBe("理性守护 · 科学信息网格");
    expect(petNormalized.routes[2].themeName).toBe("几何萌态 · 超级动物符号");

    // Titles & snapshots must refer to warm healing / pet identity
    expect(petNormalized.routes[0].title).toContain("温润治愈质感");
    expect(petNormalized.routes[0].visualSnapshot).toContain("陪伴温度");
    expect(petNormalized.routes[0].visualSnapshot).not.toContain("罐身大面积纯白原浆棉纸");

    // Steps must explore pet visual questions
    expect(petNormalized.routes[0].steps[0].title).toBe("暖调色彩与温润材质触感");
    expect(petNormalized.routes[0].steps[0].question).toContain("陪伴温度");
    expect(petNormalized.routes[0].steps[0].question).not.toContain("纸浆配比");

    // Recommended reason anchors the pet subject
    expect(petNormalized.routes[0].recommendedReason).toContain("宠物视觉提案");
  });

  it("generates sustainable material & product anchored routes and steps for pet hair product brief", () => {
    const brief = "我想做一个宠物毛发的可持续设计产品，他同时具有情感设计方向，这个产品可以是将宠物毛发回收并加工成一个新的可用材料";
    const normalized = normalizeLiveRoutesPayload(
      { routes: [] },
      {
        sessionId: "s_sust",
        requestId: "req_sust",
        baseRevision: 1,
        rawBrief: brief,
        state: {
          ...confirmedState,
          brief: { goal: brief, audience: "养宠人群与环保生活方式群体", deliverable: "可持续材料与情感产品设计" },
        },
      },
    );

    expect(normalized.routes).toHaveLength(3);
    // Theme names should adapt to sustainable material and emotional product, NOT 2D brand identity
    expect(normalized.routes[0].themeName).toBe("原生纤维 · 触感转化");
    expect(normalized.routes[1].themeName).toBe("情感器物 · 陪伴隐喻");
    expect(normalized.routes[2].themeName).toBe("现代极简 · 日常共生");

    // Snapshots must focus on recycled fiber and vessel/object form, not paper mill / 2D logo
    expect(normalized.routes[0].visualSnapshot).toContain("再生纤维");
    expect(normalized.routes[0].visualSnapshot).not.toContain("纯白原浆棉纸");
    expect(normalized.routes[1].visualSnapshot).toContain("有机弧面");
    expect(normalized.routes[2].visualSnapshot).toContain("机能");

    // Steps must explore fiber density, holding curves, and ambient living
    expect(normalized.routes[0].steps[0].title).toBe("原生纤维压合密度与微肌理");
    expect(normalized.routes[0].steps[1].title).toBe("器物造型弧度与握持触感");
    expect(normalized.routes[0].steps[2].title).toBe("现代生活环境与光影融入");
  });

  it("extracts concise 2-4 char visual labels for tabs and capsules", () => {
    expect(cleanStepLabel("白模比例与纸样筛选")).toBe("比例");
    expect(cleanStepLabel("纸样白度与微肌理")).toBe("纸样白度");
    expect(cleanStepLabel("中西文字阶与排版动线")).toBe("中西文字阶");
    expect(cleanStepLabel("侧光浅压凹与光影微雕")).toBe("侧光浅压凹");
    expect(cleanStepLabel("01. 网格骨架与字阶设定")).toBe("网格骨架");
    expect(cleanStepLabel("Step 2: 视距焦点与黑白反差")).toBe("视距焦点");
  });
});
