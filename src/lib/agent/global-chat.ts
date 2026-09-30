import { completeText, llmConfigured } from "./llm";
import {
  AITaskModeSchema,
  AITaskModeTitles,
  type AIClaim,
  type AITaskMode,
  type SuggestedArtifact,
} from "./ai-task";

export interface GlobalChatProjectContext {
  rawBrief?: string;
  goal?: string;
  audience?: string;
  deliverable?: string;
  strategyIntent?: string;
  currentHypothesis?: string;
  constraints?: string[];
  priorities?: string[];
  avoid?: string[];
  criteria?: string[];
  routes?: Array<{
    title: string;
    themeName?: string;
    visualSnapshot?: string;
    pros?: string;
    cons?: string;
    coreProblem?: string;
    isSelected?: boolean;
  }>;
  imageGenPrompts?: string[];
  imageUrls?: string[];
  notes?: string[];
}

export interface GlobalChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GlobalChatRequest {
  context: GlobalChatProjectContext;
  messages: GlobalChatMessage[];
  mode?: AITaskMode;
  sourceCardIds?: string[];
}

export interface GlobalChatResponse {
  mode: AITaskMode;
  title: string;
  reply: string;
  claims: AIClaim[];
  suggestedArtifacts: SuggestedArtifact[];
}

/**
 * Concise fallback when LLM is offline — no filler prose, just structured facts.
 */
export function generateFallbackGlobalChat(req: GlobalChatRequest): GlobalChatResponse {
  const lastUserMsg = req.messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
  const { context } = req;
  const projectGoal = context.goal || context.rawBrief?.slice(0, 40) || "设计项目";
  const selectedTheme = context.routes?.find((r) => r.isSelected) || context.routes?.[0];
  const themeName = selectedTheme?.themeName || selectedTheme?.title || "风格主题";
  const mode = AITaskModeSchema.parse(req.mode ?? "co_create");
  const sourceCardIds = req.sourceCardIds ?? [];

  const makeResult = (
    title: string,
    reply: string,
    claims: AIClaim[],
    suggestedArtifacts: SuggestedArtifact[] = [],
  ): GlobalChatResponse => ({
    mode,
    title,
    reply,
    claims: claims.map((claim) => ({
      ...claim,
      sourceCardIds: claim.sourceCardIds.length ? claim.sourceCardIds : sourceCardIds,
    })),
    suggestedArtifacts,
  });

  if (mode === "judge") {
    const routeList = context.routes?.length
      ? context.routes.map((r, i) => `${i + 1}. ${r.themeName || r.title}：优势 ${r.pros || "待补充"}；风险 ${r.cons || "待补充"}`).join("\n")
      : "暂无可比较的主题";
    return makeResult("方向比较草案", `### 判断比较\n\n${routeList}\n\n- 证据缺口：需要用同一评价标准验证受众匹配、工艺可行性与识别度。\n- 待验证问题：哪些优势来自真实素材，哪些只是渲染表现？\n\n此结果只提供比较依据，不替你选择主推方向。`, [
      { text: "比较依据来自现有主题的优势与风险字段", sourceCardIds, kind: "observation" },
      { text: "需要补充同标准验证证据", sourceCardIds, kind: "inference" },
    ], [{ type: "comparison", title: "方向比较", content: routeList }]);
  }

  if (mode === "synthesize") {
    const notes = context.notes?.slice(-4) ?? [];
    const content = notes.length ? notes.join("\n") : `围绕「${projectGoal}」整理已有画布内容，保留可追溯来源。`;
    return makeResult("阶段性方向整理", `### 整理沉淀\n\n${content}\n\n以上内容只整理已保存片段，尚未加入新的核心判断。`, [
      { text: "内容来自已保存的画布片段", sourceCardIds, kind: "observation" },
    ], [{ type: "route", title: "阶段性方向", content }]);
  }

  // Theme comparison
  if (/对比|评估|主题|路线|差异|好坏|排序/.test(lastUserMsg)) {
    const routeList = context.routes && context.routes.length > 0
      ? context.routes.map((r, i) =>
          `**主题 0${i + 1}《${r.themeName || r.title}》**\n- 优势：${r.pros || "待评估"}\n- 风险：${r.cons || "待评估"}`
        ).join("\n\n")
      : "画布中尚未生成风格主题，请先完成主题推导。";

    return makeResult("风格主题横向对比", `### 风格主题横向对比\n\n${routeList}\n\n请在画布中进一步验证各方案的工艺可行性与客群匹配度。`, [
      { text: "现有主题包含优势与风险字段", sourceCardIds, kind: "observation" },
      { text: "需要进一步验证工艺与客群匹配", sourceCardIds, kind: "recommendation" },
    ]);
  }

  // Report extraction
  if (/汇报|阐述|总结|提炼|策略/.test(lastUserMsg)) {
    return makeResult("策略阐述草稿", `### 策略阐述草稿\n\n针对「${projectGoal}」，当前设计策略围绕 **《${themeName}》** 展开。\n\n- **设计假设**：${context.currentHypothesis || "通过克制的几何微转折与材质触感传达高级感"}\n- **坚持项**：${context.priorities?.join("、") || "待明确"}\n- **避免项**：${context.avoid?.join("、") || "待明确"}\n\n*此为结构化草稿，建议根据具体汇报场景调整措辞。*`, [
      { text: `项目目标为「${projectGoal}」`, sourceCardIds, kind: "observation" },
      { text: "可将当前假设继续转化为验证任务", sourceCardIds, kind: "recommendation" },
    ]);
  }

  // Prompt optimization
  if (/提示词|生图|画面|渲染|prompt/.test(lastUserMsg)) {
    const existingPrompt = context.imageGenPrompts?.[0];
    return makeResult("画面提示词草案", existingPrompt
      ? `### 当前提示词\n\n\`\`\`\n${existingPrompt}\n\`\`\`\n\n建议在此基础上补充具体的光影角度、材质阻尼描述与场景氛围词。`
      : `画布中尚未生成出图提示词，请先在主题卡片下方生成概念画面。`, [
      { text: "提示词来自现有画布资产", sourceCardIds, kind: "observation" },
    ]);
  }

  // Generic fallback — minimal, not filler
  return makeResult("共创发散草案", `已读取「${projectGoal}」的全部画布资产（${context.routes?.length || 0} 个主题）。\n\n可以继续探索多个设计假设，再由你决定哪些片段值得保存。`, [
    { text: "当前上下文包含多个可继续探索的设计线索", sourceCardIds, kind: "observation" },
    { text: "建议先发散多个假设，再选择要保存的片段", sourceCardIds, kind: "recommendation" },
  ]);
}

/**
 * Execute Global Chat — system prompt trimmed to essential directives only.
 */
export async function executeGlobalChat(req: GlobalChatRequest): Promise<GlobalChatResponse> {
  if (!llmConfigured()) {
    return generateFallbackGlobalChat(req);
  }

  const { context, messages } = req;
  const mode = AITaskModeSchema.parse(req.mode ?? "co_create");
  const historyText = messages
    .map((m) => `${m.role === "user" ? "【设计师】" : "【顾问】"}: ${m.content}`)
    .join("\n\n");

  const routesSummary = context.routes && context.routes.length > 0
    ? context.routes
        .map(
          (r, i) =>
            `${i + 1}. 《${r.themeName || r.title}》${r.isSelected ? " [主推]" : ""} — 优势: ${r.pros || "无"} / 风险: ${r.cons || "无"}`,
        )
        .join("\n")
    : "暂无主题";

  const modeInstruction = mode === "co_create"
    ? "当前任务是共创发散：提出多个可探索的设计假设，不要求用户立即选择 A/B/C。"
    : mode === "synthesize"
      ? "当前任务是整理沉淀：只整理上下文中已有、已保存或已连接的内容，不擅自加入新的核心判断。"
      : "当前任务是判断比较：比较优势、风险、冲突和证据缺口；禁止替用户指定主推、设置确认或选择状态。";
  const systemPrompt = `你是 SIFT 的设计策略顾问。基于以下项目上下文回答设计师的问题。

【项目】${context.goal || context.rawBrief || "未命名"}
【受众】${context.audience || "未明确"}
【策略意图】${context.strategyIntent || "未明确"}
【设计假设】${context.currentHypothesis || "暂无"}
【坚持项】${context.priorities?.join("；") || "无"}
【避免项】${context.avoid?.join("；") || "无"}
【风格主题】
${routesSummary}

【本次任务模式】${modeInstruction}

要求：
- 言简意赅，结论先行，不做空泛科普
- 评估时直接指出硬伤与不可替代优势，给出排序建议
- 提炼汇报时用专业设计语言，约 200 字
- 优化提示词时给出可直接复制使用的完整 prompt
- 采用 Markdown 排版`;

  try {
    const result = await completeText(systemPrompt, historyText);
    if (result && result.trim()) {
      return {
        mode,
        title: AITaskModeTitles[mode],
        reply: result.trim(),
        claims: [{ text: "以上内容由当前项目上下文生成，需由设计师确认后保存。", sourceCardIds: req.sourceCardIds ?? [], kind: "inference" }],
        suggestedArtifacts: [],
      };
    }
    return generateFallbackGlobalChat(req);
  } catch (err) {
    console.warn("[GlobalChat LLM Fallback]:", err);
    return generateFallbackGlobalChat(req);
  }
}
