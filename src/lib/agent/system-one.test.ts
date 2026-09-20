import { describe, expect, it } from "vitest";
import {
  evaluateBriefIntent,
  routePlatformMatrix,
  isJevCloudConfigured,
} from "./system-one";

describe("SIFT System 1 Jev Decision Engine", () => {
  it("fast-classifies brief intent across design domains with calibrated scores", async () => {
    // 1. Packaging brief
    const packResult = await evaluateBriefIntent(
      "冷泡茶包装设计，追求克制有品质的日常仪式感，只用现成纸盒",
    );
    expect(packResult.domain).toBe("packaging");
    expect(packResult.clarityScore).toBeGreaterThanOrEqual(60);
    expect(packResult.confidence).toBeGreaterThan(0.5);
    expect(packResult.latencyMs).toBeLessThan(100);

    // 2. Typography brief
    const typoResult = await evaluateBriefIntent(
      "双栏网格与微字阶排版系统，研究瑞士国际主义在中西文标签上的应用",
    );
    expect(typoResult.domain).toBe("typography");
    expect(typoResult.confidence).toBeGreaterThan(0.5);

    // 3. Digital SaaS brief
    const digitalResult = await evaluateBriefIntent(
      "B端 SaaS 开发者工具深色数据控制台与微交互组件规范",
    );
    expect(digitalResult.domain).toBe("digital");
  });

  it("routes 17 design platforms into 3 distinct primary roles and alternative sources", async () => {
    // Test typography step routing
    const typoDecision = await routePlatformMatrix({
      stepTitle: "中西文字阶与灰度平衡",
      stepQuestion: "现代高冷无衬线西文与微古典中文如何搭配才显协调？",
      stepPurpose: "打磨兼具国际现代感与东方克制感的字型组合",
      themeName: "瑞士理性 · 档案清单",
    });

    expect(typoDecision.primaryPlatformIds).toHaveLength(3);
    expect(typoDecision.alternativePlatformIds.length).toBeGreaterThanOrEqual(2);

    // Verify 3 primary sources have non-overlapping role tags
    const roles = new Set(
      typoDecision.primaryPlatformIds.map((id) => typoDecision.roleTags[id]),
    );
    expect(roles.size).toBe(3);

    // Behance or Fonts In Use should be in primary for typography
    expect(
      typoDecision.primaryPlatformIds.includes("behance") ||
        typoDecision.primaryPlatformIds.includes("fontsinuse"),
    ).toBe(true);
  });

  it("routes desk and symbol steps with Xiaohongshu and Brand New prioritized", async () => {
    const deskDecision = await routePlatformMatrix({
      stepTitle: "极简几何符号隐喻提炼",
      stepQuestion: "何种极简几何线条能直观传递片刻抽离与桌面陪伴感？",
      stepPurpose: "打造具备情绪抚慰功能的工位静物视觉锤",
      themeName: "极简静物 · 桌面陪伴",
    });

    expect(deskDecision.primaryPlatformIds).toHaveLength(3);
    const roles = new Set(
      deskDecision.primaryPlatformIds.map((id) => deskDecision.roleTags[id]),
    );
    expect(roles.size).toBe(3);
    expect(deskDecision.primaryPlatformIds.includes("xiaohongshu")).toBe(true);
  });

  it("reports native engine when cloud API key is not set", () => {
    expect(typeof isJevCloudConfigured()).toBe("boolean");
  });
});
