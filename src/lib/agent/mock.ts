import type {
  AgentAnswer,
  AgentQuestion,
  Brief,
  ExplorationRoute,
  PlatformPlan,
  PlatformSource,
  StartingState,
} from "@/types";
import { withSearchUrl } from "./sources";
import { inferCraft } from "./craft";
import { dedupeQuestions } from "./questions";

function blobOf(brief: Brief) {
  return [
    brief.goal,
    brief.targetUser,
    brief.deliverable,
    ...brief.known,
    ...brief.unknown,
    ...brief.constraints,
    ...brief.preferences,
    ...brief.assumptions,
  ].join(" ");
}

export function mockRouteQuestions(
  brief: Brief,
  answers: AgentAnswer[] = [],
  asked: AgentQuestion[] = []
): AgentQuestion[] {
  if (answers.some((a) => a.questionId.startsWith("routes_"))) return [];
  const blob = blobOf(brief);
  const luxuryCheap = /奢华|高端|礼品/.test(blob) && /便宜|低成本|好做/.test(blob);
  const youngOld = /年轻/.test(blob) && /老字号|传统/.test(blob);
  const questions: AgentQuestion[] = [];
  if (luxuryCheap) {
    questions.push({
      id: "routes_q_cost",
      stage: "routes",
      prompt: "礼品档和落地成本打架时，先按哪边搜？",
      options: [
        {
          id: "gift",
          label: "先按礼品档搜",
          rationale: "会看到更完整的层次，但可能做不起",
        },
        {
          id: "cost",
          label: "先按能落地的成本搜",
          rationale: "更接近能做出来的，但会少看高档参考",
          recommended: true,
        },
      ],
    });
  } else if (youngOld) {
    questions.push({
      id: "routes_q_heritage",
      stage: "routes",
      prompt: "年轻客群和老字号感，先按哪边排探索顺序？",
      options: [
        {
          id: "youth",
          label: "先按年轻人怎么认",
          rationale: "更接近购买现场",
        },
        {
          id: "heritage",
          label: "先按老字号怎么认",
          rationale: "更容易保住已有识别",
        },
      ],
    });
  }
  return dedupeQuestions(questions, [...asked, ...answers.map((a) => ({ id: a.questionId }))]);
}

export function mockPlatformQuestions(
  brief: Brief,
  answers: AgentAnswer[] = [],
  asked: AgentQuestion[] = []
): AgentQuestion[] {
  if (answers.some((a) => a.questionId.startsWith("platform_"))) return [];
  const decided = [
    brief.goal,
    brief.targetUser,
    ...brief.known,
    ...brief.preferences,
    ...brief.constraints,
  ].join(" ");
  if (/国内|海外|英文|中文|小红书|pinterest|behance/i.test(decided)) return [];
  const needsRegion = brief.unknown.some((item) =>
    /地区|语言|海外|国内|平台/.test(item)
  );
  if (!needsRegion) return [];
  return dedupeQuestions(
    [
      {
        id: "platform_q_lang",
        stage: "platform",
        prompt: "这一轮先看哪边的参考？",
        options: [
          {
            id: "cn",
            label: "国内站为主",
            rationale: "更接近上线环境",
            recommended: true,
          },
          {
            id: "en",
            label: "英文站为主",
            rationale: "更容易看到完整项目",
          },
          {
            id: "mix",
            label: "中英都看",
            rationale: "对照差异，但会慢一点",
          },
        ],
      },
    ],
    [...asked, ...answers.map((a) => ({ id: a.questionId }))]
  );
}

export function mockParseBrief(raw: string): Brief {
  const text = raw.toLowerCase();
  const isSkincare =
    text.includes("护肤") || text.includes("skincare") || text.includes("美妆");
  const isYoung =
    text.includes("20") || text.includes("年轻") || text.includes("女性");

  if (isSkincare) {
    return {
      goal: "寻找护肤品牌视觉方向",
      targetUser: isYoung ? "20–30 岁女性" : "目标消费者",
      known: extractKnown(raw, ["自然", "年轻", "有品质感", "清新", "克制"]),
      unknown: ["还不知道先看瓶子还是先看使用场景"],
      constraints: extractKnown(raw, [
        "不要太少女",
        "不要传统有机品牌感",
        "避免廉价感",
      ]),
      deliverable: "视觉探索方向",
      preferences: [],
      assumptions: [],
      openQuestions: [],
      clarifyQuestions: [],
    };
  }

  const short = raw.trim().length < 24;
  return {
    goal: summarizeGoal(raw),
    targetUser: "待确认目标用户",
    known: extractTokens(raw).slice(0, 4),
    unknown: short
      ? ["还没确认这是界面、包装还是品牌"]
      : ["还没确认先看哪一块"],
    constraints: [],
    deliverable: "视觉探索方向",
    preferences: [],
    assumptions: [],
    openQuestions: short
      ? ["这是做什么？", "先看哪一块？"]
      : ["你更想先搞清哪件事？"],
    clarifyQuestions: short
      ? [
          {
            id: "q1",
            prompt: "这是做什么？",
            options: ["App / 小程序界面", "包装或产品外观", "品牌或平面", "还没定"],
          },
          {
            id: "q2",
            prompt: "先看哪一块？",
            options: ["别人怎么做", "关键页面或关键物件", "用户怎么用"],
          },
        ]
      : [
          {
            id: "q1",
            prompt: "你更想先搞清哪件事？",
            options: ["别人怎么做", "关键部分长什么样", "用在什么场合"],
          },
        ],
  };
}

function extractKnown(raw: string, candidates: string[]): string[] {
  return candidates.filter((c) => raw.includes(c.replace(/不要/g, "")));
}

function extractTokens(raw: string): string[] {
  return raw
    .split(/[，,。.\s、/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 12)
    .slice(0, 6);
}

function summarizeGoal(raw: string): string {
  const first = raw.trim().split(/[。.!！？?\n]/)[0] ?? raw;
  return first.slice(0, 40) || "寻找视觉方向";
}

export function mockGenerateRoutes(
  brief: Brief,
  startingState: StartingState,
  userInitialIdea: string[]
): { recommendedRouteId: string | null; routes: ExplorationRoute[] } {
  const ideaHint =
    startingState === "has_idea" && userInitialIdea.length > 0
      ? `你已经有词：${userInitialIdea.join(" / ")}。`
      : "你还没想清楚先看什么。";
  const craft = inferCraft(
    brief.goal,
    brief.deliverable,
    brief.known.join(" "),
    brief.unknown.join(" ")
  );

  const byCraft: Record<string, ExplorationRoute[]> = {
    app: [
      pack("route_01", "先看竞品怎么走", "别人核心任务怎么走完？", ["竞品首页", "核心任务", "空状态", "个人中心"], "先摸别人怎么走流程", "下手快", "别直接抄结构", `${ideaHint}先看流程比较稳。`),
      pack("route_02", "先看关键页", "哪几页决定产品长什么样？", ["首页", "列表", "详情", "空状态"], "先把主页面看清楚", "比较说得清", "容易忽略状态页", `${ideaHint}页面还没框住。`),
      pack("route_03", "先看组件状态", "按钮、表单、失败态怎么处理？", ["按钮", "表单", "加载失败", "弹窗"], "先看零碎状态", "做的时候不容易漏", "图会比较碎", `${ideaHint}如果怕漏状态，走这条。`),
    ],
    miniprogram: [
      pack("route_01", "先看同类小程序", "同类小程序首页怎么排？", ["小程序首页", "核心任务", "分享卡片", "授权"], "先看国内小程序怎么做", "贴近上线环境", "容易做成一样的", `${ideaHint}小程序先看国内。`),
      pack("route_02", "先看任务怎么走", "用户最短怎么完成任务？", ["入口", "核心任务", "结果页", "再来一次"], "先把路径走通", "不会一上来纠结皮肤", "路径看完还是要回头看界面", `${ideaHint}任务还不清楚。`),
      pack("route_03", "先看组件", "常用组件在小程序里长什么样？", ["导航", "列表", "表单", "空状态"], "先看零件", "落地时少打架", "会比较碎", `${ideaHint}如果先要能做，走这条。`),
    ],
    interaction: [
      pack("route_01", "先看任务路径", "用户一步步怎么点完？", ["任务入口", "关键操作", "成功反馈", "失败怎么办"], "先把路径画清", "不容易漏步骤", "还没看皮肤", `${ideaHint}交互先看路径。`),
      pack("route_02", "先看反馈", "点下去之后发生什么？", ["加载", "成功", "失败", "空状态"], "先看系统怎么回话", "做起来踏实", "容易忽略主路径", `${ideaHint}反馈还没想。`),
      pack("route_03", "先看别人怎么动", "转场和手势别人怎么做？", ["转场", "手势", "微动效", "打断"], "先看动的部分", "容易找到感觉", "别只抄动效", `${ideaHint}如果卡在手感，走这条。`),
    ],
    web: [
      pack("route_01", "先看竞品站", "同类官网怎么讲？", ["官网首页", "功能页", "定价", "后台入口"], "先看别人怎么铺页面", "下手快", "别做成官网模板", `${ideaHint}网页先看竞品站。`),
      pack("route_02", "先看工作台", "登录后第一屏干什么？", ["工作台", "列表", "详情", "设置"], "先看产品里", "更接近真用", "容易忽略获客页", `${ideaHint}SaaS 先看用的人。`),
      pack("route_03", "先看组件", "表格、筛选、空状态怎么做？", ["表格", "筛选", "空状态", "设置"], "先看零件", "开发时少扯", "会碎", `${ideaHint}如果要能开工，走这条。`),
    ],
    packaging: [
      pack("route_01", "先看货架", "同类产品现在都长什么样？", ["货架", "瓶型", "包装细节", "使用场景"], "先看市场上在卖的", "下手快", "看完容易被大牌带跑", `${ideaHint}先看货比较稳。`),
      pack("route_02", "先看瓶和材质", "喜欢的是瓶子、材料还是拍照？", ["瓶型", "材质", "拍照", "字体"], "把喜欢的东西拆开看", "比较说得清", "前期图会比较碎", brief.unknown[0] ?? "还不知道先看哪一层。"),
      pack("route_03", "先看别人怎么做", "同行都在用哪套套路？", ["竞品官网", "货架共性", "跨品类", "可抄的细节"], "先摸清套路", "不容易撞款", "别看完只会跟", `${ideaHint}怕撞款走这条。`),
    ],
    product: [
      pack("route_01", "先看形态", "东西拿在手里是什么形？", ["整体形态", "比例", "按键", "使用场景"], "先看外形", "下手快", "别只看效果图", `${ideaHint}外观先看形。`),
      pack("route_02", "先看材料和表面", "摸上去是什么感觉？", ["材质", "表面", "颜色", "接缝"], "先看 CMF", "比较说得清", "容易忽略结构", `${ideaHint}手感还不清楚。`),
      pack("route_03", "先看怎么用", "拿起来、打开、收起来什么样？", ["握持", "开合", "收纳", "场景"], "先看用", "不容易做成摆设", "图比较生活", `${ideaHint}如果卡在使用，走这条。`),
    ],
    brand: [
      pack("route_01", "先看字体和色", "字和颜色先定哪边？", ["字体", "色彩", "应用场景", "物料"], "先看识别零件", "后面少返工", "还没看场景", `${ideaHint}品牌先看字和色。`),
      pack("route_02", "先看用在哪", "logo 会出现在什么东西上？", ["名片", "页面", "包装", "环境"], "先看应用", "不容易做成空 logo", "物料会杂", `${ideaHint}应用还不清楚。`),
      pack("route_03", "先看同类品牌", "同类怎么认？", ["同类品牌", "差异点", "禁用样子", "可借鉴细节"], "先看别人怎么认", "不容易撞", "别只对标大牌", `${ideaHint}怕撞名走这条。`),
    ],
    graphic: [
      pack("route_01", "先看版式", "信息怎么排？", ["版式", "字体", "图片", "留白"], "先看排", "下手快", "别只看氛围图", `${ideaHint}平面先看版式。`),
      pack("route_02", "先看图怎么拍/画", "图是照片还是插画？", ["图片风格", "构图", "色彩", "字体"], "先看图", "风格比较好抓", "容易忽略字", `${ideaHint}图还没定。`),
      pack("route_03", "先看用在哪", "这张东西贴在哪？", ["海报", "社交图", "物料", "屏幕"], "先看媒介", "尺寸不容易错", "会比较碎", `${ideaHint}媒介还不清楚。`),
    ],
  };

  const fallback: ExplorationRoute[] = [
    pack("route_01", "先看同类", "别人怎么做这件事？", ["同类案例", "共性", "差异", "可借鉴细节"], "先看别人", "下手快", "别直接抄", `${ideaHint}先看同类比较稳。`),
    pack("route_02", "先看关键部分", "最要紧的那一块是什么？", ["关键部分", "细节", "使用场景", "禁用样子"], "先拆开看", "比较说得清", "会碎", brief.unknown[0] ?? "还不知道先看哪一块。"),
    pack("route_03", "先看用在哪", "这东西最后出现在什么地方？", ["使用场景", "媒介", "近看", "远看"], "先看出场位置", "不容易做飘", "场景图会杂", `${ideaHint}如果场景不清，走这条。`),
  ];

  const routes = byCraft[craft] ?? fallback;
  return { recommendedRouteId: "route_01", routes };
}

function pack(
  id: string,
  title: string,
  question: string,
  steps: string[],
  purpose: string,
  advantage: string,
  watchOut: string,
  recommendationReason: string
): ExplorationRoute {
  return {
    id,
    title,
    question,
    steps,
    purpose,
    advantage,
    watchOut,
    recommendationReason,
  };
}

export function mockPlatformPlan(
  brief: Brief,
  activeStep: string
): PlatformPlan {
  const step = activeStep || brief.unknown[0] || "同类案例";
  const topic = brief.goal.replace(/^寻找/, "").slice(0, 16);
  const craft = inferCraft(brief.goal, brief.deliverable, step);
  const zhQ = `${topic} ${step}`.trim();
  const enQ =
    craft === "app" || craft === "miniprogram" || craft === "interaction"
      ? `${topic} ${step} ui`
      : `${topic} ${step}`;

  const sources: PlatformSource[] = [
    {
      rank: 1,
      name: craft === "miniprogram" || craft === "app" ? "小红书" : "Behance",
      label: "国内案例",
      reason: "先看国内实际怎么做",
      queries: [
        { query: zhQ, translation: `搜「${step}」` },
        { query: `${topic} 竞品`, translation: "看接近的例子" },
      ],
    },
    {
      rank: 2,
      name: "Behance",
      label: "完整项目",
      reason: "看整套怎么做完",
      queries: [
        { query: enQ, translation: `英文搜「${step}」` },
        { query: `${topic} case study`, translation: "看完整案例" },
      ],
    },
    {
      rank: 3,
      name: "品牌官网",
      label: "一手现场",
      reason: "直接看产品/官网本身",
      queries: [
        { query: `${topic} official`, translation: "搜官网或产品页" },
        { query: `${topic} app`, translation: "搜产品现场" },
      ],
    },
  ].map((s, i) => {
    if (i === 0 && s.name === "Behance") {
      return {
        ...s,
        name: "Pinterest",
        label: "快速浏览",
        reason: "先快速扫一圈",
      };
    }
    return s;
  });

  const alternatives: PlatformSource[] = [
    {
      rank: 4,
      name: "Are.na",
      label: "跨领域",
      reason: "不想被品类框死时再看",
      queries: [
        { query: step, translation: `跨领域搜「${step}」` },
        { query: topic, translation: "按题目再扫" },
      ],
    },
    {
      rank: 5,
      name: "收集箱",
      label: "自己的图",
      reason: "先翻自己存过的",
      queries: [
        { query: "my saved references", translation: "回看已存" },
        { query: step, translation: "在收藏里搜这一步" },
      ],
    },
    {
      rank: 6,
      name: "Savee",
      label: "多看一点",
      reason: "还想多扫就来这",
      queries: [
        { query: enQ, translation: "再扫一轮" },
        { query: step, translation: `继续搜「${step}」` },
      ],
    },
  ];

  // Prefer 小红书 first for domestic app / mini program
  if (craft === "miniprogram" || craft === "app") {
    sources[0] = {
      ...sources[0],
      name: "小红书",
      label: "国内界面",
      reason: "先看国内 app/小程序实际长什么样",
    };
  }

  return {
    goal: `这一步去搜「${step}」`,
    sources: sources.map(withSearchUrl),
    alternatives: alternatives.map(withSearchUrl),
  };
}

