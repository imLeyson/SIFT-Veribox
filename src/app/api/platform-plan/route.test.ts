import { describe, expect, it, vi } from "vitest";
import { POST as handlePlatformPlan } from "./route";
import { getMockRoutes } from "@/lib/agent/routes-mock";
import { EXAMPLES } from "@/lib/agent/examples";
import type { DesignState } from "@/types/convergence";

vi.mock("@/lib/agent/llm", () => ({
  llmConfigured: () => false,
  llmModelName: () => "test",
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

const route = getMockRoutes(EXAMPLES[0].brief, confirmedState).routes[0];

const req = (body: unknown) =>
  new Request("http://localhost/api/platform-plan", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/platform-plan endpoint", () => {
  it("rejects invalid JSON with 400", async () => {
    const res = await handlePlatformPlan(req("{bad json"));
    expect(res.status).toBe(400);
  });

  it("rejects unconfirmed state with 400", async () => {
    const unconfirmed = { ...confirmedState, status: "questioning" };
    const res = await handlePlatformPlan(
      req({
        sessionId: "s1",
        requestId: "r1",
        state: unconfirmed,
        selectedRoute: route,
        currentStep: route.steps[0],
        completedStepIds: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns platform plan with 200", async () => {
    const res = await handlePlatformPlan(
      req({
        sessionId: "s1",
        requestId: "r1",
        state: confirmedState,
        selectedRoute: route,
        currentStep: route.steps[0],
        completedStepIds: [],
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan.primarySources).toHaveLength(3);
    expect(json.plan.alternativeSources.length).toBeGreaterThanOrEqual(2);
  });
});
