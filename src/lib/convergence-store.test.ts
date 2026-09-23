import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import { EXAMPLES } from "./agent/examples";
import { mockConvergence } from "./agent/convergence-mock";
import type { ConvergenceInput, TurnResult } from "@/types/convergence";

function memoryStorage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) };
}

function response(store: ReturnType<typeof createSiftStore>): TurnResult {
  const s = store.getState();
  const token = s.beginRequest()!;
  const input: ConvergenceInput = { sessionId: s.sessionId, requestId: token.id, state: null, history: [], pendingQuestions: null, rawBrief: EXAMPLES[0].brief, event: { type: "start" } };
  const payload = mockConvergence(input);
  return { ...payload, state: { ...payload.state, revision: 1 }, baseRevision: 0, sessionId: s.sessionId, requestId: token.id, mode: "mock", model: null, history: [] };
}

describe("convergence session", () => {
  it("commits a response and retains batch drafts until commit", () => {
    const store = createSiftStore(memoryStorage());
    const result = response(store);
    expect(store.getState().commitTurn(result)).toBe(true);
    const state = store.getState();
    expect(state.state?.currentHypothesis).toBeTruthy();
    if (state.next?.type !== "ask") throw new Error("Expected ask");
    state.setDrafts(state.next.questions.map((q) => ({ questionId: q.id, kind: "uncertain" as const })));
    expect(store.getState().drafts).toHaveLength(2);
  });

  it("one-click convergence enters an audited checkpoint without changing the direction", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    const before = structuredClone(store.getState().state!);
    const next = store.getState().next;
    if (!next || next.type !== "ask") throw new Error("Expected ask");
    store.getState().setDrafts(
      next.questions.map((question) => ({
        questionId: question.id,
        kind: "uncertain" as const,
      })),
    );

    store.getState().convergeNow();

    const after = store.getState();
    expect(after.next).toEqual({ type: "checkpoint", reason: "user_requested" });
    expect(after.state).toEqual({
      ...before,
      status: "checkpoint",
      revision: before.revision + 1,
    });
    expect(after.state?.status).not.toBe("confirmed");
    expect(after.drafts).toEqual([]);
    expect(after.history.at(-1)).toMatchObject({
      questions: null,
      event: { type: "checkpoint", action: "converge" },
      beforeRevision: before.revision,
      afterRevision: before.revision + 1,
    });
  });

  it("ignores repeated one-click convergence", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    store.getState().convergeNow();
    const afterFirstClick = {
      state: structuredClone(store.getState().state),
      next: structuredClone(store.getState().next),
      history: structuredClone(store.getState().history),
    };

    store.getState().convergeNow();

    expect(store.getState().state).toEqual(afterFirstClick.state);
    expect(store.getState().next).toEqual(afterFirstClick.next);
    expect(store.getState().history).toEqual(afterFirstClick.history);
  });

  it("supports submitting custom user input for questions when options do not fit", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().commitTurn(response(store));
    const next = store.getState().next;
    if (!next || next.type !== "ask") throw new Error("Expected ask");

    // User selects option for Q1, but provides custom text for Q2
    const customText = "通过大面积负空间留白与中英文细线排版，突出冷冽克制感";
    store.getState().setDrafts([
      { questionId: next.questions[0].id, kind: "option", optionId: next.questions[0].options[0].id },
      { questionId: next.questions[1].id, kind: "custom", text: customText },
    ]);

    expect(store.getState().drafts).toHaveLength(2);
    expect(store.getState().drafts[1]).toEqual({
      questionId: next.questions[1].id,
      kind: "custom",
      text: customText,
    });

    // Simulate answering with the custom input
    const s = store.getState();
    const token = s.beginRequest()!;
    const input: ConvergenceInput = {
      sessionId: s.sessionId,
      requestId: token.id,
      state: s.state,
      history: s.history,
      pendingQuestions: next.questions,
      rawBrief: EXAMPLES[0].brief,
      event: { type: "answer", answers: s.drafts },
    };
    const payload = mockConvergence(input);
    const baseRev = s.state?.revision ?? 0;
    const turnResult: TurnResult = {
      ...payload,
      state: { ...payload.state, revision: baseRev + 1 },
      baseRevision: baseRev,
      sessionId: s.sessionId,
      requestId: token.id,
      mode: "mock",
      model: null,
      history: s.history,
    };
    expect(store.getState().commitTurn(turnResult)).toBe(true);

    const updatedState = store.getState().state;
    expect(updatedState).toBeTruthy();
    // Verify custom text was ingested into direction priorities
    const customPriority = updatedState?.direction.priorities.find((p) => p.text === customText);
    expect(customPriority).toBeTruthy();
    expect(customPriority?.basis).toBe("user");
  });

  it("supports Figma-like freeform custom cards, custom edges, and node duplication/deletion", () => {
    const store = createSiftStore(memoryStorage());

    // 1. Add a custom note card
    const noteId = store.getState().addCustomCard({
      type: "note",
      title: "关于触感包装的灵感",
      content: "参考日式极简纤维纸",
      position: { x: 300, y: 200 },
    });
    expect(store.getState().customCards).toHaveLength(1);
    expect(store.getState().customCards[0].id).toBe(noteId);
    expect(store.getState().customCards[0].title).toBe("关于触感包装的灵感");

    // 2. Update custom card
    store.getState().updateCustomCard(noteId, {
      content: "更新为德国工业灰卡",
      color: "sky",
    });
    expect(store.getState().customCards[0].content).toBe("更新为德国工业灰卡");
    expect(store.getState().customCards[0].color).toBe("sky");

    // 3. Duplicate custom card
    const dupId = store.getState().duplicateNode(noteId);
    expect(dupId).toBeTruthy();
    expect(store.getState().customCards).toHaveLength(2);
    expect(store.getState().customCards[1].position.x).toBe(340);

    // 4. Add custom edge between them
    store.getState().addCustomEdge({
      id: `edge-${noteId}-${dupId}`,
      source: noteId,
      target: dupId!,
    });
    expect(store.getState().customEdges).toHaveLength(1);

    // 5. Delete node cleans up custom edges
    store.getState().deleteNodeById(noteId);
    expect(store.getState().customCards.find((c) => c.id === noteId)).toBeUndefined();
    expect(store.getState().deletedNodeIds).toContain(noteId);
    expect(store.getState().customEdges).toHaveLength(0);
  });

  it("supports adding, selecting, and duplicating custom route cards seamlessly", () => {
    const store = createSiftStore(memoryStorage());

    const customRoute = {
      id: "route-custom-1",
      title: "【自定义风格探索】质感极简",
      themeName: "质感极简",
      focusDimension: "核心材质与视觉调性",
      startingPoint: "自由探索切入",
      coreProblem: "建立视觉记忆点",
      purpose: "全案风格探索",
      pros: "灵活度高",
      cons: "需自行验证",
      recommendedReason: null,
      alignmentScore: 92,
      steps: [
        {
          id: "step-1",
          title: "核心母题试验",
          question: "如何确立辨识度？",
          purpose: "提炼视觉母题",
          acceptanceCriteria: ["清晰记忆点"],
        },
      ],
    };

    // 1. Add custom route card
    const cardId = store.getState().addCustomCard({
      id: "card-custom-route-1",
      type: "route",
      position: { x: 500, y: 100 },
      title: "质感极简",
      data: { route: customRoute },
    });

    expect(cardId).toBe("card-custom-route-1");
    expect(store.getState().routes.some((r) => r.id === "route-custom-1")).toBe(true);

    // 2. Select this custom route
    store.getState().selectRoute("route-custom-1");
    expect(store.getState().selectedRouteId).toBe("route-custom-1");
    expect(store.getState().activeStepId).toBe("step-1");
    expect(store.getState().explorationStage).toBe("route_selected");

    // 3. Duplicate this route node
    const dupCardId = store.getState().duplicateNode("card-custom-route-1");
    expect(dupCardId).toBeTruthy();
    const dupCard = store.getState().customCards.find((c) => c.id === dupCardId);
    expect(dupCard).toBeDefined();
    expect(dupCard?.data?.route.id).not.toBe("route-custom-1");
    expect(dupCard?.data?.route.steps[0].id).not.toBe("step-1");

    // 4. Can select the duplicated route as well
    store.getState().selectRoute(dupCard!.data!.route.id);
    expect(store.getState().selectedRouteId).toBe(dupCard!.data!.route.id);
    expect(store.getState().activeStepId).toBe(dupCard!.data!.route.steps[0].id);
  });

  it("supports creating, updating, and resizing image cards for visual reference", () => {
    const store = createSiftStore(memoryStorage());

    const imgCardId = store.getState().addCustomCard({
      id: "card-image-1",
      type: "image",
      position: { x: 200, y: 300 },
      title: "参考效果图",
      data: {
        src: "data:image/png;base64,abc",
        width: 360,
        height: 240,
        naturalWidth: 1200,
        naturalHeight: 800,
        fileName: "moodboard.png",
        lockAspectRatio: true,
      },
    });

    expect(imgCardId).toBe("card-image-1");
    const card = store.getState().customCards.find((c) => c.id === "card-image-1");
    expect(card).toBeDefined();
    expect(card?.type).toBe("image");
    expect(card?.data?.fileName).toBe("moodboard.png");

    // Update dimensions / aspect ratio
    store.getState().updateCustomCard("card-image-1", {
      data: {
        ...card?.data,
        width: 500,
        height: 333,
        lockAspectRatio: false,
      },
    });

    const updated = store.getState().customCards.find((c) => c.id === "card-image-1");
    expect(updated?.data?.width).toBe(500);
    expect(updated?.data?.height).toBe(333);
    expect(updated?.data?.lockAspectRatio).toBe(false);
  });

  it("does not auto-generate on connection, but synthesizes on synthesizeCard call and supports edge toggling", () => {
    const store = createSiftStore(memoryStorage());

    // 1. Add route 1
    const r1 = store.getState().addCustomCard({
      id: "card-r1",
      type: "route",
      position: { x: 100, y: 100 },
      title: "极简几何",
      data: {
        route: {
          id: "r1",
          title: "极简几何",
          themeName: "极简几何",
          focusDimension: "几何结构",
          startingPoint: "点线面",
          coreProblem: "清晰度",
          purpose: "纯粹结构",
          pros: "秩序感强",
          cons: "略冷硬",
          recommendedReason: null,
          alignmentScore: 92,
          steps: [{ id: "r1-s1", title: "网格骨架", question: "如何对齐？", purpose: "确定骨架", acceptanceCriteria: ["规整"] }],
        },
      },
    });

    // 2. Add route 2
    const r2 = store.getState().addCustomCard({
      id: "card-r2",
      type: "route",
      position: { x: 100, y: 300 },
      title: "温暖触感",
      data: {
        route: {
          id: "r2",
          title: "温暖触感",
          themeName: "温暖触感",
          focusDimension: "触觉材质",
          startingPoint: "天然纤维",
          coreProblem: "亲和力",
          purpose: "温度传递",
          pros: "情绪饱满",
          cons: "易杂乱",
          recommendedReason: null,
          alignmentScore: 88,
          steps: [{ id: "r2-s1", title: "微触感试验", question: "如何温润？", purpose: "确定肌理", acceptanceCriteria: ["温和"] }],
        },
      },
    });

    // 3. Add an empty route card
    const targetCardId = store.getState().addCustomCard({
      id: "card-target",
      type: "route",
      position: { x: 500, y: 200 },
      title: "空白主题待推导",
      data: { isEmpty: true },
    });

    // 4. Connect r1 -> targetCardId and r2 -> targetCardId
    store.getState().addCustomEdge({ id: "e1", source: "card-r1", target: "card-target" });
    store.getState().addCustomEdge({ id: "e2", source: "card-r2", target: "card-target" });

    // Target card remains isEmpty before button click!
    const targetBefore = store.getState().customCards.find((c) => c.id === "card-target");
    expect(targetBefore?.data?.isEmpty).toBe(true);

    // 5. Trigger synthesizeCard
    const success = store.getState().synthesizeCard("card-target");
    expect(success).toBe(true);

    const targetAfter = store.getState().customCards.find((c) => c.id === "card-target");
    expect(targetAfter?.data?.isEmpty).toBe(false);
    expect(targetAfter?.data?.isBlended).toBe(true);
    expect(targetAfter?.data?.route.themeName).toContain("极简几何");
    expect(targetAfter?.data?.route.themeName).toContain("温暖触感");

    // 6. Test edge cancellation: deleting edge removes connection
    store.getState().deleteCustomEdge("e2");
    expect(store.getState().customEdges.some((e) => e.id === "e2")).toBe(false);

    // Re-synthesizing now with single route evolves it into variation
    store.getState().synthesizeCard("card-target");
    const targetSingle = store.getState().customCards.find((c) => c.id === "card-target");
    expect(targetSingle?.data?.isEvolved).toBe(true);
  });
});

