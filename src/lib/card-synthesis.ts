import type { Route, RouteStep, PlatformPlan, PlatformSource } from "@/types/routes";
import { cleanStepLabel } from "@/types/routes";
import { toInspirationCopy } from "@/lib/exploration-copy";

export type ToolType =
  | "brief"
  | "watershed"
  | "ask"
  | "anchor"
  | "state"
  | "route"
  | "step"
  | "platformPlan"
  | "imageGen"
  | "note"
  | "image";

function cleanTitle(str: string | null | undefined): string {
  if (!str) return "风格探索";
  return str.replace(/【|】/g, "").trim();
}

interface ExtractedThemeMeta {
  zh: string;
  en: string;
  cmf: string;
  structure: string;
  startingPoint: string;
  visualSnapshot: string;
  focusDimension: string;
  coreProblem: string;
  pros: string;
  cons: string;
}

function extractThemeMeta(theme: Route): ExtractedThemeMeta {
  const rawTheme = (theme.themeName || "").trim();
  const rawTitle = (theme.title || "").trim();

  let zh = "";
  let en = "";

  const bookMatch = rawTheme.match(/^(?:《(.*?)》|【(.*?)】)(.*)$/);
  if (bookMatch) {
    zh = (bookMatch[1] || bookMatch[2] || "").trim();
    en = (bookMatch[3] || "").replace(/^[·\-\s]+/, "").trim();
  } else {
    const generalMatch = rawTheme.match(/^([^\w\s·]+(?:[·\s]+[^\w\s·]+)*)\s*([a-zA-Z\s\/\-_]+)?$/);
    if (generalMatch && generalMatch[1]) {
      zh = generalMatch[1].trim();
      en = (generalMatch[2] || "").trim();
    } else {
      zh = rawTheme.replace(/[《》【】]/g, "").trim() || "设计主题";
    }
  }

  // Clean zh and en
  zh = zh.replace(/[《》【】]/g, "").replace(/与.*$/, "").replace(/复合变奏.*$/, "").trim() || "设计主题";
  en = en.replace(/与.*$/i, "").replace(/复合变奏.*$/i, "").replace(/[^a-zA-Z\s]/g, " ").trim();

  if (!en) {
    const enInTitle = rawTitle.match(/([a-zA-Z]{3,}(?:\s+[a-zA-Z]{3,})*)/);
    if (enInTitle) en = enInTitle[1].trim();
  }

  // Extract CMF and Structure from title
  const cleanTitleStr = rawTitle.replace(/^[【\[].*?[】\]]\s*/, "").replace(/[【】]/g, "").trim();
  let cmf = "";
  let structure = "";

  if (cleanTitleStr.includes("×")) {
    const parts = cleanTitleStr.split("×").map((s) => s.trim()).filter(Boolean);
    cmf = parts[0] || "";
    structure = parts.slice(1).join(" × ") || "";
  } else if (cleanTitleStr.includes("与")) {
    const parts = cleanTitleStr.split("与").map((s) => s.trim()).filter(Boolean);
    cmf = parts[0] || "";
    structure = parts.slice(1).join("与") || "";
  } else {
    cmf = cleanTitleStr;
    structure = theme.focusDimension || "核心造型结构";
  }

  cmf = cmf.replace(/跨界融合/g, "").replace(new RegExp(`《?${zh}》?`, "g"), "").trim();
  structure = structure.replace(/跨界融合/g, "").replace(new RegExp(`《?${zh}》?`, "g"), "").trim();

  return {
    zh,
    en: en.toUpperCase(),
    cmf: cmf || "亲肤微阻尼",
    structure: structure || "极简轮廓造型",
    startingPoint: theme.startingPoint || "",
    visualSnapshot: theme.visualSnapshot || "",
    focusDimension: theme.focusDimension || "",
    coreProblem: theme.coreProblem || "",
    pros: theme.pros || "",
    cons: theme.cons || "",
  };
}

function splitChineseChunks(str: string): string[] {
  const clean = str.replace(/[^\u4e00-\u9fa5]/g, "");
  if (clean.length <= 3) return [clean];
  if (clean.length === 4) return [clean.slice(0, 2), clean.slice(2, 4)];
  if (clean.length === 5) return [clean.slice(0, 2), clean.slice(2, 5)];
  return [clean.slice(0, 2), clean.slice(2, 4)];
}

function synthesizeConceptName(
  metaA: ExtractedThemeMeta,
  metaB: ExtractedThemeMeta
): { conceptZh: string; conceptEn: string } {
  const zhA = metaA.zh;
  const zhB = metaB.zh;

  const chunksA = splitChineseChunks(zhA);
  const chunksB = splitChineseChunks(zhB);

  let conceptZh = "";
  if (chunksB.length >= 2 && chunksA.length >= 2) {
    conceptZh = `${chunksB[0]}${chunksA[chunksA.length - 1]}`;
  } else if (chunksB.length >= 1 && chunksA.length >= 1) {
    conceptZh = `${chunksB[0]}${chunksA[0]}`;
  } else {
    conceptZh = `${zhB.slice(0, 2)}${zhA.slice(-2)}`;
  }

  if (conceptZh.length < 3) {
    conceptZh = `${zhB.slice(0, 2)}${zhA.slice(0, 2)}`;
  } else if (conceptZh.length > 5) {
    conceptZh = conceptZh.slice(0, 4);
  }

  const wordsA = metaA.en.split(/\s+/).filter(Boolean);
  const wordsB = metaB.en.split(/\s+/).filter(Boolean);
  let conceptEn = "";

  if (wordsB.length > 0 && wordsA.length > 0) {
    const wordB = wordsB[0];
    const wordA = wordsA[wordsA.length - 1];
    conceptEn = wordB !== wordA ? `${wordB} ${wordA}` : `${wordB} FUSION`;
  } else if (wordsB.length > 0) {
    conceptEn = wordsB.join(" ");
  } else if (wordsA.length > 0) {
    conceptEn = wordsA.join(" ");
  } else {
    conceptEn = "HYBRID LAB";
  }

  return { conceptZh, conceptEn };
}

function synthesizeCmfAndStructure(
  metaA: ExtractedThemeMeta,
  metaB: ExtractedThemeMeta
): { cmf: string; structure: string } {
  const cmfA = metaA.cmf.replace(/包覆$/g, "").trim();
  const cmfB = metaB.cmf.replace(/包覆$/g, "").trim();

  let cmf = "";
  if (cmfB && cmfA && cmfB !== cmfA) {
    if (/灰蓝|冷白|深灰|炭黑|浅灰|墨黑|暖白|米白|透明/.test(cmfB) && !/灰蓝|冷白|深灰|炭黑|浅灰/.test(cmfA)) {
      cmf = `${cmfB.slice(0, 2)}哑光${cmfA.replace(/哑光/g, "")}`;
    } else if (/灰蓝|冷白|深灰|炭黑|浅灰|墨黑|暖白|米白|透明/.test(cmfA) && !/灰蓝|冷白|深灰|炭黑|浅灰/.test(cmfB)) {
      cmf = `${cmfA.slice(0, 2)}哑光${cmfB.replace(/哑光/g, "")}`;
    } else {
      const shortA = cmfA.slice(0, 8);
      const shortB = cmfB.slice(0, 8);
      cmf = shortA.includes(shortB) ? shortA : `${shortB}与${shortA}`;
    }
  } else {
    cmf = cmfA || cmfB || "亲肤微阻尼弹性体";
  }
  if (cmf.length > 20) cmf = cmf.slice(0, 20);

  const structA = metaA.structure.trim();
  const structB = metaB.structure.trim();

  let structure = "";
  if (structA && structB && structA !== structB) {
    const cleanA = structA.replace(/整块/g, "").replace(/结构$/g, "");
    const cleanB = structB.replace(/刷头刷颈刷柄/g, "").replace(/结构$/g, "");
    structure = `${cleanA}与${cleanB}`;
  } else {
    structure = structA || structB || "雕塑弧面与体量渐变";
  }
  if (structure.length > 24) structure = structure.slice(0, 24);

  return { cmf, structure };
}

/**
 * 1. 双主题融合（Theme Blending）：
 * 提取两个主题的视觉母题、触感材质与形式张力，合成一个兼具两者特色的全新跨界复合风格主题
 */
export function blendThemes(themeA: Route, themeB: Route): Route {
  const metaA = extractThemeMeta(themeA);
  const metaB = extractThemeMeta(themeB);
  const blendId = `route-blend-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // 1. Synthesize a brand new concept name & English tag
  const { conceptZh, conceptEn } = synthesizeConceptName(metaA, metaB);
  const fusedThemeName = `《${conceptZh}》 ${conceptEn}`.trim();

  // 2. Synthesize true CMF × Structure subtitle
  const { cmf, structure } = synthesizeCmfAndStructure(metaA, metaB);
  const fusedTitle = `【跨界融合】${cmf} × ${structure}`;

  // 3. Synthesize rich visual snapshot, metaphor, problem, pros, cons
  const visualSnapshot = `以${structure}为核心器物形态，通体施加${cmf}处理。在「${metaA.zh}」的握持人机弧度与「${metaB.zh}」的体量节奏交汇处，45°漫反射侧光勾勒出兼具工效深度与物性温润的一体化高级秩序。`;
  const sensoryMetaphor = `手心贴合的雕塑曲面与体量呼吸感共生，在${cmf}微阻尼触感映衬下呈现克制且精准的器物美学。`;
  const coreProblem = `在延续「${metaA.zh}」一体化曲面张力的同时，如何融入「${metaB.zh}」的结构转折节奏，避免局部转折打断器物整体流动感？`;
  const startingPoint = `融合「${metaA.zh}」的${metaA.structure || "轮廓骨架"}与「${metaB.zh}」的${metaB.cmf || "微触感"}，开辟复合审美路径。`;
  const focusDimension = `${structure}秩序与${cmf}微触感`;
  const pros = `深度融合「${metaA.zh}」的标志性记忆锚点与「${metaB.zh}」的高级材质秩序，既有贴合人体工效的形体辨识度，又具备丰富的感官触觉层次。`;
  const cons = `需严格把控两种材质交界处的接缝公差与分型线，防止结构细节过多破坏微观曲面的整体纯净度。`;

  // 4. Synthesize 3 concrete, bespoke steps
  const blendedSteps: RouteStep[] = [
    {
      id: `${blendId}-s1`,
      title: `【母题杂交】造型骨架与轮廓融合试验`,
      question: `如何将「${metaA.zh}」的核心特征与「${metaB.zh}」的${metaB.structure || "体量关系"}融合成连贯的一体化视觉？`,
      purpose: `确立融合型视觉母题，检验两种形体语言的相容性与轮廓纯净度`,
      acceptanceCriteria: [
        `造型转折与比例无割裂感，呈现一体化美学`,
        `兼具「${metaA.zh}」与「${metaB.zh}」的核心记忆锚点`,
      ],
    },
    {
      id: `${blendId}-s2`,
      title: `【工艺衔接】${cmf}与交界分型试验`,
      question: `在不同材质交界与体量过渡处，如何处理分型线以保证握持顺滑且符合现实模具制造？`,
      purpose: `深化微观材质过渡工艺，确保触觉层次丰富且符合工程可实现性`,
      acceptanceCriteria: [
        `明确主副材质的分型线与渐变过渡方式`,
        `表面微纹理与触感阻尼具有现实可制造性`,
      ],
    },
    {
      id: `${blendId}-s3`,
      title: `【感官验证】全场景握持贴合与漫反射光影试验`,
      question: `融合后的设计语言在真实手持握持与不同色温环境光下，是否保持克制高级？`,
      purpose: `检验跨界复合风格在全案延展时的系统完整度与视觉耐看度`,
      acceptanceCriteria: [
        `在光影与真实触碰下保持高级、克制的整体气质`,
        `可顺畅延展至整套系列器物或包装构件`,
      ],
    },
  ];

  return {
    id: blendId,
    title: fusedTitle,
    themeName: fusedThemeName,
    focusDimension,
    startingPoint,
    coreProblem,
    purpose: `跨界融合两组主题的长处，开辟兼具造型辨识度与触感深度的全新视觉领地。`,
    sensoryMetaphor,
    visualSnapshot,
    pros,
    cons,
    recommendedReason: `由设计师自主引线触发的双主题跨界融合方案，打破单一分支局限，具备独特的跨界创新张力。`,
    alignmentScore: Math.min(98, Math.max(themeA.alignmentScore ?? 90, themeB.alignmentScore ?? 90) + 2),
    steps: blendedSteps,
    feasibility: "medium",
  };
}

/**
 * 2. 单主题变奏演进（Theme Evolution）：
 * 基于单个主题演变出工艺与形态变奏分支
 */
export function evolveTheme(theme: Route): Route {
  const baseName = theme.themeName || cleanTitle(theme.title);
  const branchId = `route-branch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const evolvedSteps: RouteStep[] = (theme.steps && theme.steps.length > 0
    ? theme.steps
    : [
        {
          id: "s1",
          title: "核心母题与造型骨架试验",
          question: "如何确立第一眼视觉辨识度？",
          purpose: "提炼核心视觉母题",
          acceptanceCriteria: ["具备清晰的视觉记忆点"],
        },
        {
          id: "s2",
          title: "物料工艺与表面触感试验",
          question: "选用何种材质与表面处理？",
          purpose: "深化细节与高级质感",
          acceptanceCriteria: ["明确主材质与辅助材质搭配"],
        },
        {
          id: "s3",
          title: "场景交互与整体系统试验",
          question: "在真实场景中如何落地共生？",
          purpose: "验证全案完整度",
          acceptanceCriteria: ["延展至全系列器物"],
        },
      ]
  ).map((s, idx) => ({
    ...s,
    id: `${branchId}-s${idx + 1}`,
    title: `${cleanStepLabel(s.title)} · 变奏`,
  }));

  return {
    ...theme,
    id: branchId,
    title: `【${baseName}】形态与工艺变奏`,
    themeName: `${baseName} (变奏探索)`,
    startingPoint: `源自「${baseName}」，进一步在形态曲率与微观触感上做探索变奏。`,
    coreProblem: `在延续「${baseName}」核心调性的同时，挖掘更多维度的工艺表现空间。`,
    purpose: theme.purpose || "探索多维度的视觉表现可能",
    sensoryMetaphor: theme.sensoryMetaphor
      ? `${theme.sensoryMetaphor}（在此基础上推演更极端的曲率张力与工艺变奏）`
      : `源自「${baseName}」，在微观光影与触觉层次上做进一步激进变奏`,
    pros: "继承了主线调性，同时赋予形态和材质更多试错空间。",
    cons: "需防止探索方向过度分散失焦。",
    recommendedReason: null,
    alignmentScore: Math.min(96, (theme.alignmentScore ?? 88) + 1),
    steps: evolvedSteps,
  };
}

/**
 * 3. 策略基准派生主题：
 * 根据 02 策略基准与 Brief 推导新主题
 */
export function deriveThemeFromStrategy(state: any, rawBrief?: string): Route {
  const routeId = `route-derived-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const goal = state?.brief?.goal || rawBrief?.slice(0, 20) || "视觉系统探索";
  const intent = state?.direction?.intent?.text || "极简与功能性平衡";
  const priorities = state?.direction?.priorities || [];
  const firstPriority = priorities.length > 0 ? priorities[0] : null;
  const prioritySummary =
    typeof firstPriority === "string"
      ? firstPriority
      : firstPriority?.text || "质感与比例";

  return {
    id: routeId,
    title: `【策略基准派生】${goal}`,
    themeName: `策略收敛 · ${intent.slice(0, 10)}`,
    focusDimension: `聚焦「${prioritySummary}」与视觉主张落地`,
    startingPoint: `根据策略基准收敛成果，以「${intent}」为绝对锚点切入。`,
    coreProblem: `如何将已确认的设计坚持与红线准则，转化为具象的设计母题？`,
    purpose: `落实策略收敛主张，确保设计执行不偏离既定轨道。`,
    sensoryMetaphor: `以「${intent}」为绝对锚点，在「${prioritySummary}」的约束边界内沉淀出克制纯粹的物料光影与实体秩序`,
    visualSnapshot: `秩序井然的网格比例，严谨的几何倒角，经克制表面处理后的材质本身显露出沉稳克制的品质感。`,
    pros: "与策略基准 100% 严密贴合，避免任何主观偏向或无序试错。",
    cons: "需注意在克制边界内激发足够的视觉冲击力与惊喜感。",
    recommendedReason: "直接承接策略基准主张的定向推导方案。",
    alignmentScore: 95,
    steps: [
      {
        id: `${routeId}-s1`,
        title: "基准主张骨架试验",
        question: `如何通过轮廓线体现「${prioritySummary}」？`,
        purpose: "确立符合策略准则的基本型",
        acceptanceCriteria: ["不违背任何既定红线准则", "明确核心视觉比例"],
      },
      {
        id: `${routeId}-s2`,
        title: "触感物料固化试验",
        question: "选用何种质感符合设计坚持？",
        purpose: "推敲细节纹理与反射特性",
        acceptanceCriteria: ["材质光泽度符合策略基调"],
      },
      {
        id: `${routeId}-s3`,
        title: "真实场景适用性试验",
        question: "在全流程触点中如何贯彻主张？",
        purpose: "验证全案应用的一致性",
        acceptanceCriteria: ["视觉规范具备跨场景延展性"],
      },
    ],
  };
}

/**
 * 4. 视点试验推导（04 视点推进）：
 * 从主题派生出 3 阶段切入视点
 */
export function deriveStepsFromTheme(theme: Route): RouteStep[] {
  if (theme.steps && theme.steps.length > 0) {
    return theme.steps;
  }
  const themeName = theme.themeName || cleanTitle(theme.title);
  return [
    {
      id: `${theme.id}-s1`,
      title: "核心母题与造型骨架试验",
      question: `在「${themeName}」语境下，如何确立第一眼视觉记忆？`,
      purpose: `提炼出最核心的几何或自然母题`,
      acceptanceCriteria: ["造型特征清晰易辨识", "符合品牌调性"],
    },
    {
      id: `${theme.id}-s2`,
      title: "物料工艺与表面触感试验",
      question: `选用何种材料处理能够强化「${themeName}」的感受？`,
      purpose: `确定材料、涂装与质感阻尼`,
      acceptanceCriteria: ["明确主辅材质搭配方案", "质感具可实现性"],
    },
    {
      id: `${theme.id}-s3`,
      title: "场景交互与整体系统试验",
      question: `在真实日常场景中如何落地共生？`,
      purpose: `完成整套系统的综合检验`,
      acceptanceCriteria: ["各触点连贯一致", "满足人机交互友好性"],
    },
  ];
}

/**
 * 智能设计领域检索词提纯引擎：
 * 针对主题的形态母题、工艺特征与空间共生，自动提取国际设计圈公认的精准中英双语检索词库与去噪语法
 */
export function extractThemeDimensionQueries(theme: Route): {
  reality: { keyword: string; meaning: string; query: string };
  form: { keyword: string; meaning: string; query: string };
  craft: { keyword: string; meaning: string; query: string };
  mood: { keyword: string; meaning: string; query: string };
} {
  const combined = [
    theme.themeName || "",
    theme.title || "",
    theme.focusDimension || "",
    theme.startingPoint || "",
    theme.visualSnapshot || "",
    theme.coreProblem || "",
  ].join(" ").toLowerCase();

  // 1. 木质 / 纤维 / 环保原生材料
  if (/木|纤维|原木|竹|wood|timber|fiber|bamboo/.test(combined)) {
    return {
      reality: {
        keyword: "sustainable wood fiber product design",
        meaning: "原生木质与可持续纤维全案",
        query: "sustainable wood fiber product design",
      },
      form: {
        keyword: "organic curved monolithic silhouette",
        meaning: "温润有机曲率与纯粹剪影",
        query: "organic curved monolithic silhouette",
      },
      craft: {
        keyword: "raw timber tactile micro texture CMF",
        meaning: "原木微孔与触感表面工艺",
        query: "raw timber tactile micro texture CMF",
      },
      mood: {
        keyword: "warm natural sunlight interior lifestyle",
        meaning: "温暖天光与原木空间共生",
        query: "warm natural sunlight interior lifestyle",
      },
    };
  }

  // 2. 透明 / 机能 / 精密结构 / 极客
  if (/透明|机能|精密|齿轮|卡扣|亚克力|transparent|polycarbonate|functional|mechanical/.test(combined)) {
    return {
      reality: {
        keyword: "translucent functional industrial design",
        meaning: "高透机能与透明工业全案",
        query: "translucent functional industrial design",
      },
      form: {
        keyword: "precision skeletal structure silhouette",
        meaning: "精密镂空与理性骨架剪影",
        query: "precision skeletal structure silhouette",
      },
      craft: {
        keyword: "frosted polymer snap fit CMF detail",
        meaning: "雾面聚合物与精工卡扣工艺",
        query: "frosted polymer snap fit CMF detail",
      },
      mood: {
        keyword: "modern minimalist studio lighting render",
        meaning: "高冷透光与现代极客光影",
        query: "modern minimalist studio lighting render",
      },
    };
  }

  // 3. 金属 / 铝 / 钛 / 精工硬件
  if (/金属|铝|钛|阳极|拉丝|精工|metal|aluminum|titanium|anodized/.test(combined)) {
    return {
      reality: {
        keyword: "precision metal hardware industrial design",
        meaning: "精密五金与精工硬件全案",
        query: "precision metal hardware industrial design",
      },
      form: {
        keyword: "crisp chamfer geometric metal silhouette",
        meaning: "极简倒角与几何形体剪影",
        query: "crisp chamfer geometric metal silhouette",
      },
      craft: {
        keyword: "anodized aluminum brushed tactile finish",
        meaning: "阳极氧化铝与拉丝微纹理",
        query: "anodized aluminum brushed tactile finish",
      },
      mood: {
        keyword: "specular highlight architectural photography",
        meaning: "金属边缘反光与现代建筑光影",
        query: "specular highlight architectural photography",
      },
    };
  }

  // 4. 纸品 / 包装 / 压凹 / 折构
  if (/纸|包装|特种纸|压凹|折痕|盒|packaging|paper|emboss|unboxing/.test(combined)) {
    return {
      reality: {
        keyword: "minimalist luxury packaging identity",
        meaning: "极简高级包装与品牌全案",
        query: "minimalist luxury packaging identity",
      },
      form: {
        keyword: "geometric folding origami packaging silhouette",
        meaning: "几何折构与极简开启轮廓",
        query: "geometric folding origami packaging silhouette",
      },
      craft: {
        keyword: "blind deboss tactile paper texture CMF",
        meaning: "无墨深压凹与特种纸触感",
        query: "blind deboss tactile paper texture CMF",
      },
      mood: {
        keyword: "soft daylight studio unboxing scene",
        meaning: "漫射天光与真实开箱场景",
        query: "soft daylight studio unboxing scene",
      },
    };
  }

  // 5. 陶瓷 / 陶土 / 粗陶 / 器物
  if (/陶瓷|陶土|泥|釉|ceramic|clay|earthenware|pottery/.test(combined)) {
    return {
      reality: {
        keyword: "contemporary ceramic craft object design",
        meaning: "当代陶瓷器物与工艺全案",
        query: "contemporary ceramic craft object design",
      },
      form: {
        keyword: "handcrafted monolithic vessel silhouette",
        meaning: "手工陶器体量与器物剪影",
        query: "handcrafted monolithic vessel silhouette",
      },
      craft: {
        keyword: "matte unglazed earthenware tactile finish",
        meaning: "素烧无釉与粗陶微触感",
        query: "matte unglazed earthenware tactile finish",
      },
      mood: {
        keyword: "wabi sabi serene interior natural shadow",
        meaning: "寂静光影与东方生活空间",
        query: "wabi sabi serene interior natural shadow",
      },
    };
  }

  // 6. 声学 / 数码 / 音响 / 电子
  if (/音响|耳机|声学|数码|电子|audio|speaker|headphone|electronics/.test(combined)) {
    return {
      reality: {
        keyword: "avant garde audio consumer electronics",
        meaning: "先锋声学与高端消费电子全案",
        query: "avant garde audio consumer electronics",
      },
      form: {
        keyword: "streamlined acoustic enclosure silhouette",
        meaning: "声学腔体与流线体量剪影",
        query: "streamlined acoustic enclosure silhouette",
      },
      craft: {
        keyword: "acoustic textile matte polymer CMF finish",
        meaning: "声学透声织物与雾面触感",
        query: "acoustic textile matte polymer CMF finish",
      },
      mood: {
        keyword: "minimalist desktop audio lifestyle setup",
        meaning: "极简工位桌面与氛围光影",
        query: "minimalist desktop audio lifestyle setup",
      },
    };
  }

  // 7. 通用极简与微触感基准
  return {
    reality: {
      keyword: "contemporary minimalist industrial design",
      meaning: "当代极简工业设计全案",
      query: "contemporary minimalist industrial design",
    },
    form: {
      keyword: "monolithic geometric sculptural silhouette",
      meaning: "纯粹体量与几何雕塑感剪影",
      query: "monolithic geometric sculptural silhouette",
    },
    craft: {
      keyword: "tactile matte surface texture CMF finish",
      meaning: "微触感表面质感与 CMF 工艺",
      query: "tactile matte surface texture CMF finish",
    },
    mood: {
      keyword: "ambient diffuse daylight spatial coexistence",
      meaning: "自然漫射天光与日常空间共生",
      query: "ambient diffuse daylight spatial coexistence",
    },
  };
}

/**
 * 5. 灵感方案推导（4 灵感检索）：
 * 直接从风格主题（3 风格主题）派生出精准跨平台去噪搜索方案，涵盖整体调性与分视点切片
 */
export function derivePlanFromTheme(theme: Route, facetIndex?: number): PlatformPlan {
  const themeName = theme?.themeName || cleanTitle(theme?.title) || "设计探索";
  const routeId = theme?.id || "custom-route";
  const steps = deriveStepsFromTheme(theme);
  const activeStep = (facetIndex !== undefined && steps[facetIndex]) ? steps[facetIndex] : steps[0];
  const queries = extractThemeDimensionQueries(theme);

  return {
    id: `plan-${routeId}`,
    routeId,
    stepId: activeStep?.id || "s1",
    primarySources: [
      {
        id: `src-dezeen-${routeId}`,
        platform: "dezeen",
        roleTag: "国际先锋报道",
        reason: `针对「${themeName}」寻找全球前沿设计事务所、先锋材料与实体产品的标杆报道`,
        searchUrl: `https://www.dezeen.com/?s=${encodeURIComponent(queries.reality.query)}`,
        keywords: [
          {
            keyword: queries.reality.keyword,
            meaning: queries.reality.meaning,
            language: "en",
            dimension: "reality",
            calibratedQuery: `${queries.reality.query} minimal`,
            advancedQuery: `${queries.reality.query} -mockup -template`,
          },
          {
            keyword: queries.form.keyword,
            meaning: queries.form.meaning,
            language: "en",
            dimension: "form",
            calibratedQuery: `${queries.form.query} industrial design`,
            advancedQuery: `${queries.form.query} -stock -3d`,
          },
          {
            keyword: queries.craft.keyword,
            meaning: queries.craft.meaning,
            language: "en",
            dimension: "craft",
            calibratedQuery: `${queries.craft.query} sustainable`,
            advancedQuery: `${queries.craft.query} -mockup`,
          },
          {
            keyword: queries.mood.keyword,
            meaning: queries.mood.meaning,
            language: "en",
            dimension: "mood",
            calibratedQuery: `${queries.mood.query} spatial scene`,
            advancedQuery: `${queries.mood.query} architecture interior`,
          },
        ],
      },
      {
        id: `src-behance-${routeId}`,
        platform: "behance",
        roleTag: "工业设计与 CMF",
        reason: "深入了解该方向从草图到落地的完整工艺拆解、分型线与真实渲染细节",
        searchUrl: `https://www.behance.net/search/projects?search=${encodeURIComponent(queries.reality.query)}`,
        keywords: [
          {
            keyword: queries.reality.keyword,
            meaning: queries.reality.meaning,
            language: "en",
            dimension: "reality",
            calibratedQuery: `${queries.reality.query} CMF`,
            advancedQuery: `${queries.reality.query} -vector`,
          },
          {
            keyword: queries.form.keyword,
            meaning: queries.form.meaning,
            language: "en",
            dimension: "form",
            calibratedQuery: `${queries.form.query} sketching`,
            advancedQuery: `${queries.form.query} sketching -vector -template`,
          },
          {
            keyword: queries.craft.keyword,
            meaning: queries.craft.meaning,
            language: "en",
            dimension: "craft",
            calibratedQuery: `${queries.craft.query} process`,
            advancedQuery: `${queries.craft.query} process -template`,
          },
          {
            keyword: queries.mood.keyword,
            meaning: queries.mood.meaning,
            language: "en",
            dimension: "mood",
            calibratedQuery: `${queries.mood.query} lifestyle render`,
            advancedQuery: `${queries.mood.query} render -vector`,
          },
        ],
      },
      {
        id: `src-pinterest-${routeId}`,
        platform: "pinterest",
        roleTag: "视觉情绪对照板",
        reason: "快速建立该主题的微观质感、光影漫反射与色彩情绪板",
        searchUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(queries.reality.query)}`,
        keywords: [
          {
            keyword: queries.reality.keyword,
            meaning: queries.reality.meaning,
            language: "en",
            dimension: "reality",
            calibratedQuery: `${queries.reality.query} aesthetic`,
            advancedQuery: `${queries.reality.query} aesthetic -mockup`,
          },
          {
            keyword: queries.form.keyword,
            meaning: queries.form.meaning,
            language: "en",
            dimension: "form",
            calibratedQuery: `${queries.form.query} minimalist`,
            advancedQuery: `${queries.form.query} minimalist design -mockup`,
          },
          {
            keyword: queries.craft.keyword,
            meaning: queries.craft.meaning,
            language: "en",
            dimension: "craft",
            calibratedQuery: `${queries.craft.query} moodboard`,
            advancedQuery: `${queries.craft.query} moodboard aesthetic`,
          },
          {
            keyword: queries.mood.keyword,
            meaning: queries.mood.meaning,
            language: "en",
            dimension: "mood",
            calibratedQuery: `${queries.mood.query} aesthetic`,
            advancedQuery: `${queries.mood.query} interior scene aesthetic`,
          },
        ],
      },
    ],
    alternativeSources: [
      {
        id: `src-cosmobullet-${routeId}`,
        platform: "cosmobullet",
        roleTag: "前沿设计美学精选",
        reason: "独立策展视角，精选极度克制、具有实验性的先锋实物案例",
        searchUrl: `https://www.google.com/search?q=site:cosmobullet.com+${encodeURIComponent(queries.reality.query)}`,
        keywords: [
          {
            keyword: queries.reality.keyword,
            meaning: queries.reality.meaning,
            language: "en",
            dimension: "reality",
            calibratedQuery: `${queries.reality.query} minimal aesthetic`,
          },
          {
            keyword: queries.form.keyword,
            meaning: queries.form.meaning,
            language: "en",
            dimension: "form",
            calibratedQuery: `${queries.form.query} sculpture object`,
          },
          {
            keyword: queries.craft.keyword,
            meaning: queries.craft.meaning,
            language: "en",
            dimension: "craft",
            calibratedQuery: `${queries.craft.query} experimental craft`,
          },
          {
            keyword: queries.mood.keyword,
            meaning: queries.mood.meaning,
            language: "en",
            dimension: "mood",
            calibratedQuery: `${queries.mood.query} coexistence object`,
          },
        ],
      },
    ],
  };
}

/**
 * 从视点与主题派生出精准跨平台去噪搜索方案（向后兼容）
 */
export function derivePlanFromStep(step: RouteStep, theme?: Route): PlatformPlan {
  const queryTerm = theme?.focusDimension || theme?.themeName || "industrial design";
  const stepLabel = cleanStepLabel(step.title);
  const routeId = theme?.id || "custom-route";

  return {
    id: `plan-${routeId}-${step.id}`,
    routeId,
    stepId: step.id,
    primarySources: [
      {
        id: `src-dezeen-${step.id}`,
        platform: "dezeen",
        roleTag: "国际先锋报道",
        reason: `针对「${stepLabel}」寻找全球前沿建筑与设计事务所的最新实践案例`,
        searchUrl: `https://www.dezeen.com/?s=${encodeURIComponent(queryTerm)}`,
        keywords: [
          {
            keyword: `${queryTerm} design`,
            meaning: "国际前沿趋势案例",
            language: "en",
            calibratedQuery: `${queryTerm} material design minimal`,
          },
          {
            keyword: `${stepLabel} aesthetic`,
            meaning: "视点专项美学对照",
            language: "en",
            calibratedQuery: `${stepLabel} industrial design avant garde`,
          },
        ],
      },
      {
        id: `src-behance-${step.id}`,
        platform: "behance",
        roleTag: "工业设计与 CMF",
        reason: "深入了解该视点从草图构思到成品落地的完整工艺拆解与渲染细节",
        searchUrl: `https://www.behance.net/search/projects?search=${encodeURIComponent(queryTerm)}`,
        keywords: [
          {
            keyword: `${queryTerm} CMF`,
            meaning: "色彩材质与表面处理",
            language: "en",
            calibratedQuery: `${queryTerm} CMF design process`,
          },
          {
            keyword: `${stepLabel} concept`,
            meaning: "视点概念造型探索",
            language: "en",
            calibratedQuery: `${stepLabel} product design sketching`,
          },
        ],
      },
      {
        id: `src-pinterest-${step.id}`,
        platform: "pinterest",
        roleTag: "视觉情绪对照板",
        reason: "快速建立该视点的微观质感、光影漫反射与色彩情绪板",
        searchUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(queryTerm)}`,
        keywords: [
          {
            keyword: `${queryTerm} moodboard`,
            meaning: "情绪板质感对照",
            language: "en",
            calibratedQuery: `${queryTerm} moodboard tactile aesthetic`,
          },
          {
            keyword: `${stepLabel} texture`,
            meaning: "微观纹理与阻尼感",
            language: "en",
            calibratedQuery: `${stepLabel} surface finish minimalist`,
          },
        ],
      },
    ],
    alternativeSources: [],
  };
}

/**
 * 6. 便签自动提炼（设计手记）：
 * 提取上游节点的核心要点，自动格式化成结构化笔记
 */
export function deriveNoteFromNode(
  nodeData: any,
  nodeType: string,
): { title: string; content: string; color: "amber" | "emerald" | "sky" | "rose" | "stone" } {
  if (nodeType === "route" || nodeData?.route) {
    const route: Route = nodeData?.route ?? nodeData;
    const title = route.themeName || cleanTitle(route.title);
    return {
      title: `便签 · ${title}`,
      content: `【主题探索要点】\n• 核心聚焦：${route.focusDimension || "主线特征"}\n• 视觉主张：${route.startingPoint || ""}\n• 视点试验：${route.steps?.map((s, i) => `0${i + 1} ${cleanStepLabel(s.title)}`).join(" / ") || "未拆解"}\n\n【关键评审备忘】：\n• `,
      color: "amber",
    };
  }

  if (nodeType === "step") {
    const step = nodeData?.step ?? nodeData?.route?.steps?.[0];
    const route = nodeData?.route;
    const title = step?.title ? cleanStepLabel(step.title) : "视点试验";
    return {
      title: `便签 · 视点观察手记`,
      content: `【当前切入视点】${title}\n• 探索问题：${toInspirationCopy(step?.question || "")}\n• 观察重点：${toInspirationCopy(step?.purpose || "")}\n\n【落地检验清单】\n${step?.acceptanceCriteria?.map((c: string) => `• ${c}`).join("\n") || "• 暂无准则"}\n\n【设计师速记】：\n• `,
      color: "rose",
    };
  }

  if (nodeType === "platformPlan" || nodeData?.plan) {
    const plan: PlatformPlan = nodeData?.plan ?? nodeData;
    const sources = plan.primarySources?.map((s) => s.platform).join("、");
    return {
      title: `便签 · 灵感检索备忘`,
      content: `【已规划渠道】：${sources || "全平台"}\n\n【核心关键词速查】：\n${plan.primarySources?.flatMap((s) => s.keywords).slice(0, 4).map((k) => `• [${k.language}] ${k.calibratedQuery || k.keyword}`).join("\n") || "• 暂无关键词"}\n\n【检索发现心得】：\n• `,
      color: "sky",
    };
  }

  if (nodeType === "anchor" || nodeType === "state") {
    const state = nodeData?.state ?? nodeData;
    const intent = state?.direction?.intent?.text || "核心策略方向";
    const priorities = state?.direction?.priorities || [];
    const avoid = state?.direction?.avoid || [];
    const toText = (item: any) =>
      typeof item === "string" ? item : item?.text || String(item || "");

    return {
      title: `便签 · 策略红线准则`,
      content: `【核心主张】：${intent}\n\n【设计坚持】：\n${priorities.map((p: any) => `✓ ${toText(p)}`).join("\n") || "无"}\n\n【避免雷区】：\n${avoid.map((a: any) => `✗ ${toText(a)}`).join("\n") || "无"}\n\n【执行批注】：\n• `,
      color: "emerald",
    };
  }

  if (nodeType === "brief") {
    return {
      title: `便签 · Brief 灵感`,
      content: `【简报任务】：${nodeData?.goal || "设计任务"}\n\n【前期灵感设想】：\n• `,
      color: "stone",
    };
  }

  if (nodeType === "image" || nodeData?.src) {
    return {
      title: `便签 · 参考图速记`,
      content: `【参考图片】：${nodeData?.fileName || "意向参考图"}\n\n【视觉提炼与备忘】：\n• 色彩倾向：\n• 材质工艺：\n• 形态启发：`,
      color: "sky",
    };
  }

  return {
    title: `设计手记`,
    content: `随手记录你的灵感、设计手记、评审反馈或排版约束…`,
    color: "amber",
  };
}

/**
 * 7. 从风格主题或策略基准派生概念生图提示词与控制参数
 */
export interface StructuredPrompt {
  subject: string;
  material: string;
  lighting: string;
}

export function deriveImageGenFromTheme(theme?: Route): {
  prompt: string;
  negativePrompt: string;
  structuredPrompt: StructuredPrompt;
  negativeTags: string[];
  aspectRatio: "1:1" | "3:4" | "4:3" | "16:9";
  stylePreset: "realistic" | "clay" | "cinematic";
  themeName: string;
  sourceDimension?: string;
} {
  const themeName = theme?.themeName || cleanTitle(theme?.title) || "概念画面";
  const visualDesc = theme?.visualSnapshot || theme?.sensoryMetaphor || theme?.purpose || "";
  const craftDesc = theme?.focusDimension || theme?.startingPoint || "";
  const consDesc = theme?.cons || "";

  // Extract clean sentences without meta prefixes
  const cleanVisual = visualDesc
    ? visualDesc.replace(/^针对[^，,]+[，,]\s*/, "").replace(/^一眼看懂[，,]\s*/, "").trim()
    : `「${themeName}」实物原型与纯几何造型体量`;

  const cleanCraft = craftDesc || "高饱和哑光微肌理平涂、表面漫反射、无反光、同色软胶圆角工艺细节";
  const cleanLighting = "45° 侧光微立体阴影、工作室静物漫反射布光、纯净中性浅灰底、工业设计产品摄影";

  const promptParts: string[] = [
    cleanVisual,
    `材质工艺：${cleanCraft}`,
    cleanLighting,
    "8k resolution, photorealistic studio lighting, tactile CMF details",
  ];
  const prompt = promptParts.join("，");

  const negativeTags = [
    "低分辨率",
    "廉价塑料反光",
    "结构形变与畸变",
    "杂乱多余装饰",
    "卡通玩具感",
    "文字水印与Logo",
  ];
  if (consDesc) {
    negativeTags.push(`规避：${consDesc}`);
  }
  const negativePrompt = negativeTags.join("，");

  return {
    prompt,
    negativePrompt,
    structuredPrompt: {
      subject: cleanVisual,
      material: cleanCraft,
      lighting: cleanLighting,
    },
    negativeTags,
    aspectRatio: "3:4",
    stylePreset: "realistic",
    themeName,
    sourceDimension: craftDesc,
  };
}

/**
 * 辅助：生成高质量概念渲染示意矢量图（用于模型接入前的保真演示与状态闭环）
 */
export function generateMockConceptSvg(
  themeName: string,
  prompt: string,
  aspectRatio: "1:1" | "3:4" | "4:3" | "16:9" | "9:16" = "3:4",
  variantIndex: number = 0,
): string {
  let w = 600;
  let h = 800;
  if (aspectRatio === "1:1") {
    w = 600;
    h = 600;
  } else if (aspectRatio === "4:3") {
    w = 800;
    h = 600;
  } else if (aspectRatio === "16:9") {
    w = 800;
    h = 450;
  } else if (aspectRatio === "9:16") {
    w = 450;
    h = 800;
  }

  const combined = (themeName + " " + prompt).toLowerCase();
  const isDark = /黑|深灰|暗|钛|金属|暗黑|极夜|dark|black|carbon|metal/i.test(combined);
  const isBlue = /蓝|海|青|冰|冷|透明|玻璃|cyan|blue/i.test(combined);
  const isWarm = /橙|暖|釉面|红|黄|拼贴|陶|胡桃木|warm|orange|terracotta/i.test(combined);
  const isGreen = /绿|生态|原浆|白|木|纸|自然|green|sage/i.test(combined);

  const bg = isDark
    ? "#18181b"
    : isBlue
      ? "#f0f5fa"
      : isWarm
        ? "#fcf9f5"
        : isGreen
          ? "#f5f8f5"
          : "#f8f8f7";

  const bgEnd = isDark
    ? "#27272a"
    : isBlue
      ? "#dbe6f1"
      : isWarm
        ? "#f3ece1"
        : isGreen
          ? "#e6eee7"
          : "#eae8e3";

  const primary = isDark
    ? "#e4e4e7"
    : isBlue
      ? "#2563eb"
      : isWarm
        ? "#ea580c"
        : isGreen
          ? "#059669"
          : "#4f46e5";

  const secondary = isDark
    ? "#52525b"
    : isBlue
      ? "#93c5fd"
      : isWarm
        ? "#fdba74"
        : isGreen
          ? "#a7f3d0"
          : "#c7d2fe";

  const accent = isDark ? "#f4f4f5" : "#292524";
  const lineCol = isDark ? "#3f3f46" : "#e5e2dc";

  let safeTitle = themeName.replace(/[<>&'"]/g, "").trim();
  if (!safeTitle || safeTitle === "概念画面" || safeTitle === "意象出图") {
    const firstPhrase = prompt.split(/[,，、。\n]/)[0]?.trim();
    safeTitle = firstPhrase ? firstPhrase.slice(0, 16) : "概念视觉";
  } else {
    safeTitle = safeTitle.slice(0, 16);
  }
  const seedTag = `0${(variantIndex % 4) + 1}`;

  // Variation geometry
  let visualGeometry = "";
  if (variantIndex % 4 === 0) {
    visualGeometry = `
      <g transform="translate(${w / 2}, ${h / 2 - 15})" filter="url(#shadow)">
        <circle cx="-50" cy="-20" r="105" fill="${secondary}" opacity="0.85" />
        <rect x="-80" y="-80" width="160" height="160" rx="32" fill="url(#primGrad)" transform="rotate(-12)" />
        <circle cx="45" cy="45" r="50" fill="${isDark ? "#27272a" : "#ffffff"}" opacity="0.95" />
        <path d="M -50 -30 L 30 -30" stroke="${isDark ? "#71717a" : "#ffffff"}" stroke-width="3" stroke-linecap="round" opacity="0.75" />
      </g>`;
  } else if (variantIndex % 4 === 1) {
    visualGeometry = `
      <g transform="translate(${w / 2}, ${h / 2 - 15})" filter="url(#shadow)">
        <rect x="-100" y="-70" width="200" height="140" rx="28" fill="${secondary}" opacity="0.75" />
        <rect x="-60" y="-100" width="120" height="200" rx="28" fill="url(#primGrad)" transform="rotate(18)" />
        <circle cx="0" cy="0" r="38" fill="${isDark ? "#27272a" : "#ffffff"}" opacity="0.95" />
        <line x1="-80" y1="0" x2="80" y2="0" stroke="${isDark ? "#71717a" : "#ffffff"}" stroke-width="2" stroke-dasharray="4 4" opacity="0.8" />
      </g>`;
  } else if (variantIndex % 4 === 2) {
    visualGeometry = `
      <g transform="translate(${w / 2}, ${h / 2 - 15})" filter="url(#shadow)">
        <polygon points="0,-110 95,55 -95,55" fill="${secondary}" opacity="0.7" />
        <circle cx="0" cy="0" r="75" fill="url(#primGrad)" />
        <rect x="-35" y="-35" width="70" height="70" rx="16" fill="${isDark ? "#27272a" : "#ffffff"}" opacity="0.95" />
      </g>`;
  } else {
    visualGeometry = `
      <g transform="translate(${w / 2}, ${h / 2 - 15})" filter="url(#shadow)">
        <path d="M -90 40 Q 0 -110 90 40" fill="none" stroke="url(#primGrad)" stroke-width="48" stroke-linecap="round" />
        <circle cx="0" cy="30" r="45" fill="${secondary}" opacity="0.9" />
        <circle cx="0" cy="30" r="20" fill="${isDark ? "#27272a" : "#ffffff"}" />
      </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${bg}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
      <linearGradient id="primGrad" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stop-color="${primary}" stop-opacity="0.95" />
        <stop offset="100%" stop-color="${primary}" stop-opacity="0.8" />
      </linearGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#1c1917" flood-opacity="${isDark ? "0.4" : "0.12"}" />
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bgGrad)" />
    
    <!-- Horizon studio ground line -->
    <line x1="32" y1="${h - 60}" x2="${w - 32}" y2="${h - 60}" stroke="${lineCol}" stroke-width="1" />

    <!-- Central Prototype Object -->
    ${visualGeometry}

    <!-- Discreet Editorial Plate -->
    <text x="36" y="${h - 32}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="${accent}" letter-spacing="1">
      ${safeTitle}
    </text>
    <text x="${w - 36}" y="${h - 32}" text-anchor="end" font-family="ui-monospace, monospace" font-size="10.5" font-weight="500" fill="${isDark ? "#a1a1aa" : "#78716c"}">
      方案 ${seedTag} · ${aspectRatio}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * 8. 统一连线上下文合成调度器（Synthesizer Router）：
 * 根据目标卡片类型与所有连入的上游节点，自动计算并填充卡片内容
 */
export function synthesizeCardFromInputs(
  targetType: ToolType,
  upstreamNodes: Array<{ id: string; type?: string; data: any }>,
  ctx?: { state?: any; rawBrief?: string; routes?: Route[] },
): { title?: string; content?: string; color?: any; data?: any } {
  // Collect all upstream routes
  const upstreamRoutes: Route[] = [];
  upstreamNodes.forEach((n) => {
    if (n.data?.route) {
      upstreamRoutes.push(n.data.route);
    } else if (n.type === "route" && n.data && (n.data as any).title) {
      upstreamRoutes.push(n.data as Route);
    } else if (ctx?.routes) {
      const matched = ctx.routes.find((r) => r.id === n.id || `route-${r.id}` === n.id);
      if (matched) upstreamRoutes.push(matched);
    }
  });

  // Target: 03 风格主题
  if (targetType === "route") {
    // Case 1: Connected to 2 or more themes -> Theme Blending!
    if (upstreamRoutes.length >= 2) {
      const blended = blendThemes(upstreamRoutes[0], upstreamRoutes[1]);
      return {
        title: blended.themeName,
        data: {
          route: blended,
          isBlended: true,
          isEmpty: false,
        },
      };
    }

    // Case 2: Connected to 1 theme -> Theme Evolution / Variation!
    if (upstreamRoutes.length === 1) {
      const evolved = evolveTheme(upstreamRoutes[0]);
      return {
        title: evolved.themeName,
        data: {
          route: evolved,
          isEvolved: true,
          isEmpty: false,
        },
      };
    }

    // Case 3: Connected to Strategy Benchmark or Brief
    const derived = deriveThemeFromStrategy(ctx?.state, ctx?.rawBrief);
    return {
      title: derived.themeName,
      data: {
        route: derived,
        isDerived: true,
        isEmpty: false,
      },
    };
  }

  // Target: 04 视点推进
  if (targetType === "step") {
    const parentRoute = upstreamRoutes[0] ?? deriveThemeFromStrategy(ctx?.state, ctx?.rawBrief);
    const steps = deriveStepsFromTheme(parentRoute);
    return {
      title: `${parentRoute.themeName || parentRoute.title} · 视点推进`,
      data: {
        route: parentRoute,
        stepId: steps[0]?.id,
        isEmpty: false,
      },
    };
  }

  // Target: 4 灵感检索
  if (targetType === "platformPlan") {
    const stepNode = upstreamNodes.find((n) => n.type === "step");
    const parentRoute =
      upstreamRoutes[0] ??
      stepNode?.data?.route ??
      deriveThemeFromStrategy(ctx?.state, ctx?.rawBrief);

    const plan = derivePlanFromTheme(parentRoute);
    const themeDisplay = parentRoute?.themeName || cleanTitle(parentRoute?.title) || "风格主题";
    return {
      title: `${themeDisplay} · 灵感检索`,
      data: {
        plan,
        isEmpty: false,
      },
    };
  }

  // Target: 5 画面生成 (ImageGen)
  if (targetType === "imageGen") {
    const parentRoute =
      upstreamRoutes[0] ??
      upstreamNodes.find((n) => n.data?.route)?.data?.route ??
      deriveThemeFromStrategy(ctx?.state, ctx?.rawBrief);

    const themeDisplay = parentRoute?.themeName || cleanTitle(parentRoute?.title) || "概念画面";
    const imageGenData = deriveImageGenFromTheme(parentRoute);

    return {
      title: `${themeDisplay} · 意象出图`,
      data: {
        ...imageGenData,
        route: parentRoute,
        imageUrl: null,
        isGenerating: false,
        isEmpty: false,
      },
    };
  }

  // Target: 便签 (Sticky Note)
  if (targetType === "note") {
    const primaryUpstream = upstreamNodes[0];
    if (primaryUpstream) {
      const noteData = deriveNoteFromNode(primaryUpstream.data, primaryUpstream.type ?? "");
      return {
        title: noteData.title,
        content: noteData.content,
        color: noteData.color,
        data: {
          isEmpty: false,
        },
      };
    }
  }

  // Target: 0 简报解析 (Brief)
  if (targetType === "brief") {
    const images = upstreamNodes
      .filter((n) => n.type === "image" && n.data?.src)
      .map((n) => n.data.src as string)
      .slice(0, 3);
    const notes = upstreamNodes
      .filter((n) => n.type === "note" && (n.data?.content || (n as any).content))
      .map((n) => (n.data?.content || (n as any).content) as string);
    const initialBrief = notes.length > 0 ? notes.join("\n\n") : "";

    return {
      title: "0 简报解析",
      data: {
        rawBrief: initialBrief,
        briefImages: images,
        status: "idle",
        state: null,
        next: null,
        error: null,
        isEmpty: false,
      },
    };
  }

  // Target: 1 视觉抉择 (Ask)
  if (targetType === "ask") {
    const briefNode = upstreamNodes.find((n) => n.type === "brief");
    const briefData = briefNode?.data ?? {};
    const questions = briefData.next?.questions || briefData.questions || [
      {
        id: "q_auto_1",
        prompt: "整体视觉调性更倾向克制收敛还是前卫张扬？",
        type: "choice",
        options: [
          { id: "opt_minimal", text: "纯粹克制、极简几何与温和留白", tag: "极简收敛" },
          { id: "opt_bold", text: "先锋前卫、解构张力与辨识度", tag: "前卫张力" },
        ],
      },
      {
        id: "q_auto_2",
        prompt: "表面触感更侧重原生微孔肌理还是精密现代打磨？",
        type: "choice",
        options: [
          { id: "opt_tactile", text: "保留物理材质的粗粝与阻尼触感", tag: "原生触感" },
          { id: "opt_refined", text: "微米级细腻平滑与精密工程质感", tag: "精工质感" },
        ],
      },
    ];

    return {
      title: "关键视觉抉择",
      data: {
        parentBriefId: briefNode?.id,
        rawBrief: briefData.rawBrief || ctx?.rawBrief || "",
        questions,
        state: briefData.state ?? ctx?.state ?? null,
        status: "active",
        isEmpty: false,
      },
    };
  }

  // Target: 2 策略基准 (State)
  if (targetType === "state") {
    const askNode = upstreamNodes.find((n) => n.type === "ask");
    const briefNode = upstreamNodes.find((n) => n.type === "brief");
    const inheritedState = askNode?.data?.state || briefNode?.data?.state || ctx?.state;
    const rawBrief = askNode?.data?.rawBrief || briefNode?.data?.rawBrief || ctx?.rawBrief || "";

    return {
      title: "核心策略基准",
      data: {
        parentAskId: askNode?.id,
        parentBriefId: briefNode?.id,
        rawBrief,
        state: inheritedState || {
          brief: { goal: rawBrief || "设计主线收敛" },
          direction: {
            intent: { text: "极简克制与高级质感平衡" },
            priorities: ["确立第一眼纯粹辨识度", "确保微触感物理可实现性"],
            avoid: ["避免浮夸非必要的装饰性细节"],
          },
          status: "confirmed",
        },
        status: "confirmed",
        isEmpty: false,
      },
    };
  }

  return {
    data: { isEmpty: false },
  };
}
