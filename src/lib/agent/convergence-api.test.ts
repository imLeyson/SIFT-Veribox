import { describe, expect, it, vi } from "vitest";
import { handleTurn } from "./convergence-api";
import { EXAMPLES } from "./examples";
vi.mock("./llm", () => ({
  llmConfigured: () => false,
  llmModelName: () => "test",
  completeJson: vi.fn(),
}));
const request = (body: unknown) =>
  new Request("http://localhost/api/brief", {
    method: "POST",
    body: JSON.stringify(body),
  });
const initial = () => ({
  sessionId: "s1",
  requestId: "r1",
  rawBrief: EXAMPLES[0].brief,
  state: null,
  history: [],
  pendingQuestions: null,
  event: { type: "start" },
});
describe("convergence API", () => {
  it("rejects malformed JSON and invalid requests with 400", async () => {
    expect(
      (
        await handleTurn(
          new Request("http://localhost", { method: "POST", body: "{" }),
          true,
        )
      ).status,
    ).toBe(400);
    expect((await handleTurn(request({}), true)).status).toBe(400);
    expect((await handleTurn(request(initial()), false)).status).toBe(400);
  });
  it("initializes then commits a batch answer with its complete provenance", async () => {
    const first = await (await handleTurn(request(initial()), true)).json();
    const next = {
      ...initial(),
      requestId: "r2",
      state: first.state,
      history: first.history,
      pendingQuestions: first.next.questions,
      event: {
        type: "answer",
        answers: first.next.questions.map((question: { id: string; options: { id: string }[] }) => ({ questionId: question.id, kind: "option" as const, optionId: question.options[0].id })),
      },
    };
    const response = await handleTurn(request(next), false);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.state.direction.priorities[0].sourceIds).toEqual(["r2"]);
    expect(result.history[0].event.answers).toHaveLength(2);
    expect(result.baseRevision).toBe(1);
    expect(result.state.revision).toBe(2);
  });
  it("accepts fast_start on brief and rejects it on clarify", async () => {
    const body = { ...initial(), event: { type: "fast_start" } };
    const allowed = await handleTurn(request(body), true);
    expect(allowed.status).toBe(200);
    const result = await allowed.json();
    expect(result.next).toEqual({ type: "checkpoint", reason: "fast_converged" });
    expect((await handleTurn(request(body), false)).status).toBe(400);
  });
});
