import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeJson } from "./llm";
import { runConvergenceTurn } from "./convergence";
import { mockConvergence } from "./convergence-mock";
import { EXAMPLES } from "./examples";
import type { ConvergenceInput } from "@/types/convergence";
vi.mock("./llm", () => ({
  llmConfigured: () => true,
  llmModelName: () => "test-live",
  completeJson: vi.fn(),
}));
const initial = (): ConvergenceInput => ({
  sessionId: "s1",
  requestId: "r1",
  rawBrief: EXAMPLES[0].brief,
  state: null,
  history: [],
  pendingQuestion: null,
  event: { type: "start" },
});
beforeEach(() => {
  vi.mocked(completeJson).mockReset();
});
describe("live contract guards", () => {
  it("never silently falls back when a configured model fails", async () => {
    vi.mocked(completeJson).mockRejectedValue(new Error("模型请求超时"));
    await expect(runConvergenceTurn(initial())).rejects.toThrow("模型请求超时");
  });
  it("rejects a model that confirms on the user's behalf", async () => {
    const payload = mockConvergence(initial());
    payload.state.status = "confirmed";
    payload.next = { type: "checkpoint", reason: "ready" };
    vi.mocked(completeJson).mockResolvedValue(payload);
    await expect(runConvergenceTurn(initial())).rejects.toThrow(/用户确认/);
  });
  it("rejects invented evidence sources", async () => {
    const payload = mockConvergence(initial());
    payload.state.direction.priorities.push({
      text: "需要大插画",
      basis: "user",
      sourceIds: ["nonexistent"],
    });
    vi.mocked(completeJson).mockResolvedValue(payload);
    await expect(runConvergenceTurn(initial())).rejects.toThrow(/不存在的回答/);
  });
  it("rejects a question unrelated to an open uncertainty", async () => {
    const payload = mockConvergence(initial());
    if (payload.next.type !== "ask") throw new Error("ask");
    payload.next.question.uncertaintyId = "unrelated";
    vi.mocked(completeJson).mockResolvedValue(payload);
    await expect(runConvergenceTurn(initial())).rejects.toThrow(/未决判断/);
  });
  it("rejects a dropped constraint on an ordinary answer", async () => {
    const input = initial();
    vi.mocked(completeJson).mockResolvedValue(mockConvergence(input));
    const first = await runConvergenceTurn(input);
    if (first.next.type !== "ask") throw new Error("ask");
    const next: ConvergenceInput = {
      ...input,
      requestId: "r2",
      state: first.state,
      history: first.history,
      pendingQuestion: first.next.question,
      event: {
        type: "answer",
        answer: {
          questionId: first.next.question.id,
          kind: "option",
          optionId: "layout",
        },
      },
    };
    const payload = mockConvergence(next);
    payload.state.constraints = [];
    vi.mocked(completeJson).mockResolvedValue(payload);
    await expect(runConvergenceTurn(next)).rejects.toThrow(/丢失了已有约束/);
  });
});
