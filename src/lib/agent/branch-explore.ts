import {
  BranchExploreInputSchema,
  BranchExploreOutputSchema,
} from "./canvas-schema";
import type {
  BranchExploreInput,
  BranchExploreOutput,
  BranchConstraint,
} from "@/types/canvas";
import { completeJson, llmConfigured } from "./llm";

const SYSTEM_PROMPT = `你是 SIFT 画布分支探索 Agent（Branch Exploration Specialist），充当资深设计总监与实战派视觉策略搭档。
设计师在无限画布上发散探索，并已经为你提供了若干条【确定项约束（Inherited Constraints）】以及明确【舍弃的内容（Discarded Items）】。

【核心任务】：
基于继承的确定项作为不可侵犯的硬约束，为当前分支推导 2~3 张具有高度画面感、互补且具体的视觉探索卡片（Canvas Cards），并给出一段精炼的分支主旨总结。

【三大铁律】：
1. 【硬约束绝对贯彻】：新卡片必须严格继承并贯彻所有确定项（如特定纸张材质、低饱和配色、极简微字阶等），绝不提出违背确定项的相悖方案！
2. 【舍弃项彻底排除】：绝对不能再次引入任何已被设计师标记为“舍弃”的元素、手法或风格词！
3. 【画面呈象第一，严禁假大空与AI味】：
   - 绝不使用“赋能、多维共鸣、叙事解构、心流体验、高级感、轻奢风”等空洞公关套话。
   - 必须使用设计师在工位上的真实专业词汇（如：350g触感棉纸、无墨深压凹、75%负空间、8pt微字阶、非对称双栏网格、漫反射哑光质感）。

【探索模式区别】：
- high_constraint（高约束深化）：围绕确定项做微观聚焦与具体工艺/排版深化，提供可直接验证的细节方案。
- low_constraint（低约束发散）：在遵守硬约束和排除舍弃项的前提下，探索 2~3 种不同切入视点的可能性。

【返回 JSON 规范】：
{
  "branchSummary": "一句话精炼总结当前分支的探索核心主旨与推导逻辑（≤200字）",
  "generatedCards": [
    {
      "title": "卡片标题（4~16字，如【触感压凹】350g棉纸无墨微压）",
      "content": "具象详实的手法描绘，说明材质、比例、视觉组织与光影特征（80~200字）",
      "tags": ["标签1", "标签2"],
      "hypothesis": "本张卡片验证的设计假设（如：通过触觉阻尼感强化高品质日常仪式）"
    }
  ]
}
`;

export function getMockBranchExplore(input: BranchExploreInput): BranchExploreOutput {
  const constraintsSummary = input.inheritedConstraints
    .map((c: BranchConstraint) => c.content)
    .join("，") || "极简克制与质感表达";

  const userFocus = input.userPrompt?.trim() || "";
  const isLow = input.explorationMode === "low_constraint";

  if (isLow) {
    return {
      branchSummary: `基于「${constraintsSummary.slice(0, 40)}」的发散探索，从三个正交视点切入拓展视觉可能性。`,
      generatedCards: [
        {
          title: "【物性本真】原生肌理与无墨压凹",
          content: "保留未涂布特种纸的原生粗糙触感与微植物杂色纤维，品牌信息完全依赖无墨深压凹（Deboss）形成光影浮雕，杜绝油墨厚重感。",
          tags: ["原生纸感", "无墨压凹", "物理触觉"],
          hypothesis: "物理触感的高反差能让使用者在未阅读文字前建立原生纯净的第一感知。",
        },
        {
          title: "【微字阶尺度】档案式严谨信息构图",
          content: "采用 7pt~9pt 的精细无衬线排印与微细分割线，模拟实验档案或植物标本卡片的冷峻排版，大面积负空间留白维持克制。",
          tags: ["微字阶", "档案构图", "留白秩序"],
          hypothesis: "档案式的排版语汇能够传递理性、专业的品质信赖感。",
        },
        {
          title: "【桌面静物感】低介入几何器物形态",
          content: "包装弱化商业营销标语，将整体轮廓打磨成类似现代桌面石膏静物的几何体块，自然融入居家与办公环境。",
          tags: ["桌面静物", "低介入", "器物美学"],
          hypothesis: "去除广告感的产品更容易长期陈列于日常工作台，成为生活陪伴物。",
        },
      ],
    };
  }

  // High constraint mode
  return {
    branchSummary: `严格锁定约束「${constraintsSummary.slice(0, 40)}」${userFocus ? ` 并深化「${userFocus}」` : ""}，聚焦材质工艺与精细排版的微观落地推导。`,
    generatedCards: [
      {
        title: "【工艺微观参数】350g触感棉纸与0.4mm盲压",
        content: `贯彻已有约束，主面选用 350g 哑光触感特种棉纸，核心字标采用 0.4mm 模具精细盲压。侧面附以单色灰度细字配比，避免任何视觉抢夺。${userFocus ? `针对需求深化：${userFocus}。` : ""}`,
        tags: ["工艺参数", "棉纸触感", "盲压深度"],
        hypothesis: "通过毫米级的深度控制呈现隐敛的光影转折，满足近距离把玩的精致感。",
      },
      {
        title: "【双栏网格律动】70%负空间与非对称留白",
        content: "严格遵守去噪原则，左侧 30% 区域收纳必须的产地、克重与使用指引，右侧 70% 形成完整呼吸负空间，营造东方式的清醒与安定感。",
        tags: ["非对称网格", "负空间", "呼吸节奏"],
        hypothesis: "高比例留白能有效抵御货架信息的焦虑感，让包装具有独特的静止力。",
      },
    ],
  };
}

export async function liveBranchExplore(
  input: BranchExploreInput,
): Promise<BranchExploreOutput> {
  const prompt = `
【继承的确定项约束 (必须严格贯彻)】：
${input.inheritedConstraints.length > 0 ? input.inheritedConstraints.map((c: BranchConstraint, i: number) => `${i + 1}. [${c.type}] ${c.title ? `${c.title}: ` : ""}${c.content}`).join("\n") : "暂无硬性确定约束，基于 Brief 主旨进行探索"}

【已标记舍弃的内容 (绝对禁止引入)】：
${input.discardedItems && input.discardedItems.length > 0 ? input.discardedItems.map((d: string, i: number) => `${i + 1}. ${d}`).join("\n") : "无"}

【探索模式】：
${input.explorationMode === "low_constraint" ? "低约束多向发散模式" : "高约束垂直深化模式"}

【用户针对本分支的额外探索要求】：
${input.userPrompt?.trim() || "围绕当前确定项，给出深化与探索的具象方案"}

请严格输出符合格式的 JSON，包含 branchSummary 和 2~3 个具象设计的 generatedCards。
`;

  const raw = await completeJson<BranchExploreOutput>(
    SYSTEM_PROMPT,
    prompt,
  );

  return BranchExploreOutputSchema.parse(raw);
}

export async function runBranchExplore(
  value: BranchExploreInput,
): Promise<BranchExploreOutput> {
  const input = BranchExploreInputSchema.parse(value);

  if (llmConfigured()) {
    try {
      return await liveBranchExplore(input);
    } catch {
      // Graceful fallback to deterministic mock if live LLM errors
      return getMockBranchExplore(input);
    }
  }

  return getMockBranchExplore(input);
}
