import { describe, expect, it } from "vitest";
import { createSiftStore } from "./convergence-store";
import type { DesignState } from "@/types/convergence";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
}

const sampleConfirmedState: DesignState = {
  revision: 1,
  status: "confirmed",
  brief: {
    goal: "冷萃茶包装设计",
    audience: "年轻白领",
    deliverable: "纸盒包装",
  },
  constraints: [],
  direction: {
    intent: { text: "极简素净日常", basis: "user", sourceIds: ["brief"] },
    priorities: [
      { text: "特种棉纸触感", basis: "user", sourceIds: ["r1"] },
    ],
    avoid: [
      { text: "大红大金传统风格", basis: "user", sourceIds: ["r1"] },
    ],
    criteria: [],
  },
  currentHypothesis: "以无墨压凹构建留白质感",
  validationAction: null,
  uncertainties: [],
  visualKeywords: ["特种棉纸", "无墨压凹"],
};

describe("Real-World User Scenario Deep Optimizations", () => {
  it("allows designer to add custom priorities and auto-syncs as confirmed decisions", () => {
    const store = createSiftStore(memoryStorage());
    store.setState({ state: sampleConfirmedState });

    expect(store.getState().state?.direction.priorities).toHaveLength(1);

    // Designer adds a custom client requirement
    store.getState().addStatePriority("必须使用环保大豆油墨印刷");

    const state = store.getState().state;
    expect(state?.direction.priorities).toHaveLength(2);
    expect(state?.direction.priorities[1].text).toBe("必须使用环保大豆油墨印刷");
    expect(state?.revision).toBe(2);

    // Decision context has it confirmed
    const ctx = store.getState().getDecisionContext();
    expect(
      ctx.confirmed.some((d) => d.content === "必须使用环保大豆油墨印刷"),
    ).toBe(true);
  });

  it("allows designer to add custom avoidances and auto-syncs as confirmed decisions", () => {
    const store = createSiftStore(memoryStorage());
    store.setState({ state: sampleConfirmedState });

    expect(store.getState().state?.direction.avoid).toHaveLength(1);

    // Designer adds a hard negative constraint
    store.getState().addStateAvoid("严禁使用任何塑料薄膜覆膜");

    const state = store.getState().state;
    expect(state?.direction.avoid).toHaveLength(2);
    expect(state?.direction.avoid[1].text).toBe("严禁使用任何塑料薄膜覆膜");
    expect(state?.revision).toBe(2);

    const ctx = store.getState().getDecisionContext();
    expect(
      ctx.confirmed.some((d) => d.content === "严禁使用任何塑料薄膜覆膜"),
    ).toBe(true);
  });

  it("allows designer to add custom visual keywords and auto-syncs as confirmed decisions", () => {
    const store = createSiftStore(memoryStorage());
    store.setState({ state: sampleConfirmedState });

    expect(store.getState().state?.visualKeywords).toHaveLength(2);

    store.getState().addVisualKeyword("冷灰低饱和");

    const state = store.getState().state;
    expect(state?.visualKeywords).toHaveLength(3);
    expect(state?.visualKeywords).toContain("冷灰低饱和");
    expect(state?.revision).toBe(2);

    const ctx = store.getState().getDecisionContext();
    expect(ctx.confirmed.some((d) => d.content === "冷灰低饱和")).toBe(true);
  });

  it("allows adding custom color hex to visual inspiration palette", () => {
    const store = createSiftStore(memoryStorage());

    const id = store.getState().addVisualInspiration({
      url: "https://example.com/sample.jpg",
      title: "色彩参考",
      palette: ["#FFFFFF", "#000000"],
    });

    // Designer manually adds Pantone / custom HEX color
    const current = store.getState().visualInspirations.find((v) => v.id === id);
    store.getState().updateVisualInspiration(id, {
      palette: [...(current?.palette || []), "#D96B27"],
    });

    const updated = store.getState().visualInspirations.find((v) => v.id === id);
    expect(updated?.palette).toEqual(["#FFFFFF", "#000000", "#D96B27"]);
  });

  it("safely resets session and clears all state when reset() is called", () => {
    const store = createSiftStore(memoryStorage());
    store.setState({
      rawBrief: "测试简报",
      state: sampleConfirmedState,
      briefImages: ["data:image/png;base64,mock"],
    });

    store.getState().reset();

    expect(store.getState().rawBrief).toBe("");
    expect(store.getState().state).toBeNull();
    expect(store.getState().briefImages).toHaveLength(0);
    expect(store.getState().visualInspirations).toHaveLength(0);
  });
});
