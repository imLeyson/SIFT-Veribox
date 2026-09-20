import { describe, expect, it, vi } from "vitest";
import { POST as handleRoutes } from "./route";
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

const req = (body: unknown) =>
  new Request("http://localhost/api/routes", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/routes endpoint", () => {
  it("rejects invalid JSON with 400", async () => {
    const res = await handleRoutes(req("{bad json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/有效 JSON/);
  });

  it("rejects unconfirmed state with 400", async () => {
    const unconfirmed = { ...confirmedState, status: "questioning" };
    const res = await handleRoutes(
      req({
        sessionId: "s1",
        requestId: "r1",
        baseRevision: 2,
        rawBrief: EXAMPLES[0].brief,
        state: unconfirmed,
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/方向确认后/);
  });

  it("generates 3 routes with 200", async () => {
    const res = await handleRoutes(
      req({
        sessionId: "s1",
        requestId: "r1",
        baseRevision: 3,
        rawBrief: EXAMPLES[0].brief,
        state: confirmedState,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.routes).toHaveLength(3);
    expect(json.mode).toBe("mock");
  });
});
