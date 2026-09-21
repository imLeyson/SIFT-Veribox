import type { Route, RouteStep } from "@/types/routes";
import { completeJson } from "./llm";
import type { z } from "zod";
import type { RoutesInputSchema } from "./routes-schema";

type RoutesInput = z.infer<typeof RoutesInputSchema>;

const SYSTEM = `你是 SIFT 设计主题构思 Agent，充当资深设计总监（Design Director）与实战派品牌策略搭档。
当前设计任务的方向（Design State）已经收敛并由用户正式确认。
你的任务是基于设计学界成熟的 Creative Territories（创意领地）提案模型（借鉴 Pentagram / Wolff Olins 的商业提案实践），为该任务生成正好 3 条互不相同、正交互补、画面感极强的【设计主题（Design Themes）】。

【最高准则 · 核心行业与主体绝对锁死（严禁上下文漂移）】：
1. 绝对锚定用户原始需求的核心行业与品类主体（如“宠物”、“咖啡”、“SaaS”、“美妆”、“潮玩”、“文创”等）！收敛问答中确认的调性（如“白色”、“极简”、“高级”）只是风格修饰词，绝不能篡位成核心主体！
2. 严禁出现“输入宠物却输出纸厂特种纸打样”、“输入SaaS却输出茶叶罐包装”等上下文丢失的灾难性漂移！
3. 所有 3 个设计主题（Theme）、快照（Snapshot）和切入视点（Steps），必须全部深度服务于【该品类主体】的整体视觉系统或商业设计全案。

关键原则与语言风格（杜绝伪需求，彻底摒弃假大空套话与AI味）：
1. 绝对禁词：严禁使用“赋能、多维共鸣、叙事解构、心流体验、空间重构、生态感知、交融升华、高级感、轻奢风、自然简约、一眼看懂、一目了然”等任何空洞浮夸的公关大词或轻佻AI套话。
2. 严禁泄漏代码变量名与刻板模板：绝对禁止在任何输出文本中包含任何英文代码变量名或系统字段词（严禁输出 uncertainties、quality_source、confirmedDimensions、id、state、payload 等！）。严禁机械套用“针对前期对于想要...的纠结”等模板句式，必须直接、中肯地陈述设计与审美依据！
3. 通俗易懂、体现懂行的专业感，且【画面呈象第一】：
   - 必须使用设计师在工位上真实沟通与商业提案中的大白话与专业词汇（如：“300g 原浆棉卡”、“0.5mm 侧光深压凹”、“双栏模块化网格”、“中西文字阶 2.5 倍对比”、“负空间呼吸感”、“货架视觉真空”、“1.5米盲测辨识”）。
   - 必须提供 themeName：4–8 字响亮直观的大主题名（紧扣品类主体，如宠物提案中「温润陪伴 · 治愈微触感」、「理性守护 · 科学信息网格」、「几何萌态 · 超级动物符号」；实体包装案中「素纸微白 · 原生触觉」等）。必须让人一眼看出针对该品类要做什么设计主题。
   - 必须提供 visualSnapshot：用 1–2 句精炼具象的画面语言描绘最终成品的视觉呈象与质感特征（必须结合品类主体！例如宠物提案：“品牌主视觉以柔和暖白棉质感为底，搭配极简几何猫犬负空间剪影与无墨浅压凹，不使用花哨卡通涂鸦，在 45 度侧光下呈现静谧治愈的高级陪伴感”）。严禁脱离主体、严禁使用“一眼看懂”、“让人一目了然”等轻佻AI套话！
4. 严格单推荐规则：
   - 3 个主题中，只能有且仅有 1 个主题被选为推荐主题（recommendedRouteId 指向它），且只有该主题能填写 recommendedReason；其余两个探索主题的 recommendedReason 必须填 null！

三条正交领地（Creative Territories · 跨设计品类自适应）：
必须根据当前任务的核心品类（品牌VI、平面、包装、UI/SaaS、生活方式等）自适应演绎三条正交路径：
1. 领地一【材质工艺与微触感 / 调性氛围】（借鉴 Dieter Rams "少，但更好" 与原研哉触觉设计）：
   - 针对品牌/生活方式/宠物：依靠温润材料肌理（如暖调棉麻质感、低饱和柔和暖色、无墨微凹印）、干净呼吸感留白，传递静谧、自然或亲和的治愈温度；
   - 针对实体包装：依靠实体材料的原生肌理、留白微光影与表面工艺（如特种纸浆颗粒、单色深压凹、微弱局部 UV）；
   - 针对数字界面：依靠极度克制的微渐变、细腻卡片投影、空间层级与呼吸感留白。
   - 核心：不靠花哨多余杂乱插画遮丑，用纯净克制的材质/调性触感与极端留白取胜。
2. 领地二【排版秩序与信息结构】（借鉴 Josef Müller-Brockmann 网格法则与瑞士排印学）：
   - 依靠严谨的信息骨架、双栏/模块化网格、中西文字阶强弱梯级对比与冷冽排版；
   - 针对品牌/文创：打造档案式、专业理性的规范与极高品质信任感（如成分/规格/严谨字标）；
   - 针对数字产品：打造高密度、清晰逻辑的数据与组件层级；
   - 核心：极高信息阅读效率、科学理性与专业权威感。
3. 领地三【视觉锤与符号化跳脱】（借鉴 Laura Ries 视觉锤理论与图形隐喻）：
   - 提炼与品类强相关的极简高穿透力视觉符号、负空间隐喻或高反差色块（如宠物品类的极简几何动物剪影重锤、抽象爪印线条，或科技品类的动态几何）；
   - 远距离（1.5–3米）或 16px 缩微尺寸下 0.5 秒抓人眼球，形成货架、包装或手机屏幕上的瞬间辨识。
   - 核心：视觉记忆点穿透力极强、辨识度极高。

严格字段契约：
- themeName: 4–8 字响亮直观的大主题名（紧扣品类主体，如「温润陪伴 · 治愈微触感」）。
- title: 必须采用【视觉抓手/工艺手法】具体手法名 格式。例如：
  * 宠物案：【暖调棉感与微压凹】温润治愈质感 / 【瑞士网格与严谨字阶】专业守护信息系统 / 【几何负空间与动物剪影】高辨识超级符号
  * 包装案：【特种棉纸与单色深压凹】极端克制纸感 / 【瑞士网格与严谨字阶】档案式风味信息 / 【极简几何色块与视觉锤】高辨识度符号
  * 界面案：【1px精细网格与暗黑质感】工程极客美学 / 【多态组件与紧凑字阶】高密度信息架构 / 【微动效与核心视觉焦点】穿透式控制中枢
- visualSnapshot: 1–2 句具象大白话描绘“最终画面长什么样”，画面感极强且紧扣当前品类主体。
- focusDimension: 视觉核心切入点（如"温润材质微触感与亲和调性"、"科学信息网格与排版秩序"、"极简动物符号与高穿透视觉锤"）。
- startingPoint: 独特的探索起点（简短精炼）。
- coreProblem: 核心设计抉择（说明主动放弃了什么、押注了什么，如"放弃花哨卡通插画，把视觉质感全押在温润棉纸微触感与无墨压凹上"）。
- purpose: 具象的视觉执行手法。
- pros: 视觉亮点 / 灵感抓手（该主题在画面、构图、色彩或材质上最出彩、最打动人的审美特质）。
- cons: 防跑偏提示 / 注意边界（探索该视觉方向时需警惕的调性陷阱或审美红线）。
- feasibility: "high" | "medium" | "challenging"（落地可行性与打样难度）。
- timeframe: 探索打样周期（如"0.5–1 天"、"1–2 天"）。
- recommendedReason: 仅在推荐主题填写自然中肯的设计解题理由（直接陈述为什么该方案最能达成设计意图并平衡落地，严禁使用“针对前期对于...的纠结”等模板套话！），其余两个探索主题严格填 null。
- steps: 恰好 3 个前期灵感切入视点（Visual Inspiration Angles，紧扣品类与主题）：
  * 核心定位：SIFT 只做【前期视觉灵感探索与审美收敛】，不做后期落地生产工程！严禁输出脱离主体品类的无关测试清单！
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
      "themeName": "温润陪伴 · 治愈微触感",
      "title": "【暖调棉感与微压凹】温润治愈质感",
      "visualSnapshot": "品牌主视觉以柔和暖白棉质感为底，搭配极简细节与微压凹，不使用花哨卡通涂鸦，在 45 度侧光下呈现静谧治愈的陪伴温度",
      "focusDimension": "温润材质微触感与亲和调性",
      "startingPoint": "暖调棉感微触感与柔和留白",
      "coreProblem": "放弃繁复花哨的卡通插画，把视觉质感全押在温润材质触感与无墨微凹印细节上",
      "purpose": "以大面积柔和暖调与微光影细节构建耐看且具陪伴温度的整体视觉体验",
      "pros": "温润质感与克制留白形成安静治愈的审美空间，耐看且极具呼吸感",
      "cons": "留白若无微质感与暖调光影支撑，极易显得单调空洞，需把控好色调温度与光影层次",
      "feasibility": "high",
      "timeframe": "0.5–1 天",
      "recommendedReason": "暖调棉感与微压凹直接确立亲和耐看的高品质基准，既保留治愈感又规避低质卡通低幼感",
      "steps": [
        {
          "id": "step_1_1",
          "title": "暖调色彩与温润材质触感",
          "question": "何种低饱和暖调色彩与微肌理最能传递安静治愈的陪伴温度？",
          "purpose": "确立第一眼的材质基准与暖调微差，保持纯净呼吸感",
          "deliverables": ["暖调治愈色系对照板", "温润材质微肌理样张"],
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
  const rawGoal = (input.state?.brief?.goal || input.rawBrief || "").trim();
  const isPet = /宠物|猫|狗|pet|cat|dog/i.test(rawGoal);
  const isUI = /ui|ux|saas|界面|后台|dashboard|网页|web/i.test(rawGoal);
  const isCoffee = /咖啡|coffee/i.test(rawGoal);
  const subjectLabel = rawGoal ? rawGoal.slice(0, 10) : "设计案";

  let defaultStarts = [
    "特种纸微触感与无墨压凹",
    "双栏网格与微字阶层级",
    "高对比几何符号视觉锤",
  ];
  let defaultDimensions = [
    "特种纸肌理与深压凹工艺",
    "双栏网格与微字阶层级",
    "高对比几何符号视觉锤",
  ];
  let defaultThemeNames = [
    "素纸微白 · 原生触觉",
    "瑞士理性 · 档案清单",
    "极简静物 · 视觉重锤",
  ];
  let defaultTitles = [
    "【特种棉纸与深压凹】极端克制纸感",
    "【瑞士网格与严谨字阶】档案式清晰信息",
    "【极简几何色块与视觉锤】高辨识度符号",
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
    "以高反差与极简几何视觉重锤实现秒级记忆锁定",
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

  if (isPet) {
    defaultStarts = [
      "暖调棉感微触感与柔和留白",
      "理性双栏网格与守护信息层级",
      "极简几何动物负空间视觉锤",
    ];
    defaultDimensions = [
      "温润材质微触感与亲和调性",
      "科学信息网格与排版秩序",
      "极简动物符号与高穿透视觉锤",
    ];
    defaultThemeNames = [
      "温润陪伴 · 治愈微触感",
      "理性守护 · 科学信息网格",
      "几何萌态 · 超级动物符号",
    ];
    defaultTitles = [
      "【暖调棉感与微压凹】温润治愈质感",
      "【瑞士网格与严谨字阶】专业守护信息系统",
      "【几何负空间与动物剪影】高辨识超级符号",
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
      "以强视觉穿透力的动物几何符号实现 0.5 秒瞬间辨识与跨介质延展",
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
  } else if (isUI) {
    defaultStarts = [
      "暗黑微质感与 1px 精细网格",
      "高密度数据表格与字阶骨架",
      "核心控制台单一视觉锤聚焦",
    ];
    defaultDimensions = [
      "深色极客美学与细腻微渐变",
      "信息架构与高密度数据网格",
      "极简工程视觉符号与控制台",
    ];
    defaultThemeNames = [
      "暗黑工程 · 极简微质感",
      "严谨网格 · 高密度数据流",
      "极简中枢 · 核心控制台",
    ];
    defaultTitles = [
      "【1px精细网格与暗黑质感】工程极客美学",
      "【多态组件与紧凑字阶】高密度信息架构",
      "【微动效与核心视觉焦点】穿透式控制中枢",
    ];
    defaultSnapshots = [
      "深色暗黑背景配合 1px 冷灰描边与细腻微渐变，克制无悬浮光污染，呈现纯粹利落的专业工程美学。",
      "严格遵循 8px 栅格与紧凑字阶体系，高密度数据展示井然有序，键盘级交互动线清晰明了。",
      "提炼穿透力极强的单一控制台视觉核心，关键状态色彩一目了然，打造高沉浸感生产力工具体验。",
    ];
    defaultCoreProblems = [
      "放弃浮夸重型 3D 渲染，把视觉质感建立在细腻微质感与 1px 网格秩序上",
      "放弃松散排布，通过紧凑字阶与多态组件实现高密度数据的高效承载",
      "放弃分散视觉注意力，提炼单一视觉焦点实现秒级状态感知",
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
  } else if (isCoffee) {
    defaultStarts = [
      "原浆大地纸感与单色深压凹",
      "产区风味档案与双栏排印",
      "极简几何豆标与高对比视觉锤",
    ];
    defaultDimensions = [
      "原生触觉与天然纸张肌理",
      "风味档案与瑞士排版秩序",
      "极简几何符号与辨识度",
    ];
    defaultThemeNames = [
      "大地本色 · 原生纸感触觉",
      "风味档案 · 瑞士理性排印",
      "极简几何 · 豆标视觉重锤",
    ];
    defaultTitles = [
      "【原浆棉卡与单色深压凹】风土原生质感",
      "【双栏网格与风味标尺】产地信息档案",
      "【几何豆标与色块冲撞】瞬间辨识视觉锤",
    ];
    defaultSnapshots = [
      "粗颗粒大地色系原浆纸留白，正面单色浅压凹烘焙风味细节，无多余装饰，还原咖啡豆风土原生触觉。",
      "严谨网格排布产地、海拔与处理法信息，微字阶对比严谨克制，呈现专业独立咖啡馆档案可信度。",
      "极简几何咖啡豆剪影与高对比色块，货架与吧台陈列中瞬间抓住眼球，视觉记忆点清晰纯粹。",
    ];
    defaultCoreProblems = [
      "放弃花哨多色包装贴纸，把视觉质感全押在原浆纸触感与风土肌理上",
      "放弃市面常见网红插画，以严谨瑞士网格呈现产区风味信息档案",
      "放弃具象写实图案，提炼极简几何豆标超级符号建立瞬间辨识",
    ];
    defaultPurposes = [
      "以大地原浆材质与微凹印还原咖啡豆的风土手作触觉",
      "建立如同独立咖啡馆出品档案般的专业排版秩序与信赖感",
      "以极具冲击力的几何豆标在复杂货架中形成瞬间视觉焦点",
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
  }

  function getDefaultSteps(routeIdx: number): RouteStep[] {
    if (isPet) {
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
          acceptanceCriteria: ["核心信息在 1 秒内被视觉锁定", "中西文字阶对比分明"],
        },
        {
          id: `step_${routeIdx + 1}_3`,
          title: "几何动物负空间与符号记忆",
          question: "在 1.5 米远视与微缩尺寸下，动物几何符号是否具备秒级辨识度？",
          purpose: "验证超级符号的视觉穿透力与跨介质延展表现",
          deliverables: ["几何动物剪影对照稿", "跨尺寸与远视辨识度测试样张"],
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
          acceptanceCriteria: ["核心数据在 0.5 秒内清晰锁定", "字阶级差舒适"],
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

    return {
      id: routeId,
      title,
      themeName,
      visualSnapshot,
      startingPoint: starting,
      focusDimension: nonEmpty(r.focusDimension, defaultDimensions[i] ?? "视觉美学探索"),
      coreProblem: nonEmpty(r.coreProblem, defaultCoreProblems[i] ?? defaultCoreProblems[0]),
      purpose: nonEmpty(r.purpose, defaultPurposes[i] ?? defaultPurposes[0]),
      pros: nonEmpty(r.pros, defaultPros[i] ?? defaultPros[0]),
      cons: nonEmpty(r.cons, defaultCons[i] ?? defaultCons[0]),
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
      title: defaultTitles[i] ?? `【视觉策略与探索】实战方案 0${i + 1}`,
      themeName: defaultThemeNames[i] ?? `设计主题 0${i + 1}`,
      visualSnapshot: defaultSnapshots[i] ?? "大面积纯净留白，依靠材质微肌理与清晰字阶呈现克制现代美感。",
      startingPoint: defaultStarts[i] ?? `领地 0${i + 1}`,
      focusDimension: defaultDimensions[i] ?? "综合美学表现",
      coreProblem: defaultCoreProblems[i] ?? defaultCoreProblems[0],
      purpose: defaultPurposes[i] ?? defaultPurposes[0],
      pros: defaultPros[i] ?? defaultPros[0],
      cons: defaultCons[i] ?? defaultCons[0],
      feasibility: "high",
      timeframe: "0.5–1 天",
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
  const rawGoal = (input.state?.brief?.goal || input.rawBrief || "").trim();
  if (rawGoal) {
    promptSystem += `\n\n【⚠️ 当前任务核心 Brief 锚点（绝对约束，严禁偏离）】：\n用户原始需求主体为：“${rawGoal}”。\n所有 3 个设计主题（Theme）、快照（Snapshot）和切入视点（Steps）必须严格围绕【${rawGoal}】这一核心品类与主体展开！\n严禁将风格修饰词（如“白色”）脱离主体当成单一特种纸或纸厂测试！必须输出针对【${rawGoal}】的整体视觉策略方案！`;
  }
  if (input.excludeThemeNames && input.excludeThemeNames.length > 0) {
    promptSystem += `\n\n【用户更换主题指令】：用户对上一批设计主题（${input.excludeThemeNames.join("、")}）不满意，要求换一批全新的创意领地与设计主题！严禁与上述主题重复或雷同，必须推导截然不同的视觉手法与画面呈象！`;
  }
  return completeJson(promptSystem, JSON.stringify(input), "none").then((payload) =>
    normalizeLiveRoutesPayload(payload, input),
  );
}
