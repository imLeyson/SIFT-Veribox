import { completeJson, llmConfigured } from "./llm";

export type CardType = "imageGen" | "platformPlan" | "route" | "state" | "note";

export interface CardChatRequest {
  cardType: CardType;
  cardTitle: string;
  cardData: Record<string, any>;
  upstreamContext?: {
    goal?: string;
    themeName?: string;
    strategyIntent?: string;
    priorities?: string[];
    avoid?: string[];
    criteria?: string[];
  };
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface CardChatResponse {
  reply: string;
  suggestedAction?: {
    type: "update_prompt" | "update_keywords" | "update_theme" | "update_strategy";
    label: string;
    patch: Record<string, any>;
  };
}

/**
 * Heuristic fallback when LLM is unavailable or offline
 */
export function generateFallbackCardChat(req: CardChatRequest): CardChatResponse {
  const lastUserMsg = req.messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
  const { cardType, cardData, upstreamContext } = req;
  const theme = upstreamContext?.themeName || cardData.themeName || "概念设计";

  if (cardType === "imageGen") {
    const currentPrompt = (cardData.prompt as string) || "";
    let revised = currentPrompt;
    let explanation = `已根据你对「${theme}」的调整意见优化提示词：\n\n`;

    if (/材质|质感|骨瓷|阻尼|触感/i.test(lastUserMsg)) {
      revised = `${currentPrompt}，表面采用哑光半透骨瓷微肌理处理，触感温润微阻尼，柔和次表面漫反射，合模分型精细工艺，真实工业样机摄影，8k 超清超写实`;
      explanation += `• **材质肌理**：增强了哑光半透骨瓷与微阻尼触感，弱化刺眼高光；\n• **工艺收口**：强化了精细分型与工业样机实拍质感。`;
    } else if (/光影|侧光|氛围|暗黑|夜间|影棚/i.test(lastUserMsg)) {
      revised = `${currentPrompt}，极简影棚专业布光，45°立体雕塑侧光，柔和环境漫反射，光影转折克制干净，8k 商业摄影大师级构图`;
      explanation += `• **光影调性**：切换为 45° 专业雕塑侧光，强化形体骨架体量感；\n• **背景纯净**：漫反射浅灰影棚背景，凸显轮廓张力。`;
    } else if (/生活|场景|桌面|家居/i.test(lastUserMsg)) {
      revised = `${currentPrompt}，置于当代极简晨光生活居室桌面，天然大理石与白橡木台面，自然柔和晨曦侧逆光，生活美学实景商业大片`;
      explanation += `• **环境融入**：置入极简生活家居场景，增强生活尺度亲和力；\n• **光线真实**：引入自然晨曦漫射侧光。`;
    } else {
      revised = `${currentPrompt}，极简纯粹主义造型，克制微倒角，哑光微肌理漫反射，专业单反 85mm 商业产品摄影`;
      explanation += `• **造型强化**：凸显纯粹几何形体与微倒角张力；\n• **专业实拍**：规避塑料感与玩具模型渲染瑕疵。`;
    }

    return {
      reply: `${explanation}\n\n建议将调整后的提示词应用到当前卡片：`,
      suggestedAction: {
        type: "update_prompt",
        label: "应用更新后的提示词",
        patch: { prompt: revised },
      },
    };
  }

  if (cardType === "platformPlan") {
    return {
      reply: `已为你梳理针对「${theme}」在 Behance 与 Pinterest 的专业去噪检索策略：\n\n• **形态语法**：建议使用 \`minimalist CMF geometry -render\` 排除劣质 3D 样机；\n• **工艺黑话**：建议补充 \`matte surface dampening\`（哑光阻尼度）与 \`subtle parting line\`（合模分型线）。`,
      suggestedAction: {
        type: "update_keywords",
        label: "补充高阶专业去噪词",
        patch: {
          extraQuery: `${theme} industrial CMF design -toy -plastic`,
        },
      },
    };
  }

  if (cardType === "route") {
    return {
      reply: `针对风格主题「${theme}」的血统溯源与差异化建议：\n\n• **核心突破点**：突出纯几何与温润触感的反差张力；\n• **防跑偏提示**：避免过度追求异形导致模具成本失控。`,
      suggestedAction: {
        type: "update_theme",
        label: "优化防跑偏与设计母题",
        patch: {
          cons: "防跑偏：避免为了纯粹极简而牺牲握持功能工效学，杜绝廉价塑料喷漆工艺感。",
        },
      },
    };
  }

  return {
    reply: `已收到针对当前卡片的协同批注，建议在后续汇报与提案中着重突出此项决策考量。`,
  };
}

/**
 * Handle Card Chat Completion
 */
export async function executeCardChat(req: CardChatRequest): Promise<CardChatResponse> {
  if (!llmConfigured()) {
    return generateFallbackCardChat(req);
  }

  const { cardType, cardTitle, cardData, upstreamContext, messages } = req;
  const historyText = messages
    .map((m) => `${m.role === "user" ? "【设计师】" : "【SIFT 顾问】"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `你是一个深谙工业设计、视觉传达与 CMF（色彩/材质/表面处理）的高级设计策略协同顾问（SIFT Copilot）。
当前正在协助设计师在画布上微调特定的单一卡片任务。

【当前卡片类型】: ${cardType}
【卡片标题】: ${cardTitle}
【卡片当前数据】:
${JSON.stringify(cardData, null, 2)}

【上游上下文（Brief 与策略约束）】:
${JSON.stringify(upstreamContext || {}, null, 2)}

【你的职责与原则】:
1. 聚焦针对当前卡片的具体问题给出精炼、专业的设计见解（控制在 150 字以内，条理分明）。
2. 使用专业设计语言（如漫反射、阻尼感、分型线、体量感、光影雕塑、去噪语法等），切忌空洞泛泛而谈。
3. 如果设计师的问题需要对当前卡片进行实质性修改（如微调生图提示词、添加搜索词、修正策略准则），请在返回的 JSON 中明确提供 proposedUpdate。
   - 对于 imageGen：必须输出完整的优质 prompt，可直接用于出图；
   - 对于 platformPlan：输出建议补充的高阶检索词 query；
   - 对于 route：输出建议调整的 pros 或 cons。

【返回格式】必须严格为 JSON 格式：
{
  "reply": "你的专业设计建议与简要解释（支持 markdown 列表）",
  "suggestedAction": {
    "type": "update_prompt" | "update_keywords" | "update_theme" | "update_strategy",
    "label": "按钮上的操作文字，如：应用更新后的提示词",
    "patch": {
      // 具体的更新字段，如 prompt: "..."
    }
  }
}
如果没有实质修改建议，suggestedAction 可为 null。`;

  try {
    const result = await completeJson<{
      reply?: string;
      suggestedAction?: {
        type: "update_prompt" | "update_keywords" | "update_theme" | "update_strategy";
        label: string;
        patch: Record<string, any>;
      };
    }>(systemPrompt, historyText);

    if (result && result.reply) {
      return {
        reply: result.reply,
        suggestedAction: result.suggestedAction || undefined,
      };
    }
    return generateFallbackCardChat(req);
  } catch (err) {
    console.warn("[CardChat LLM Fallback]:", err);
    return generateFallbackCardChat(req);
  }
}
