import { describe, expect, it, vi } from "vitest";
import { runConvergenceTurn } from "./convergence";
import { EXAMPLES } from "./examples";
import type { ConvergenceInput, TurnResult } from "@/types/convergence";

vi.mock("./llm", () => ({ llmConfigured: () => false, llmModelName: () => "test", completeJson: vi.fn() }));

function start(brief: string = EXAMPLES[0].brief): ConvergenceInput {
  return { sessionId: "session-test", requestId: "request-1", rawBrief: brief, state: null, history: [], pendingQuestion: null, event: { type: "start" } };
}
function answer(input: ConvergenceInput, result: TurnResult, kind: "option" | "uncertain" = "option", optionId?: string): ConvergenceInput {
  if (result.next.type !== "ask") throw new Error("Expected a question");
  return { ...input, requestId: `${input.requestId}-next`, state: result.state, history: result.history, pendingQuestion: result.next.question, event: { type: "answer", answer: kind === "uncertain" ? { questionId: result.next.question.id, kind } : { questionId: result.next.question.id, kind, optionId: optionId ?? result.next.question.options[0].id } } };
}

describe("design convergence", () => {
  it("asks one concrete question without repeating supplied audience or constraints", async () => {
    const result = await runConvergenceTurn(start());
    expect(result.next.type).toBe("ask");
    if (result.next.type !== "ask") return;
    expect(result.next.question.prompt.length).toBeLessThanOrEqual(40);
    expect(result.next.question.uncertaintyId).toBe("quality_expression");
    expect(result.state.brief.audience).toBe("都市上班族");
    expect(result.state.constraints.map(x => x.text).join()).toContain("荧光色");
  });

  it("different answers change the direction and the next decision", async () => {
    const input = start();
    const first = await runConvergenceTurn(input);
    const tactile = await runConvergenceTurn(answer(input, first, "option", "touch"));
    const visual = await runConvergenceTurn(answer(input, first, "option", "layout"));
    expect(tactile.state.direction.priorities).not.toEqual(visual.state.direction.priorities);
    expect(tactile.next).not.toEqual(visual.next);
    expect(visual.state.direction.priorities[0].sourceIds).toContain("request-1-next");
    expect(visual.state.constraints).toEqual(first.state.constraints);
    expect(visual.state.uncertainties.some(u => u.id === "quality_expression")).toBe(false);
    expect(visual.history).toHaveLength(1);
    expect(visual.state.revision).toBe(first.state.revision + 1);
  });

  it("reframes uncertainty once, then defers without inventing a preference", async () => {
    let input = start();
    const first = await runConvergenceTurn(input);
    input = answer(input, first, "uncertain");
    const second = await runConvergenceTurn(input);
    expect(second.next.type).toBe("ask");
    expect(second.next).not.toEqual(first.next);
    input = answer(input, second, "uncertain");
    const third = await runConvergenceTurn(input);
    expect(third.state.direction.priorities).toEqual([]);
    expect(third.state.uncertainties.find(u => u.id === "quality_expression")?.status).toBe("deferred");
    expect(third.next).toEqual({ type: "checkpoint", reason: "needs_evidence" });
  });

  it("a complete brief can go directly to human checkpoint", async () => {
    const result = await runConvergenceTurn(start(EXAMPLES.find(x => x.id === "complete")!.brief));
    expect(result.next).toEqual({ type: "checkpoint", reason: "ready" });
    expect(result.state.status).toBe("checkpoint");
  });

  it("rejects answers to another question or a fabricated option", async () => {
    const input = start();
    const first = await runConvergenceTurn(input);
    const next = answer(input, first, "option", "made-up");
    await expect(runConvergenceTurn(next)).rejects.toThrow(/选项/);
    next.event = { type: "answer", answer: { kind: "uncertain", questionId: "old-question" } };
    await expect(runConvergenceTurn(next)).rejects.toThrow(/当前问题/);
  });

  it("an explicit correction updates the current direction and retains its history", async () => {
    const input = start();
    const first = await runConvergenceTurn(input);
    const secondInput = answer(input, first, "option", "layout");
    const second = await runConvergenceTurn(secondInput);
    const corrected = await runConvergenceTurn({ ...secondInput, requestId: "correction-1", state: second.state, history: second.history, pendingQuestion: second.next.type === "ask" ? second.next.question : null, event: { type: "correct", text: "改为通过表面触感体现品质感" } });
    expect(corrected.state.direction.priorities[0].text).toContain("表面触感");
    expect(corrected.history).toHaveLength(2);
    expect(corrected.history[0]).toEqual(second.history[0]);
    expect(corrected.state.constraints).toEqual(first.state.constraints);
  });

  for (const example of EXAMPLES) {
    it(`can complete ${example.label} without a route or search plan`, async () => {
      let input = start(example.brief);
      let result = await runConvergenceTurn(input);
      for (let i = 0; i < 6 && result.next.type === "ask"; i++) {
        input = answer(input, result);
        result = await runConvergenceTurn(input);
      }
      expect(result.next.type).toBe("checkpoint");
      expect(result.state.status).not.toBe("confirmed");
      expect(result).not.toHaveProperty("routes");
    });
  }
});
