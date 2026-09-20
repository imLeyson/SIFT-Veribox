import { describe, expect, it, vi } from "vitest";
import { runRoutesGeneration } from "./routes";
import { normalizeLiveRoutesPayload } from "./routes-live";
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
    expect(normalized.routes[0].title).toMatch(/转译与落地法/);
    expect(normalized.routes[0].focusDimension).toBeTruthy();
    expect(normalized.routes[0].feasibility).toBe("high");
    expect(normalized.routes[0].steps.length).toBeGreaterThanOrEqual(3);
    for (const step of normalized.routes[0].steps) {
      expect(step.deliverables && step.deliverables.length > 0).toBe(true);
      expect(step.acceptanceCriteria && step.acceptanceCriteria.length > 0).toBe(true);
    }
  });
});
