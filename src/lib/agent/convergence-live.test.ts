import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeJson } from "./llm";
import { runConvergenceTurn } from "./convergence";
import { mockConvergence } from "./convergence-mock";
import { liveConvergence, normalizeLivePayload } from "./convergence-live";
import { EXAMPLES } from "./examples";
import type { ConvergenceInput } from "@/types/convergence";
vi.mock("./llm", () => ({ llmConfigured: () => true, llmModelName: () => "test-live", completeJson: vi.fn() }));
const initial = (): ConvergenceInput => ({ sessionId: "s1", requestId: "r1", rawBrief: EXAMPLES[0].brief, state: null, history: [], pendingQuestions: null, event: { type: "start" } });
beforeEach(() => vi.mocked(completeJson).mockReset());

describe("live contract guards", () => {
  it("repairs incomplete uncertainty fields at the model boundary", () => {
    const input = initial();
    const payload = mockConvergence(input);
    payload.state.uncertainties = payload.state.uncertainties.map((item) => ({
      ...item,
      topic: undefined as unknown as string,
      decisionAffected: undefined as unknown as string,
      status: "resolved" as never,
    }));
    const normalized = normalizeLivePayload(payload, input) as typeof payload;
    expect(normalized.state.uncertainties[0].topic).toBeTruthy();
    expect(normalized.state.uncertainties[0].decisionAffected).toBeTruthy();
    expect(["open", "deferred"]).toContain(normalized.state.uncertainties[0].status);
  });

  it("fills missing state layers instead of passing undefined into the contract", () => {
    const input = initial();
    const normalized = normalizeLivePayload(
      { state: { uncertainties: [] }, next: undefined },
      input,
    ) as { state: { revision: number; status: string; direction: object }; next: object };
    expect(normalized.state.revision).toBe(0);
    expect(["questioning", "checkpoint", "confirmed"]).toContain(normalized.state.status);
    expect(normalized.state.direction).toBeTruthy();
    expect(normalized.next).toBeTruthy();
  });

  it("disables hidden reasoning so the structured response is not empty", async () => {
    vi.mocked(completeJson).mockResolvedValue(mockConvergence(initial()));
    await liveConvergence(initial());
    expect(vi.mocked(completeJson).mock.calls[0]?.[2]).toBe("none");
  });

  it("rejects a model that confirms on the user's behalf", async () => { const payload = mockConvergence(initial()); payload.state.status = "confirmed"; payload.next = { type: "checkpoint", reason: "ready" }; vi.mocked(completeJson).mockResolvedValue(payload); await expect(runConvergenceTurn(initial())).rejects.toThrow(/用户确认/); });
  it("rejects a question unrelated to an open uncertainty", async () => { const payload = mockConvergence(initial()); if (payload.next.type !== "ask") throw new Error("ask"); payload.next.questions[0].uncertaintyId = "unrelated"; vi.mocked(completeJson).mockResolvedValue(payload); await expect(runConvergenceTurn(initial())).rejects.toThrow(/未决判断/); });
});
