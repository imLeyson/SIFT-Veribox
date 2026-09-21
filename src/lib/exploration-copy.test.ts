import { describe, expect, it } from "vitest";
import {
  compactText,
  getBriefAnchor,
  getConvergenceAnchor,
  toInspirationCopy,
} from "./exploration-copy";

describe("exploration copy", () => {
  it("keeps the brief anchor compact for a node context row", () => {
    expect(compactText("  冷泡茶\n克制日常感  ", 20)).toBe("冷泡茶 克制日常感");
    expect(getBriefAnchor("很长的原始 brief", "明确的目标")).toBe("明确的目标");
  });

  it("prefers a confirmed convergence judgment over a generic fallback", () => {
    const state = {
      direction: {
        intent: { text: "克制但有触感", basis: "user", sourceIds: ["q1"] },
        priorities: [],
        avoid: [],
        criteria: [],
      },
      currentHypothesis: null,
      brief: { goal: "包装", audience: null, deliverable: null },
    } as never;
    expect(getConvergenceAnchor(state)).toBe("克制但有触感");
  });

  it("reframes execution-heavy generated copy as visual research language", () => {
    expect(toInspirationCopy("生产级案例，需打样与验收测试")).toBe(
      "成熟案例，需质感实拍与判断对照",
    );
  });
});
