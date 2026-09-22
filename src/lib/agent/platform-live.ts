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
   - Fonts In Use（角色：真实排印与字阶档案，全球商业设计案中的字体搭配、字阶层级与排印学范例）
   - Typewolf（角色：字体搭配与排版风向，流行西文排版搭配、字重微调与独立字型实践）
3. 全案系统与品牌重塑类（适合视觉锤、符号化、Logo 记忆点、多介质延展）：
   - Behance（角色：完整全案与系统推演，成套品牌案例、设计推演过程、实物打样与完整视觉识别）
   - Brand New（角色：品牌重塑与视觉系统，权威品牌改版复盘、视觉符号拆解与延展规范）
4. 总监级调研与前卫情绪板类（适合视觉扩散、小众美学切片、去算法化灵感）：
   - Are.na（角色：总监级视觉调研与溯源，资深创意人灵感溯源，无低质套版贴图的高质调研平台）
   - Pinterest（角色：意象发散与色彩情绪板，色彩基调、负空间氛围、跨品类灵感扩散）
   - Instagram（角色：生活方式与场景切片，主理人生活美学、先锋小众品牌社媒动态）
5. 本土消费心智与工艺质感类（适合中文消费反馈、货架盲测、实物质感）：
   - 小红书（角色：本土消费真实晒单，真实货架陈列、开箱体验、买点评价与用户真实心智）
   - 站酷 (ZCOOL)（角色：本土商业设计与工艺案例，本土优秀团队设计案、印刷工艺实拍与材质细节）
   - 花瓣 (Huaban)（角色：国内电商与灵感采集，本土电商、线下陈列与国人消费视觉）
6. 数字产品与交互系统类（适合 SaaS、工作台、高密度数据、暗黑科技）：
   - Mobbin（角色：真实生产界面与交互流，收录全球顶级真实 iOS、Web 与 SaaS 产品完整页面截图）
   - Godly（角色：先锋网页与微动效美学，精选现代前沿网页、暗黑工程美学、微动效排版）
   - Dribbble（角色：数字组件与概念小样，高保真微交互、卡片投影、图标细节小样）
7. 综合验证与跨品类检索：
   - Google / 品牌官网搜索（角色：跨品类调研与行业规范，官方设计规范、行业深度分析与报告）

强针对性核心规则（拒绝平庸泛词，生成设计师真正可搜的精准检索式）：
0. 【最高准则 · 检索词品类主体与设计载体绝对锁死（严禁无主体孤立检索）】：
   - 检索词必须结合当前设计任务的核心主体/材料/载体（如“可持续产品/再生纤维”、“咖啡”、“SaaS”、“实体包装”等）与具体视觉手法！
   - 严禁生成脱离主体的孤立工艺词！例如：当前任务是“宠物毛发可持续产品”，步骤是探索微触感/肌理，关键词必须是“sustainable pet hair composite material”或“再生纤维 宠物毛发 可持续产品”，绝对不能搜出脱离产品的“pet brand identity”（那是平面Logo案）或孤立的“blind deboss”（那是纸张）！
   - 组合公式：【核心品类主体 / 材料 / 载体】 + 【视点设问 / 视觉手法 / 工艺】。
1. 深度针对当前选定主题与画面快照：
   - 必须结合 selectedRoute.themeName（如「原生纤维 · 触感转化」）、selectedRoute.focusDimension 与 selectedRoute.visualSnapshot；
   - 严禁出现“tea packaging”、“minimal design”等脱离当前品类的大而无当泛化大词！
2. 深度针对当前激活步骤的工位实操疑问：
   - 当前步骤探索实体产品/材料/CMF时：优先选用 Behance (工业设计全案) / Pinterest (CMF与材质情绪板) / The Dieline / 小红书 / 站酷，关键词聚焦产品形态、再生纤维压合肌理、微孔、手感实物；
   - 当前步骤探索包装造型与材质工艺时：优先选用 The Dieline / BP&O / 小红书 / 站酷，关键词聚焦瓶罐结构、特种材质、压凹阴影；
   - 当前步骤探索字体/网格时：优先选用 Fonts In Use / Typewolf / Behance，关键词聚焦中西文字体、字阶对比、双栏网格；
   - 当前步骤探索视觉锤/图形时：优先选用 Brand New / Are.na / Behance，关键词聚焦极简符号、正负空间剪影；
   - 当前步骤探索 SaaS/界面时：优先选用 Mobbin / Godly / Dribbble，关键词聚焦 8px 栅格、状态色彩、数据卡片、深色模式。
3. 融合参考图视觉关键词：
   - 若 state.visualKeywords 存在，必须将其中的色彩基调、排版层级、材质肌理融入关键词中。
4. 垂直搜索引擎专有语法结构（严禁多词长句，否则垂直平台将返回 0 结果）：
   - 专业垂直设计平台使用的是结构化 Tag / 分类检索，非 Google 语义模糊搜索；
   - 英文关键词：严格限制在 1–3 个核心实体词（如：sustainable recycled fiber / bio composite tactile / dashboard grid）；
   - 中文关键词：严格限制在 2–3 个核心设计分词（如：再生纤维 可持续产品 / 宠物毛发 情感器物 / SaaS 后台）；
   - 严禁将长定语、修饰词放入 keyword，这些必须写在 meaning（检索意图解析）中！
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
      "platform": "Behance",
      "roleTag": "工业设计与可持续全案",
      "reason": "针对当前可持续材料与产品造型探索，Behance 收录了成套工业设计实案与物性打样",
      "keywords": [
        {
          "keyword": "sustainable recycled fiber product",
          "meaning": "再生纤维在实体产品设计中的成套设计案例与表面质感",
          "language": "en",
          "searchType": "benchmark",
          "advancedQuery": "sustainable recycled fiber product -mockup -template"
        },
        {
          "keyword": "再生纤维 可持续产品",
          "meaning": "国内高品质环保材料创新产品与实物设计案例",
          "language": "zh",
          "searchType": "detail",
          "advancedQuery": "再生纤维 可持续产品 实物打样 -素材"
        }
      ]
    }
  ],
  "alternativeSources": [
    {
      "platform": "Pinterest",
      "roleTag": "CMF与材质情绪板",
      "reason": "汇聚全球工业设计 CMF 探索、微孔肌理与材料通感图谱",
      "keywords": [
        {
          "keyword": "bio composite tactile",
          "meaning": "生物基复合材料自然温润触感与漫反射光泽参考",
          "language": "en",
          "searchType": "moodboard",
          "advancedQuery": "bio composite tactile -freepik"
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
      const calZh = calibratePlatformQuery(reg.id, zhKw, {
        stepTitle: input.currentStep.title,
        themeName: input.selectedRoute.themeName,
      });
      const calEn = calibratePlatformQuery(reg.id, enKw, {
        stepTitle: input.currentStep.title,
        themeName: input.selectedRoute.themeName,
      });
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
      const calZh = calibratePlatformQuery(reg.id, zhKw, {
        stepTitle: input.currentStep.title,
        themeName: input.selectedRoute.themeName,
      });
      const calEn = calibratePlatformQuery(reg.id, enKw, {
        stepTitle: input.currentStep.title,
        themeName: input.selectedRoute.themeName,
      });
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
  let promptSystem = SYSTEM;
  const rawGoal = (input.state?.brief?.goal || "").trim();
  const deliverable = (input.state?.brief?.deliverable || "").trim();
  const themeName = input.selectedRoute?.themeName || "";
  const routeTitle = input.selectedRoute?.title || "";
  const visualSnapshot = input.selectedRoute?.visualSnapshot || "";
  const focusDimension = input.selectedRoute?.focusDimension || "";
  const stepTitle = input.currentStep?.title || "";
  const stepQuestion = input.currentStep?.question || "";
  const stepPurpose = input.currentStep?.purpose || "";
  const deliverables = (input.currentStep?.deliverables || []).join("、");

  promptSystem += `\n\n【⚠️ 检索主体与视点设问绝对锚定（严禁偏离）】：
1. 任务原始主体与载体：“${rawGoal}”${deliverable ? `（载体：${deliverable}）` : ""}。
2. 当前选定探索主题：“${themeName}”（${routeTitle}）。
3. 主题画面快照（Visual Snapshot）：“${visualSnapshot}”。
4. 当前工位激活视点：“${stepTitle}”（设问：“${stepQuestion}”；意图：“${stepPurpose}”）。
5. 所有搜索平台的角色与关键词，必须严格服务于为「${stepTitle}」收集具体的视觉参考与质感证据！
6. 严禁出现脱离当前品类与材质的孤立通用词（如不可对实体产品搜 2D 平面名片或茶包装！）。`;

  const userPrompt = `【当前需要检索的工位视点与设计上下文】：
- 设计任务主体：${rawGoal}
${deliverable ? `- 交付形态：${deliverable}` : ""}
- 选定设计主题：${themeName}（${routeTitle}）
- 主题画面呈现与材质特征：${visualSnapshot}
${focusDimension ? `- 视觉核心切入点：${focusDimension}` : ""}
- 当前探索视点：${stepTitle}
- 视点核心探索疑问：${stepQuestion}
- 视点审美意图：${stepPurpose}
${deliverables ? `- 期望参考物料：${deliverables}` : ""}

请为上述工位视点生成正好 3 个主来源平台和 2–4 个备选平台，关键词必须精炼、专业，直接映射到该视点的具体工艺/形态与当前品类载体！

完整输入 JSON：
${JSON.stringify(input)}`;

  return completeJson(promptSystem, userPrompt, "none").then((payload) =>
    normalizeLivePlatformPayload(payload, input),
  );
}
