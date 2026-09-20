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
});

