import type { PlatformPlan, PlatformSource, PlatformKeyword } from "@/types/routes";
import { completeJson } from "./llm";
import type { z } from "zod";
import type { PlatformPlanInputSchema } from "./routes-schema";
import { buildPlatformSearchUrl, PLATFORM_REGISTRY } from "./platform-registry";

type PlatformPlanInput = z.infer<typeof PlatformPlanInputSchema>;

const SYSTEM = `你是 SIFT 搜索计划与关键词 Agent。
设计师已确认设计方向，并选择了具体路线与当前探索步骤。
你的任务是为当前这一个具体步骤，生成一份高效、精准的外部平台搜索计划。

规则要求：
1. 平台必须来自注册表：
   - Pinterest（视觉扩散：意象、情绪板、色彩质感）
   - Behance（完整项目验证：完整落地案、推演过程、系统规范）
   - 小红书（中文语境与消费场景：本土真实晒单、买点、用户评价）
   - Instagram（场景和趋势参考：主理人切片、前沿动态、小众品牌）
   - Dribbble（数字产品与界面参考：微交互、高保真组件、排版小样）
   - Google / 品牌官网搜索（品牌验证与跨品类检索：行业报告、官方规范、学术研究）
2. 动态排序：根据当前步骤的探索重点（例如是先看材质？还是先看网格？还是先看用户真实评价？）动态决定哪个平台排第一。
3. 必须返回正好 3 个主来源（primarySources），且 3 个主来源的角色（roleTag）必须完全不同！
4. 必须返回 2–4 个备选来源（alternativeSources）。
5. 每个平台提供 2–4 个可直接在搜索框使用的关键词：
   - 包含中英双语关键词；
   - 英文关键词给出具体的中文释义（说明它搜出来的是什么视觉参考）；
   - 中文关键词给出具体的使用说明（说明在中文平台中如何切中用户真实心智）；
   - 关键词必须深度结合当前步骤的具体问题与目的，严禁返回毫无针对性的泛化大词（如只搜“包装”、“设计”、“好看”）。
6. 返回且仅返回纯 JSON，格式如下：
{
  "primarySources": [
    {
      "platform": "平台名（如 Pinterest）",
      "roleTag": "能力标签（如 视觉扩散）",
      "reason": "为什么在当前步骤将该平台排在这一顺序的理由",
      "keywords": [
        {"keyword": "具体英文检索词", "meaning": "该词搜索意图与释义", "language": "en"},
        {"keyword": "具体中文检索词", "meaning": "中文语境下的检索切入点", "language": "zh"}
      ]
    }
  ],
  "alternativeSources": [
    {
      "platform": "备选平台名",
      "roleTag": "备选能力标签",
      "reason": "作为备选平台的理由",
      "keywords": [
        {"keyword": "检索词1", "meaning": "释义", "language": "en"},
        {"keyword": "检索词2", "meaning": "释义", "language": "zh"}
      ]
    }
  ]
}`;

type RecordLike = Record<string, unknown>;
function record(v: unknown): RecordLike {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as RecordLike)
    : {};
}

function nonEmpty(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

export function normalizeLivePlatformPayload(
  raw: unknown,
  input: PlatformPlanInput,
): {
  sessionId: string;
  requestId: string;
  plan: PlatformPlan;
} {
  const root = record(raw);
  const rawPrimary = Array.isArray(root.primarySources)
    ? root.primarySources.map(record)
    : [];
  const rawAlternative = Array.isArray(root.alternativeSources)
    ? root.alternativeSources.map(record)
    : [];

  const registeredList = Object.values(PLATFORM_REGISTRY);

  function normalizeKeywords(rawKws: unknown[]): PlatformKeyword[] {
    const list: PlatformKeyword[] = [];
    for (const item of rawKws) {
      const rec = record(item);
      const kw = nonEmpty(rec.keyword, "");
      if (!kw) continue;
      const lang = rec.language === "en" || rec.language === "zh" ? rec.language : /[\u4e00-\u9fa5]/.test(kw) ? "zh" : "en";
      list.push({
        keyword: kw,
        meaning: nonEmpty(rec.meaning, "探索参考检索词"),
        language: lang,
      });
    }
    while (list.length < 2) {
      const idx = list.length + 1;
      list.push({
        keyword: `${input.currentStep.title} 案例 ${idx}`,
        meaning: "对应当前步骤的基础参考词",
        language: "zh",
      });
    }
    return list.slice(0, 4);
  }

  function normalizeSource(
    s: RecordLike,
    fallbackReg: (typeof registeredList)[0],
    index: number,
  ): PlatformSource {
    const platformName = nonEmpty(s.platform, fallbackReg.name);
    const reg =
      registeredList.find(
        (p) =>
          p.name.toLowerCase() === platformName.toLowerCase() ||
          p.id === platformName.toLowerCase(),
      ) ?? fallbackReg;

    const keywords = normalizeKeywords(
      Array.isArray(s.keywords) ? s.keywords : [],
    );
    const firstKw = keywords[0]?.keyword ?? input.currentStep.title;

    return {
      id: nonEmpty(s.id, `src_${reg.id}_${index + 1}`),
      platform: reg.name,
      roleTag: nonEmpty(s.roleTag, reg.roleTag),
      reason: nonEmpty(s.reason, reg.description),
      keywords,
      searchUrl: buildPlatformSearchUrl(reg.id, firstKw),
    };
  }

  const usedPlatforms = new Set<string>();
  const usedRoles = new Set<string>();

  const primarySources: PlatformSource[] = [];
  for (let i = 0; i < rawPrimary.length && primarySources.length < 3; i++) {
    const item = rawPrimary[i];
    const source = normalizeSource(item, registeredList[i % registeredList.length], i);
    if (!usedPlatforms.has(source.platform) && !usedRoles.has(source.roleTag)) {
      usedPlatforms.add(source.platform);
      usedRoles.add(source.roleTag);
      primarySources.push(source);
    }
  }

  // If fewer than 3 primary sources, fill with unused platforms
  for (const reg of registeredList) {
    if (primarySources.length >= 3) break;
    if (!usedPlatforms.has(reg.name) && !usedRoles.has(reg.roleTag)) {
      usedPlatforms.add(reg.name);
      usedRoles.add(reg.roleTag);
      const kws: PlatformKeyword[] = [
        {
          keyword: `${input.currentStep.title} ${reg.roleTag}`,
          meaning: `${reg.name} 上的 ${reg.roleTag} 参考`,
          language: "zh",
        },
        {
          keyword: `minimal ${reg.name.toLowerCase()} design reference`,
          meaning: "英文高质量设计标杆参考",
          language: "en",
        },
      ];
      primarySources.push({
        id: `src_${reg.id}_${primarySources.length + 1}`,
        platform: reg.name,
        roleTag: reg.roleTag,
        reason: reg.description,
        keywords: kws,
        searchUrl: buildPlatformSearchUrl(reg.id, kws[0].keyword),
      });
    }
  }

  const alternativeSources: PlatformSource[] = [];
  for (let i = 0; i < rawAlternative.length && alternativeSources.length < 4; i++) {
    const item = rawAlternative[i];
    const source = normalizeSource(
      item,
      registeredList[(i + 3) % registeredList.length],
      i + 3,
    );
    if (!usedPlatforms.has(source.platform)) {
      usedPlatforms.add(source.platform);
      alternativeSources.push(source);
    }
  }

  // Ensure 2 to 4 alternative sources
  for (const reg of registeredList) {
    if (alternativeSources.length >= 2) break;
    if (!usedPlatforms.has(reg.name)) {
      usedPlatforms.add(reg.name);
      const kws: PlatformKeyword[] = [
        {
          keyword: `${input.currentStep.title} 备选`,
          meaning: `在 ${reg.name} 上拓展寻找更多可能性`,
          language: "zh",
        },
        {
          keyword: "creative design benchmark",
          meaning: "跨领域创意标杆",
          language: "en",
        },
      ];
      alternativeSources.push({
        id: `src_alt_${reg.id}_${alternativeSources.length + 1}`,
        platform: reg.name,
        roleTag: reg.roleTag,
        reason: reg.description,
        keywords: kws,
        searchUrl: buildPlatformSearchUrl(reg.id, kws[0].keyword),
      });
    }
  }

  return {
    sessionId: input.sessionId,
    requestId: input.requestId,
    plan: {
      id: `plan_${input.selectedRoute.id}_${input.currentStep.id}`,
      routeId: input.selectedRoute.id,
      stepId: input.currentStep.id,
      primarySources,
      alternativeSources,
    },
  };
}

export function livePlatformPlan(input: PlatformPlanInput): Promise<unknown> {
  return completeJson(SYSTEM, JSON.stringify(input), "none").then((payload) =>
    normalizeLivePlatformPayload(payload, input),
  );
}
