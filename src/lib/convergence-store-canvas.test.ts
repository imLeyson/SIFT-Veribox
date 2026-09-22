import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import { EXAMPLES } from "./agent/examples";
import { mockConvergence } from "./agent/convergence-mock";
import type { ConvergenceInput, TurnResult } from "@/types/convergence";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
}

function seedConfirmedStore() {
  const storage = memoryStorage();
  const store = createSiftStore(storage);
  const s = store.getState();
  const token = s.beginRequest()!;
  const input: ConvergenceInput = {
    sessionId: s.sessionId,
    requestId: token.id,
    state: null,
    history: [],
    pendingQuestions: null,
    rawBrief: EXAMPLES[0].brief,
    event: { type: "start" },
  };
  const payload = mockConvergence(input);
  const result: TurnResult = {
    ...payload,
    state: { ...payload.state, revision: 1 },
    baseRevision: 0,
    sessionId: s.sessionId,
    requestId: token.id,
    mode: "mock",
    model: null,
    history: [],
  };
  store.getState().commitTurn(result);
  // Enter checkpoint
  store.getState().convergeNow();
  // Confirm direction
  store.getState().confirm();
  return { store, storage };
}

describe("convergence-store canvas & branching", () => {
  it("initializes root branch and seeds determined items upon direction confirmation", () => {
    const { store } = seedConfirmedStore();
    const state = store.getState();

    expect(state.state?.status).toBe("confirmed");
    expect(state.activeBranchId).toBe("branch-root");
    expect(state.branches["branch-root"]).toBeDefined();
    expect(state.branches["branch-root"].name).toBe("主方向探索");

    // Seeded items should include intent and priorities as determined items
    const items = Object.values(state.canvasItems);
    expect(items.length).toBeGreaterThanOrEqual(1);

    const intentItem = items.find((it) => it.tags?.includes("intent"));
    expect(intentItem).toBeDefined();
    expect(intentItem?.status).toBe("determined");
    expect(intentItem?.content).toBeTruthy();
  });

  it("updates canvas item status: undetermined -> determined -> discarded", () => {
    const { store } = seedConfirmedStore();
    const itemId = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      title: "色彩探索",
      content: "哑光象牙白与深苔绿",
    });

    expect(store.getState().canvasItems[itemId].status).toBe("undetermined");

    store.getState().setCanvasItemStatus(itemId, "determined");
    expect(store.getState().canvasItems[itemId].status).toBe("determined");

    store.getState().setCanvasItemStatus(itemId, "discarded");
    expect(store.getState().canvasItems[itemId].status).toBe("discarded");
  });

  it("creates a new branch from items carrying over only determined/selected constraints", () => {
    const { store } = seedConfirmedStore();

    const item1 = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      status: "determined",
      title: "材质约束",
      content: "350g 触感棉纸微压凹",
    });

    const item2 = store.getState().addCanvasItem({
      type: "image",
      branchId: "branch-root",
      status: "determined",
      title: "参考图",
      imageUrl: "https://example.com/texture.jpg",
      content: "纸张肌理",
    });

    const branchId = store.getState().createBranchFromItems(
      "分支 1：纸张触感深化",
      [item1, item2],
      "branch-root",
      `node-${item1}`,
    );

    const current = store.getState();
    expect(current.activeBranchId).toBe(branchId);
    const branch = current.branches[branchId];
    expect(branch).toBeDefined();
    expect(branch.parentId).toBe("branch-root");
    expect(branch.inheritedConstraints).toHaveLength(2);
    expect(branch.inheritedConstraints[0].content).toBe("350g 触感棉纸微压凹");
    expect(branch.inheritedConstraints[1].imageUrl).toBe("https://example.com/texture.jpg");
  });

  it("groups canvas items into SchemeGroup and toggles collapse", () => {
    const { store } = seedConfirmedStore();
    const itemA = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      title: "排版规范",
      content: "8pt 细字排版",
    });
    const itemB = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      title: "色彩规范",
      content: "灰绿搭配",
    });

    const groupId = store.getState().createSchemeGroup(
      "方案一：冷冽理性",
      [itemA, itemB],
      "#10B981",
    );

    expect(store.getState().schemeGroups[groupId]).toBeDefined();
    expect(store.getState().schemeGroups[groupId].collapsed).toBe(false);
    expect(store.getState().schemeGroups[groupId].itemIds).toEqual([itemA, itemB]);

    store.getState().toggleSchemeGroupCollapse(groupId);
    expect(store.getState().schemeGroups[groupId].collapsed).toBe(true);

    // Removing an item cleans it from scheme group
    store.getState().removeCanvasItem(itemA);
    expect(store.getState().canvasItems[itemA]).toBeUndefined();
    expect(store.getState().schemeGroups[groupId].itemIds).toEqual([itemB]);
  });

  it("persists canvas items, branches, and scheme groups across rehydration", async () => {
    const { store, storage } = seedConfirmedStore();
    const item1 = store.getState().addCanvasItem({
      type: "text",
      branchId: "branch-root",
      status: "determined",
      title: "持久化测试项",
      content: "验证刷新后依然完整存在",
    });
    const branchId = store.getState().createBranchFromItems("新探索分支", [item1]);
    const groupId = store.getState().createSchemeGroup("方案组 A", [item1]);

    // Simulate page reload
    const reloadedStore = createSiftStore(storage);
    await reloadedStore.persist.rehydrate();

    const reloaded = reloadedStore.getState();
    expect(reloaded.canvasItems[item1]).toBeDefined();
    expect(reloaded.canvasItems[item1].title).toBe("持久化测试项");
    expect(reloaded.branches[branchId]).toBeDefined();
    expect(reloaded.branches[branchId].name).toBe("新探索分支");
    expect(reloaded.schemeGroups[groupId]).toBeDefined();
    expect(reloaded.schemeGroups[groupId].name).toBe("方案组 A");
  });
});
