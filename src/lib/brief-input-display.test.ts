import { beforeEach, describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ReactFlowProvider } from "@xyflow/react";
import { BriefInputNode } from "@/components/flow/nodes/BriefInputNode";
import { useSiftStore } from "@/lib/convergence-store";

const renderBrief = (data: Record<string, unknown>) => {
  const props = {
    id: "brief-display-test",
    type: "brief",
    data,
    selected: false,
  } as React.ComponentProps<typeof BriefInputNode>;

  return renderToString(
    React.createElement(
      ReactFlowProvider,
      null,
      React.createElement(BriefInputNode, props),
    ),
  );
};

describe("BriefInputNode display", () => {
  beforeEach(() => {
    useSiftStore.getState().reset();
  });

  it("does not render live clarity diagnostics while entering a brief", () => {
    const html = renderBrief({
      rawBrief: "为儿童设计一款温和有趣的牙刷包装",
      state: null,
    });

    expect(html).not.toContain("综合视觉探索");
    expect(html).not.toContain("清晰度");
    expect(html).not.toContain("前置美学感官种子");
  });

  it("does not render sensory seed details after a brief is locked", () => {
    const html = renderBrief({
      rawBrief: "为儿童设计一款温和有趣的牙刷包装",
      state: { brief: { goal: "儿童牙刷包装" } },
    });

    expect(html).not.toContain("前置美学感官种子");
    expect(html).not.toContain("触感:");
    expect(html).not.toContain("光影:");
  });
});
