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
  it("coerces fast_start to a checkpoint even if the model asks questions", async () => {
    vi.mocked(completeJson).mockResolvedValue(mockConvergence(initial()));
    const result = await runConvergenceTurn({ ...initial(), event: { type: "fast_start" } });
    expect(result.next).toEqual({ type: "checkpoint", reason: "fast_converged" });
    expect(result.state.status).toBe("checkpoint");
    expect(result.state.status).not.toBe("confirmed");
    expect(result.history.at(-1)?.event).toEqual({ type: "checkpoint", action: "converge" });
  });
  it("defaults unlabeled fast_start judgments to assumptions", () => {
    const input = { ...initial(), event: { type: "fast_start" as const } };
    const normalized = normalizeLivePayload(
      {
        state: {
          brief: { goal: "冷泡茶包装", audience: null, deliverable: null },
          direction: {
            intent: { text: "干净有仪式感", sourceIds: ["brief"] },
            priorities: [{ text: "先按版式推进", sourceIds: ["r1"] }],
            avoid: [],
            criteria: [],
          },
          uncertainties: [],
        },
        next: { type: "ask", questions: [] },
      },
      input,
    ) as {
      state: {
        direction: {
          intent: { basis: string };
          priorities: { basis: string }[];
        };
      };
    };
    expect(normalized.state.direction.intent.basis).toBe("assumption");
    expect(normalized.state.direction.priorities[0].basis).toBe("assumption");
  });
  it("rejects a question unrelated to an open uncertainty", async () => { const payload = mockConvergence(initial()); if (payload.next.type !== "ask") throw new Error("ask"); payload.next.questions[0].uncertaintyId = "unrelated"; vi.mocked(completeJson).mockResolvedValue(payload); await expect(runConvergenceTurn(initial())).rejects.toThrow(/未决判断/); });

  it("forwards images to completeJson and extracts visualKeywords in normalized state", async () => {
    const payload = mockConvergence(initial());
    payload.state.visualKeywords = ["冷茶青", "60%留白", "特种棉纸"];
    vi.mocked(completeJson).mockResolvedValue(payload);

    const inputWithImages: ConvergenceInput = {
      ...initial(),
      images: ["data:image/jpeg;base64,abc"],
    };
    const result = (await liveConvergence(inputWithImages)) as typeof payload;
    expect(vi.mocked(completeJson).mock.calls[0]?.[3]).toEqual(["data:image/jpeg;base64,abc"]);
    expect(result.state.visualKeywords).toEqual(["冷茶青", "60%留白", "特种棉纸"]);
  });

  it("auto-preserves unreconsidered constraints when model omits them during answer turns", async () => {
    const startInput = initial();
    const startPayload = mockConvergence(startInput);
    startPayload.state.constraints = [
      { text: "只用现成纸盒", basis: "user", sourceIds: ["brief"] },
    ];
    if (startPayload.next.type !== "ask") throw new Error("Expected ask");

    const answerInput: ConvergenceInput = {
      ...startInput,
      requestId: "r2",
      state: startPayload.state,
      pendingQuestions: startPayload.next.questions,
      event: {
        type: "answer",
        answers: [
          {
            questionId: startPayload.next.questions[0].id,
            kind: "option",
            optionId: startPayload.next.questions[0].options[0].id,
          },
          {
            questionId: startPayload.next.questions[1].id,
            kind: "option",
            optionId: startPayload.next.questions[1].options[0].id,
          },
        ],
      },
    };

    // Live model returns empty constraints array (omitting previous constraint)
    const modelPayload = mockConvergence(answerInput);
    modelPayload.state.constraints = [];
    vi.mocked(completeJson).mockResolvedValue(modelPayload);

    // normalizeLivePayload should auto-preserve "只用现成纸盒"
    const normalized = normalizeLivePayload(modelPayload, answerInput) as typeof modelPayload;
    expect(normalized.state.constraints.some((c) => c.text === "只用现成纸盒")).toBe(true);

    // runConvergenceTurn should pass without throwing "模型丢失了已有约束，请重试"
    const result = await runConvergenceTurn(answerInput);
    expect(result.state.constraints.some((c) => c.text === "只用现成纸盒")).toBe(true);
  });

  it("allows dropping or replacing a constraint when the question explicitly reconsiders it", async () => {
    const startInput = initial();
    const startPayload = mockConvergence(startInput);
    startPayload.state.constraints = [
      { text: "只用现成纸盒", basis: "user", sourceIds: ["brief"] },
    ];
    if (startPayload.next.type !== "ask") throw new Error("Expected ask");

    // Mark the first question as explicitly reconsidering "只用现成纸盒"
    const questions = [
      {
        ...startPayload.next.questions[0],
        constraintRefs: ["只用现成纸盒"],
      },
      startPayload.next.questions[1],
    ];

    const answerInput: ConvergenceInput = {
      ...startInput,
      requestId: "r2",
      state: startPayload.state,
      pendingQuestions: questions,
      event: {
        type: "answer",
        answers: [
          {
            questionId: questions[0].id,
            kind: "option",
            optionId: questions[0].options[0].id,
          },
          {
            questionId: questions[1].id,
            kind: "option",
            optionId: questions[1].options[0].id,
          },
        ],
      },
    };

    const modelPayload = mockConvergence(answerInput);
    modelPayload.state.constraints = [
      { text: "改为使用金属定制盒", basis: "user", sourceIds: ["r2"] },
    ];
    vi.mocked(completeJson).mockResolvedValue(modelPayload);

    const normalized = normalizeLivePayload(modelPayload, answerInput) as typeof modelPayload;
    expect(normalized.state.constraints.some((c) => c.text === "只用现成纸盒")).toBe(false);
    expect(normalized.state.constraints.some((c) => c.text === "改为使用金属定制盒")).toBe(true);

    const result = await runConvergenceTurn(answerInput);
    expect(result.state.constraints.some((c) => c.text === "只用现成纸盒")).toBe(false);
    expect(result.state.constraints.some((c) => c.text === "改为使用金属定制盒")).toBe(true);
  });

  it("handles answer turns with mixed uncertain answers without throwing repeated uncertainty error", async () => {
    const startInput = initial();
    const startPayload = mockConvergence(startInput);
    if (startPayload.next.type !== "ask") throw new Error("Expected ask");

    // Three questions: two answered with option, one answered with uncertain
    const q1 = startPayload.next.questions[0];
    const q2 = startPayload.next.questions[1];
    const q3 = {
      id: "q_start_3",
      uncertaintyId: "uncertainty_craft",
      prompt: "材质工艺偏向哪种表达路径？",
      constraintRefs: [],
      options: [
        { id: "a", label: "原生纤维斜纹" },
        { id: "b", label: "精密喷砂阳极氧化" },
      ],
    };
    startPayload.state.uncertainties.push({
      id: "uncertainty_craft",
      topic: "材质工艺偏向",
      decisionAffected: "材质表达路径",
      impact: "material",
      status: "open",
    });

    const pendingQuestions = [q1, q2, q3];
    const answerInput: ConvergenceInput = {
      ...startInput,
      requestId: "r2",
      state: startPayload.state,
      pendingQuestions,
      event: {
        type: "answer",
        answers: [
          { questionId: q1.id, kind: "option", optionId: q1.options[0].id },
          { questionId: q2.id, kind: "option", optionId: q2.options[0].id },
          { questionId: q3.id, kind: "uncertain" },
        ],
      },
    };

    // Live model outputs generic or repeated IDs in next round
    const modelPayload = mockConvergence(answerInput);
    modelPayload.next = {
      type: "ask",
      questions: [
        {
          id: "q_r2_1",
          uncertaintyId: q1.uncertaintyId, // Colliding ID with previously answered Q1
          prompt: "次级界面的留白比例？",
          constraintRefs: [],
          options: [{ id: "a", label: "60%" }, { id: "b", label: "40%" }],
        },
        {
          id: "q_r2_2",
          uncertaintyId: "uncertainty_craft", // Follow-up on uncertain Q3
          prompt: "具体材质试样优先验证哪种触感？",
          constraintRefs: [],
          options: [{ id: "a", label: "粗砺哑光" }, { id: "b", label: "细腻平滑" }],
        },
      ],
    };
    vi.mocked(completeJson).mockResolvedValue(modelPayload);

    // Should succeed cleanly without throwing "模型重复询问已处理的判断，请重试"
    const result = await runConvergenceTurn(answerInput);
    expect(result.state).toBeTruthy();
    expect(["questioning", "checkpoint"]).toContain(result.state.status);
    expect(["ask", "checkpoint"]).toContain(result.next.type);
  });
});


