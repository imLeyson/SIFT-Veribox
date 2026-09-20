import { describe, expect, it, vi } from "vitest";
import { runConvergenceTurn } from "./convergence";
import { EXAMPLES } from "./examples";
import type { ConvergenceInput, TurnResult } from "@/types/convergence";

vi.mock("./llm", () => ({ llmConfigured: () => false, llmModelName: () => "test", completeJson: vi.fn() }));

function start(brief: string = EXAMPLES[0].brief): ConvergenceInput {
  return { sessionId: "session-test", requestId: "request-1", rawBrief: brief, state: null, history: [], pendingQuestions: null, event: { type: "start" } };
}

function answer(input: ConvergenceInput, result: TurnResult, uncertain = false): ConvergenceInput {
  if (result.next.type !== "ask") throw new Error("Expected ask");
  return { ...input, requestId: `${input.requestId}-next`, state: result.state, history: result.history, pendingQuestions: result.next.questions, event: { type: "answer", answers: result.next.questions.map((q) => uncertain ? { questionId: q.id, kind: "uncertain" as const } : { questionId: q.id, kind: "option" as const, optionId: q.options[0].id }) } };
}

describe("batch design convergence", () => {
  it("asks two or three high-value questions and states a hypothesis", async () => {
    const result = await runConvergenceTurn(start());
    expect(result.next.type).toBe("ask");
    if (result.next.type !== "ask") return;
    expect(result.next.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.next.questions.length).toBeLessThanOrEqual(3);
    expect(result.state.currentHypothesis).toBeTruthy();
    expect(result.state.brief.audience).toBe("都市上班族");
  });

  it("updates design state after a batch and keeps the answered questions", async () => {
    const input = start();
    const first = await runConvergenceTurn(input);
    const second = await runConvergenceTurn(answer(input, first));
    expect(second.history[0].questions).toHaveLength(2);
    expect(second.state.revision).toBe(first.state.revision + 1);
    expect(second.state.currentHypothesis).toBeTruthy();
    expect(second.state.status).toBe("checkpoint");
    expect(second.next.type).toBe("checkpoint");
  });

  it("does not invent a preference when every answer is uncertain", async () => {
    const input = start();
    const first = await runConvergenceTurn(input);
    const second = await runConvergenceTurn(answer(input, first, true));
    expect(second.state.direction.priorities).toEqual([]);
    expect(second.state.currentHypothesis).toBeTruthy();
  });

  it("takes a complete brief to a human checkpoint without auto-confirming", async () => {
    const result = await runConvergenceTurn(start(String(EXAMPLES.find((x) => x.id === "complete")!.brief)));
    expect(result.next.type).toBe("checkpoint");
    expect(result.state.status).toBe("checkpoint");
    expect(result.state.status).not.toBe("confirmed");
  });

  it("rejects a fabricated question id", async () => {
    const input = start();
    const first = await runConvergenceTurn(input);
    const next = answer(input, first);
    next.event = { type: "answer", answers: [{ questionId: "made-up", kind: "uncertain" }] };
    await expect(runConvergenceTurn(next)).rejects.toThrow(/当前问题/);
  });

  it("fast-starts an incomplete brief into an assumed checkpoint without confirming", async () => {
    const result = await runConvergenceTurn({
      ...start(),
      event: { type: "fast_start" },
    });
    expect(result.next).toEqual({ type: "checkpoint", reason: "fast_converged" });
    expect(result.state.status).toBe("checkpoint");
    expect(result.state.status).not.toBe("confirmed");
    expect(result.state.direction.intent?.basis).toBe("user");
    expect(
      result.state.direction.priorities.some((item) => item.basis === "assumption"),
    ).toBe(true);
    expect(result.history.at(-1)?.event).toEqual({
      type: "checkpoint",
      action: "converge",
    });
  });

  it("rejects fast_start when a session already exists", async () => {
    const first = await runConvergenceTurn(start());
    await expect(
      runConvergenceTurn({
        ...start(),
        requestId: "request-fast",
        state: first.state,
        history: first.history,
        pendingQuestions: first.next.type === "ask" ? first.next.questions : null,
        event: { type: "fast_start" },
      }),
    ).rejects.toThrow(/开始时不能携带旧状态/);
  });

  it("preserves custom direction and constraints when answered alongside an uncertain question", async () => {
    const input = start();
    const first = await runConvergenceTurn(input);
    if (first.next.type !== "ask") throw new Error("Expected ask");
    const second = await runConvergenceTurn({
      ...input,
      requestId: "request-custom",
      state: first.state,
      history: first.history,
      pendingQuestions: first.next.questions,
      event: {
        type: "answer",
        answers: [
          { questionId: first.next.questions[0].id, kind: "uncertain" },
          {
            questionId: first.next.questions[1].id,
            kind: "custom",
            text: "冷茶青色与极简排版",
          },
        ],
      },
    });
    expect(second.state.status).toBe("checkpoint");
    expect(second.state.direction.priorities.length).toBeGreaterThanOrEqual(1);
    expect(
      second.state.direction.priorities.some((p) => p.text.includes("冷茶青色与极简排版")),
    ).toBe(true);
  });
});
