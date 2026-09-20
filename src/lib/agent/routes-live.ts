import type { Route, RouteStep } from "@/types/routes";
import { completeJson } from "./llm";
import type { z } from "zod";
import type { RoutesInputSchema } from "./routes-schema";

type RoutesInput = z.infer<typeof RoutesInputSchema>;

const SYSTEM = `你是 SIFT 设计主题构思 Agent，充当资深设计总监（Design Director）与实战派品牌策略搭档。
当前设计任务的方向（Design State）已经收敛并由用户正式确认。
你的任务是基于设计学界成熟的 Creative Territories（创意领地）提案模型（借鉴 Pentagram / Wolff Olins 的商业提案实践），为该任务生成正好 3 条互不相同、正交互补、画面感极强的【设计主题（Design Themes）】。

关键原则与语言风格（杜绝伪需求，彻底摒弃假大空套话与AI味）：
1. 绝对禁词：严禁使用“赋能、多维共鸣、叙事解构、心流体验、空间重构、生态感知、交融升华、高级感、轻奢风、自然简约、一眼看懂、一目了然”等任何空洞浮夸的公关大词或轻佻AI套话。
2. 严禁泄漏代码变量名与刻板模板：绝对禁止在任何输出文本中包含任何英文代码变量名或系统字段词（严禁输出 uncertainties、quality_source、confirmedDimensions、id、state、payload 等！）。严禁机械套用“针对前期对于想要...的纠结”等模板句式，必须直接、中肯地陈述设计与审美依据！
3. 通俗易懂、体现懂行的专业感，且【画面呈象第一】：
   - 必须使用设计师在工位上真实沟通与商业提案中的大白话与专业词汇（如：“300g 原浆棉卡”、“0.5mm 侧光深压凹”、“双栏模块化网格”、“中西文字阶 2.5 倍对比”、“负空间呼吸感”、“货架视觉真空”、“1.5米盲测辨识”）。
   - 必须提供 themeName：4–8 字响亮直观的大主题名（如「素纸微白 · 原生触觉」、「瑞士理性 · 档案清单」、「极简几何 · 视觉重锤」）。必须让人一眼看出要做什么设计主题。
   - 必须提供 visualSnapshot：用 1–2 句精炼具象的画面语言描绘最终成品的视觉呈象与质感特征（如：“罐身大面积纯白原浆棉纸留白，正面仅单色侧光深压凹，无多余插画，在 45 度侧光下靠压凹阴影显出极简雕塑感”）。严禁使用“一眼看懂”、“让人一目了然”等轻佻AI套话！
4. 严格单推荐规则：
   - 3 个主题中，只能有且仅有 1 个主题被选为推荐主题（recommendedRouteId 指向它），且只有该主题能填写 recommendedReason；其余两个探索主题的 recommendedReason 必须填 null！

三条正交领地（Creative Territories）：
1. 主题一【材质工艺与微触感】（借鉴 Dieter Rams "少，但更好" 与原研哉触觉设计）：
   - 依靠实体材料的原生肌理、留白微光影与表面工艺（如特种纸浆颗粒、单色深压凹、微弱局部 UV、触感膜）；
   - 不靠花哨多余插画遮丑，用纯净材料触感与极端留白取胜。
2. 主题二【信息网格与排版秩序】（借鉴 Josef Müller-Brockmann 网格法则与排印学）：
   - 依靠严谨的信息骨架、强弱字阶梯级对比、极致留白与冷冽排版；
   - 打造极高信息阅读效率与档案式可信度。
3. 主题三【视觉锤与符号化跳脱】（借鉴 Laura Ries 视觉锤理论与几何图形隐喻）：
   - 提炼极简且穿透力极强的单一视觉符号或高反差色块；
   - 远距离（1.5–3米）或 16px 缩微尺寸下 0.5 秒抓人眼球，形成货架或社媒瞬间辨识。

严格字段契约：
- themeName: 4–8 字响亮直观的大主题名（如「素纸微白 · 原生触觉」）。
- title: 必须采用【视觉抓手/工艺手法】具体手法名 格式。例如：
  * 【特种棉纸与单色深压凹】极端克制纸感
  * 【瑞士网格与严谨字阶】档案式风味信息
  * 【极简几何色块与视觉锤】高辨识度桌面静物
- visualSnapshot: 1–2 句具象大白话描绘“最终画面长什么样”，画面感极强。
- focusDimension: 视觉核心切入点（如"特种纸肌理与深压凹工艺"、"双栏网格与微字阶层级"、"高对比几何符号视觉锤"）。
- startingPoint: 独特的探索起点（简短精炼）。
- coreProblem: 核心设计抉择（说明主动放弃了什么、押注了什么，如"放弃多色插画装饰，把视觉质感全押在特种棉纸触感与无油墨压凹阴影上"）。
- purpose: 具象的视觉执行手法。
- pros: 视觉亮点 / 灵感抓手（该主题在画面、构图、色彩或材质上最出彩、最打动人的审美特质，如"大面积留白形成纯粹视觉真空，靠棉纸微压凹显出雕塑感，耐看且极具呼吸感"）。
- cons: 防跑偏提示 / 注意边界（探索该视觉方向时需警惕的调性陷阱或审美红线，如"留白过多若缺乏微工艺质感支撑，极易显得苍白空洞无物；必须把控好纸张肌理的层次"）。
- feasibility: "high" | "medium" | "challenging"（落地可行性与打样难度）。
- timeframe: 探索打样周期（如"0.5–1 天"、"1–2 天"）。
- recommendedReason: 仅在推荐主题填写自然中肯的设计解题理由（直接陈述为什么该方案最能达成设计意图并平衡落地，严禁使用“针对前期对于...的纠结”等模板套话！），其余两个探索主题严格填 null。
- steps: 恰好 3 个前期灵感切入视点（Visual Inspiration Angles，如：视点 1 纸样白度与微肌理 -> 视点 2 中西文字阶与排版动线 -> 视点 3 侧光浅压凹与光影微雕）。
  * 核心定位：SIFT 只做【前期视觉灵感探索与审美收敛】，不做后期落地生产工程！严禁输出任何纸张克重（如280g）、模塑温度、实物白模打样、耐脏测试、耐磨测试或儿童亲和力报告等伪落地伪生产清单！
  * title: 4–8 字纯视觉切入视点（如"纸样白度与微肌理"、"双栏网格与字阶动线"、"侧光浅压凹与光影"）。
  * question: 该视点探索的审美与视觉表现关键问题（如"何种纸浆配比能呈现最温润的暖白本色与微颗粒触感？"）。
  * purpose: 纯视觉层面的审美意图（如"确立第一眼的材质基准与白度微调，保持纯净呼吸感"）。
  * deliverables: 2–3 组视觉灵感对照草案（如"特种原浆纸样微颗粒对照板"、"正面留白与字阶层级草案"）。严禁写实物白模打样、耐脏测试报告！
  * acceptanceCriteria: 2–3 条纯视觉审美标准（如"自然光下呈现温润漫反射无刺眼杂光"、"留白比例充盈，呼吸感充足"）。严禁写克重、模具、耐脏！

必须且只能返回纯 JSON，格式严格如下：
{
  "routes": [
    {
      "id": "route_1",
      "themeName": "素纸微白 · 原生触觉",
      "title": "【特种棉纸与深压凹】极端克制纸感",
      "visualSnapshot": "大面积纯白原浆棉纸留白，正面仅单色侧光深压凹，无多余插画，在 45 度侧光下靠压凹阴影显出极简雕塑感",
      "focusDimension": "特种纸肌理与深压凹工艺",
      "startingPoint": "特种纸微触感与无墨压凹",
      "coreProblem": "放弃多色繁复装饰，依靠材料肌理与光影阴影建立静谧质感",
      "purpose": "以大面积素雅纸感与微光影细节构建耐看且具触觉温度的视觉体验",
      "pros": "大面积留白在复杂环境中形成纯粹视觉真空，靠棉纸触感与压凹阴影呈现沉静雕塑感",
      "cons": "留白若无微压凹与纸张肌理反差支撑，极易显得苍白空洞无物，必须严控纸张白度与阴影层次",
      "feasibility": "high",
      "timeframe": "0.5–1 天",
      "recommendedReason": "纯纸感与单色深压凹直接建立素雅品质基准，在规避花哨插画的同时确保视觉具备雕塑级耐看度",
      "steps": [
        {
          "id": "step_1_1",
          "title": "纸样白度与微肌理",
          "question": "何种纸浆配比在自然光下最显温润暖白与微颗粒触感？",
          "purpose": "确立第一眼的材质基准与白度微调，保持呼吸感",
          "deliverables": ["特种原浆纸微颗粒对照板", "正面留白与肌理样张"],
          "acceptanceCriteria": ["自然光下呈现温润漫反射无刺眼杂光", "留白比例充盈，呼吸感充足"]
        }
      ]
    }
  ],
  "recommendedRouteId": "route_1"
}`;

type RecordLike = Record<string, unknown>;
function record(v: unknown): RecordLike {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as RecordLike)
    : {};
}

export function sanitizeLeakedVariables(text: string): string {
  if (!text) return text;
  return text
    .replace(/(?:针对\s*)?(?:state\.)?uncertainties(?:\s*(?:中|里|内)的?|\.)?\s*([a-zA-Z0-9_]+)?(?:\s*的未决(?:纠结|诉求|顾虑|问题))?/g, "针对前期的核心诉求与待定考量")
    .replace(/\buncertainties\b/gi, "未决考量")
    .replace(/\bquality_source\b/gi, "品质与工艺")
    .replace(/\bconfirmedDimensions\b/gi, "已确认维度")
    .replace(/\bdesign_state\b/gi, "设计方向")
    .trim();
}

function nonEmpty(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim()
    ? sanitizeLeakedVariables(v.trim())
    : fallback;
}

export function normalizeLiveRoutesPayload(
  raw: unknown,
  input: RoutesInput,
): {
  sessionId: string;
  requestId: string;
  routes: Route[];
  recommendedRouteId: string | null;
} {
  const root = record(raw);
  const rawRoutes = Array.isArray(root.routes) ? root.routes.map(record) : [];

  const seenStarting = new Set<string>();
  const defaultStarts = [
    "特种纸微触感与无墨压凹",
    "双栏网格与微字阶层级",
    "高对比几何符号视觉锤",
  ];
  const defaultDimensions = [
    "特种纸肌理与深压凹工艺",
    "双栏网格与微字阶层级",
    "高对比几何符号视觉锤",
  ];

  const defaultThemeNames = [
    "素纸微白 · 原生触觉",
    "瑞士理性 · 档案清单",
    "极简静物 · 视觉重锤",
  ];

  const defaultTitles = [
    "【特种棉纸与深压凹】极端克制纸感",
    "【瑞士网格与严谨字阶】档案式清晰信息",
    "【极简几何色块与视觉锤】高辨识度符号",
  ];

  const defaultSnapshots = [
    "大面积纯白原浆棉纸留白，正面仅单色侧光深压凹，无多余插画，在 45 度侧光下靠压凹阴影显出极简雕塑感。",
    "严谨双栏瑞士网格排版，中西文字阶 2.5 倍对比，冷冽黑白字符清晰罗列核心信息，呈现如档案般的权威可信度。",
    "低饱和和谐色调搭配极度洗练的单一几何符号，无论远视还是微缩都能被瞬间锁定，呈现纯粹现代的视觉焦点。",
  ];

  const routes: Route[] = rawRoutes.slice(0, 3).map((r, i) => {
    const routeId = nonEmpty(r.id, `route_${i + 1}`);
    let starting = nonEmpty(r.startingPoint, defaultStarts[i] ?? `探索领地 ${i + 1}`);
    if (seenStarting.has(starting)) {
      starting = `${starting}（领地 ${i + 1}）`;
    }
    seenStarting.add(starting);

    let title = nonEmpty(r.title, defaultTitles[i] ?? `设计主题 ${i + 1}`);
    if (/^(自然|极简|高级|复古|现代|轻奢|科技感|温暖|可爱|优雅|大气|高端|简约|清新|质感|时尚|酷炫|潮流)$/.test(title)) {
      title = `【${title}】视觉转译与落地法`;
    }

    let themeName = typeof r.themeName === "string" && r.themeName.trim()
      ? sanitizeLeakedVariables(r.themeName.trim())
      : "";

    if (!themeName) {
      const match = title.match(/【(.*?)】(.*)/);
      if (match) {
        themeName = match[2].trim() || match[1].trim();
      } else {
        themeName = defaultThemeNames[i] ?? `主题 0${i + 1}`;
      }
    }

    let visualSnapshot = typeof r.visualSnapshot === "string" && r.visualSnapshot.trim()
      ? sanitizeLeakedVariables(r.visualSnapshot.trim())
      : "";

    if (!visualSnapshot) {
      visualSnapshot = defaultSnapshots[i] ?? "大面积克制留白，突出核心材质与文字层级，呈现纯净耐看的现代视觉质感。";
    }

    const rawSteps = Array.isArray(r.steps) ? r.steps.map(record) : [];
    const seenStepIds = new Set<string>();
    const seenStepTitles = new Set<string>();
    let steps: RouteStep[] = rawSteps.map((s, si) => {
      let sid = nonEmpty(s.id, `step_${i + 1}_${si + 1}`);
      if (seenStepIds.has(sid)) sid = `${sid}_${si + 1}`;
      seenStepIds.add(sid);

      let stitle = nonEmpty(s.title, `阶段探索 0${si + 1}`);
      if (seenStepTitles.has(stitle)) stitle = `${stitle}（${si + 1}）`;
      seenStepTitles.add(stitle);

      const rawDeliverables = Array.isArray(s.deliverables)
        ? s.deliverables
            .filter((d): d is string => typeof d === "string" && Boolean(d.trim()))
            .map(sanitizeLeakedVariables)
        : [];
      const deliverables =
        rawDeliverables.length > 0
          ? rawDeliverables.slice(0, 4)
          : [
              `${stitle}情绪板与样卡`,
              `${stitle}视觉层级对照稿`,
            ];

      const rawCriteria = Array.isArray(s.acceptanceCriteria)
        ? s.acceptanceCriteria
            .filter((c): c is string => typeof c === "string" && Boolean(c.trim()))
            .map(sanitizeLeakedVariables)
        : [];
      const acceptanceCriteria =
        rawCriteria.length > 0
          ? rawCriteria.slice(0, 4)
          : [
              "核心品名与说明在 1 秒内清晰识别",
              "留白面积占比保持 50% 以上，呼吸感充足",
            ];

      return {
        id: sid,
        title: stitle,
        question: nonEmpty(s.question, "此阶段需要探索什么关键视觉问题？"),
        purpose: nonEmpty(s.purpose, "验证设计可行性与美学表达"),
        deliverables,
        acceptanceCriteria,
      };
    });

    if (steps.length < 3) {
      const needed = 3 - steps.length;
      for (let k = 0; k < needed; k++) {
        const idx = steps.length + 1;
        steps.push({
          id: `step_${i + 1}_${idx}`,
          title: `视距焦点与留白节奏 0${idx}`,
          question: "在真实 1.5 米视距下，大面积留白与视觉焦点是否舒适分明？",
          purpose: "打磨视觉呼吸感与第一焦点穿透力",
          deliverables: ["1.5米视距黑白对比稿", "版面留白节奏分析图"],
          acceptanceCriteria: ["远视下主体轮廓清晰分明", "留白充盈不压抑"],
        });
      }
    } else if (steps.length > 5) {
      steps = steps.slice(0, 5);
    }

    const recReason =
      typeof r.recommendedReason === "string" && r.recommendedReason.trim()
        ? sanitizeLeakedVariables(r.recommendedReason.trim())
        : null;

    const feasibilityVal = r.feasibility === "high" || r.feasibility === "medium" || r.feasibility === "challenging"
      ? r.feasibility
      : (i === 0 ? "high" : i === 1 ? "high" : "medium") as "high" | "medium" | "challenging";

    return {
      id: routeId,
      title,
      themeName,
      visualSnapshot,
      startingPoint: starting,
      focusDimension: nonEmpty(r.focusDimension, defaultDimensions[i] ?? "视觉美学探索"),
      coreProblem: nonEmpty(r.coreProblem, "放弃多色繁复插画装饰，把视觉质感全押在特种棉纸触感与无墨压凹上"),
      purpose: nonEmpty(r.purpose, "以大面积素雅纸感与微光影细节构建耐看且具触觉温度的视觉体验"),
      pros: nonEmpty(r.pros, "大面积留白在复杂环境中形成纯粹视觉真空，靠棉纸触感与压凹阴影呈现沉静雕塑感"),
      cons: nonEmpty(r.cons, "留白若无微压凹与纸张肌理反差支撑，极易显得苍白空洞无物，必须严控纸张白度与阴影层次"),
      feasibility: feasibilityVal,
      timeframe: nonEmpty(r.timeframe, "0.5–1 天"),
      recommendedReason: recReason,
      steps,
    };
  });

  // Ensure exactly 3 routes
  while (routes.length < 3) {
    const i = routes.length;
    routes.push({
      id: `route_${i + 1}`,
      title: defaultTitles[i] ?? `【工艺与排版】实战探索 0${i + 1}`,
      themeName: defaultThemeNames[i] ?? `设计主题 0${i + 1}`,
      visualSnapshot: defaultSnapshots[i] ?? "大面积纯净留白，依靠材质微肌理与清晰字阶呈现克制现代美感。",
      startingPoint: defaultStarts[i] ?? `领地 0${i + 1}`,
      focusDimension: defaultDimensions[i] ?? "综合美学表现",
      coreProblem: "放弃多色繁复装饰，依靠材料肌理与光影阴影建立静谧质感",
      purpose: "以大面积素雅纸感与微光影细节构建耐看且具触觉温度的视觉体验",
      pros: "大面积留白在复杂环境中形成纯粹视觉真空，靠棉纸触感与压凹阴影呈现沉静雕塑感",
      cons: "留白若无微压凹与纸张肌理反差支撑，极易显得苍白空洞无物，必须严控纸张白度与阴影层次",
      feasibility: "high",
      timeframe: "0.5–1 天",
      recommendedReason: null,
      steps: [
        {
          id: `step_${i + 1}_1`,
          title: "纸样白度与微肌理",
          question: "何种纸浆配比在自然光下最显温润暖白与微颗粒触感？",
          purpose: "确立第一眼的材质基准与白度微调，保持呼吸感",
          deliverables: ["特种原浆纸微颗粒对照板", "正面留白与肌理样张"],
          acceptanceCriteria: ["自然光下呈现温润漫反射无刺眼杂光", "留白比例充盈，呼吸感充足"],
        },
        {
          id: `step_${i + 1}_2`,
          title: "中西文字阶与排版动线",
          question: "品名、说明与信息区块如何在正面形成清晰骨架？",
          purpose: "打磨严谨有力的版式骨架与视觉第一焦点",
          deliverables: ["双栏网格排版规范稿", "核心信息层级样张 3 款"],
          acceptanceCriteria: ["品名在 1 秒内被视觉锁定", "中西文字阶对比分明"],
        },
        {
          id: `step_${i + 1}_3`,
          title: "侧光浅压凹与光影微雕",
          question: "在 45 度侧光照射下，局部微压凹是否形成干净利落的阴影？",
          purpose: "验证微工艺的视觉层次与光影细节表现",
          deliverables: ["局部深压凹光影效果稿", "侧光阴影对比样张"],
          acceptanceCriteria: ["45度侧光下压凹轮廓清晰无毛边", "阴影微弱而具雕塑感"],
        },
      ],
    });
  }

  // Determine exactly ONE recommendedRouteId
  let recommendedRouteId: string | null = null;
  if (
    typeof root.recommendedRouteId === "string" &&
    routes.some((r) => r.id === root.recommendedRouteId)
  ) {
    recommendedRouteId = root.recommendedRouteId;
  } else {
    // Pick the first route that has a recommendedReason, or default to the first route
    recommendedRouteId = routes.find((r) => Boolean(r.recommendedReason))?.id ?? routes[0]?.id ?? null;
  }

  // Strict single-recommendation guarantee:
  // ONLY the route matching recommendedRouteId gets a non-null recommendedReason!
  routes.forEach((r, idx) => {
    if (r.id === recommendedRouteId) {
      if (!r.recommendedReason) {
        r.recommendedReason = "针对前期核心诉求与待定考量，该主题切入角度最稳妥直接。";
      }
      r.alignmentScore = 96;
    } else {
      r.recommendedReason = null;
      r.alignmentScore = idx === 1 ? 91 : 87;
    }
  });

  return {
    sessionId: input.sessionId,
    requestId: input.requestId,
    routes,
    recommendedRouteId,
  };
}

export function liveRoutes(input: RoutesInput): Promise<unknown> {
  return completeJson(SYSTEM, JSON.stringify(input), "none").then((payload) =>
    normalizeLiveRoutesPayload(payload, input),
  );
}
