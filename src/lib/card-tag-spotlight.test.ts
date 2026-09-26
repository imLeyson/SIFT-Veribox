import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ReactFlowProvider } from "@xyflow/react";
import { useSiftStore } from "@/lib/convergence-store";
import { NodeShell, CARD_TAG_CONFIG } from "@/components/flow/NodeShell";
import { generateDossierMarkdown } from "@/lib/export-dossier";

describe("Module 3: Card Tagging & Collaborative Spotlight System", () => {
  beforeEach(() => {
    useSiftStore.getState().reset();
  });

  it("supports setting, updating, and clearing decision tags in store", () => {
    const store = useSiftStore.getState();

    // Initial state: no tags, filter is 'all'
    expect(store.cardTags).toEqual({});
    expect(store.activeFilterTag).toBe("all");

    // Tag node-1 as primary
    store.setCardTag("node-1", "primary");
    expect(useSiftStore.getState().cardTags["node-1"]).toBe("primary");

    // Tag node-2 as review
    store.setCardTag("node-2", "review");
    expect(useSiftStore.getState().cardTags["node-2"]).toBe("review");

    // Tag node-3 as serendipity
    store.setCardTag("node-3", "serendipity");
    expect(useSiftStore.getState().cardTags["node-3"]).toBe("serendipity");

    // Tag node-4 as stashed
    store.setCardTag("node-4", "stashed");
    expect(useSiftStore.getState().cardTags["node-4"]).toBe("stashed");

    // Update node-2 to primary
    store.setCardTag("node-2", "primary");
    expect(useSiftStore.getState().cardTags["node-2"]).toBe("primary");

    // Clear node-1 tag
    store.setCardTag("node-1", null);
    expect(useSiftStore.getState().cardTags["node-1"]).toBeUndefined();
  });

  it("supports activating and clearing spotlight filter in store", () => {
    const store = useSiftStore.getState();

    store.setActiveFilterTag("review");
    expect(useSiftStore.getState().activeFilterTag).toBe("review");

    store.setActiveFilterTag("primary");
    expect(useSiftStore.getState().activeFilterTag).toBe("primary");

    store.setActiveFilterTag("all");
    expect(useSiftStore.getState().activeFilterTag).toBe("all");
  });

  it("renders decision tag badges and applies spotlight classes in NodeShell", () => {
    const store = useSiftStore.getState();
    store.setCardTag("test-node-primary", "primary");
    store.setCardTag("test-node-other", "review");

    // 1. Normal mode (all): primary node has amber active class
    const htmlNormal = renderToString(
      React.createElement(
        ReactFlowProvider,
        null,
        React.createElement(
          NodeShell,
          {
            kicker: "画面生成",
            title: "极简白瓷冷萃壶",
            nodeId: "test-node-primary",
          },
          React.createElement("div", null, "Card Content")
        )
      )
    );

    expect(htmlNormal).toContain("⭐️");
    expect(htmlNormal).toContain("核心");
    expect(htmlNormal).toContain(CARD_TAG_CONFIG.primary.badgeClass);

    // 2. Spotlight mode: filter by 'primary' -> primary node is spotlighted (scale-[1.01], opacity-100)
    store.setActiveFilterTag("primary");
    const htmlSpotlightMatched = renderToString(
      React.createElement(
        ReactFlowProvider,
        null,
        React.createElement(
          NodeShell,
          {
            kicker: "画面生成",
            title: "极简白瓷冷萃壶",
            nodeId: "test-node-primary",
          },
          React.createElement("div", null, "Card Content")
        )
      )
    );

    expect(htmlSpotlightMatched).toContain("scale-[1.01]");
    expect(htmlSpotlightMatched).toContain("opacity-100");

    // 3. Spotlight mode: filter by 'primary' -> review node is dimmed (opacity-20)
    const htmlSpotlightDimmed = renderToString(
      React.createElement(
        ReactFlowProvider,
        null,
        React.createElement(
          NodeShell,
          {
            kicker: "灵感检索",
            title: "合模线检索",
            nodeId: "test-node-other",
          },
          React.createElement("div", null, "Card Content")
        )
      )
    );

    expect(htmlSpotlightDimmed).toContain("opacity-20");
    expect(htmlSpotlightDimmed).toContain("❓");
    expect(htmlSpotlightDimmed).toContain("待评");
  });

  it("includes collaborative review decision funnel in export dossier", () => {
    const mockStore: any = {
      rawBrief: "高端便携手冲咖啡器具设计",
      state: {
        brief: { goal: "高端手冲咖啡器具", audience: "年轻职场人", deliverable: "便携水壶" },
        constraints: [],
        direction: { intent: { text: "极简纯粹" }, priorities: [], avoid: [], criteria: [] },
      },
      routes: [
        {
          id: "r1",
          title: "纯粹秩序",
          themeName: "纯粹秩序",
          startingPoint: "极简几何",
          coreProblem: "如何平衡留白？",
          purpose: "轻量温润",
          pros: "辨识度高",
          cons: "防廉价塑料感",
          steps: [],
        },
      ],
      customCards: [
        {
          id: "card-img-1",
          type: "imageGen",
          title: "钛金暗黑杯",
          data: { prompt: "8k超写实商业工业摄影，哑光深空灰钛金杯身" },
          position: { x: 0, y: 0 },
        },
        {
          id: "card-plan-1",
          type: "platformPlan",
          title: "Behance工艺分型检索",
          data: {},
          position: { x: 0, y: 0 },
        },
      ],
      cardTags: {
        "card-img-1": "primary",
        "card-plan-1": "review",
        "route-r1": "serendipity",
      },
    };

    const markdown = generateDossierMarkdown(mockStore);

    expect(markdown).toContain("团队协同标记与决策漏斗");
    expect(markdown).toContain("⭐️ 核心主选方案");
    expect(markdown).toContain("钛金暗黑杯");
    expect(markdown).toContain("❓ 待团队/导师重点表决");
    expect(markdown).toContain("Behance工艺分型检索");
    expect(markdown).toContain("💡 突破性意外灵感");
    expect(markdown).toContain("纯粹秩序");
  });
});
