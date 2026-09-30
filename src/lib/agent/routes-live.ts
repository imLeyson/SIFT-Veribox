import type { Route, RouteStep } from "@/types/routes";
import { completeJson } from "./llm";
import type { z } from "zod";
import type { RoutesInputSchema } from "./routes-schema";
import { sanitizeAntiTeleology } from "./convergence-live";
import { selectCreativeLenses, type CreativeLens } from "./creative-lenses";
import { normalizeRouteTitle, normalizeThemeName } from "./route-title";

type RoutesInput = z.infer<typeof RoutesInputSchema>;

const SYSTEM = `你是 SIFT 设计主题构思 Agent，充当资深设计总监（Design Director）与实战派视觉策略搭档。
当前设计任务的方向（Design State）已经收敛并由用户正式确认。
你的任务是基于设计策略提案方法，为该任务生成正好 3 条互不相同、彼此有依据且画面感极强的【设计主题（Design Themes）】。

【最高准则 · 核心品类与设计载体绝对锁死（严禁上下文漂移）】：
1. 绝对锚定用户需求的核心品类主体与交付载体（如“可持续材料产品”、“生活器物”、“实体包装”、“UI/SaaS”、“品牌全案”等）！收敛问答中确认的调性（如“白色”、“极简”、“高级”）只是修饰词，绝不能篡位成核心主体！
2. 严禁品类错位：严禁将“可持续材料与实体器物”做成“平面品牌纸厂打样”或“瑞士网格排版标签”，严禁将“UI界面”做成“实体包装盒”！
3. 所有 3 个设计主题（Theme）、快照（Snapshot）和切入视点（Steps），必须全部深度服务于【该设计任务的具体载体】。

关键原则与动态主题命名架构（去除 AI 感与套路复读）：
1. 主题名称必须先从当前 Brief 找到真实锚点，再形成有创意的中文概念，不强制使用书名号、英文副标题或固定的“材质 × 工艺”格式。
   - themeName：4–10 个中文字符，作为画布上的直接工作标签，来自当前任务中的具体物件、动作、场景、材料变化或信息关系。
     * 不加《》或【】；不要写成书名、广告语、诗句或抽象品牌口号。
     * 优先使用“对象与关系”“形态与处理”这类直接命名，例如“硬壳与软质”“弧面转折”“握持面处理”。
     * 概念名称必须与当前任务主体有关，不能只写“高级、极简、温暖、秩序、未来”等泛化形容词。
     * 【严禁虚空公关套话与网红奶茶词汇】：绝对禁止使用“时光、岁月、初见、温馨、星河、物性转化、空间解构、多维赋能、生态感知、心流共鸣、交融升华”等虚无 AI 词汇！
     * 【严禁敷衍平庸词】：绝对禁止使用“现代风、白色简约、好看的包装、高端大气、主题一”等空洞废话！
   - title：卡片第一行的工作标题，直接写清楚视觉对象和处理关系，像设计师在画布上的工作标签，不是广告文案或诗句。
     * 使用 8–18 个中文字符，优先采用“对象与处理”“形态与关系”这类直接说法，例如“硬壳与软质交界”“弧面转折与三面关系”。
     * 禁止使用《》、【】、引号、英文副标题、乘号“×”、对仗句（如“远看……近看……”）和抒情隐喻（如“掌心磨出的亮面”）。
     * 禁止“打造、构建、探索、赋能、焕新、高级感”等宣传或 AI 套话；只写要比较的设计处理。

2. 动态创意方向（禁止固定套用）：
   - 根据 Brief、交付载体、目标受众和已确认的优先级，自主发现 3 个真正适合当前任务的切入方向；
   - 三个方向必须有清晰差异，可以分别聚焦材料、行为、叙事、信息结构、场景、工艺或其他与任务相关的因素；
   - 不得默认使用固定的“物性本真 / 诗意人本 / 工业精密”三分法，也不得为了凑齐三类而牵强套用。

3. 去除机械复读原则（Anti-Repetition Rule）：
   - 严禁同一名词（如“原生”、“纤维”、“肌理”）在同一张卡片的 themeName、title、startingPoint、focusDimension、visualSnapshot 中重复出现 3 次以上！
   - 各字段分工明确：
     * themeName：从 Brief 生长出的具体创意命题；
     * title：对该命题的自然语言说明；
     * visualSnapshot：1–2 句具象大白话描绘“最终画面/实物长什么样”，画面感极强且紧扣当前品类主体与材质，严禁使用“一眼看懂”、“让人一目了然”等轻佻AI套话；
     * focusDimension：核心视觉手法（工艺、排版或构成规则）；
     * coreProblem：设计取舍与权衡（说明主动放弃了什么、押注了什么，呼应用户收敛确立的 Priorities 与 Avoid，这是设计师决策最有价值的思考！）；
     * cons：防跑偏提醒（探索该方向时需警惕的调性陷阱或审美红线）。

4. 严格单推荐规则：
   - 3 个主题中，只能有且仅有 1 个主题被选为推荐主题（recommendedRouteId 指向它），且只有该主题能填写 recommendedReason；其余两个探索主题的 recommendedReason 必须填 null！
   - 推荐理由必须自然中肯，严禁机械套用“针对前期对于想要...的纠结”等刻板模板！

5. 【核心禁令 · 严禁目的论臆断与伪因果套话（Anti-Teleology Guardrail · 铁律）】：
   - 严禁出现“XX负责YY”、“为了实现0.5秒识别”、“大色块负责货架辨识度”、“圆角增强亲和力”、“高饱和增强儿童吸引力”等任何强加因果的陈词滥调！
   - 严禁无中生有主体：若用户需求未提及“IP”、“吉祥物”、“开窗”、“插画”等具体要素，主题方案严禁擅自为其预设职能（绝不能出现“IP 负责儿童情绪吸引”等无端臆想）！
   - coreProblem 必须聚焦【纯形式/构图/CMF/工艺之间的物理与美学矛盾】（例如：“在高饱和撞色大色块的强烈视觉张力下，如何确保品牌字标的绝对图底反差与倒角转折的纯净度？”），绝对禁止写成“如何实现货架辨识度与儿童吸引力”等空洞商业套话。
   - visualSnapshot 必须是具象客观的视觉画面，紧扣材质、光影、形体与构成，不写主观心理自嗨。

跨设计品类动态发现创意方向（严禁生搬硬套）：
必须根据当前任务的核心载体、受众、使用场景和已确认约束，自主提出 3 条差异化路径。
每条路径都要有自己的视觉命题和具体依据；可从材质、形态、行为、信息结构、叙事、文化语义、空间场景或工艺细节中选择切入点，但只使用真正适合当前任务的因素。

严格字段契约（保证每条主题都有清晰依据与视觉定调）：
   - themeName: 4–8 个中文字符的创意主题名，必须从当前 Brief 或已确认判断中生长出来。
   - title: 一句具体的视觉命题，可以是材料、动作、场景、信息或工艺，不套用统一格式。
- sensoryMetaphor: 1 句物料与光影画面的审美提炼（如：“未经精抛的暖灰微孔表面，被冷冽的铝合金倒角精密收口，在光线下呈现哑光漫反射”）。
- visualSnapshot: 1–2 句具象大白话描绘“最终画面/实物长什么样”，画面感极强且紧扣当前品类主体与材质。
- focusDimension: 视觉核心切入点。
- startingPoint: 独特的探索起点（简短精炼）。
- coreProblem: 核心设计抉择（说明主动放弃了什么、押注了什么，必须呼应用户收敛确立的 Priorities 与 Avoid）。
- purpose: 具象的视觉执行手法。
- pros: 视觉亮点 / 灵感抓手（画面、构图、色彩或材质上最出彩的审美特质）。
- cons: 防跑偏提示 / 注意边界（探索该方向时需警惕的调性陷阱或审美红线）。
- feasibility: "high" | "medium" | "challenging"。
- timeframe: 探索打样周期（如"1–2 天"、"2–3 天"）。
- recommendedReason: 仅在推荐主题填写自然中肯的设计解题理由（直接陈述为什么该方案最能达成设计意图并平衡落地，严禁使用“针对前期对于...的纠结”等模板套话！），其余两个探索主题严格填 null。
- steps: 恰好 3 个前期灵感切入视点（Visual Inspiration Angles，紧扣品类与主题）：
  * 核心定位：SIFT 只做【前期视觉灵感探索与审美收敛】，不做后期落地生产工程！
  * title: 4–8 字纯视觉切入视点。
  * question: 该视点探索的审美与视觉表现关键问题。
  * purpose: 纯视觉层面的审美意图。
  * deliverables: 2–3 组视觉灵感对照草案。
  * acceptanceCriteria: 2–3 条纯视觉审美标准。

必须且只能返回纯 JSON，格式严格如下：
{
  "routes": [
    {
      "id": "route_1",
      "themeName": "从 Brief 提取的中文创意名称",
      "title": "一句具体的视觉命题",
      "sensoryMetaphor": "用一句具体的材质、形态、光影或场景描述画面",
      "visualSnapshot": "描述最终画面或实体效果，避免抽象口号",
      "focusDimension": "当前主题最核心的视觉切入点",
      "startingPoint": "从前置内容中提炼出的探索起点",
      "coreProblem": "本主题主动放弃与重点押注之间的视觉取舍",
      "purpose": "要观察和比较的视觉表现",
      "pros": "具体的视觉亮点或灵感抓手",
      "cons": "需要警惕的视觉偏差",
      "feasibility": "high",
      "timeframe": "1–2 天",
      "recommendedReason": "说明该主题为什么最贴合当前 Brief 和已确认方向",
      "steps": [
        {
          "id": "step_1_1",
          "title": "纤维压合密度与微肌理",
          "question": "何种纤维压合密度与表面微气孔在自然光下最显温润触感？",
          "purpose": "确立第一眼的材质基准与漫反射微光泽，保持物料真实呼吸感",
          "deliverables": ["纤维微孔漫反射对比样板", "低饱和暖调色谱"],
          "acceptanceCriteria": ["自然光下呈现温润漫反射无刺眼塑料感", "材质肌理层次分明"]
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

const FIXED_THEME_LABELS = ["物性本真", "诗意人本", "工业精密"] as const;

function themeNameCore(value: string): string {
  return value
    .replace(/[《》【】]/g, "")
    .replace(/[a-zA-Z][a-zA-Z\s/-]*/g, "")
    .replace(/[^\u4e00-\u9fa5]/g, "")
    .trim();
}

function stripThemeStudioTag(value: string): string {
  const clean = value.replace(/[《》【】]/g, "").trim();
  const bookMatch = clean.match(/^([^\s]+)\s+[A-Za-z][A-Za-z\s\/_-]*$/);
  if (bookMatch) return bookMatch[1];
  return clean.replace(/[A-Za-z][A-Za-z\s\/_-]*/g, "").replace(/\s{2,}/g, " ").trim() || value;
}

function creativeSource(input: RoutesInput): string {
  return [
    input.rawBrief,
    input.state.brief.goal,
    input.state.brief.deliverable,
    input.state.brief.audience,
    input.state.direction?.intent?.text,
    ...(input.state.direction?.priorities ?? []).map((item) => item.text),
    ...(input.state.direction?.criteria ?? []).map((item) => item.text),
  ]
    .filter(Boolean)
    .join(" ");
}

function creativeAnchor(input: RoutesInput, index: number): string {
  const candidates = creativeSource(input)
    .match(/[\u4e00-\u9fa5]{2,8}/g)
    ?.map((chunk) => chunk.replace(/我想|想做|做一个|一款|一个|关于|围绕|设计|主题|视觉|方向|用户|项目|提案|产品|品牌|包装|可持续|核心|目标|日常|使用|人群|好看/g, ""))
    .filter((chunk) => chunk.length >= 2) ?? [];
  const value = candidates[index % Math.max(candidates.length, 1)] || "探索切面";
  return value.slice(0, value.length > 4 ? 4 : value.length);
}

function fallbackCreativeThemeName(input: RoutesInput, index: number, lens: CreativeLens): string {
  const suffixes = ["触点", "折面", "转折", "层差", "边界", "曲面", "收口", "结构"];
  const anchor = creativeAnchor(input, index);
  const lensOffset = lens.id.charCodeAt(0) % suffixes.length;
  return `${anchor}${suffixes[(index + lensOffset + (input.refreshIndex ?? 0)) % suffixes.length]}`;
}

function namesNeedDiversity(names: string[]): boolean {
  const cores = names.map(themeNameCore).filter(Boolean);
  if (cores.length < 3) return false;
  // Keep concrete names supplied by the model. Diversity fallback is only
  // needed when names are duplicated or remain one of the generic template
  // labels; shared initials alone are not evidence of a bad set.
  const generic = /^(?:不同切面|设计主题|探索切面|方向|主题|自然|极简|高级|现代|温暖|质感)/;
  if (new Set(cores).size < cores.length || cores.some((name) => generic.test(name))) return true;
  const firstChars = cores.map((name) => name.slice(0, 1));
  return firstChars.every((char) => char === firstChars[0]) &&
    /冷|暖|极|新|原|纯|清|深|低|柔|微|高/.test(firstChars[0]);
}

function needsThemeNameFallback(name: string, allNames: string[]): boolean {
  const core = themeNameCore(name);
  if (!core) return true;
  const generic = /^(?:不同切面|设计主题|探索切面|方向|主题|自然|极简|高级|现代|温暖|质感)/;
  if (generic.test(core)) return true;
  return allNames.filter((candidate) => themeNameCore(candidate) === core).length > 1;
}

function creativeRoundPrompt(lenses: CreativeLens[]): string {
  return lenses
    .map((lens, index) => `- 主题 ${index + 1}【${lens.label}】：${lens.instruction}`)
    .join("\n");
}

function adaptiveThemeName(
  raw: string,
  input: RoutesInput,
  index: number,
  startingPoint: string,
  focusDimension: string,
  lens: CreativeLens,
): string {
  const value = raw.trim();
  if (!FIXED_THEME_LABELS.some((label) => value.includes(label))) return value;

  const creativeName = fallbackCreativeThemeName(input, index, lens);
  if (creativeName.length >= 3) return creativeName;

  const source = `${startingPoint} ${focusDimension} ${input.state.brief.goal ?? input.rawBrief}`
    .replace(/[《》【】]/g, "")
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, " ")
    .trim();
  const chunks = source.split(/\s+/).filter(Boolean);
  const base = (chunks[index % Math.max(chunks.length, 1)] || "设计方向").slice(0, 6);
  const suffixes = ["切面", "转译", "构成", "语法", "折线"];
  return `${base}${suffixes[index % suffixes.length]}`;
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
  const creativeLenses = selectCreativeLenses(
    `${input.sessionId}|${input.rawBrief}|${input.refreshIndex ?? 0}`,
  );

  const seenStarting = new Set<string>();
  const rawGoal = (input.state?.brief?.goal || input.rawBrief || "").trim();
  const deliverable = (input.state?.brief?.deliverable || "").trim();
  const isProductOrMaterial =
    /产品|材料|可持续|回收|毛发|纤维|器物|物料|装置|硬件|家具|日用/i.test(rawGoal) ||
    /产品|材料|器物|物料|可持续/i.test(deliverable);
  const isPetVI = /宠物|猫|狗|pet|cat|dog/i.test(rawGoal) && !isProductOrMaterial;
  const isUI = /ui|ux|saas|界面|后台|dashboard|网页|web/i.test(rawGoal);
  const isCoffee = /咖啡|coffee/i.test(rawGoal);
  const subjectLabel = rawGoal ? rawGoal.slice(0, 10) : "设计案";

  let defaultStarts = [
    "原浆棉纸微触感与侧光深压凹",
    "双栏网格与微字阶档案标尺",
    "几何大色块与视觉重锤",
  ];
  let defaultDimensions = [
    "棉纸物料肌理与深压凹工艺",
    "双栏网格与微字阶排印体系",
    "几何负空间与局部哑光微UV",
  ];
  let defaultTitles = [
    "300g 原浆棉纸 × 45° 侧光深压凹",
    "双栏微字阶排印 × 产地风味档案",
    "几何负空间大色块 × 局部哑光微UV",
  ];
  let defaultSnapshots = [
    "大面积纯白原浆棉纸留白，正面仅单色侧光深压凹，无多余插画，在 45 度侧光下靠压凹阴影显出极简雕塑感。",
    "严谨双栏瑞士网格排版，中西文字阶 2.5 倍对比，冷冽黑白字符清晰罗列核心信息，呈现如档案般的权威可信度。",
    "低饱和和谐色调搭配极度洗练的单一几何符号，无论远视还是微缩都能被瞬间锁定，呈现纯粹现代的视觉焦点。",
  ];
  let defaultCoreProblems = [
    "放弃多色繁复装饰，依靠材料肌理与光影阴影建立静谧质感",
    "放弃花哨视觉修饰，以严谨排版结构与强弱对比建立权威可信度",
    "放弃平庸复杂图形，提炼极简几何符号以穿透复杂视觉环境",
  ];
  let defaultPurposes = [
    "以大面积素雅纸感与微光影细节构建耐看且具触觉温度的视觉体验",
    "以清晰理性的排版动线与字阶层次打造高效信息传达系统",
    "以高反差与极简几何视觉重锤构建纯粹的版面焦点",
  ];
  let defaultPros = [
    "大面积留白在复杂环境中形成纯粹视觉真空，靠棉纸触感与压凹阴影呈现沉静雕塑感",
    "严谨字阶与清晰骨架极大提升阅读品质，呈现如同专业档案般的可靠质感",
    "视觉锤穿透力极强，无论远距离还是微缩尺寸都能瞬间被用户锁定",
  ];
  let defaultCons = [
    "留白若无微压凹与纸张肌理反差支撑，极易显得苍白空洞无物，必须严控纸张白度与阴影层次",
    "网格若缺乏对比变化容易显得呆板僵硬，需把控好核心字阶的动态层级",
    "符号若提炼不够纯粹容易落入俗套，必须保持几何轮廓的极端克制与张力",
  ];
  let defaultSensoryMetaphors = [
    "大面积未漂白高克重棉纸，在 45° 侧光下沉下一道近乎静止的 1.5mm 深压凹光影",
    "精密冷灰双栏网格，黑白字符如权威档案标尺般克制排列，散发理性秩序感",
    "纯粹几何负空间在暗调中切出一记清脆的视觉重锤，瞬间锚定视觉焦点",
  ];

  if (isProductOrMaterial) {
    defaultStarts = [
      "再生纤维物性转化与微孔阻尼",
      "自然卵石连续曲率与手握抚慰度",
      "高强度复合料与结合部卡扣细节",
    ];
    defaultDimensions = [
      "材料微孔漫反射与金属精密收口",
      "情感陪伴语义与有机器物形态",
      "现代机能美学与日常共生",
    ];
    defaultTitles = [
      "再生纤维微孔阻尼 × 1px 细拉丝冷铝倒角",
      "自然卵石连续曲率 × 隐式握持凹槽",
      "高强度再生复合料 × 模块化卡扣微咬合",
    ];
    defaultSnapshots = [
      "回收再生材料压合成微孔哑光表面，保留天然毛色微杂质与漫反射暖意，冷冽金属倒角利落收口，在侧光下呈现物料本真质感。",
      "柔和流动的有机弧面与微握持凹槽，器型沉静如卵石，置于居家桌面或掌心抚触，通过实体形态传递无声的陪伴温度。",
      "极简克制的几何线条结合精妙微倒角构件，材料与现代铝合金或原木自然嵌合，呈现兼具实用机能与当代家居审美的优雅器物。",
    ];
    defaultCoreProblems = [
      "放弃二次精细涂层掩盖，把视觉与触觉质感押在再生纤维本身的微颗粒肌理与自然漫反射上",
      "放弃符号化具象装饰，通过器物本身的握持弧度与有机线条唤起情感陪伴共鸣",
      "放弃单纯的概念展品定位，以克制利落的机能结构让可持续材料自然融入现代日常生活",
    ];
    defaultPurposes = [
      "以回收纤维本身的物性转化与微气孔触感构建真实耐看的产品肌理体验",
      "以符合人体抚触习惯的有机器物形态传递情感疗愈与陪伴温度",
      "以现代极简机能结构与精致收口实现可持续新材料在日常产品中的优雅落地",
    ];
    defaultPros = [
      "材料原生肌理独特且具辨识度，自然光下呈现温润微光泽，环保与品质感兼具",
      "器物造型温润耐看，兼具桌面静物美感与触觉互动抚慰价值",
      "结构精妙克制，轻松融入现代居家与办公空间，商业接受度高",
    ];
    defaultCons = [
      "纤维若压合过于致密会失去透性质感，过于松散又显粗糙，需把控好纤维密度与微孔平衡",
      "造型若过于具象容易流于低俗，需保持抽象雕塑般的线条克制",
      "结合部公差若处理不当易显工件粗糙，需严控材质交界面的收口细节",
    ];
    defaultSensoryMetaphors = [
      "像一块未经精抛的暖灰凝灰岩，被冷冽的 1px 铝合金倒角精密收口，表面泛着微孔漫反射",
      "自然圆润如河床卵石，柔和曲面贴合掌心微握凹槽，散发温润无声的陪伴温度",
      "极简现代几何形态与精妙微卡扣无缝咬合，宛如一件融入当代居所的建筑微缩模型",
    ];
  } else if (isPetVI) {
    defaultStarts = [
      "棉柔纸微触感与浅浮雕无墨微凹",
      "科学双栏网格与严谨成分标尺",
      "极简动物负空间与超级符号视觉锤",
    ];
    defaultDimensions = [
      "温润棉柔纸微触感与治愈留白",
      "科学双栏网格与严谨信息骨架",
      "极简动物剪影与瞬间穿透符号",
    ];
    defaultTitles = [
      "350g 棉柔纸微触感 × 浅浮雕无墨微压凹",
      "科学双栏网格 × 严谨成分标尺",
      "极简几何动物剪影 × 瞬间穿透超级符号",
    ];
    defaultSnapshots = [
      "品牌主视觉以柔和暖白棉质感为底，搭配极简细节与微压凹，不使用花哨卡通涂鸦，呈现安静治愈的陪伴温度。",
      "严谨双栏瑞士网格排版，中西文字阶清晰对比，秩序井然地呈现品牌专业守护与成分信息，建立科学可信度。",
      "极度洗练的几何动物剪影与高反差视觉锤，远视或缩微至手机图标仍能被瞬间锁定，形成独特的品牌视觉记忆。",
    ];
    defaultCoreProblems = [
      "放弃繁复花哨的卡通插画，把视觉质感全押在温润材质触感与无墨微凹印细节上",
      "放弃松散的情感化图文混排，以严谨瑞士网格与清晰字阶建立专业守护信赖感",
      "放弃平庸写实的宠物照片，提炼极简几何动物剪影与高穿透力超级符号",
    ];
    defaultPurposes = [
      "以柔和低饱和暖白与微肌理构建耐看、亲和且具陪伴温度的整体视觉体验",
      "以模块化网格秩序与双语排印打造严谨科学的专业宠物视觉规范",
      "以强视觉穿透力的几何正负形轮廓构建纯粹符号与跨介质延展",
    ];
    defaultPros = [
      "温润质感与克制留白形成安静治愈的审美空间，耐看且极具呼吸感",
      "严谨信息层级让守护属性与核心信息一目了然，呈现极高的品牌可信度",
      "几何负空间动物符号辨识度极高，远视或缩微均能瞬间锁定用户心智",
    ];
    defaultCons = [
      "留白若无细腻微质感与暖调光影支撑，容易显得单调空泛；需严控调性温度",
      "版式若过于冷硬可能降低亲和力；需平衡理性网格与温和陪伴情绪",
      "符号化若过于抽象可能增加识别成本；需确保动物形态特征精准易读",
    ];
    defaultSensoryMetaphors = [
      "柔和如冬日羊绒披肩的暖白底色，局部泛着微光泽压印，不着喧闹墨迹却满是抚慰感",
      "严谨科学的双栏标尺骨架，像一份由兽医与科研人员郑重签发的专业守护档案",
      "极度洗练的负空间动物剪影，在 1.5 米外如同一记温暖而坚定的视觉重锤",
    ];
  } else if (isUI) {
    defaultStarts = [
      "暗黑微质感与 1px 精细冷灰微层级",
      "8px 密集数据晶格与紧凑型排布",
      "硬件级控制台拟态与单一穿透微光",
    ];
    defaultDimensions = [
      "深色极客美学与 1px 微层级",
      "信息架构与 8px 密集数据网格",
      "硬件控制台隐喻与状态微光",
    ];
    defaultTitles = [
      "暗黑无光基底 × 1px 精细冷灰微层级",
      "8px 密集数据晶格 × 紧凑型无衬线排布",
      "硬件级控制台拟态 × 单一穿透状态微光",
    ];
    defaultSnapshots = [
      "深色暗黑背景配合 1px 冷灰描边与细腻微渐变，克制无悬浮光污染，呈现纯粹利落的专业工程美学。",
      "严格遵循 8px 栅格与紧凑字阶体系，高密度数据展示井然有序，键盘级交互动线清晰明了。",
      "提炼穿透力极强的单一控制台视觉核心，关键状态色彩一目了然，打造高沉浸感生产力工具体验。",
    ];
    defaultCoreProblems = [
      "放弃浮夸重型 3D 渲染，把视觉质感建立在细腻微质感与 1px 网格秩序上",
      "放弃松散排布，通过紧凑字阶与多态组件实现高密度数据的高效承载",
      "放弃分散视觉注意力，提炼单一视觉焦点建立直观状态指示",
    ];
    defaultPurposes = [
      "打造克制纯粹的深色极客生产力工具界面体验",
      "建立严谨科学的界面排版与高密度组件设计规范",
      "构建瞬间穿透的交互中枢与关键数据状态感知",
    ];
    defaultPros = [
      "长时间使用不易视觉疲劳，工程与专业感拉满",
      "高密度信息呈现条理清晰，用户决策效率倍增",
      "核心状态指示一目了然，操作容错率极高",
    ];
    defaultCons = [
      "深色层级若对比不足容易产生灰蒙感，必须严控各级表面色阶",
      "高密度若缺少呼吸感容易压抑，需善用 8px 栅格留白",
      "微动效若过多会干扰操作，必须遵循物理动效曲线",
    ];
    defaultSensoryMetaphors = [
      "夜航座舱般的纯粹冷黑界面，1px 精细冷灰线雕琢着极度克制的数据发光微层级",
      "严谨遵循 8px 律动的密集数据晶格，信息流如精密机械般从容流动",
      "整片暗调中心只有 1 处高穿透状态光斑，第一视线直达系统的核心状态指标",
    ];
  } else if (isCoffee) {
    defaultStarts = [
      "粗颗粒原浆牛皮卡与单色深压凹",
      "瑞士双栏排印与产区风味标尺",
      "高反差几何色块冲撞与极简豆标",
    ];
    defaultDimensions = [
      "原浆牛皮卡肌理与风土触觉",
      "风味档案与瑞士双栏排印",
      "极简几何豆标与货架视觉锤",
    ];
    defaultTitles = [
      "380g 粗颗粒原浆牛皮卡 × 单色深压凹烘焙标",
      "瑞士双栏微字阶排印 × 档案式封签标尺",
      "高反差几何色块冲撞 × 极简轮廓符号",
    ];
    defaultSnapshots = [
      "粗颗粒大地色系原浆纸留白，正面单色浅压凹烘焙风味细节，无多余装饰，还原咖啡豆风土原生触觉。",
      "严谨网格排布产地、海拔与处理法信息，微字阶对比严谨克制，呈现专业独立咖啡馆档案可信度。",
      "极简几何咖啡豆剪影与高对比色块，货架与吧台陈列中瞬间抓住眼球，视觉记忆点清晰纯粹。",
    ];
    defaultCoreProblems = [
      "放弃花哨多色包装贴纸，把视觉质感全押在原浆纸触感与风土肌理上",
      "放弃市面常见网红插画，以严谨瑞士网格呈现产区风味信息档案",
      "放弃繁复写实图案，提炼极简几何豆标符号构建纯粹图形资产",
    ];
    defaultPurposes = [
      "以大地原浆材质与微凹印还原咖啡豆的风土手作触觉",
      "建立如同独立咖啡馆出品档案般的专业排版秩序与信赖感",
      "以几何豆标与高对比色块构建纯粹的图底视觉张力",
    ];
    defaultPros = [
      "天然质感让人联想风土本真，质朴温润极耐品味",
      "产地信息一目了然，极大提升精品咖啡的专业调性",
      "几何符号视觉穿透力强，陈列视觉记忆深刻",
    ];
    defaultCons = [
      "纸感若过于粗糙容易显廉价，需挑选优质微颗粒棉卡",
      "排版若过于密集容易像药品说明书，需留足呼吸空间",
      "符号若无咖啡故事支撑容易空洞，需强化豆种与烘焙隐喻",
    ];
    defaultSensoryMetaphors = [
      "粗纤维大地牛皮纸与单色浅压凹烘焙图谱，散发如同产地泥土般的风土原初触觉",
      "严谨的瑞士双栏风味标尺档案，理性质朴地记录着海拔、处理法与杯测曲线",
      "极简几何豆标与高对比色块冲撞，在昏暗的独立咖啡吧台上一眼被视觉锁定",
    ];
  }

  function getDefaultSteps(routeIdx: number): RouteStep[] {
    if (isProductOrMaterial) {
      return [
        {
          id: `step_${routeIdx + 1}_1`,
          title: "原生纤维压合密度与微肌理",
          question: "何种纤维压合密度与表面微气孔在自然光下最显温润触感？",
          purpose: "确立第一眼的材质基准与漫反射微光泽，保持物料真实呼吸感",
          deliverables: ["纤维微孔漫反射对比样板", "低饱和暖调色谱"],
          acceptanceCriteria: ["自然光下呈现温润漫反射无刺眼塑料感", "材质肌理层次分明"],
        },
        {
          id: `step_${routeIdx + 1}_2`,
          title: "器物造型弧度与握持触感",
          question: "日常陪伴器物的弧线尺度与手握抚慰度如何传递安定温和的心理预期？",
          purpose: "打磨符合人体工学与触觉心理的器物轮廓曲度",
          deliverables: ["微握持曲线切削草图", "有机形态弧度对照模型稿"],
          acceptanceCriteria: ["手掌贴合舒适自然", "轮廓线条洗练无多余碎线"],
        },
        {
          id: `step_${routeIdx + 1}_3`,
          title: "现代生活环境与光影融入",
          question: "该可持续材料置于现代原木或极简家居桌面时，如何与周围环境自然共生？",
          purpose: "验证新材料在真实日常光影与生活场景中的审美和谐度",
          deliverables: ["居家光影环境渲染板", "桌面材质并置效果图"],
          acceptanceCriteria: ["与现代空间和谐相融无突兀感", "桌面静物美感优雅耐看"],
        },
      ];
    }
    if (isPetVI) {
      return [
        {
          id: `step_${routeIdx + 1}_1`,
          title: "暖调色彩与温润材质触感",
          question: "何种低饱和暖调色彩与微肌理最能传递安静治愈的陪伴温度？",
          purpose: "确立第一眼的材质基准与暖调微差，保持纯净呼吸感",
          deliverables: ["暖调治愈色系对照板", "温润材质微肌理样张"],
          acceptanceCriteria: ["自然光下呈现温润漫反射无刺眼杂光", "留白比例充盈，呼吸感充足"],
        },
        {
          id: `step_${routeIdx + 1}_2`,
          title: "双栏网格与专业守护信息",
          question: "品牌守护信息与核心说明如何在版面中形成严谨安心的秩序？",
          purpose: "打磨清晰有力的版式骨架与视觉第一焦点",
          deliverables: ["专业双栏网格排版稿", "核心信息层级样张 3 款"],
          acceptanceCriteria: ["核心信息层级分明视觉清晰", "中西文字阶对比分明"],
        },
        {
          id: `step_${routeIdx + 1}_3`,
          title: "几何动物负空间与符号记忆",
          question: "在微缩尺寸与不同视距下，动物几何符号的轮廓是否依然清晰凝聚？",
          purpose: "验证超级符号的视觉穿透力与跨介质延展表现",
          deliverables: ["几何动物剪影对照稿", "跨尺寸清晰度测试样张"],
          acceptanceCriteria: ["缩微至 16px 仍能清晰分辨动物特征", "轮廓洗练无多余噪点"],
        },
      ];
    }
    if (isUI) {
      return [
        {
          id: `step_${routeIdx + 1}_1`,
          title: "暗黑微质感与表面层级",
          question: "深色背景与 1px 冷灰描边卡片如何在无光污染下划分清晰层级？",
          purpose: "确立克制纯净的暗黑工程美学基准",
          deliverables: ["深色微层级色板", "1px描边卡片对比样张"],
          acceptanceCriteria: ["各层级对比度符合 WCAG AA 规范", "无悬浮眩光污染"],
        },
        {
          id: `step_${routeIdx + 1}_2`,
          title: "8px栅格与高密度数据排版",
          question: "高密度数据、状态徽标与表格如何在 8px 栅格下保持从容动线？",
          purpose: "构建严谨高效的信息阅读骨架",
          deliverables: ["8px高密度表格排版稿", "多态组件层级规范"],
          acceptanceCriteria: ["核心数据在第一眼清晰锁定", "字阶级差舒适"],
        },
        {
          id: `step_${routeIdx + 1}_3`,
          title: "状态色彩与视觉控制中枢",
          question: "关键告警、成功与运行中状态如何以穿透式视觉锤瞬间传递？",
          purpose: "验证控制台核心视觉焦点与状态识别效率",
          deliverables: ["关键状态色彩对比板", "中枢控制台高保真小样"],
          acceptanceCriteria: ["状态色彩传意秒级响应", "视觉中枢焦点突出"],
        },
      ];
    }
    return [
      {
        id: `step_${routeIdx + 1}_1`,
        title: "材质白度与原生微肌理",
        question: "何种基底材质与微颗粒在自然光下最显温润原生触感？",
        purpose: "确立第一眼的材质基准与调性质感，保持呼吸感",
        deliverables: ["原生物料微颗粒对照板", "正面留白与肌理样张"],
        acceptanceCriteria: ["自然光下呈现温润漫反射无刺眼杂光", "留白比例充盈，呼吸感充足"],
      },
      {
        id: `step_${routeIdx + 1}_2`,
        title: "中西文字阶与排版动线",
        question: "品名、核心说明与信息区块如何在版面形成清晰骨架？",
        purpose: "打磨严谨有力的版式骨架与视觉第一焦点",
        deliverables: ["双栏网格排版规范稿", "核心信息层级样张 3 款"],
        acceptanceCriteria: ["品名在 1 秒内被视觉锁定", "中西文字阶对比分明"],
      },
      {
        id: `step_${routeIdx + 1}_3`,
        title: "微光影细节与视觉重锤",
        question: "在 45 度侧光照射下，局部微工艺与符号轮廓是否干净利落？",
        purpose: "验证微工艺的视觉层次与光影细节表现",
        deliverables: ["微光影层次效果稿", "侧光阴影对比样张"],
        acceptanceCriteria: ["45度侧光下轮廓清晰无毛边", "阴影微弱而具雕塑感"],
      },
    ];
  }

  let routes: Route[] = rawRoutes.slice(0, 3).map((r, i) => {
    const routeId = nonEmpty(r.id, `route_${i + 1}`);
    let starting = nonEmpty(r.startingPoint, defaultStarts[i] ?? `探索领地 ${i + 1}`);
    if (seenStarting.has(starting)) {
      starting = `${starting}（领地 ${i + 1}）`;
    }
    seenStarting.add(starting);

    const rawTitle = nonEmpty(r.title, defaultTitles[i] ?? `设计主题 ${i + 1}`);

    let themeName = typeof r.themeName === "string" && r.themeName.trim()
      ? stripThemeStudioTag(sanitizeLeakedVariables(r.themeName.trim()))
      : "";

    if (!themeName) {
      const match = rawTitle.match(/【(.*?)】(.*)/);
      if (match) {
        themeName = match[2].trim() || match[1].trim();
      } else {
        themeName = fallbackCreativeThemeName(
          input,
          i,
          creativeLenses[i] ?? creativeLenses[0],
        );
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
      const defSteps = getDefaultSteps(i);
      for (let k = 0; k < needed; k++) {
        const fallbackStep = defSteps[steps.length] ?? {
          id: `step_${i + 1}_${steps.length + 1}`,
          title: `视距焦点与留白节奏 0${steps.length + 1}`,
          question: "在真实 1.5 米视距下，大面积留白与视觉焦点是否舒适分明？",
          purpose: "打磨视觉呼吸感与第一焦点穿透力",
          deliverables: ["1.5米视距黑白对比稿", "版面留白节奏分析图"],
          acceptanceCriteria: ["远视下主体轮廓清晰分明", "留白充盈不压抑"],
        };
        steps.push(fallbackStep);
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

    const sensoryMetaphor = typeof r.sensoryMetaphor === "string" && r.sensoryMetaphor.trim()
      ? sanitizeLeakedVariables(r.sensoryMetaphor.trim())
      : (defaultSensoryMetaphors[i] ?? defaultSensoryMetaphors[0]);

    const resolvedFocusDimension = sanitizeAntiTeleology(nonEmpty(r.focusDimension, defaultDimensions[i] ?? "视觉美学探索"));
    const resolvedThemeName = adaptiveThemeName(
      themeName,
      input,
      i,
      starting,
      resolvedFocusDimension,
      creativeLenses[i] ?? creativeLenses[0],
    );

    const normalizedThemeName = normalizeThemeName(
      resolvedThemeName,
      fallbackCreativeThemeName(input, i, creativeLenses[i] ?? creativeLenses[0]),
      { startingPoint: starting, focusDimension: resolvedFocusDimension },
    );

    return {
      id: routeId,
      title: sanitizeAntiTeleology(
        normalizeRouteTitle(rawTitle, defaultTitles[i] ?? `设计主题 ${i + 1}`, {
          startingPoint: starting,
          focusDimension: resolvedFocusDimension,
        }),
      ),
        themeName: sanitizeAntiTeleology(normalizedThemeName),
      visualSnapshot: sanitizeAntiTeleology(visualSnapshot),
      sensoryMetaphor: sanitizeAntiTeleology(sensoryMetaphor),
      startingPoint: sanitizeAntiTeleology(starting),
      focusDimension: resolvedFocusDimension,
      coreProblem: sanitizeAntiTeleology(nonEmpty(r.coreProblem, defaultCoreProblems[i] ?? defaultCoreProblems[0])),
      purpose: sanitizeAntiTeleology(nonEmpty(r.purpose, defaultPurposes[i] ?? defaultPurposes[0])),
      pros: sanitizeAntiTeleology(nonEmpty(r.pros, defaultPros[i] ?? defaultPros[0])),
      cons: sanitizeAntiTeleology(nonEmpty(r.cons, defaultCons[i] ?? defaultCons[0])),
      feasibility: feasibilityVal,
      timeframe: nonEmpty(r.timeframe, "1–2 天"),
      recommendedReason: recReason ? sanitizeAntiTeleology(recReason) : null,
      steps,
    };
  });

  if (routes.length === 3 && namesNeedDiversity(routes.map((route) => route.themeName || ""))) {
    const names = routes.map((route) => route.themeName || "");
    const fallbackNameIndexes = new Set<number>();
    const genericName = /^(?:不同切面|设计主题|探索切面|方向|主题|自然|极简|高级|现代|温暖|质感)/;
    names.forEach((name, index) => {
      if (genericName.test(themeNameCore(name))) fallbackNameIndexes.add(index);
    });
    const firstChars = names.map((name) => themeNameCore(name).slice(0, 1));
    if (firstChars.every((char) => char && char === firstChars[0])) {
      names.forEach((name, index) => {
        if (themeNameCore(name).length <= 4) fallbackNameIndexes.add(index);
      });
    }
    routes = routes.map((route, index) => ({
      ...route,
      themeName: (fallbackNameIndexes.has(index) || needsThemeNameFallback(route.themeName || "", names))
        ? sanitizeAntiTeleology(
            fallbackCreativeThemeName(
              input,
              index,
              creativeLenses[index] ?? creativeLenses[0],
            ),
          )
        : route.themeName,
    }));
  }

  // Ensure exactly 3 routes
  while (routes.length < 3) {
    const i = routes.length;
    routes.push({
      id: `route_${i + 1}`,
      title: normalizeRouteTitle(
        defaultTitles[i] ?? `设计主题 ${i + 1}`,
        defaultTitles[i] ?? `设计主题 ${i + 1}`,
        {
          startingPoint: defaultStarts[i],
          focusDimension: defaultDimensions[i],
        },
      ),
      themeName: fallbackCreativeThemeName(
        input,
        i,
        creativeLenses[i] ?? creativeLenses[0],
      ),
      visualSnapshot: defaultSnapshots[i] ?? "大面积纯净留白，依靠材质微肌理与清晰字阶呈现克制现代美感。",
      sensoryMetaphor: defaultSensoryMetaphors[i] ?? defaultSensoryMetaphors[0],
      startingPoint: defaultStarts[i] ?? `探索切入 0${i + 1}`,
      focusDimension: defaultDimensions[i] ?? "综合美学表现",
      coreProblem: defaultCoreProblems[i] ?? defaultCoreProblems[0],
      purpose: defaultPurposes[i] ?? defaultPurposes[0],
      pros: defaultPros[i] ?? defaultPros[0],
      cons: defaultCons[i] ?? defaultCons[0],
      feasibility: "high",
      timeframe: "1–2 天",
      recommendedReason: null,
      steps: getDefaultSteps(i),
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
        r.recommendedReason = `针对【${subjectLabel}】的核心诉求与前置沟通，该主题切入角度最稳妥直接。`;
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
  let promptSystem = SYSTEM;
  const creativeLenses = selectCreativeLenses(
    `${input.sessionId}|${input.rawBrief}|${input.refreshIndex ?? 0}`,
  );
  const rawGoal = (input.state?.brief?.goal || input.rawBrief || "").trim();
  const deliverable = (input.state?.brief?.deliverable || "").trim();
  const audience = (input.state?.brief?.audience || "").trim();
  const intent = (input.state?.direction?.intent?.text || "").trim();
  const priorities = (input.state?.direction?.priorities || [])
    .map((p) => p.text)
    .filter(Boolean);
  const avoidances = (input.state?.direction?.avoid || [])
    .map((a) => a.text)
    .filter(Boolean);
  const criteria = (input.state?.direction?.criteria || [])
    .map((c) => c.text)
    .filter(Boolean);
  const visualKeywords = (input.state?.visualKeywords || []).filter(Boolean);
  const constraints = (input.state?.constraints || [])
    .map((c) => c.text)
    .filter(Boolean);

  const historyAnswers: string[] = [];
  if (Array.isArray(input.history)) {
    for (const entry of input.history) {
      if (entry.event.type === "answer" && entry.questions) {
        for (const ans of entry.event.answers) {
          const q = entry.questions.find((question) => question.id === ans.questionId);
          if (q) {
            let ansText = "";
            if (ans.kind === "option") {
              ansText = q.options.find((o) => o.id === ans.optionId)?.label || ans.optionId;
            } else if (ans.kind === "custom") {
              ansText = ans.text;
            }
            if (ansText) {
              historyAnswers.push(`“${q.prompt}” → 用户明确选定：“${ansText}”`);
            }
          }
        }
      }
    }
  }

  if (rawGoal) {
    promptSystem += `\n\n【⚠️ 当前任务核心 Brief 锚点（绝对约束，严禁偏离）】：\n用户原始需求主体为：“${rawGoal}”。\n所有 3 个设计主题（Theme）、快照（Snapshot）和切入视点（Steps）必须严格围绕【${rawGoal}】这一核心品类与主体展开！\n严禁将风格修饰词（如“白色”）脱离主体当成单一特种纸或纸厂测试！必须输出针对【${rawGoal}】的整体视觉策略方案！`;
  }
  if (input.excludeThemeNames && input.excludeThemeNames.length > 0) {
    promptSystem += `\n\n【用户更换主题指令】：用户对上一批设计主题（${input.excludeThemeNames.join("、")}）不满意，要求换一批全新的创意领地与设计主题！严禁与上述主题重复或雷同，必须推导截然不同的视觉手法与画面呈象！`;
  }

  promptSystem += `\n\n【本轮创意分工，必须一一对应】
本轮不要先套用熟悉的风格词。先从 Brief 和用户已确认内容中提取具体事实，再按下列三个创意视角各生成一条主题：
${creativeRoundPrompt(creativeLenses)}
三条主题的名称、title、startingPoint 和 visualSnapshot 必须彼此不同；不要让三条主题共享同一个开头形容词，也不要都写成“材质 × 工艺”、网格、几何、留白或英文代号。`;

  const userPrompt = `【任务设计背景与已收敛方向状态 (Design State)】：
- 原始 Brief 核心目标：${rawGoal}
${deliverable ? `- 交付载体与媒介：${deliverable}` : ""}
${audience ? `- 目标受众：${audience}` : ""}
${intent ? `- 核心视觉意图 (Intent)：${intent}` : ""}
${historyAnswers.length ? `- 问答收敛环节用户的核心取舍：\n${historyAnswers.map((h, i) => `  ${i + 1}. ${h}`).join("\n")}` : ""}
${priorities.length ? `- 经问答收敛确认【坚决优先达成】的审美维度 (Priorities)：\n${priorities.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}` : ""}
${avoidances.length ? `- 经问答收敛确认【严厉杜绝避开】的审美雷区 (Avoid)：\n${avoidances.map((a, i) => `  ${i + 1}. ${a}`).join("\n")}` : ""}
${criteria.length ? `- 视觉评价标准 (Criteria)：\n${criteria.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}` : ""}
${visualKeywords.length ? `- 已沉淀专业视觉参数 (Visual Keywords)：${visualKeywords.join("、")}` : ""}
${constraints.length ? `- 已确认设计约束：${constraints.join("；")}` : ""}

【主题生成铁律】：
1. 3 个设计主题必须严格围绕【${rawGoal}】${deliverable ? `（交付载体：${deliverable}）` : ""}展开，严禁品类漂移！
2. 必须自适应选择适合【${deliverable || rawGoal}】门类的 3 条创意领地，严禁生搬硬套不相干的 2D 瑞士排版或 Logo 视觉锤！
3. 3 个主题必须各自从不同侧面积极响应上述已确认的【优先达成维度】，并坚决杜绝上述【严厉杜绝避开的雷区】！
4. 每一条主题的 visualSnapshot 必须用生动具体的画面大白话描绘出成品在光影与真实场景下的视觉质感。
5. 必须返回单推荐（recommendedRouteId 对应 1 个主题，其余 2 个主题 recommendedReason 严格填 null）。

完整原始输入 JSON（含上下文 ID 与修订版本）：
${JSON.stringify(input)}`;

  return completeJson(promptSystem, userPrompt, "none", [], 0.85).then((payload) =>
    normalizeLiveRoutesPayload(payload, input),
  );
}
