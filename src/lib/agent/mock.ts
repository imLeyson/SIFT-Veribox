import type {
  Brief,
  ExplorationRoute,
  PlatformPlan,
  PlatformSource,
  StartingState,
} from "@/types";
import { withSearchUrl } from "./sources";

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
      unknown: ["什么视觉语言可以表达自然但不传统有机"],
      constraints: extractKnown(raw, [
        "不要太少女",
        "不要传统有机品牌感",
        "避免廉价感",
      ]),
      deliverable: "视觉探索方向",
      openQuestions: [],
    };
  }

  return {
    goal: summarizeGoal(raw),
    targetUser: "待确认目标用户",
    known: extractTokens(raw).slice(0, 4),
    unknown: ["当前最大的视觉不确定性是什么"],
    constraints: [],
    deliverable: "视觉探索方向",
    openQuestions:
      raw.trim().length < 20 ? ["目标用户是谁？", "有哪些明确不要的方向？"] : [],
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
      ? `结合你已有的感觉（${userInitialIdea.join(" / ")}）`
      : "从 Brief 的未知项出发";

  const routes: ExplorationRoute[] = [
    {
      id: "route_01",
      title: "先找整体感觉",
      question: "我想要什么整体视觉感觉？",
      steps: ["风格", "色彩", "摄影", "字体"],
      purpose: "快速建立整体视觉边界",
      advantage: "快速看到完整方向",
      watchOut: "容易被成熟案例锚定",
      recommendationReason: `${ideaHint}，若你更想先框住整体调性，这条路线最直接。`,
    },
    {
      id: "route_02",
      title: "先拆关键视觉元素",
      question: "究竟是什么元素构成了想要的感觉？",
      steps: ["摄影", "构图", "字体", "色彩"],
      purpose: "弄清楚喜欢的感觉由哪些元素构成",
      advantage: "判断更具体、更可解释",
      watchOut: "前期看到的信息比较碎",
      recommendationReason:
        brief.unknown[0] ??
        "Brief 已有调性词，但具体视觉元素还不清楚，建议先拆元素验证。",
    },
    {
      id: "route_03",
      title: "先看行业，再跳出去",
      question: "行业怎么做，我又能如何不同？",
      steps: ["同类品牌", "行业共性", "跨品类", "差异元素"],
      purpose: "先理解行业惯例，再寻找差异表达",
      advantage: "更容易发现差异机会",
      watchOut: "可能被行业现有视觉框架限制",
      recommendationReason: `围绕「${brief.goal}」，若你担心同质化，可先扫行业再跨品类。`,
    },
  ];

  // Prefer element-first when unknown is about visual language
  const recommendElement = brief.unknown.some((u) =>
    /视觉|元素|语言|表达/.test(u)
  );

  return {
    recommendedRouteId: recommendElement ? "route_02" : "route_01",
    routes,
  };
}

export function mockPlatformPlan(
  brief: Brief,
  activeStep: string
): PlatformPlan {
  const step = activeStep || "摄影";
  const catalogs: Record<string, PlatformSource[]> = {
    摄影: [
      {
        rank: 1,
        name: "Pinterest",
        label: "视觉扩散",
        reason: "扩大摄影表达的视觉可能性",
        queries: [
          {
            query: "natural skincare photography",
            translation: "自然护肤摄影",
          },
          {
            query: "editorial beauty close up",
            translation: "编辑感美妆近景",
          },
          {
            query: "quiet natural product still life",
            translation: "克制自然的产品静物",
          },
        ],
      },
      {
        rank: 2,
        name: "Are.na",
        label: "跨领域参考",
        reason: "补充跨领域摄影参考，避免被品类限制",
        queries: [
          { query: "editorial still life", translation: "编辑感静物" },
          { query: "natural texture", translation: "自然材质" },
        ],
      },
      {
        rank: 3,
        name: "Behance",
        label: "完整项目验证",
        reason: "验证摄影语言在完整品牌项目中是否成立",
        queries: [
          {
            query: "skincare brand identity",
            translation: "护肤品牌视觉",
          },
          { query: "beauty campaign", translation: "美妆广告项目" },
        ],
      },
    ],
    风格: [
      {
        rank: 1,
        name: "Pinterest",
        label: "氛围扩散",
        reason: "快速浏览整体风格与氛围组合",
        queries: [
          { query: "minimal natural brand aesthetic", translation: "极简自然品牌审美" },
          { query: "editorial lifestyle moodboard", translation: "编辑感生活方式拼贴" },
        ],
      },
      {
        rank: 2,
        name: "Savee",
        label: "快速浏览",
        reason: "高密度视觉浏览，便于对比整体感觉",
        queries: [
          { query: "branding mood", translation: "品牌氛围" },
          { query: "soft minimal design", translation: "柔和极简设计" },
        ],
      },
      {
        rank: 3,
        name: "Behance",
        label: "系统验证",
        reason: "看风格如何落到完整品牌系统",
        queries: [
          { query: "visual identity system", translation: "视觉识别系统" },
          { query: "brand art direction", translation: "品牌艺术指导" },
        ],
      },
    ],
    同类品牌: [
      {
        rank: 1,
        name: "小红书",
        label: "国内语境",
        reason: "了解本土护肤品牌的视觉表达",
        queries: [
          { query: "护肤品牌视觉", translation: "看国内货架上的品牌表达" },
          { query: "小众护肤包装", translation: "看小众包装如何避开大牌套路" },
        ],
      },
      {
        rank: 2,
        name: "品牌官网",
        label: "一手落地",
        reason: "直接看竞品官网的真实视觉落地",
        queries: [
          { query: "clean beauty brand website", translation: "清洁美妆品牌官网" },
          { query: "indie skincare branding", translation: "独立护肤品牌视觉" },
        ],
      },
      {
        rank: 3,
        name: "Behance",
        label: "案例研究",
        reason: "看同类项目的完整 Case Study",
        queries: [
          { query: "skincare packaging design", translation: "护肤包装设计" },
          { query: "beauty brand case study", translation: "美妆品牌案例" },
        ],
      },
    ],
  };

  const alternatives: PlatformSource[] = [
    {
      rank: 4,
      name: "Cosmos",
      label: "相似发现",
      reason: "基于视觉相似继续扩展",
      queries: [
        { query: "natural editorial photography", translation: "自然编辑感摄影" },
        { query: "quiet still life", translation: "克制静物" },
      ],
    },
    {
      rank: 5,
      name: "Designspiration",
      label: "平面扩散",
      reason: "补充平面与摄影交叉参考",
      queries: [
        { query: "beauty art direction", translation: "美妆艺术指导" },
        { query: "packaging layout", translation: "包装排版参考" },
      ],
    },
    {
      rank: 6,
      name: "收集箱",
      label: "历史偏好",
      reason: "先回顾你已有收藏，避免重复搜索",
      queries: [
        { query: "my saved references", translation: "回看自己已存参考" },
        { query: "board review", translation: "整理收藏夹里的重复方向" },
      ],
    },
  ];

  const key =
    Object.keys(catalogs).find((k) => step.includes(k)) ??
    (catalogs[step] ? step : "摄影");
  const sources = (catalogs[key] ?? catalogs["摄影"]).map(withSearchUrl);

  return {
    goal: `探索适合「${brief.goal}」的${step}语言`,
    sources,
    alternatives: alternatives.map(withSearchUrl),
  };
}
