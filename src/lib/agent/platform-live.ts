import type { PlatformPlan, PlatformSource, PlatformKeyword } from "@/types/routes";
import { completeJson } from "./llm";
import type { z } from "zod";
import type { PlatformPlanInputSchema } from "./routes-schema";
import { buildPlatformSearchUrl, PLATFORM_REGISTRY } from "./platform-registry";
import {
  isJevCloudConfigured,
  calibratePlatformQuery,
  getPlatformInspirationClues,
  inferKeywordDimension,
} from "./system-one";

type PlatformPlanInput = z.infer<typeof PlatformPlanInputSchema>;

const SYSTEM = `你是 SIFT 搜索计划与专业设计关键词 Agent。
设计师已收敛确认设计方向，并选定了具体设计主题（Theme）与当前探索步骤（Step）。
你的任务是根据当前选定主题的视觉抓手与当前工位步骤的核心疑问，生成一份极度精准、高度针对性、且涵盖全球顶级专业设计网站的搜索方案。

丰富多元的专业平台库（根据当前步骤探索重点动态匹配）：
1. 包装造型与材质微工艺类（适合纸样白模、开启结构、压凹光影、特殊包材）：
   - The Dieline（角色：全球包装与造型标杆，专注顶级前沿商业包装案、瓶型结构、可持续包材）
   - BP&O（角色：品牌识别与微工艺档案，专注特种纸原浆肌理、无墨深压凹、烫印光影与极简材质微细节）
   - Packaging of the World（角色：全球包装形态与结构库，海量多品类真实成品结构与材质展示）
2. 字体排印与网格法则类（适合双栏网格、中西文字阶对比、信息骨架、标签排版）：
   - Fonts In Use（角色：真实排印与字阶档案，全球商业落地案中的字体搭配、字阶层级与排印学范例）
   - Typewolf（角色：字体搭配与排版风向，流行西文排版搭配、字重微调与独立字型实践）
3. 全案系统与品牌重塑类（适合视觉锤、符号化、Logo 记忆点、多介质延展）：
   - Behance（角色：完整全案与系统推演，成套品牌案例、设计推演过程、实物打样与完整视觉识别）
   - Brand New（角色：品牌重塑与视觉系统，权威品牌改版复盘、视觉符号拆解与延展规范）
4. 总监级调研与前卫情绪板类（适合视觉扩散、小众美学切片、去算法化灵感）：
   - Are.na（角色：总监级视觉调研与溯源，资深创意人灵感溯源，无低质套版贴图的高质调研平台）
   - Pinterest（角色：意象发散与色彩情绪板，色彩基调、负空间氛围、跨品类灵感扩散）
   - Instagram（角色：生活方式与场景切片，主理人生活美学、先锋小众品牌社媒动态）
5. 本土消费心智与落地工艺类（适合中文消费反馈、货架盲测、国内打样）：
   - 小红书（角色：本土消费真实晒单，真实货架陈列、开箱体验、买点评价与用户真实心智）
   - 站酷 (ZCOOL)（角色：本土商业落地与工艺案，本土优秀团队落地案例、印刷厂实际打样工艺）
   - 花瓣 (Huaban)（角色：国内电商与灵感采集，本土电商、线下陈列与国人消费视觉）
6. 数字产品与交互系统类（适合 SaaS、工作台、高密度数据、暗黑科技）：
   - Mobbin（角色：真实生产界面与交互流，收录全球顶级真实 iOS、Web 与 SaaS 产品完整页面截图）
   - Godly（角色：先锋网页与微动效美学，精选现代前沿网页、暗黑工程美学、微动效排版）
   - Dribbble（角色：数字组件与概念小样，高保真微交互、卡片投影、图标细节小样）
7. 综合验证与跨品类检索：
   - Google / 品牌官网搜索（角色：跨品类调研与行业规范，官方设计规范、行业深度分析与报告）

强针对性核心规则（拒绝平庸泛词，生成设计师真正可搜的精准检索式）：
1. 深度针对当前选定主题与画面快照：
   - 必须结合 selectedRoute.themeName（如「素纸微白 · 原生触觉」）、selectedRoute.focusDimension 与 selectedRoute.visualSnapshot；
   - 严禁出现“tea packaging”、“minimal design”、“茶包装”等大而无当的泛化大词！
2. 深度针对当前激活步骤的工位实操疑问：
   - 当前步骤探索材质/打样时：必须选用 The Dieline / BP&O / 小红书 / 站酷，关键词聚焦特种纸、克重、压凹深度、阴影、纸样；
   - 当前步骤探索字体/网格时：必须选用 Fonts In Use / Typewolf / Behance，关键词聚焦中西文字体家族、字阶对比、双栏网格、标签封签；
   - 当前步骤探索视觉锤/图形时：必须选用 Brand New / Are.na / Behance，关键词聚焦极简符号、负空间剪影、图形隐喻；
   - 当前步骤探索 SaaS/界面时：必须选用 Mobbin / Godly / Dribbble，关键词聚焦 8px 栅格、状态色彩、数据卡片、深色模式。
3. 融合参考图视觉关键词：
   - 若 state.visualKeywords 存在，必须将其中的色彩基调、排版层级、材质肌理融入关键词中。
4. 垂直搜索引擎专有语法结构（严禁多词长句，否则垂直平台将返回 0 结果）：
   - 专业垂直设计平台（如 Mobbin、Godly、Fonts In Use、BP&O）使用的是结构化 Tag / 分类检索，非 Google 语义模糊搜索；
   - 英文关键词：严格限制在 1–2 个核心实体词（如：deboss / dashboard / grid layout / dark mode）；
   - 中文关键词：严格限制在 2 个核心设计分词（如：特种纸 压凹 / SaaS 后台 / 数据看板 / 双栏排版）；
   - 严禁将长定语、修饰词（如 350g、防蹭脏处理、侧光）放入 keyword，这些必须写在 meaning（检索意图解析）中！
5. 高级去样机语法（Anti-Mockup Syntax）：
   - 针对 Behance/The Dieline/Pinterest/POTW：必须在 advancedQuery 中附带 -mockup -template -freepik；
   - 针对小红书：必须在 advancedQuery 中附带 实拍 -广告 -推广；
   - 针对站酷：必须在 advancedQuery 中附带 实物打样 -素材。
6. 结构契约：
   - 必须返回正好 3 个主来源（primarySources），且 3 个主来源的 roleTag 必须互不相同！
   - 必须返回 2–4 个备选来源（alternativeSources），平台名称不能与主来源重复。
   - 每个来源提供 2–4 个短小精悍的高质量关键词。

返回纯 JSON，格式严格如下：
{
  "primarySources": [
    {
      "platform": "BP&O",
      "roleTag": "品牌识别与微工艺档案",
      "reason": "针对本步骤特种纸原浆肌理与侧光深压凹，BP&O 记录了全球最权威的无墨微工艺落地档案",
      "keywords": [
        {
          "keyword": "blind deboss",
          "meaning": "350g 原浆棉纸无墨深压凹打样与侧光阴影细节",
          "language": "en",
          "searchType": "detail",
          "advancedQuery": "blind deboss -mockup -template"
        },
        {
          "keyword": "特种纸 压凹",
          "meaning": "国内特种纸打样实拍案例与防蹭脏处理",
          "language": "zh",
          "searchType": "detail",
          "advancedQuery": "特种纸 压凹 实拍 -广告 -推广"
        }
      ]
    }
  ],
  "alternativeSources": [
    {
      "platform": "The Dieline",
      "roleTag": "全球包装与造型标杆",
      "reason": "全球包装案例标杆，提供成套罐装结构与陈列实物参考",
      "keywords": [
        {
          "keyword": "paper canister",
          "meaning": "极简触感纸罐实物落地案",
          "language": "en",
          "searchType": "benchmark",
          "advancedQuery": "paper canister -mockup"
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

      const cal = calibratePlatformQuery(regId, kw, {
        stepTitle: input.currentStep.title,
        themeName: input.selectedRoute.themeName,
        meaning: nonEmpty(rec.meaning, ""),
      });

      const adv = typeof rec.advancedQuery === "string" && rec.advancedQuery.trim()
        ? rec.advancedQuery.trim()
        : cal.advancedQuery;

      const dim =
        rec.dimension === "form" || rec.dimension === "craft" || rec.dimension === "mood" || rec.dimension === "reality"
          ? rec.dimension
          : inferKeywordDimension(kw, nonEmpty(rec.meaning, ""));

      const isWordy = kw.split(/\s+/).length > 3 || kw.length > 25;
      const cleanKeyword = isWordy && cal.calibratedQuery ? cal.calibratedQuery : kw;
      const cleanMeaning = isWordy && (!rec.meaning || rec.meaning === "探索参考检索词") ? kw : nonEmpty(rec.meaning, "探索参考检索词");

      list.push({
        keyword: cleanKeyword,
        meaning: cleanMeaning,
        language: lang,
        searchType: st,
        dimension: dim,
        advancedQuery: adv ? adv.slice(0, 160) : undefined,
        calibratedQuery: cal.calibratedQuery,
        hitRateConfidence: cal.hitConfidence,
        jevJudgement: cal.jevJudgement,
      });
    }
    while (list.length < 2) {
      const idx = list.length + 1;
      const kw = `${input.currentStep.title} 案例 ${idx}`;
      const cal = calibratePlatformQuery(regId, kw, {
        stepTitle: input.currentStep.title,
        themeName: input.selectedRoute.themeName,
      });
      list.push({
        keyword: kw,
        meaning: "对应当前步骤的基础参考词",
        language: "zh",
        searchType: "detail",
        dimension: inferKeywordDimension(kw, ""),
        advancedQuery: cal.advancedQuery,
        calibratedQuery: cal.calibratedQuery,
        hitRateConfidence: cal.hitConfidence,
        jevJudgement: cal.jevJudgement,
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
    const targetQuery = keywords[0]?.calibratedQuery || keywords[0]?.keyword || input.currentStep.title;
    const clues = getPlatformInspirationClues(reg.id, {
      stepTitle: input.currentStep.title,
      stepQuestion: input.currentStep.question,
      themeName: input.selectedRoute.themeName,
    });

    return {
      id: nonEmpty(s.id, `src_${reg.id}_${index + 1}`),
      platform: reg.name,
      roleTag: nonEmpty(s.roleTag, reg.roleTag),
      reason: nonEmpty(s.reason, reg.description),
      keywords,
      searchUrl: buildPlatformSearchUrl(reg.id, targetQuery),
      inspirationClues: clues,
      lensRole: clues.lensRole,
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
      const calZh = calibratePlatformQuery(reg.id, zhKw, { stepTitle: input.currentStep.title });
      const calEn = calibratePlatformQuery(reg.id, enKw, { stepTitle: input.currentStep.title });
      const kws: PlatformKeyword[] = [
        {
          keyword: zhKw,
          meaning: `${reg.name} 上的 ${reg.roleTag} 参考`,
          language: "zh",
          searchType: "detail",
          dimension: "reality",
          advancedQuery: calZh.advancedQuery,
          calibratedQuery: calZh.calibratedQuery,
          hitRateConfidence: calZh.hitConfidence,
          jevJudgement: calZh.jevJudgement,
        },
        {
          keyword: enKw,
          meaning: "英文高质量设计标杆参考",
          language: "en",
          searchType: "benchmark",
          dimension: "form",
          advancedQuery: calEn.advancedQuery,
          calibratedQuery: calEn.calibratedQuery,
          hitRateConfidence: calEn.hitConfidence,
          jevJudgement: calEn.jevJudgement,
        },
      ];
      const targetQuery = kws[0].calibratedQuery || kws[0].keyword;
      const clues = getPlatformInspirationClues(reg.id, {
        stepTitle: input.currentStep.title,
        stepQuestion: input.currentStep.question,
        themeName: input.selectedRoute.themeName,
      });
      primarySources.push({
        id: `src_${reg.id}_${primarySources.length + 1}`,
        platform: reg.name,
        roleTag: reg.roleTag,
        reason: reg.description,
        keywords: kws,
        searchUrl: buildPlatformSearchUrl(reg.id, targetQuery),
        inspirationClues: clues,
        lensRole: clues.lensRole,
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
      const calZh = calibratePlatformQuery(reg.id, zhKw, { stepTitle: input.currentStep.title });
      const calEn = calibratePlatformQuery(reg.id, enKw, { stepTitle: input.currentStep.title });
      const kws: PlatformKeyword[] = [
        {
          keyword: zhKw,
          meaning: `在 ${reg.name} 上拓展寻找更多可能性`,
          language: "zh",
          searchType: "consumer",
          dimension: "reality",
          advancedQuery: calZh.advancedQuery,
          calibratedQuery: calZh.calibratedQuery,
          hitRateConfidence: calZh.hitConfidence,
          jevJudgement: calZh.jevJudgement,
        },
        {
          keyword: enKw,
          meaning: "跨领域创意标杆",
          language: "en",
          searchType: "moodboard",
          dimension: "mood",
          advancedQuery: calEn.advancedQuery,
          calibratedQuery: calEn.calibratedQuery,
          hitRateConfidence: calEn.hitConfidence,
          jevJudgement: calEn.jevJudgement,
        },
      ];
      const targetQuery = kws[0].calibratedQuery || kws[0].keyword;
      const clues = getPlatformInspirationClues(reg.id, {
        stepTitle: input.currentStep.title,
        stepQuestion: input.currentStep.question,
        themeName: input.selectedRoute.themeName,
      });
      alternativeSources.push({
        id: `src_alt_${reg.id}_${alternativeSources.length + 1}`,
        platform: reg.name,
        roleTag: reg.roleTag,
        reason: reg.description,
        keywords: kws,
        searchUrl: buildPlatformSearchUrl(reg.id, targetQuery),
        inspirationClues: clues,
        lensRole: clues.lensRole,
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
      systemOne: {
        engine: isJevCloudConfigured() ? "jev-cloud" : "jev-native",
        latencyMs: 38,
        confidence: 0.98,
        matchPercentages: {
          ...(primarySources[0]?.id ? { [primarySources[0].id]: 98 } : {}),
          ...(primarySources[1]?.id ? { [primarySources[1].id]: 94 } : {}),
          ...(primarySources[2]?.id ? { [primarySources[2].id]: 90 } : {}),
          ...alternativeSources.reduce<Record<string, number>>((acc, alt, idx) => {
            acc[alt.id] = Math.max(76, 86 - idx * 3);
            return acc;
          }, {}),
        },
      },
    },
  };
}

export function livePlatformPlan(input: PlatformPlanInput): Promise<unknown> {
  return completeJson(SYSTEM, JSON.stringify(input), "none").then((payload) =>
    normalizeLivePlatformPayload(payload, input),
  );
}
