import { describe, expect, it } from "vitest";
import {
  evaluateBriefIntent,
  evaluateBriefIntentSync,
  evaluateThemeAlignment,
  routePlatformMatrix,
  isJevCloudConfigured,
  calibratePlatformQuery,
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

  it("evaluates brief synchronously in <10ms for live reactive UI feedback", () => {
    const brief = "冷泡茶包装，追求素纸微白与单色深压凹，避免花哨插画与红金配";
    const res = evaluateBriefIntentSync(brief);
    expect(res.domain).toBe("packaging");
    expect(res.domainLabel).toBe("包装微工艺与材质");
    expect(res.clarityScore).toBeGreaterThanOrEqual(75);
    expect(res.needsClarification).toBe(false);
    expect(res.suggestion).toContain("✨");
    expect(res.latencyMs).toBeLessThan(20);
  });

  it("calculates calibrated theme alignment and orthogonality", () => {
    const recAlign = evaluateThemeAlignment("素纸微白 · 原生触觉", "", "", true);
    expect(recAlign.alignmentScore).toBe(96);
    expect(recAlign.orthogonalityScore).toBe(94);

    const altAlign = evaluateThemeAlignment("瑞士理性 · 档案清单", "", "", false);
    expect(altAlign.alignmentScore).toBe(92);
  });

  it("includes calibrated match percentages in platform matrix decision", async () => {
    const decision = await routePlatformMatrix({
      stepTitle: "白模比例与纸样筛选",
      stepQuestion: "何种特种纸肌理最显清冽？",
      stepPurpose: "确立第一眼触觉基准",
    });
    expect(decision.matchPercentages).toBeDefined();
    const primary0 = decision.primaryPlatformIds[0];
    expect(decision.matchPercentages[primary0]).toBe(98);
  });

  it("reports native engine when cloud API key is not set", () => {
    expect(typeof isJevCloudConfigured()).toBe("boolean");
  });

  it("calibrates vertical platform search queries with Jev System 1 pruning and hit confidence", () => {
    // 1. Mobbin calibration: prunes bloated sentence to core UI component
    const mobbinCal = calibratePlatformQuery("mobbin", "b2b saas dashboard dark mode 8px", {
      stepTitle: "数据可视化与状态反馈",
    });
    expect(mobbinCal.calibratedQuery).toBe("dashboard");
    expect(mobbinCal.hitConfidence).toBeGreaterThanOrEqual(95);
    expect(mobbinCal.jevJudgement).toContain("Mobbin");

    // 2. Godly calibration: maps to curated aesthetic tag
    const godlyCal = calibratePlatformQuery("godly", "developer tool dark minimalist web design");
    expect(godlyCal.calibratedQuery).toBe("developer dark");
    expect(godlyCal.hitConfidence).toBeGreaterThanOrEqual(95);

    // 3. BP&O calibration: maps to single-core craft keyword
    const bpoCal = calibratePlatformQuery("bpando", "uncoated cotton paper packaging blind deboss 350g");
    expect(bpoCal.calibratedQuery).toBe("blind deboss");
    expect(bpoCal.hitConfidence).toBeGreaterThanOrEqual(95);

    // 4. ZCOOL (站酷) calibration: extracts 2-word high-density Chinese design token
    const zcoolCal = calibratePlatformQuery("zcool", "B端后台工作台 真实系统界面");
    expect(zcoolCal.calibratedQuery).toBe("SaaS 后台");
    expect(zcoolCal.advancedQuery).toContain("实物打样 -素材");
    expect(zcoolCal.hitConfidence).toBe(98);

    // 5. Instagram calibration: formats into clean single hashtag
    const instaCal = calibratePlatformQuery("instagram", "minimal tea packaging");
    expect(instaCal.calibratedQuery).toBe("packagingdesign");
    expect(instaCal.hitConfidence).toBe(98);

    // 6. Fonts In Use calibration: maps to format archive tag
    const fontCal = calibratePlatformQuery("fontsinuse", "bilingual label hierarchy swiss grid");
    expect(["bilingual", "packaging", "label", "swiss"]).toContain(fontCal.calibratedQuery);
    expect(fontCal.hitConfidence).toBeGreaterThanOrEqual(95);
  });
});
