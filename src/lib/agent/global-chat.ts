import { completeJson, completeText, llmConfigured } from "./llm";

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
}

export interface GlobalChatResponse {
  reply: string;
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

  // Theme comparison
  if (/对比|评估|主题|路线|差异|好坏|排序/.test(lastUserMsg)) {
    const routeList = context.routes && context.routes.length > 0
      ? context.routes.map((r, i) =>
          `**主题 0${i + 1}《${r.themeName || r.title}》**\n- 优势：${r.pros || "待评估"}\n- 风险：${r.cons || "待评估"}`
        ).join("\n\n")
      : "画布中尚未生成风格主题，请先完成主题推导。";

    return {
      reply: `### 风格主题横向对比\n\n${routeList}\n\n当前主推：**《${themeName}》**。建议在画布中进一步验证各方案的工艺可行性与客群匹配度。`,
    };
  }

  // Report extraction
  if (/汇报|阐述|总结|提炼|策略/.test(lastUserMsg)) {
    return {
      reply: `### 策略阐述草稿\n\n针对「${projectGoal}」，当前设计策略以 **《${themeName}》** 为主推方向。\n\n- **设计假设**：${context.currentHypothesis || "通过克制的几何微转折与材质触感传达高级感"}\n- **坚持项**：${context.priorities?.join("、") || "待明确"}\n- **避免项**：${context.avoid?.join("、") || "待明确"}\n\n*此为结构化草稿，建议根据具体汇报场景调整措辞。*`,
    };
  }

  // Prompt optimization
  if (/提示词|生图|画面|渲染|prompt/.test(lastUserMsg)) {
    const existingPrompt = context.imageGenPrompts?.[0];
    return {
      reply: existingPrompt
        ? `### 当前提示词\n\n\`\`\`\n${existingPrompt}\n\`\`\`\n\n建议在此基础上补充具体的光影角度、材质阻尼描述与场景氛围词。`
        : `画布中尚未生成出图提示词，请先在主题卡片下方生成概念画面。`,
    };
  }

  // Generic fallback — minimal, not filler
  return {
    reply: `已读取「${projectGoal}」的全部画布资产（${context.routes?.length || 0} 个主题）。请具体描述您需要评估、提炼或优化的内容。`,
  };
}

/**
 * Execute Global Chat — system prompt trimmed to essential directives only.
 */
export async function executeGlobalChat(req: GlobalChatRequest): Promise<GlobalChatResponse> {
  if (!llmConfigured()) {
    return generateFallbackGlobalChat(req);
  }

  const { context, messages } = req;
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

  const systemPrompt = `你是 SIFT 的设计策略顾问。基于以下项目上下文回答设计师的问题。

【项目】${context.goal || context.rawBrief || "未命名"}
【受众】${context.audience || "未明确"}
【策略意图】${context.strategyIntent || "未明确"}
【设计假设】${context.currentHypothesis || "暂无"}
【坚持项】${context.priorities?.join("；") || "无"}
【避免项】${context.avoid?.join("；") || "无"}
【风格主题】
${routesSummary}

要求：
- 言简意赅，结论先行，不做空泛科普
- 评估时直接指出硬伤与不可替代优势，给出排序建议
- 提炼汇报时用专业设计语言，约 200 字
- 优化提示词时给出可直接复制使用的完整 prompt
- 采用 Markdown 排版`;

  try {
    const result = await completeText(systemPrompt, historyText);
    if (result && result.trim()) {
      return { reply: result.trim() };
    }
    return generateFallbackGlobalChat(req);
  } catch (err) {
    console.warn("[GlobalChat LLM Fallback]:", err);
    return generateFallbackGlobalChat(req);
  }
}
