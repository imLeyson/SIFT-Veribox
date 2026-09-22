import { describe, expect, it } from "vitest";
import { getMockBranchExplore, runBranchExplore } from "./branch-explore";
import type { BranchExploreInput, GeneratedCanvasCard } from "@/types/canvas";

describe("Branch Explore Agent", () => {
  const baseInput: BranchExploreInput = {
    branchId: "b-1",
    inheritedConstraints: [
      {
        id: "c-1",
        sourceItemId: "it-1",
        type: "text",
        title: "材质要求",
        content: "350g触感特种纸，无墨微压凹",
      },
      {
        id: "c-2",
        sourceItemId: "it-2",
        type: "text",
        title: "排版规范",
        content: "75%呼吸负空间，8pt微字阶",
      },
    ],
    discardedItems: ["拒绝荧光高饱和色", "拒绝大面积商业宣传贴图"],
    userPrompt: "深化开箱触感与字阶对比",
    explorationMode: "high_constraint",
  };

  it("produces deterministic mock cards adhering to inherited constraints in high_constraint mode", () => {
    const output = getMockBranchExplore(baseInput);

    expect(output.branchSummary).toContain("350g触感特种纸");
    expect(output.generatedCards.length).toBeGreaterThanOrEqual(2);

    const firstCard = output.generatedCards[0];
    expect(firstCard.title).toBeTruthy();
    expect(firstCard.content).toBeTruthy();
    expect(firstCard.tags.length).toBeGreaterThan(0);
    expect(firstCard.hypothesis).toBeTruthy();
  });

  it("produces 3 exploratory cards in low_constraint mode", () => {
    const lowInput: BranchExploreInput = {
      ...baseInput,
      explorationMode: "low_constraint",
    };
    const output = getMockBranchExplore(lowInput);

    expect(output.generatedCards).toHaveLength(3);
    const titles = output.generatedCards.map((c: GeneratedCanvasCard) => c.title);
    expect(titles[0]).toContain("原生肌理");
    expect(titles[1]).toContain("微字阶");
    expect(titles[2]).toContain("桌面静物");
  });

  it("runBranchExplore returns valid contract in mock fallback environment", async () => {
    const output = await runBranchExplore(baseInput);
    expect(output.generatedCards.length).toBeGreaterThanOrEqual(2);
    expect(output.branchSummary).toBeTruthy();
  });
});
