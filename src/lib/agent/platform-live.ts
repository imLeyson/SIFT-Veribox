import type { PlatformPlan, PlatformSource, PlatformKeyword } from "@/types/routes";
import { completeJson } from "./llm";
import type { z } from "zod";
import type { PlatformPlanInputSchema } from "./routes-schema";
import { buildPlatformSearchUrl, PLATFORM_REGISTRY } from "./platform-registry";

type PlatformPlanInput = z.infer<typeof PlatformPlanInputSchema>;

const SYSTEM = `你是 SIFT 搜索计划与关键词 Agent。
设计师已确认设计方向，并选择了具体路线与当前探索步骤。
你的任务是为当前这一个具体步骤，生成一份高效、精准的外部平台搜索计划。

规则要求（设计师专业搜索心智）：
1. 平台必须来自注册表：
   - Pinterest（视觉扩散：意象、情绪板、色彩质感）
   - Behance（完整项目验证：完整落地案、推演过程、系统规范）
   - 小红书（中文语境与消费场景：本土真实晒单、买点、用户评价）
   - Instagram（场景和趋势参考：主理人切片、前沿动态、小众品牌）
   - Dribbble（数字产品与界面参考：微交互、高保真组件、排版小样）
   - Google / 品牌官网搜索（品牌验证与跨品类检索：行业报告、官方规范、学术研究）
2. 动态排序：根据当前步骤的探索重点（例如是先看材质？还是先看网格？还是先看真实晒单？）动态决定哪个平台排第一。
3. 必须返回正好 3 个主来源（primarySources），且 3 个主来源的角色（roleTag）必须完全不同！
4. 必须返回 2–4 个备选来源（alternativeSources）。
5. 专业设计检索公式：严禁生成“包装”、“设计”、“好看”等毫无针对性的泛化大词！
   关键词结构必须遵循：[设计流派/风格] + [载体/媒介] + [美学/工艺特征]（如 swiss typography grid system packaging、tactile embossed paper packaging）。
   若 state.visualKeywords 存在，必须优先将其中提取的核心视觉关键词（色彩基调、排版层级、材质肌理）融入各平台的检索词与高级语法中。
6. 中英双语精准分工：
   - 英文关键词：面向海外社区（Behance/Pinterest/Dribbble/IG），包含流派/大师风格或工艺术语，附带中文精准释义；
   - 中文关键词：面向本土消费心智（小红书/国内行业库），直击真实打卡晒单、买点评价与用户痛点；
   - 标注 searchType："moodboard"（情绪板）| "detail"（微观细节）| "consumer"（消费语境）| "benchmark"（标杆案）。
7. 高级去样机语法（Anti-Mockup Syntax）：
   - Behance 与 Pinterest 充斥劣质样机贴图模板，必须为首要关键词生成 advancedQuery，自动附带 -mockup -template（如 swiss typography packaging -mockup -template）；
   - 小红书生成本土精准避坑语法（如 包装版式 留白 实拍 -广告）。
8. 返回且仅返回纯 JSON，格式如下：
{
  "primarySources": [
    {
      "platform": "平台名（如 Behance）",
      "roleTag": "能力标签（如 完整项目验证）",
      "reason": "为什么在当前步骤将该平台排在这一顺序的理由",
      "keywords": [
        {
          "keyword": "具体英文检索词",
          "meaning": "该词搜索意图与释义",
          "language": "en",
          "searchType": "benchmark",
          "advancedQuery": "具体英文检索词 -mockup -template"
        },
        {
          "keyword": "具体中文检索词",
          "meaning": "中文语境下的检索切入点",
          "language": "zh",
          "searchType": "consumer",
          "advancedQuery": "具体中文检索词 实拍 -广告"
        }
      ]
    }
  ],
  "alternativeSources": [
    {
      "platform": "备选平台名",
      "roleTag": "备选能力标签",
      "reason": "作为备选平台的理由",
      "keywords": [
        {
          "keyword": "检索词1",
          "meaning": "释义",
          "language": "en",
          "searchType": "detail"
        },
        {
          "keyword": "检索词2",
          "meaning": "释义",
          "language": "zh",
          "searchType": "consumer"
        }
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

  function normalizeKeywords(rawKws: unknown[], regId: string): PlatformKeyword[] {
    const list: PlatformKeyword[] = [];
    const validSearchTypes = ["moodboard", "detail", "consumer", "benchmark"] as const;

    for (const item of rawKws) {
      const rec = record(item);
      const kw = nonEmpty(rec.keyword, "");
      if (!kw) continue;
      const lang = rec.language === "en" || rec.language === "zh" ? rec.language : /[\u4e00-\u9fa5]/.test(kw) ? "zh" : "en";
      const st = typeof rec.searchType === "string" && (validSearchTypes as readonly string[]).includes(rec.searchType)
        ? (rec.searchType as (typeof validSearchTypes)[number])
        : lang === "zh" ? "consumer" : "detail";

      let adv = typeof rec.advancedQuery === "string" && rec.advancedQuery.trim()
        ? rec.advancedQuery.trim()
        : "";

      if (!adv) {
        if (regId === "behance" || regId === "pinterest") {
          adv = kw.includes("-mockup") ? kw : `${kw} -mockup -template`;
        } else if (regId === "xiaohongshu") {
          adv = kw.includes("-广告") ? kw : `${kw} 实拍 -广告`;
        } else if (regId === "instagram") {
          adv = kw.startsWith("#") ? kw : `#${kw.replace(/[\s#]+/g, "")}`;
        }
      }

      list.push({
        keyword: kw,
        meaning: nonEmpty(rec.meaning, "探索参考检索词"),
        language: lang,
        searchType: st,
        advancedQuery: adv ? adv.slice(0, 160) : undefined,
      });
    }
    while (list.length < 2) {
      const idx = list.length + 1;
      const kw = `${input.currentStep.title} 案例 ${idx}`;
      list.push({
        keyword: kw,
        meaning: "对应当前步骤的基础参考词",
        language: "zh",
        searchType: "detail",
        advancedQuery: regId === "behance" || regId === "pinterest" ? `${kw} -mockup` : undefined,
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
      reg.id,
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
      const zhKw = `${input.currentStep.title} ${reg.roleTag}`;
      const enKw = `minimal ${reg.name.toLowerCase()} design benchmark`;
      const kws: PlatformKeyword[] = [
        {
          keyword: zhKw,
          meaning: `${reg.name} 上的 ${reg.roleTag} 参考`,
          language: "zh",
          searchType: "detail",
          advancedQuery: reg.id === "xiaohongshu" ? `${zhKw} 实拍 -广告` : undefined,
        },
        {
          keyword: enKw,
          meaning: "英文高质量设计标杆参考",
          language: "en",
          searchType: "benchmark",
          advancedQuery: reg.id === "behance" || reg.id === "pinterest" ? `${enKw} -mockup -template` : undefined,
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
      const zhKw = `${input.currentStep.title} 备选`;
      const enKw = "creative design benchmark";
      const kws: PlatformKeyword[] = [
        {
          keyword: zhKw,
          meaning: `在 ${reg.name} 上拓展寻找更多可能性`,
          language: "zh",
          searchType: "consumer",
          advancedQuery: reg.id === "xiaohongshu" ? `${zhKw} 真实晒单` : undefined,
        },
        {
          keyword: enKw,
          meaning: "跨领域创意标杆",
          language: "en",
          searchType: "moodboard",
          advancedQuery: reg.id === "behance" || reg.id === "pinterest" ? `${enKw} -mockup` : undefined,
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
