import { describe, it, expect } from "vitest";
import { generateDossierMarkdown } from "./export-dossier";
import type { SiftStore } from "./convergence-store";

describe("generateDossierMarkdown", () => {
  it("generates markdown with brief, direction, chosen route, steps and checklist", () => {
    const mockStore: Partial<SiftStore> = {
      rawBrief: "冷泡茶包装设计，追求克制有品质的日常仪式感，避免红金罐。",
      state: {
        revision: 1,
        validationAction: null,
        status: "confirmed",
        brief: {
          goal: "冷泡茶包装设计",
          audience: "都市白领",
          deliverable: "罐装包装主视觉与材料规范",
        },
        constraints: [
          {
            text: "避免使用大面积高饱和度色彩",
            basis: "user",
            sourceIds: ["brief"],
          },
        ],
        direction: {
          intent: {
            text: "以哑光质感与克制版式传达清冽与日常仪式感",
            basis: "assumption",
            sourceIds: ["brief"],
          },
          priorities: [
            { text: "优先强调天然茶汤原色呈现", basis: "assumption", sourceIds: ["brief"] },
          ],
          avoid: [
            { text: "避免过度繁复的金银烫印与厚重礼盒", basis: "assumption", sourceIds: ["brief"] },
          ],
          criteria: [
            { text: "便利店货架 1 米内识别度", basis: "assumption", sourceIds: ["brief"] },
          ],
        },
        currentHypothesis: "品质感应来自特殊纸张纤维触感，而非繁琐纹样",
        uncertainties: [],
      },
      routes: [
        {
          id: "route-mat",
          title: "纸感光泽与微触觉视觉表达",
          startingPoint: "纸张质朴意象与低反光质感",
          coreProblem: "如何在罐身正面通过质感留白传达清冽仪式感？",
          purpose: "以素雅纸质视觉、微光泽细节与克制排版建立静谧品质感",
          pros: "视觉气质沉静高级，耐看持久",
          cons: "极度考验版式构图与留白比例",
          recommendedReason: "直接切中材质意象与克制留白",
          steps: [
            {
              id: "step-1",
              title: "纸感视觉情绪板与版式序列",
              question: "茶汤透光色与何种纸张色调搭配最显清冽？",
              purpose: "确立第一眼视觉色彩基调",
              deliverables: ["茶汤透光色彩提取色卡", "大地纸感视觉情绪板 3 组"],
              acceptanceCriteria: [
                "已验证品名与产地层级在 1 米内识别清晰",
                "大面积留白形成舒适呼吸感",
              ],
            },
          ],
        },
      ],
      selectedRouteId: "route-mat",
      activeStepId: "step-1",
      completedCriteria: {
        "step-1": ["已验证品名与产地层级在 1 米内识别清晰"],
      },
      stepNotes: {
        "step-1": [
          "在Behance看到这个极简排版不错",
          "参考案例: https://behance.net/gallery/tea-eco",
        ],
      },
      platformPlans: [
        {
          id: "plan-1",
          routeId: "route-mat",
          stepId: "step-1",
          primarySources: [
            {
              id: "behance",
              platform: "Behance",
              roleTag: "完整案例",
              reason: "查看完整包装工程图与结构拆解",
              searchUrl: "https://www.behance.net/search/projects?search=cold+brew+tea",
              keywords: [
                {
                  keyword: "cold brew tea packaging pulp",
                  meaning: "纸模冷萃茶包装全案",
                  language: "en",
                  searchType: "detail",
                  advancedQuery: "cold brew tea packaging -mockup",
                },
              ],
            },
          ],
          alternativeSources: [],
        },
      ],
    };

    const md = generateDossierMarkdown(mockStore);

    expect(md).toContain("# 🎨 SIFT 设计探索与收敛提案简报");
    expect(md).toContain("冷泡茶包装设计");
    expect(md).toContain("以哑光质感与克制版式传达清冽与日常仪式感");
    expect(md).toContain("纸感光泽与微触觉视觉表达");
    expect(md).toContain("纸感视觉情绪板与版式序列");
    // Checklist verification
    expect(md).toContain("[x] 已验证品名与产地层级在 1 米内识别清晰");
    expect(md).toContain("[ ] 大面积留白形成舒适呼吸感");
    expect(md).toContain("1/2 已通过");
    // Notes verification
    expect(md).toContain("在Behance看到这个极简排版不错");
    expect(md).toContain("https://behance.net/gallery/tea-eco");
    // Keywords verification
    expect(md).toContain("cold brew tea packaging pulp");
    expect(md).toContain("cold brew tea packaging -mockup");
  });
});
