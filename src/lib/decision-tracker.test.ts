import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
}

describe("Decision Tracker & Constraint Exclusion Engine", () => {
  it("initializes with empty itemDecisions", () => {
    const store = createSiftStore(memoryStorage());
    const decisions = store.getState().itemDecisions;
    expect(decisions).toEqual({});
    const ctx = store.getState().getDecisionContext();
    expect(ctx.confirmed).toHaveLength(0);
    expect(ctx.uncertain).toHaveLength(0);
    expect(ctx.discarded).toHaveLength(0);
  });

  it("can record confirmed text, image, link and theme decisions", () => {
    const store = createSiftStore(memoryStorage());

    // 1. Confirmed Text
    store.getState().setItemDecision({
      id: "text_kw_1",
      type: "text",
      content: "极简特种纸微触感",
      label: "视觉关键词",
      status: "confirmed",
      sourceNode: "02 方向",
    });

    // 2. Confirmed Image
    store.getState().setItemDecision({
      id: "img_brief_0",
      type: "image",
      content: "data:image/png;base64,sample123",
      label: "参考图 01",
      status: "confirmed",
      sourceNode: "00 简报",
    });

    // 3. Confirmed Link
    store.getState().setItemDecision({
      id: "link_step_behance",
      type: "link",
      content: "https://www.behance.net/search/projects?search=minimal+tea",
      label: "Behance 纯净方案",
      status: "confirmed",
      sourceNode: "05 搜索",
    });

    // 4. Confirmed Theme
    store.getState().setItemDecision({
      id: "theme_route_1",
      type: "theme",
      content: "呼吸感纸构 · 空白之境",
      label: "路线 1 主题",
      status: "confirmed",
      sourceNode: "03 主题",
    });

    const ctx = store.getState().getDecisionContext();
    expect(ctx.confirmed.map((d) => d.content)).toContain("极简特种纸微触感");
    expect(ctx.confirmed.map((d) => d.content)).toContain("data:image/png;base64,sample123");
    expect(ctx.confirmed.map((d) => d.content)).toContain("https://www.behance.net/search/projects?search=minimal+tea");
    expect(ctx.confirmed.map((d) => d.content)).toContain("呼吸感纸构 · 空白之境");

    expect(ctx.discarded).toHaveLength(0);
    expect(ctx.uncertain).toHaveLength(0);
  });

  it("can toggle item status and correctly sort into discarded", () => {
    const store = createSiftStore(memoryStorage());

    store.getState().setItemDecision({
      id: "kw_avoid",
      type: "text",
      content: "大插画与卡通 IP",
      label: "视觉红线",
      status: "uncertain",
      sourceNode: "02 方向",
    });

    let ctx = store.getState().getDecisionContext();
    expect(ctx.uncertain.map((d) => d.content)).toContain("大插画与卡通 IP");
    expect(ctx.discarded).toHaveLength(0);

    // Toggle to discarded
    store.getState().toggleItemStatus("kw_avoid", "discarded");

    ctx = store.getState().getDecisionContext();
    expect(ctx.uncertain).toHaveLength(0);
    expect(ctx.confirmed).toHaveLength(0);
    expect(ctx.discarded.map((d) => d.content)).toContain("大插画与卡通 IP");

    // Toggle to confirmed
    store.getState().toggleItemStatus("kw_avoid", "confirmed");
    ctx = store.getState().getDecisionContext();
    expect(ctx.confirmed.map((d) => d.content)).toContain("大插画与卡通 IP");
    expect(ctx.discarded).toHaveLength(0);
  });

  it("can remove item decisions", () => {
    const store = createSiftStore(memoryStorage());

    store.getState().setItemDecision({
      id: "theme_discard",
      type: "theme",
      content: "传统红金尊贵风",
      status: "discarded",
      sourceNode: "03 主题",
    });

    expect(store.getState().getDecisionContext().discarded.map((d) => d.content)).toContain("传统红金尊贵风");

    store.getState().removeItemDecision("theme_discard");
    expect(store.getState().getDecisionContext().discarded).toHaveLength(0);
  });

  it("persists itemDecisions across storage reloads", async () => {
    const storage = memoryStorage();
    const store1 = createSiftStore(storage);

    store1.getState().setItemDecision({
      id: "img_test",
      type: "image",
      content: "https://example.com/ref.jpg",
      status: "confirmed",
    });

    // Recreate store using same storage and trigger rehydration
    const store2 = createSiftStore(storage);
    await store2.persist.rehydrate();

    expect(store2.getState().itemDecisions["img_test"]).toBeDefined();
    expect(store2.getState().itemDecisions["img_test"].content).toBe("https://example.com/ref.jpg");
    expect(store2.getState().itemDecisions["img_test"].status).toBe("confirmed");
    expect(store2.getState().getDecisionContext().confirmed.map((d) => d.content)).toContain("https://example.com/ref.jpg");
  });
});
