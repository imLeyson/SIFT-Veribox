import { describe, expect, it } from "vitest";
import { createSiftStore, resolveNodeContext, resolveChainBriefContext, getUpstreamSummary } from "./convergence-store";
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
  it("keeps selected result items and named groups across session persistence", async () => {
    const storage = memoryStorage();
    const first = createSiftStore(storage);
    first.getState().addCustomCard({
      id: "theme-1",
      type: "route",
      title: "纸感留白",
      position: { x: 0, y: 0 },
    });
    first.getState().addCustomCard({
      id: "theme-2",
      type: "route",
      title: "冷静结构",
      position: { x: 0, y: 300 },
    });

    first.getState().addOutcomeItems(["theme-1", "theme-2"]);
    const groupId = first.getState().createOutcomeGroup("方案一：材质与结构", ["theme-1", "theme-2"]);

    expect(groupId).toBeTruthy();
    expect(first.getState().outcomeItems).toHaveLength(2);
    expect(first.getState().outcomeGroups[0]).toMatchObject({
      title: "方案一：材质与结构",
      itemIds: ["theme-1", "theme-2"],
    });

    await first.persist.rehydrate();
    const second = createSiftStore(storage);
    await second.persist.rehydrate();
    expect(second.getState().outcomeItems).toEqual(["theme-1", "theme-2"]);
    expect(second.getState().outcomeGroups).toHaveLength(1);
    expect(second.getState().outcomeGroups[0].id).toBe(groupId);
  });

  it("does not duplicate result items and removes deleted cards from groups", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().addOutcomeItems(["route-1", "route-1", "route-2"]);
    expect(store.getState().outcomeItems).toEqual(["route-1", "route-2"]);

    const groupId = store.getState().createOutcomeGroup("方案二", ["route-1", "route-2"]);
    store.getState().removeOutcomeItem("route-1");
    expect(store.getState().outcomeItems).toEqual(["route-2"]);
    expect(store.getState().outcomeGroups.find((group) => group.id === groupId)?.itemIds).toEqual([
      "route-2",
    ]);
  });

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

    store.getState().addOutcomeItems([noteId, dupId!]);
    expect(store.getState().outcomeItems).toEqual([noteId, dupId]);

    // 5. Delete node cleans up custom edges
    store.getState().deleteNodeById(noteId);
    expect(store.getState().customCards.find((c) => c.id === noteId)).toBeUndefined();
    expect(store.getState().deletedNodeIds).toContain(noteId);
    expect(store.getState().customEdges).toHaveLength(0);
    expect(store.getState().outcomeItems).toEqual([dupId]);
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

    store.getState().deleteNodeById(cardId);
    expect(store.getState().customCards.find((card) => card.id === cardId)).toBeUndefined();
    expect(store.getState().routes.some((route) => route.id === "route-custom-1")).toBe(false);
    expect(store.getState().selectedRouteId).toBe(dupCard!.data!.route.id);

    store.getState().deleteNodeById(dupCardId!);
    expect(store.getState().routes.some((route) => route.id === dupCard!.data!.route.id)).toBe(false);
    expect(store.getState().selectedRouteId).toBeNull();
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
    expect(targetAfter?.data?.synthesis?.sourceCardIds).toEqual(["card-r1", "card-r2"]);
    expect(targetAfter?.data?.synthesis?.sourceCount).toBe(2);
    expect(targetAfter?.data?.synthesis?.outputType).toBe("route");
    expect(targetAfter?.data?.route.themeName).toContain("《");
    expect(targetAfter?.data?.route.startingPoint).toContain("极简几何");

    // 6. Test edge cancellation: deleting edge removes connection
    store.getState().deleteCustomEdge("e2");
    expect(store.getState().customEdges.some((e) => e.id === "e2")).toBe(false);

    // Re-synthesizing now with single route evolves it into variation
    store.getState().synthesizeCard("card-target");
    const targetSingle = store.getState().customCards.find((c) => c.id === "card-target");
    expect(targetSingle?.data?.isEvolved).toBe(true);
  });

  it("normalizes upstream node IDs (direction, step-*, plan-*, turn-*) and synthesizes context accurately", () => {
    const store = createSiftStore(memoryStorage());

    // Setup state
    const mockState = {
      revision: 1,
      status: "confirmed" as const,
      brief: { goal: "测试茶叶包装", audience: "年轻群体", deliverable: "包装盒" },
      constraints: [],
      direction: {
        intent: { text: "极简纯白自然主义", basis: "user" as const, sourceIds: [] },
        priorities: [
          { text: "原浆微触感", basis: "user" as const, sourceIds: [] },
          { text: "克制负空间", basis: "user" as const, sourceIds: [] },
        ],
        avoid: [
          { text: "大面积渐变", basis: "user" as const, sourceIds: [] },
          { text: "塑料质感", basis: "user" as const, sourceIds: [] },
        ],
        criteria: [],
      },
      currentHypothesis: "以原浆白呈现质感",
      validationAction: null,
      uncertainties: [],
      visualKeywords: [],
    };

    store.setState({
      state: mockState,
      rawBrief: "测试茶叶包装设计",
      routes: [
        {
          id: "r1",
          title: "原生素纸",
          themeName: "原生素纸",
          focusDimension: "材质触感",
          startingPoint: "素纸留白",
          coreProblem: "质感",
          purpose: "呈现",
          pros: "高级",
          cons: "易脏",
          recommendedReason: "推荐",
          alignmentScore: 95,
          steps: [
            {
              id: "r1-s1",
              title: "纸张克重与压凹试验",
              question: "何种克重最显温润？",
              purpose: "确立第一眼质感",
              acceptanceCriteria: ["无反光", "肌理明显"],
            },
          ],
        },
      ],
      platformPlans: [
        {
          id: "plan-r1-s1",
          routeId: "r1",
          stepId: "r1-s1",
          primarySources: [],
          alternativeSources: [],
        },
      ],
    });

    // 1. Test resolveNodeContext directly
    const s = store.getState();
    const resolvedDirection = resolveNodeContext("direction", s);
    expect(resolvedDirection?.type).toBe("state");
    expect(resolvedDirection?.label).toContain("2 策略基准");

    const resolvedStep = resolveNodeContext("step-r1", s);
    expect(resolvedStep?.type).toBe("step");
    expect(resolvedStep?.label).toContain("探索验证");
    expect(resolvedStep?.data?.step?.title).toBe("纸张克重与压凹试验");

    const resolvedPlan = resolveNodeContext("plan-r1-s1", s);
    expect(resolvedPlan?.type).toBe("platformPlan");
    expect(resolvedPlan?.label).toBe("灵感检索");

    const resolvedAsk = resolveNodeContext("turn-1", s);
    expect(resolvedAsk?.type).toBe("ask");
    expect(resolvedAsk?.label).toBe("1 视觉抉择");

    // 2. Test getUpstreamSummary with direction and step nodes
    const targetCardId = store.getState().addCustomCard({
      id: "card-note-test",
      type: "note",
      position: { x: 300, y: 100 },
      title: "设计手记",
      content: "",
    });

    // Connect from "direction" (2 策略基准) to note card
    store.getState().addCustomEdge({ id: "e-dir", source: "direction", target: "card-note-test" });

    const summary = getUpstreamSummary("card-note-test", store.getState());
    expect(summary.count).toBe(1);
    expect(summary.hasStrategy).toBe(true);
    expect(summary.labels[0]).toContain("2 策略基准");

    // 3. Test synthesizeCard on note card connected to "direction"
    const synthesized = store.getState().synthesizeCard("card-note-test");
    expect(synthesized).toBe(true);

    const updatedNote = store.getState().customCards.find((c) => c.id === "card-note-test");
    expect(updatedNote?.content).toContain("极简纯白自然主义");
    expect(updatedNote?.content).toContain("原浆微触感");
    expect(updatedNote?.content).toContain("大面积渐变");

    // 4. Test connecting "step-r1" to an empty step card
    const targetStepId = store.getState().addCustomCard({
      id: "card-step-test",
      type: "step",
      position: { x: 600, y: 100 },
      title: "视点卡片",
      data: { isEmpty: true },
    });
    store.getState().addCustomEdge({ id: "e-step", source: "step-r1", target: "card-step-test" });

    const stepSummary = getUpstreamSummary("card-step-test", store.getState());
    expect(stepSummary.hasStep).toBe(true);
    expect(stepSummary.labels[0]).toContain("探索验证");
  });
});

describe("resolveChainBriefContext — multi-brief chain resolution", () => {
  it("traces upstream edges to find the correct Brief for an independent chain", () => {
    const store = createSiftStore(memoryStorage());

    // Simulate two independent Brief chains on the canvas
    // Chain A: brief-A → state-A → route-A
    store.getState().addCustomCard({
      id: "brief-A",
      type: "brief",
      position: { x: 0, y: 0 },
      data: { rawBrief: "设计一款极简茶具", state: { brief: { goal: "茶具" } } },
    });
    store.getState().addCustomCard({
      id: "state-A",
      type: "state",
      position: { x: 470, y: 0 },
      data: { rawBrief: "设计一款极简茶具", state: { brief: { goal: "茶具" }, status: "confirmed" } },
    });
    store.getState().addCustomCard({
      id: "route-A",
      type: "route",
      position: { x: 940, y: 0 },
      data: { rawBrief: "设计一款极简茶具", route: { id: "r-a", title: "茶道极简" }, isEmpty: false },
    });
    store.getState().addCustomEdge({ id: "e-ba", source: "brief-A", target: "state-A" });
    store.getState().addCustomEdge({ id: "e-sa", source: "state-A", target: "route-A" });

    // Chain B: brief-B → state-B → route-B
    store.getState().addCustomCard({
      id: "brief-B",
      type: "brief",
      position: { x: 0, y: 600 },
      data: { rawBrief: "设计一款儿童玩具包装", state: { brief: { goal: "儿童玩具" } } },
    });
    store.getState().addCustomCard({
      id: "state-B",
      type: "state",
      position: { x: 470, y: 600 },
      data: { rawBrief: "设计一款儿童玩具包装", state: { brief: { goal: "儿童玩具" }, status: "confirmed" } },
    });
    store.getState().addCustomCard({
      id: "route-B",
      type: "route",
      position: { x: 940, y: 600 },
      data: { rawBrief: "设计一款儿童玩具包装", route: { id: "r-b", title: "趣味积木" }, isEmpty: false },
    });
    store.getState().addCustomEdge({ id: "e-bb", source: "brief-B", target: "state-B" });
    store.getState().addCustomEdge({ id: "e-sb", source: "state-B", target: "route-B" });

    // Create a blank route card connected to route-B (chain B downstream)
    store.getState().addCustomCard({
      id: "blank-from-B",
      type: "route",
      position: { x: 1410, y: 600 },
      data: { isEmpty: true },
    });
    store.getState().addCustomEdge({ id: "e-rb", source: "route-B", target: "blank-from-B" });

    const s = store.getState();

    // Resolve chain context for blank-from-B → should find Brief B's rawBrief, NOT Brief A
    const ctx = resolveChainBriefContext("blank-from-B", s);
    expect(ctx.rawBrief).toBe("设计一款儿童玩具包装");

    // Resolve chain context for route-A → should find Brief A
    const ctxA = resolveChainBriefContext("route-A", s);
    expect(ctxA.rawBrief).toBe("设计一款极简茶具");

    // Resolve from state-B directly → should have both rawBrief and state
    const ctxState = resolveChainBriefContext("state-B", s);
    expect(ctxState.rawBrief).toBe("设计一款儿童玩具包装");
    expect(ctxState.state).toBeTruthy();
    expect(ctxState.state.brief.goal).toBe("儿童玩具");
  });

  it("falls back to primary pipeline brief when tracing reaches id='brief'", () => {
    const store = createSiftStore(memoryStorage());
    store.getState().setRawBrief("全局简报内容");

    // No custom cards, but there's a custom edge from "brief" → "some-route"
    store.getState().addCustomCard({
      id: "some-route",
      type: "route",
      position: { x: 940, y: 0 },
      data: { isEmpty: true },
    });
    store.getState().addCustomEdge({ id: "e-1", source: "brief", target: "some-route" });

    const ctx = resolveChainBriefContext("some-route", store.getState());
    expect(ctx.rawBrief).toBe("全局简报内容");
  });

  it("returns null when no chain-specific context is found", () => {
    const store = createSiftStore(memoryStorage());

    // Orphan card with no edges
    store.getState().addCustomCard({
      id: "orphan",
      type: "route",
      position: { x: 0, y: 0 },
      data: { isEmpty: true },
    });

    const ctx = resolveChainBriefContext("orphan", store.getState());
    expect(ctx.rawBrief).toBeNull();
    expect(ctx.state).toBeNull();
  });
});
