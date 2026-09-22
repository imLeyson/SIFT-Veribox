import { describe, expect, it, vi } from "vitest";
import { POST as handleBranchExplore } from "./route";

vi.mock("@/lib/agent/llm", () => ({
  llmConfigured: () => false,
  llmModelName: () => "test",
  completeJson: vi.fn(),
}));

const req = (body: unknown) =>
  new Request("http://localhost/api/branch-explore", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/branch-explore endpoint", () => {
  it("rejects invalid JSON with 400", async () => {
    const res = await handleBranchExplore(req("{bad json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/有效 JSON/);
  });

  it("rejects payload missing branchId with 400", async () => {
    const res = await handleBranchExplore(
      req({
        inheritedConstraints: [],
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("returns generated cards and branch summary for valid payload", async () => {
    const res = await handleBranchExplore(
      req({
        branchId: "branch-test",
        inheritedConstraints: [
          {
            id: "c-1",
            sourceItemId: "it-1",
            type: "text",
            content: "哑光特种棉纸",
          },
        ],
        discardedItems: ["不要高饱和荧光色"],
        userPrompt: "深化极简排版",
        explorationMode: "high_constraint",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.branchSummary).toBeTruthy();
    expect(Array.isArray(json.generatedCards)).toBe(true);
    expect(json.generatedCards.length).toBeGreaterThanOrEqual(1);
    expect(json.generatedCards[0].title).toBeTruthy();
  });
});
