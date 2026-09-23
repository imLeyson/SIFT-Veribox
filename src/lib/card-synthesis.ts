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
  | "note"
  | "image";

function cleanTitle(str: string | null | undefined): string {
  if (!str) return "风格探索";
  return str.replace(/【|】/g, "").trim();
}

/**
 * 1. 双主题融合（Theme Blending）：
 * 提取两个主题的视觉母题、触感材质与形式张力，合成一个兼具两者特色的全新跨界复合风格主题
 */
export function blendThemes(themeA: Route, themeB: Route): Route {
  const nameA = themeA.themeName || cleanTitle(themeA.title);
  const nameB = themeB.themeName || cleanTitle(themeB.title);
  const blendId = `route-blend-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const focusA = themeA.focusDimension || "形态与骨架";
  const focusB = themeB.focusDimension || "材质与触感";

  const blendedSteps: RouteStep[] = [
    {
      id: `${blendId}-s1`,
      title: `双主题母题杂交与造型骨架试验`,
      question: `如何将「${nameA}」的造型轮廓与「${nameB}」的核心特征融合成连贯的第一眼视觉？`,
      purpose: `确立融合型视觉母题，检验两种形态语言的相容性`,
      acceptanceCriteria: [
        `兼具「${nameA}」与「${nameB}」的核心记忆锚点`,
        `造型转折与比例无割裂感，呈现一体化美学`,
      ],
    },
    {
      id: `${blendId}-s2`,
      title: `复合材质微触感与表面过渡试验`,
      question: `在保留「${focusA}」特性的同时，如何施加「${focusB}」的工艺处理？`,
      purpose: `深化材质交界工艺与细节质感，确保触觉层次丰富`,
      acceptanceCriteria: [
        `明确主副材质的分型线与渐变过渡方式`,
        `表面微纹理与触感阻尼具有现实可实现性`,
      ],
    },
    {
      id: `${blendId}-s3`,
      title: `场景共生与整体系统验证试验`,
      question: `融合后的设计语言在真实应用场景中如何表现？`,
      purpose: `检验跨界复合风格在全案延展时的系统完整度与受众亲和力`,
      acceptanceCriteria: [
        `可顺畅延展至整套系列器物或包装构件`,
        `在光影与真实触碰下保持高级、克制的整体气质`,
      ],
    },
  ];

  return {
    id: blendId,
    title: `【跨界融合】${nameA} × ${nameB}`,
    themeName: `${nameA}与${nameB}复合变奏`,
    focusDimension: `${focusA} × ${focusB}`,
    startingPoint: `以「${nameA}」的造型轮廓为骨架，注入「${nameB}」的触感材质与工艺语汇，探索两极交融的复合设计语言。`,
    coreProblem: `如何在延续「${nameA}」辨识度的同时，赋予其「${nameB}」的高级材质深度与制造可行性？`,
    purpose: `融合两组主题的长处，开辟兼具造型辨识度与触感深度的全新视觉领地。`,
    visualSnapshot: `在「${nameA}」温润克制的器物曲线上，覆以「${nameB}」特有的细腻材质肌理。光影流转时显现出两种语汇的精妙融合，既有力量感又富于温暖的触觉呼吸感。`,
    pros: `兼收并蓄两者的美学优势：既继承了「${nameA}」的视觉记忆锤，又吸收了「${nameB}」的工艺质感细节。`,
    cons: `需严格把控两种设计语言的主次权重，避免细节过于繁复抢戏。`,
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
  const prioritySummary = priorities.length > 0 ? priorities[0] : "质感与比例";

  return {
    id: routeId,
    title: `【策略基准派生】${goal}`,
    themeName: `策略收敛 · ${intent.slice(0, 10)}`,
    focusDimension: `聚焦「${prioritySummary}」与视觉主张落地`,
    startingPoint: `根据策略基准收敛成果，以「${intent}」为绝对锚点切入。`,
    coreProblem: `如何将已确认的设计坚持与红线准则，转化为具象的设计母题？`,
    purpose: `落实策略收敛主张，确保设计执行不偏离既定轨道。`,
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
 * 5. 灵感方案推导（05 灵感检索）：
 * 从视点与主题派生出精准跨平台去噪搜索方案
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
    return {
      title: `便签 · 策略红线准则`,
      content: `【核心主张】：${intent}\n\n【设计坚持】：\n${priorities.map((p: string) => `✓ ${p}`).join("\n") || "无"}\n\n【避免雷区】：\n${avoid.map((a: string) => `✗ ${a}`).join("\n") || "无"}\n\n【执行批注】：\n• `,
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
 * 7. 统一连线上下文合成调度器（Synthesizer Router）：
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

  // Target: 05 灵感检索
  if (targetType === "platformPlan") {
    // Check if upstream is a Step node
    const stepNode = upstreamNodes.find((n) => n.type === "step");
    const parentRoute = stepNode?.data?.route ?? upstreamRoutes[0];
    const targetStep =
      parentRoute?.steps?.find((s: RouteStep) => s.id === stepNode?.data?.stepId) ??
      parentRoute?.steps?.[0] ?? {
        id: "s1",
        title: "核心母题与造型骨架试验",
        question: "如何确立第一眼辨识度？",
        purpose: "提炼核心视觉母题",
      };

    const plan = derivePlanFromStep(targetStep, parentRoute);
    return {
      title: `${parentRoute?.themeName || "视点"} · 灵感检索`,
      data: {
        plan,
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

  return {
    data: { isEmpty: false },
  };
}
