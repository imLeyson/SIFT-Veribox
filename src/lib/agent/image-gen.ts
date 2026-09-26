export interface ImageGenParams {
  prompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
  stylePreset?: "realistic" | "minimal" | "clay" | "cinematic";
  referenceImageUrl?: string;
  refWeight?: number;
}

export interface ImageGenResult {
  url: string;
  revisedPrompt?: string;
  created?: number;
}

const ASPECT_RATIO_SIZE_MAP: Record<string, string> = {
  "1:1": "1024x1024",
  "3:4": "768x1024",
  "4:3": "1024x768",
  "16:9": "1792x1024",
  "9:16": "1024x1792",
};

const STYLE_PROMPT_ENHANCERS: Record<string, string> = {
  realistic: "物性实感, 8k超写实工业设计摄影, 极富触感的真实材质微肌理, 专业影棚漫反射布光, 极简商业静物细节",
  minimal: "极简概念设计, 干净留白与平涂色块, 纯粹极简轮廓, 工业设计CMF概念图",
  clay: "3D黏土微塑风格, 细腻温润哑光触感, 柔和环境光遮蔽, 极具手工温度的立体概念模型",
  cinematic: "电影级质感布光, 强戏剧性阴影与明暗层次, 宽画幅镜头景深, 胶片质感光影",
};

export function buildEnhancedPrompt(prompt: string, stylePreset?: string): string {
  const cleanPrompt = prompt.trim();
  if (!stylePreset || !STYLE_PROMPT_ENHANCERS[stylePreset]) {
    return cleanPrompt;
  }
  const enhancer = STYLE_PROMPT_ENHANCERS[stylePreset];
  // If the prompt is already comprehensive, append enhancer cleanly
  return `${cleanPrompt}，${enhancer}`;
}

export async function generateImageWithGpt(params: ImageGenParams): Promise<ImageGenResult> {
  const baseUrl = (process.env.IMAGE_GEN_BASE_URL || "https://maas.haoee.com/v1").replace(/\/$/, "");
  const apiKey = process.env.IMAGE_GEN_API_KEY || "01M3E3A3SFET040WWR9BMJ3NV1";
  const model = process.env.IMAGE_GEN_MODEL || "gpt-image-2.5";

  if (!apiKey) {
    throw new Error("IMAGE_GEN_API_KEY 未配置");
  }

  const effectivePrompt = buildEnhancedPrompt(params.prompt, params.stylePreset);
  const size = ASPECT_RATIO_SIZE_MAP[params.aspectRatio || "3:4"] || "768x1024";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: effectivePrompt,
        n: 1,
        size,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorMessage = `图像生成服务返回异常 (HTTP ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        if (errorText) {
          errorMessage = `${errorMessage}: ${errorText.slice(0, 150)}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const item = data.data?.[0];

    if (!item?.url && !item?.b64_json) {
      throw new Error("服务未返回有效图片地址");
    }

    const url = item.url || `data:image/png;base64,${item.b64_json}`;

    return {
      url,
      revisedPrompt: item.revised_prompt,
      created: data.created,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("模型出图请求超时 (60s)，请稍后重试");
    }
    throw error;
  }
}
