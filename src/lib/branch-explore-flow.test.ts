import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import { createConvergenceActions } from "./convergence-client";
import { EXAMPLES } from "./agent/examples";
import { mockConvergence } from "./agent/convergence-mock";
import { getMockBranchExplore } from "./agent/branch-explore";
import type { ConvergenceInput, TurnResult } from "@/types/convergence";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
}

describe("Phase 1 E2E: Single-User Branch Exploration Loop", () => {
  it("walks through confirm -> mark determined/discarded -> branch explore -> persistence", async () => {
    const memory = createMemoryStorage();
    const store = createSiftStore(memory);

    // Mock fetcher for /api/branch-explore
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      const body = JSON.parse(init?.body as string);

      if (urlStr.includes("/api/branch-explore")) {
        const output = getMockBranchExplore(body);
        return Response.json(output);
      }
      return new Response("Not found", { status: 404 });
    };

    const actions = createConvergenceActions(store, fetcher);

    // 1. Setup brief and simulate confirmed direction
    store.getState().setRawBrief(EXAMPLES[0].brief);
    const token = store.getState().beginRequest()!;
    const input: ConvergenceInput = {
      sessionId: store.getState().sessionId,
      requestId: token.id,
      state: null,
      history: [],
      pendingQuestions: null,
      rawBrief: EXAMPLES[0].brief,
      event: { type: "start" },
    };
    const payload = mockConvergence(input);
    const turnResult: TurnResult = {
      ...payload,
      state: { ...payload.state, revision: 1 },
      baseRevision: 0,
      sessionId: store.getState().sessionId,
      requestId: token.id,
      mode: "mock",
      model: null,
      history: [],
    };
    store.getState().commitTurn(turnResult);
    store.getState().convergeNow();
    store.getState().confirm();

    // 2. Verify root branch and initial canvas items
    const s1 = store.getState();
    expect(s1.branches["branch-root"]).toBeDefined();
    expect(s1.activeBranchId).toBe("branch-root");

    const items = Object.values(s1.canvasItems);
    expect(items.length).toBeGreaterThanOrEqual(1);

    // 3. User adds a custom tactile material idea
    const customItemId = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      title: "特种纸压凹实验",
      content: "350g 触感棉纸无墨微压凹",
      status: "undetermined",
    });

    // Mark custom item as determined
    store.getState().setCanvasItemStatus(customItemId, "determined");
    expect(store.getState().canvasItems[customItemId].status).toBe("determined");

    // Add a discarded item
    const noisyItemId = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      title: "商业大贴图",
      content: "高饱和商业塑料感贴图",
      status: "discarded",
    });
    expect(store.getState().canvasItems[noisyItemId].status).toBe("discarded");

    // 4. Branch out from customItemId!
    const newBranchId = await actions.exploreBranch(
      customItemId,
      "深化触觉阻尼与微压凹参数",
    );

    expect(newBranchId).toBeTruthy();
    expect(typeof newBranchId).toBe("string");

    const s2 = store.getState();
    expect(s2.branches[newBranchId!]).toBeDefined();
    expect(s2.activeBranchId).toBe(newBranchId);

    // The new branch should have inherited constraints
    const branch = s2.branches[newBranchId!];
    expect(branch.inheritedConstraints.length).toBeGreaterThanOrEqual(1);
    expect(
      branch.inheritedConstraints.some((c) => c.content.includes("350g 触感棉纸")),
    ).toBe(true);

    // Check that child generated cards were added to the canvas under newBranchId
    const newCards = Object.values(s2.canvasItems).filter(
      (it) => it.branchId === newBranchId,
    );
    expect(newCards.length).toBeGreaterThanOrEqual(2);
    expect(newCards[0].title).toBeTruthy();
    expect(newCards[0].content).toBeTruthy();
    expect(newCards[0].status).toBe("undetermined");

    // User marks one of the newly generated cards as determined
    store.getState().setCanvasItemStatus(newCards[0].id, "determined");
    expect(store.getState().canvasItems[newCards[0].id].status).toBe("determined");

    // 5. Test persistence rehydration: simulate page reload
    const reloadedStore = createSiftStore(memory);
    await reloadedStore.persist.rehydrate();

    const reloadedState = reloadedStore.getState();
    expect(reloadedState.branches[newBranchId!]).toBeDefined();
    expect(reloadedState.branches[newBranchId!].name).toBe(branch.name);
    expect(reloadedState.canvasItems[customItemId]).toBeDefined();
    expect(reloadedState.canvasItems[customItemId].status).toBe("determined");
    expect(reloadedState.canvasItems[newCards[0].id].status).toBe("determined");
  });

  it("walks through Scheme Group packaging, branching with extra constraints, and dual mode switching", async () => {
    const memory = createMemoryStorage();
    const store = createSiftStore(memory);

    let lastExplorationMode: string | undefined;
    let lastBranchName: string | undefined;

    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      const body = JSON.parse(init?.body as string);

      if (urlStr.includes("/api/branch-explore")) {
        lastExplorationMode = body.explorationMode;
        lastBranchName = body.branchName;
        const output = getMockBranchExplore(body);
        return Response.json(output);
      }
      return new Response("Not found", { status: 404 });
    };

    const actions = createConvergenceActions(store, fetcher);

    // 1. Add two determined items
    const item1 = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      title: "棉纸触感",
      content: "350g触感棉纸无墨微压凹",
      status: "determined",
    });

    const item2 = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      title: "非对称排版",
      content: "75%呼吸留白，8pt微字阶",
      status: "determined",
    });

    // 2. Package items into a SchemeGroup
    const groupId = store.getState().createSchemeGroup("方案 A · 极简冷峻触感", [item1, item2]);
    expect(groupId).toBeTruthy();

    const s1 = store.getState();
    expect(s1.schemeGroups[groupId]).toBeDefined();
    expect(s1.schemeGroups[groupId].name).toBe("方案 A · 极简冷峻触感");
    expect(s1.schemeGroups[groupId].itemIds).toEqual([item1, item2]);
    expect(s1.schemeGroups[groupId].collapsed).toBe(false);

    // Toggle collapse
    store.getState().toggleSchemeGroupCollapse(groupId);
    expect(store.getState().schemeGroups[groupId].collapsed).toBe(true);
    store.getState().toggleSchemeGroupCollapse(groupId);
    expect(store.getState().schemeGroups[groupId].collapsed).toBe(false);

    // 3. Test Dual Mode switching (Phase 3)
    expect(store.getState().explorationMode).toBe("high_constraint");
    store.getState().setExplorationMode("low_constraint");
    expect(store.getState().explorationMode).toBe("low_constraint");

    // 4. Branch out from Scheme Group with custom options
    const newBranchId = await actions.exploreBranch(
      item1,
      "基于方案组「方案 A · 极简冷峻触感」综合深化",
      {
        customBranchName: "方案深化：方案 A · 极简冷峻触感",
        extraConstraintItemIds: [item1, item2],
      },
    );

    expect(newBranchId).toBeTruthy();
    expect(lastExplorationMode).toBe("low_constraint");
    expect(lastBranchName).toBe("方案深化：方案 A · 极简冷峻触感");

    const s2 = store.getState();
    const branch = s2.branches[newBranchId!];
    expect(branch.name).toBe("方案深化：方案 A · 极简冷峻触感");

    // Inherited constraints should contain both items from the scheme group
    const constraintContents = branch.inheritedConstraints.map((c) => c.content);
    expect(constraintContents.some((c) => c.includes("350g触感棉纸"))).toBe(true);
    expect(constraintContents.some((c) => c.includes("75%呼吸留白"))).toBe(true);

    // In low_constraint mode, mock produces 3 exploratory cards
    const newCards = Object.values(s2.canvasItems).filter((it) => it.branchId === newBranchId);
    expect(newCards).toHaveLength(3);

    // 5. Test persistence rehydration of scheme groups and exploration mode
    const reloadedStore = createSiftStore(memory);
    await reloadedStore.persist.rehydrate();

    const reloadedState = reloadedStore.getState();
    expect(reloadedState.schemeGroups[groupId]).toBeDefined();
    expect(reloadedState.schemeGroups[groupId].name).toBe("方案 A · 极简冷峻触感");
    expect(reloadedState.explorationMode).toBe("low_constraint");
    expect(reloadedState.branches[newBranchId!]).toBeDefined();
  });
});
