import { describe, expect, it, vi } from "vitest";
import { runPlatformPlanGeneration } from "./platform-plan";
import { normalizeLivePlatformPayload } from "./platform-live";
import { getMockRoutes } from "./routes-mock";
import { EXAMPLES } from "./examples";
import type { DesignState } from "@/types/convergence";

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
  uncertainties: [],
};

const mockRoutes = getMockRoutes(EXAMPLES[0].brief, confirmedState).routes;

describe("platform plan agent generation", () => {
  it("generates 3 primary sources with distinct roles and 2 alternative sources for material step", async () => {
    const route = mockRoutes[0];
    const step = route.steps[0];

    const result = await runPlatformPlanGeneration({
      sessionId: "s1",
      requestId: "p_req1",
      state: confirmedState,
      selectedRoute: route,
      currentStep: step,
      completedStepIds: [],
    });

    const plan = result.plan;
    expect(plan.primarySources).toHaveLength(3);
    const roles = new Set(plan.primarySources.map((s) => s.roleTag));
    expect(roles.size).toBe(3);

    expect(plan.alternativeSources.length).toBeGreaterThanOrEqual(2);
    expect(plan.alternativeSources.length).toBeLessThanOrEqual(4);

    for (const source of [...plan.primarySources, ...plan.alternativeSources]) {
      expect(source.keywords.length).toBeGreaterThanOrEqual(2);
      expect(source.keywords.length).toBeLessThanOrEqual(4);
      expect(source.searchUrl).toMatch(/^https:\/\//);
      expect(source.reason).toBeTruthy();
    }
  });

  it("dynamically prioritizes platforms for typography and digital steps", async () => {
    const typoRoute = mockRoutes[1]; // typography
    const typoStep = typoRoute.steps[0];
    const typoRes = await runPlatformPlanGeneration({
      sessionId: "s1",
      requestId: "p_req2",
      state: confirmedState,
      selectedRoute: typoRoute,
      currentStep: typoStep,
      completedStepIds: [],
    });
    // Behance is top priority for typography grid & full project validation
    expect(typoRes.plan.primarySources[0].platform).toBe("Behance");

    const deskRoute = mockRoutes[2]; // desk scene
    const deskStep = deskRoute.steps[0];
    const deskRes = await runPlatformPlanGeneration({
      sessionId: "s1",
      requestId: "p_req3",
      state: confirmedState,
      selectedRoute: deskRoute,
      currentStep: deskStep,
      completedStepIds: [],
    });
    // 小红书 is top priority for real desk consumer scene
    expect(deskRes.plan.primarySources[0].platform).toBe("小红书");
  });

  it("normalizes live LLM output that has empty or duplicate sources", () => {
    const route = mockRoutes[0];
    const step = route.steps[0];
    const raw = {
      primarySources: [
        { platform: "Pinterest", roleTag: "视觉扩散", keywords: [] },
      ],
      alternativeSources: [],
    };
    const normalized = normalizeLivePlatformPayload(raw, {
      sessionId: "s1",
      requestId: "p_req4",
      state: confirmedState,
      selectedRoute: route,
      currentStep: step,
      completedStepIds: [],
    });

    expect(normalized.plan.primarySources).toHaveLength(3);
    const roles = new Set(normalized.plan.primarySources.map((s) => s.roleTag));
    expect(roles.size).toBe(3);
    expect(normalized.plan.alternativeSources.length).toBeGreaterThanOrEqual(2);

    // Verify searchType and advancedQuery are populated
    for (const source of [...normalized.plan.primarySources, ...normalized.plan.alternativeSources]) {
      for (const kw of source.keywords) {
        expect(kw.searchType).toBeTruthy();
        expect(["moodboard", "detail", "consumer", "benchmark"]).toContain(kw.searchType);
      }
    }
    // Pinterest primary source keywords should have anti-mockup advanced query
    const pinSource = normalized.plan.primarySources.find((s) => s.platform === "Pinterest");
    expect(pinSource?.keywords[0]?.advancedQuery).toMatch(/-mockup/);
  });

  it("enriches sources with Jev lensRole, inspirationClues, dimension, and calibratedQuery", async () => {
    const route = mockRoutes[0];
    const step = route.steps[0];

    const result = await runPlatformPlanGeneration({
      sessionId: "s1",
      requestId: "p_req5",
      state: confirmedState,
      selectedRoute: route,
      currentStep: step,
      completedStepIds: [],
    });

    const plan = result.plan;
    for (const src of plan.primarySources) {
      expect(["benchmark", "avant_garde", "proofing"]).toContain(src.lensRole);
      expect(src.inspirationClues).toBeDefined();
      expect(src.inspirationClues?.lookFor).toBeTruthy();
      expect(src.inspirationClues?.avoid).toBeTruthy();

      for (const kw of src.keywords) {
        expect(["form", "craft", "mood", "reality"]).toContain(kw.dimension);
        expect(kw.calibratedQuery).toBeTruthy();
      }
    }
  });

  it("generates sustainable material & product search plan without falling back to tea packaging", async () => {
    const brief = "我想做一个宠物毛发的可持续设计产品，他同时具有情感设计方向，这个产品可以是将宠物毛发回收并加工成一个新的可用材料";
    const sustState: DesignState = {
      ...confirmedState,
      brief: { goal: brief, audience: "养宠人群", deliverable: "可持续材料与情感产品设计" },
    };
    const sustRoutes = getMockRoutes(brief, sustState).routes;
    const sustRoute = sustRoutes[0];
    const sustStep = sustRoute.steps[0];

    const res = await runPlatformPlanGeneration({
      sessionId: "s_sust_plan",
      requestId: "p_req_sust",
      state: sustState,
      selectedRoute: sustRoute,
      currentStep: sustStep,
      completedStepIds: [],
    });

    const plan = res.plan;
    expect(plan.primarySources).toHaveLength(3);
    const platforms = plan.primarySources.map((s) => s.platform);
    expect(platforms).toContain("Behance");
    expect(platforms).toContain("Pinterest");
    expect(platforms).toContain("小红书");

    // Must NOT contain tea packaging keywords!
    const allKeywords = [
      ...plan.primarySources.flatMap((s) => s.keywords.map((k) => k.keyword)),
      ...plan.alternativeSources.flatMap((s) => s.keywords.map((k) => k.keyword)),
    ];
    for (const kw of allKeywords) {
      expect(kw).not.toMatch(/tea|茶罐|茶包装/i);
    }
    // Must contain sustainable / fiber / tactile keywords
    expect(allKeywords.some((k) => /sustainable|recycled|fiber|材料|毛发|再生/i.test(k))).toBe(true);
  });
});

