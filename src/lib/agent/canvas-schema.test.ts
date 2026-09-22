import { describe, expect, it } from "vitest";
import {
  CanvasItemSchema,
  BranchSchema,
  SchemeGroupSchema,
  BranchExploreInputSchema,
  BranchExploreOutputSchema,
} from "./canvas-schema";

describe("Canvas Schema", () => {
  it("validates a text CanvasItem with defaults", () => {
    const item = CanvasItemSchema.parse({
      id: "item-1",
      type: "text",
      branchId: "branch-root",
      title: "核心意图",
      content: "都市上班族冷泡茶，克制极简",
    });

    expect(item.status).toBe("undetermined");
    expect(item.tags).toEqual([]);
    expect(item.createdAt).toBeGreaterThan(0);
  });

  it("validates an image CanvasItem with determined status", () => {
    const item = CanvasItemSchema.parse({
      id: "img-1",
      type: "image",
      branchId: "branch-root",
      status: "determined",
      title: "参考素材",
      content: "特种纸质感",
      imageUrl: "https://example.com/paper.jpg",
      tags: ["texture", "paper"],
    });

    expect(item.status).toBe("determined");
    expect(item.imageUrl).toBe("https://example.com/paper.jpg");
    expect(item.tags).toContain("texture");
  });

  it("validates a Branch with inherited constraints", () => {
    const branch = BranchSchema.parse({
      id: "branch-2",
      name: "分支探索：特种纸与微字阶",
      parentId: "branch-root",
      sourceNodeId: "item-1",
      inheritedConstraints: [
        {
          id: "c-1",
          sourceItemId: "item-1",
          type: "text",
          content: "都市上班族冷泡茶，克制极简",
          title: "核心意图",
        },
      ],
    });

    expect(branch.parentId).toBe("branch-root");
    expect(branch.inheritedConstraints).toHaveLength(1);
  });

  it("validates SchemeGroup creation and collapse toggle", () => {
    const group = SchemeGroupSchema.parse({
      id: "scheme-1",
      name: "方案一：极致冷冽纸感",
      itemIds: ["item-1", "img-1"],
      color: "#3B82F6",
    });

    expect(group.collapsed).toBe(false);
    expect(group.itemIds).toHaveLength(2);
  });

  it("validates BranchExplore input and output contract", () => {
    const input = BranchExploreInputSchema.parse({
      branchId: "branch-2",
      inheritedConstraints: [
        {
          id: "c-1",
          sourceItemId: "item-1",
          type: "text",
          content: "冷泡茶极简排版",
        },
      ],
      discardedItems: ["不要荧光色和大插画"],
      userPrompt: "深化纸张克重与压凹工艺",
      explorationMode: "high_constraint",
    });

    expect(input.explorationMode).toBe("high_constraint");
    expect(input.discardedItems).toContain("不要荧光色和大插画");

    const output = BranchExploreOutputSchema.parse({
      branchSummary: "围绕特种纸压凹工艺与微字阶排版展开的深度视觉方案",
      generatedCards: [
        {
          title: "微字阶呼吸留白",
          content: "75% 负空间配合 8pt 微字阶，营造克制秩序感",
          tags: ["排版", "留白"],
          hypothesis: "通过极致文字比例传达专业冷静的产品心智",
        },
      ],
    });

    expect(output.generatedCards).toHaveLength(1);
    expect(output.generatedCards[0].tags).toContain("留白");
  });
});
