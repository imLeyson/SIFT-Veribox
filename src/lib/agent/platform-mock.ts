import type { PlatformPlan, PlatformSource } from "@/types/routes";
import type { Route, RouteStep } from "@/types/routes";
import type { DesignState } from "@/types/convergence";
import { buildPlatformSearchUrl, PLATFORM_REGISTRY } from "./platform-registry";
import {
  calibratePlatformQuery,
  getPlatformInspirationClues,
  inferKeywordDimension,
} from "./system-one";

export function getMockPlatformPlan(
  state: DesignState,
  route: Route,
  currentStep: RouteStep,
): PlatformPlan {
  const stepText = (
    currentStep.title +
    " " +
    currentStep.question +
    " " +
    currentStep.purpose +
    " " +
    (route.themeName ?? "") +
    " " +
    route.title +
    " " +
    (route.focusDimension ?? "")
  ).toLowerCase();

  const combinedText = (stepText + " " + (state.brief.goal ?? "")).toLowerCase();

  const isDigital =
    stepText.includes("界面") ||
    stepText.includes("组件") ||
    stepText.includes("saas") ||
    stepText.includes("后台系统") ||
    stepText.includes("交互") ||
    stepText.includes("微交互") ||
    stepText.includes("动效") ||
    stepText.includes("工作台") ||
    combinedText.includes("saas");

  const isSymbolOrIdentity =
    stepText.includes("视觉锤") ||
    stepText.includes("符号") ||
    stepText.includes("几何") ||
    stepText.includes("解构") ||
    stepText.includes("轮廓") ||
    stepText.includes("静物") ||
    stepText.includes("桌面");

  const isTypography =
    stepText.includes("排版") ||
    stepText.includes("字体") ||
    stepText.includes("网格") ||
    stepText.includes("字阶") ||
    stepText.includes("版式") ||
    stepText.includes("封签") ||
    stepText.includes("标尺");

  const isSkincareOrScience =
    combinedText.includes("护肤") ||
    combinedText.includes("美妆") ||
    combinedText.includes("实验") ||
    combinedText.includes("配方") ||
    combinedText.includes("敏感肌") ||
    combinedText.includes("刻度");

  let primary: PlatformSource[];
  let alternative: PlatformSource[];

  if (isDigital) {
    // 1. Digital / SaaS scenario
    primary = [
      {
        id: "src_mobbin",
        platform: PLATFORM_REGISTRY.mobbin.name,
        roleTag: PLATFORM_REGISTRY.mobbin.roleTag,
        reason: "检索全球顶尖真实 Web 与 SaaS 生产级工作台、深色模式与复杂表单交互",
        keywords: [
          {
            keyword: "b2b saas dashboard dark mode",
            meaning: "真实生产级深色 B 端高密度数据看板",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "b2b saas dashboard dark mode -template",
          },
          {
            keyword: "data table 8px grid hierarchy",
            meaning: "高密度数据表格 8px 栅格与视线流动规范",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "B端后台工作台 真实系统界面",
            meaning: "国内一线产研协同工具工作台实际生产截图",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("mobbin", "b2b saas dashboard dark mode"),
      },
      {
        id: "src_godly",
        platform: PLATFORM_REGISTRY.godly.name,
        roleTag: PLATFORM_REGISTRY.godly.roleTag,
        reason: "探索前沿先锋工程美学、极客暗黑调性与轻盈微动效排版",
        keywords: [
          {
            keyword: "developer tool dark minimalist web design",
            meaning: "极简开发者工具工程美学落地网页",
            language: "en",
            searchType: "moodboard",
          },
          {
            keyword: "engineering aesthetic micro interaction",
            meaning: "硬核极客调性的高精度状态指示与交互反馈",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "暗黑极客科技美学 界面排版",
            meaning: "等宽字体与深炭灰科技背景的高级搭配",
            language: "zh",
            searchType: "moodboard",
          },
        ],
        searchUrl: buildPlatformSearchUrl("godly", "developer tool dark minimalist web design"),
      },
      {
        id: "src_dribbble",
        platform: PLATFORM_REGISTRY.dribbble.name,
        roleTag: PLATFORM_REGISTRY.dribbble.roleTag,
        reason: "高保真查看卡片微阴影弥散高度、胶囊标签微间距与组件细节小样",
        keywords: [
          {
            keyword: "saas component card diffuse shadow",
            meaning: "卡片模组细腻空气感弥散阴影与圆角参数",
            language: "en",
            searchType: "detail",
            advancedQuery: "saas card shadow -mockup",
          },
          {
            keyword: "status badge design system component",
            meaning: "状态指示徽章与数据标签组件规范",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "设计系统 状态色阶 规范",
            meaning: "符合 WCAG 标准的功能性色彩梯度与对比度样板",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("dribbble", "saas component card diffuse shadow"),
      },
    ];
    alternative = [
      {
        id: "src_fontsinuse",
        platform: PLATFORM_REGISTRY.fontsinuse.name,
        roleTag: PLATFORM_REGISTRY.fontsinuse.roleTag,
        reason: "查阅专业等宽代码字体在数据系统中的排版案例与字阶对比",
        keywords: [
          {
            keyword: "monospace font dashboard ui",
            meaning: "等宽代码字体在控制台界面的经典排版案例",
            language: "en",
            searchType: "benchmark",
          },
          {
            keyword: "等宽字体 控制台 数据界面 排版",
            meaning: "中文技术控制台界面的等宽字体与数字对齐范例",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("fontsinuse", "monospace font dashboard ui"),
      },
      {
        id: "src_behance",
        platform: PLATFORM_REGISTRY.behance.name,
        roleTag: PLATFORM_REGISTRY.behance.roleTag,
        reason: "查阅成套大型企业级 SaaS 设计系统的端到端推演过程",
        keywords: [
          {
            keyword: "enterprise design system case study",
            meaning: "企业级多团队协同设计系统完整案例",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "enterprise design system -mockup -template",
          },
          {
            keyword: "企业级 SaaS 设计系统 全案推演",
            meaning: "大型 SaaS 业务组件与状态机规范推演全案",
            language: "zh",
            searchType: "benchmark",
          },
        ],
        searchUrl: buildPlatformSearchUrl("behance", "enterprise design system case study"),
      },
      {
        id: "src_arena",
        platform: PLATFORM_REGISTRY.arena.name,
        roleTag: PLATFORM_REGISTRY.arena.roleTag,
        reason: "总监级极客美学与数据可视化艺术灵感溯源",
        keywords: [
          {
            keyword: "brutalist developer aesthetics cybernetics",
            meaning: "硬核科技美学与极简数字主义调研情绪板",
            language: "en",
            searchType: "moodboard",
          },
          {
            keyword: "minimalist dark ui moodboard research",
            meaning: "先锋暗黑极简界面与微动效视觉研究",
            language: "en",
            searchType: "moodboard",
          },
        ],
        searchUrl: buildPlatformSearchUrl("arena", "brutalist developer aesthetics"),
      },
    ];
  } else if (isTypography) {
    // 2. Typography & Grid scenario
    primary = [
      {
        id: "src_behance",
        platform: PLATFORM_REGISTRY.behance.name,
        roleTag: PLATFORM_REGISTRY.behance.roleTag,
        reason: "成套查阅设计师从正面网格骨架到 1:1 打印打样的完整排版推演",
        keywords: [
          {
            keyword: "brand identity typography system packaging",
            meaning: "品牌文字系统与中西文字体搭配规范",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "typography packaging -mockup -template",
          },
          {
            keyword: "中西文字阶对比 包装设计 推演",
            meaning: "双栏版式中西文灰度均衡推演草图",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("behance", "brand identity typography system packaging"),
      },
      {
        id: "src_fontsinuse",
        platform: PLATFORM_REGISTRY.fontsinuse.name,
        roleTag: PLATFORM_REGISTRY.fontsinuse.roleTag,
        reason: "全球真实商业落地中的中西字体搭配、字阶层级与双栏网格规范档案",
        keywords: [
          {
            keyword: "swiss typography grid packaging bilingual label",
            meaning: "瑞士国际主义双栏网格在包装标签上的严谨应用",
            language: "en",
            searchType: "benchmark",
          },
          {
            keyword: "grotesk type hierarchy food beverage label",
            meaning: "现代无衬线字体的 2.5 倍字阶对比与微字号排布",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "双栏网格 档案式风味标尺 包装正表面",
            meaning: "中文语境下的多层级信息排版与呼吸感留白",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("fontsinuse", "swiss typography grid packaging bilingual label"),
      },
      {
        id: "src_dieline",
        platform: PLATFORM_REGISTRY.dieline.name,
        roleTag: PLATFORM_REGISTRY.dieline.roleTag,
        reason: "全球顶级包装案例中核心品名与风味标尺的实际货架阅读效率参考",
        keywords: [
          {
            keyword: "minimalist grid typography packaging canister",
            meaning: "极简网格排版纸罐/铁罐成套案例",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "grid typography packaging -mockup",
          },
          {
            keyword: "editorial style tea packaging label",
            meaning: "杂志排印风格的茶叶产地与年份标签设计",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "极简网格 食品包装 风味标签 实拍",
            meaning: "货架 1.5 米视距下高穿透力的排版实拍案",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("dieline", "minimalist grid typography packaging canister"),
      },
    ];
    alternative = [
      {
        id: "src_typewolf",
        platform: PLATFORM_REGISTRY.typewolf.name,
        roleTag: PLATFORM_REGISTRY.typewolf.roleTag,
        reason: "探索当代前沿小众无衬线西文与古典字型的优雅碰撞趋势",
        keywords: [
          {
            keyword: "neue sans serif font pairings",
            meaning: "现代冷冽无衬线字型搭配指南",
            language: "en",
            searchType: "moodboard",
          },
          {
            keyword: "editorial typography font pairings lookbook",
            meaning: "杂志排印风格西文字体混搭视觉参考",
            language: "en",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("typewolf", "neue sans serif font pairings"),
      },
      {
        id: "src_bpando",
        platform: PLATFORM_REGISTRY.bpando.name,
        roleTag: PLATFORM_REGISTRY.bpando.roleTag,
        reason: "深入了解小尺寸标签上的微型字距、微压痕与高级留白配比",
        keywords: [
          {
            keyword: "minimalist packaging label typography layout",
            meaning: "极简纯粹的标签信息排布与留白案例",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "clean grid layout branding stationery",
            meaning: "严格栅格系统下的微型标签排版与压凹细节",
            language: "en",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("bpando", "minimalist packaging label typography layout"),
      },
      {
        id: "src_xiaohongshu",
        platform: PLATFORM_REGISTRY.xiaohongshu.name,
        roleTag: PLATFORM_REGISTRY.xiaohongshu.roleTag,
        reason: "了解国内消费者对档案式说明书风格包装的实际阅读与接受度",
        keywords: [
          {
            keyword: "包装版式 留白设计 实拍 -广告",
            meaning: "本土消费者对极简排版包装的真实晒单",
            language: "zh",
            searchType: "consumer",
            advancedQuery: "包装版式 留白 实拍 -广告",
          },
          {
            keyword: "极简茶叶标签 排版排式 真实开箱",
            meaning: "大众用户对信息层级与风味标签的可读性反馈",
            language: "zh",
            searchType: "consumer",
          },
        ],
        searchUrl: buildPlatformSearchUrl("xiaohongshu", "包装版式 留白设计 实拍"),
      },
      {
        id: "src_zcool",
        platform: PLATFORM_REGISTRY.zcool.name,
        roleTag: PLATFORM_REGISTRY.zcool.roleTag,
        reason: "查阅国内顶尖设计团队在中英双语包装标签上的落地打样工艺",
        keywords: [
          {
            keyword: "双栏网格 包装设计 实物打样",
            meaning: "本土印刷厂实际生产打样工艺案",
            language: "zh",
            searchType: "detail",
            advancedQuery: "网格 包装 实物打样 -素材",
          },
          {
            keyword: "中文标签 排版规范 印厂落地",
            meaning: "国内本土商业包装合规标签与字阶排印落地",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("zcool", "双栏网格 包装设计 实物打样"),
      },
    ];
  } else if (isSymbolOrIdentity) {
    // 3. Symbol / Visual Hammer / Desktop Still Life scenario
    primary = [
      {
        id: "src_xiaohongshu",
        platform: PLATFORM_REGISTRY.xiaohongshu.name,
        roleTag: PLATFORM_REGISTRY.xiaohongshu.roleTag,
        reason: "洞察年轻白领在真实工位桌面的摆件美学、自发拍照分享与情绪买点",
        keywords: [
          {
            keyword: "工位桌面美学 治愈系摆件 拍照 实拍",
            meaning: "打工人对办公桌面私密治愈好物的真实评价",
            language: "zh",
            searchType: "consumer",
            advancedQuery: "工位 桌面摆件 实拍 -广告",
          },
          {
            keyword: "桌面搭子 治愈好物 办公好物 晒单",
            meaning: "年轻办公族对桌面陪伴感与静物美学的情绪买点",
            language: "zh",
            searchType: "consumer",
          },
        ],
        searchUrl: buildPlatformSearchUrl("xiaohongshu", "工位桌面美学 治愈系摆件 拍照"),
      },
      {
        id: "src_dieline",
        platform: PLATFORM_REGISTRY.dieline.name,
        roleTag: PLATFORM_REGISTRY.dieline.roleTag,
        reason: "验证极简符号在桌面静物与圆柱形罐体 360 度旋转陈列中的视觉平衡",
        keywords: [
          {
            keyword: "minimalist geometric container packaging still life",
            meaning: "现代极简几何容器桌面静物美学包装案",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "geometric packaging container -mockup",
          },
          {
            keyword: "subtle pastel color palette packaging",
            meaning: "低饱和莫兰迪色调与桌面环境自然相融的色盘",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "桌面静物 极简几何包装 实物",
            meaning: "办公桌面解压与现代陪伴感包装实拍",
            language: "zh",
            searchType: "consumer",
          },
        ],
        searchUrl: buildPlatformSearchUrl("dieline", "minimalist geometric container packaging still life"),
      },
      {
        id: "src_brandnew",
        platform: PLATFORM_REGISTRY.brandnew.name,
        roleTag: PLATFORM_REGISTRY.brandnew.roleTag,
        reason: "深度复盘顶级品牌单一极简符号的提炼过程、负空间与极端缩微辨识度",
        keywords: [
          {
            keyword: "minimal geometric symbol visual hammer",
            meaning: "极简几何符号作为穿透力视觉锤的经典案",
            language: "en",
            searchType: "benchmark",
          },
          {
            keyword: "rebrand negative space icon identity",
            meaning: "负空间构图与单一轮廓标志提炼规范",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "极简品牌视觉锤 几何图形提炼 案例",
            meaning: "单一视觉符号跨介质延展规范",
            language: "zh",
            searchType: "benchmark",
          },
        ],
        searchUrl: buildPlatformSearchUrl("brandnew", "minimal geometric symbol visual hammer"),
      },
    ];
    alternative = [
      {
        id: "src_arena",
        platform: PLATFORM_REGISTRY.arena.name,
        roleTag: PLATFORM_REGISTRY.arena.roleTag,
        reason: "总监级纯净视觉调研，去商业套版，探索兼具哲学静谧感与治愈的几何形态",
        keywords: [
          {
            keyword: "minimalist graphic forms visual research",
            meaning: "极简现代几何形态与微解压隐喻调研情绪板",
            language: "en",
            searchType: "moodboard",
          },
          {
            keyword: "zen still life workspace objects",
            meaning: "现代办公桌面治愈静物与自然光影",
            language: "en",
            searchType: "moodboard",
          },
        ],
        searchUrl: buildPlatformSearchUrl("arena", "minimalist graphic forms visual research"),
      },
      {
        id: "src_behance",
        platform: PLATFORM_REGISTRY.behance.name,
        roleTag: PLATFORM_REGISTRY.behance.roleTag,
        reason: "查阅单一几何符号从草图到全套包装与周边的延展推演",
        keywords: [
          {
            keyword: "minimalist visual identity still life packaging",
            meaning: "成套极简视觉识别系统与包装落地案例",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "visual identity packaging -mockup -template",
          },
          {
            keyword: "极简几何符号 品牌视觉体系 全案",
            meaning: "单一几何符号在全套周边与陈列物上的延展规范",
            language: "zh",
            searchType: "benchmark",
          },
        ],
        searchUrl: buildPlatformSearchUrl("behance", "minimalist visual identity still life packaging"),
      },
      {
        id: "src_zcool",
        platform: PLATFORM_REGISTRY.zcool.name,
        roleTag: PLATFORM_REGISTRY.zcool.roleTag,
        reason: "查看国内年轻新消费品牌在桌面陪伴感与几何符号上的优秀落地案例",
        keywords: [
          {
            keyword: "桌面好物 几何包装 实物打样",
            meaning: "国内商业落地案例",
            language: "zh",
            searchType: "detail",
          },
          {
            keyword: "工位静物 包装周边 打样实拍",
            meaning: "本土设计师关于工位疗愈周边物料的打样作品",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("zcool", "桌面好物 几何包装 实物打样"),
      },
    ];
  } else if (isSkincareOrScience) {
    // 4. Skincare & Science Evidence scenario
    primary = [
      {
        id: "src_bpando",
        platform: PLATFORM_REGISTRY.bpando.name,
        roleTag: PLATFORM_REGISTRY.bpando.roleTag,
        reason: "深度研读高冷实验室证据感、微型数据刻度排版与药剂学美感包装的微细节",
        keywords: [
          {
            keyword: "clinical skincare branding minimal label typographic scale",
            meaning: "严谨实验室护肤品牌微刻度与纯净排版",
            language: "en",
            searchType: "benchmark",
          },
          {
            keyword: "uncoated frosted glass amber dropper packaging finish",
            meaning: "哑光透光玻璃瓶身触感与微工艺细节",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "极简实验室护肤品 刻度排版 实物打样",
            meaning: "配方逻辑图表化在瓶贴上的实际落地案",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("bpando", "clinical skincare branding minimal label"),
      },
      {
        id: "src_dieline",
        platform: PLATFORM_REGISTRY.dieline.name,
        roleTag: PLATFORM_REGISTRY.dieline.roleTag,
        reason: "全球顶尖美容护肤包装前沿案，参考瓶身透光度、微型数据标尺与陈列效果",
        keywords: [
          {
            keyword: "evidence based skincare packaging frosted bottle",
            meaning: "科学证据感高端护肤瓶包装",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "skincare bottle packaging -mockup",
          },
          {
            keyword: "botanical macro texture skincare packaging",
            meaning: "微观植物肌理与温和哑光触感护肤包装",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "冷白玻瓶 极简刻度 护肤品包装 实拍",
            meaning: "成分党高信任感护肤包装实物案",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("dieline", "evidence based skincare packaging frosted bottle"),
      },
      {
        id: "src_xiaohongshu",
        platform: PLATFORM_REGISTRY.xiaohongshu.name,
        roleTag: PLATFORM_REGISTRY.xiaohongshu.roleTag,
        reason: "洞察国内成分党与敏感肌人群对包装专业信任感、卫生与手感的真实心智",
        keywords: [
          {
            keyword: "成分党 极简护肤品 包装实拍 质感 -广告",
            meaning: "成分党对实验室证据感包装的第一眼信任度",
            language: "zh",
            searchType: "consumer",
            advancedQuery: "成分党 护肤 包装 实拍 -广告 -推广",
          },
          {
            keyword: "敏感肌 护肤品 瓶身手感 真实评价",
            meaning: "用户对温和安心触感的直接反馈",
            language: "zh",
            searchType: "consumer",
          },
        ],
        searchUrl: buildPlatformSearchUrl("xiaohongshu", "成分党 极简护肤品 包装实拍 质感"),
      },
    ];
    alternative = [
      {
        id: "src_fontsinuse",
        platform: PLATFORM_REGISTRY.fontsinuse.name,
        roleTag: PLATFORM_REGISTRY.fontsinuse.roleTag,
        reason: "查阅专业药典与理化分析图表在产品标签上的严谨字体排印",
        keywords: [
          {
            keyword: "pharmaceutical label typography hierarchy",
            meaning: "药典级标签文字层级与微小数字刻度排版",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "clinical formula typography grid layout",
            meaning: "理化配方说明严格双栏网格版式",
            language: "en",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("fontsinuse", "pharmaceutical label typography hierarchy"),
      },
      {
        id: "src_arena",
        platform: PLATFORM_REGISTRY.arena.name,
        roleTag: PLATFORM_REGISTRY.arena.roleTag,
        reason: "总监级纯净美学与晨暮柔和光影微晕的情绪板调研",
        keywords: [
          {
            keyword: "clean beauty packaging tactile macro photography",
            meaning: "纯净护肤微观材质与通感微气孔留白",
            language: "en",
            searchType: "moodboard",
          },
          {
            keyword: "frosted glass cosmetic bottle lighting research",
            meaning: "微透磨砂冷白玻璃在自然漫反射光影下的质感研究",
            language: "en",
            searchType: "moodboard",
          },
        ],
        searchUrl: buildPlatformSearchUrl("arena", "clean beauty packaging tactile"),
      },
      {
        id: "src_zcool",
        platform: PLATFORM_REGISTRY.zcool.name,
        roleTag: PLATFORM_REGISTRY.zcool.roleTag,
        reason: "查看国内本土美妆个护团队在特种玻璃瓶印刷与防蹭脏打样上的实务",
        keywords: [
          {
            keyword: "高端护肤品 瓶身印刷 工艺打样",
            meaning: "国内工厂实际打样案",
            language: "zh",
            searchType: "detail",
          },
          {
            keyword: "冷白玻丝印 护肤品包装 实物打样",
            meaning: "特种玻璃瓶高温丝印与移印防脱落打样案",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("zcool", "高端护肤品 瓶身印刷 工艺打样"),
      },
    ];
  } else {
    // 5. Default / Material Craft & Tea Packaging scenario
    primary = [
      {
        id: "src_bpando",
        platform: PLATFORM_REGISTRY.bpando.name,
        roleTag: PLATFORM_REGISTRY.bpando.roleTag,
        reason: "针对本步骤特种原浆纸肌理与侧光深压凹，BP&O 是全球对无墨工艺与高克重纸张细节记录最深的权威档案",
        keywords: [
          {
            keyword: "uncoated cotton paper packaging blind deboss 350g",
            meaning: "350g 原浆棉纸无墨深压凹打样与侧光阴影细节",
            language: "en",
            searchType: "detail",
            advancedQuery: "uncoated cotton paper blind deboss -mockup -template",
          },
          {
            keyword: "tactile uncoated paper tea canister packaging",
            meaning: "纯粹特种纸触感茶罐包装与克制留白案例",
            language: "en",
            searchType: "benchmark",
          },
          {
            keyword: "纯白特种纸 侧光无墨压凹 包装实拍",
            meaning: "国内特种纸打样实拍案例与防蹭脏处理",
            language: "zh",
            searchType: "detail",
            advancedQuery: "纯白特种纸 压凹 实拍 -广告 -推广",
          },
        ],
        searchUrl: buildPlatformSearchUrl("bpando", "uncoated cotton paper packaging blind deboss 350g"),
      },
      {
        id: "src_dieline",
        platform: PLATFORM_REGISTRY.dieline.name,
        roleTag: PLATFORM_REGISTRY.dieline.roleTag,
        reason: "全球顶级商业包装设计标杆，提供成套罐装包装结构、开启封贴与货架实拍参考",
        keywords: [
          {
            keyword: "minimalist tactile paper canister packaging",
            meaning: "极简触感纸罐实物落地案与盒身比例",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "tactile paper canister packaging -mockup",
          },
          {
            keyword: "blind deboss tea packaging case study",
            meaning: "单一单色无油墨压凹茶包装完整成套案",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "高端茶包装 极简纸罐 实体结构 实拍",
            meaning: "国内高端冷泡茶极简纸筒与盒盖封贴实案",
            language: "zh",
            searchType: "benchmark",
          },
        ],
        searchUrl: buildPlatformSearchUrl("dieline", "minimalist tactile paper canister packaging"),
      },
      {
        id: "src_xiaohongshu",
        platform: PLATFORM_REGISTRY.xiaohongshu.name,
        roleTag: PLATFORM_REGISTRY.xiaohongshu.roleTag,
        reason: "洞察国内都市年轻消费者对极简素纸茶罐的第一眼触感印象、开箱晒单与防蹭脏反馈",
        keywords: [
          {
            keyword: "纯白特种纸茶罐 实拍 避坑 -广告",
            meaning: "白领真实开箱对浅色纸罐仓储耐脏与挺度的客观评价",
            language: "zh",
            searchType: "consumer",
            advancedQuery: "特种纸茶包装 实拍 -广告 -推广",
          },
          {
            keyword: "极简茶包装 纯纸感 晒单 高级感",
            meaning: "年轻消费者对大面积留白与凹凸触感的情感买点",
            language: "zh",
            searchType: "consumer",
          },
        ],
        searchUrl: buildPlatformSearchUrl("xiaohongshu", "纯白特种纸茶罐 实拍 避坑"),
      },
    ];
    alternative = [
      {
        id: "src_fontsinuse",
        platform: PLATFORM_REGISTRY.fontsinuse.name,
        roleTag: PLATFORM_REGISTRY.fontsinuse.roleTag,
        reason: "查阅真实商业物料中压凹工艺与中西文字体字阶层级的结合范例",
        keywords: [
          {
            keyword: "blind deboss typography packaging",
            meaning: "无墨压凹在字体边缘的清晰度与字号容错率",
            language: "en",
            searchType: "detail",
          },
          {
            keyword: "letterpress stationery blind impression",
            meaning: "活版凸印无墨深压痕与高克重棉纸结合典范",
            language: "en",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("fontsinuse", "blind deboss typography packaging"),
      },
      {
        id: "src_zcool",
        platform: PLATFORM_REGISTRY.zcool.name,
        roleTag: PLATFORM_REGISTRY.zcool.roleTag,
        reason: "查阅国内顶尖设计团队在特种纸无墨深压凹与 1:1 白模打样上的真实工艺案",
        keywords: [
          {
            keyword: "特种纸 深度压凹 茶包装 实物打样",
            meaning: "本土印厂实际工艺参数与机台压力设置经验",
            language: "zh",
            searchType: "detail",
            advancedQuery: "特种纸 压凹 打样 实物 -素材",
          },
          {
            keyword: "棉纸触感 罐装冷泡茶 实体打样",
            meaning: "本土茶饮品牌高阶原浆棉纸包装落地案",
            language: "zh",
            searchType: "detail",
          },
        ],
        searchUrl: buildPlatformSearchUrl("zcool", "特种纸 深度压凹 茶包装 实物打样"),
      },
      {
        id: "src_packagingoftheworld",
        platform: PLATFORM_REGISTRY.packagingoftheworld.name,
        roleTag: PLATFORM_REGISTRY.packagingoftheworld.roleTag,
        reason: "跨品类横向检索全球类似高克重纯白触感纸在各消费品类中的实物成品",
        keywords: [
          {
            keyword: "white paper blind embossed canister packaging",
            meaning: "纯白棉纸压凹圆筒包装成品库",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "white paper embossed packaging -mockup",
          },
          {
            keyword: "minimalist debossed tube packaging tea",
            meaning: "极简圆柱纸筒深压痕商业落地案例",
            language: "en",
            searchType: "benchmark",
          },
        ],
        searchUrl: buildPlatformSearchUrl("packagingoftheworld", "white paper blind embossed canister packaging"),
      },
      {
        id: "src_behance",
        platform: PLATFORM_REGISTRY.behance.name,
        roleTag: PLATFORM_REGISTRY.behance.roleTag,
        reason: "深入查阅国际团队完整的极简触觉茶包装从草案到货架陈列的全套推演过程",
        keywords: [
          {
            keyword: "minimal tea branding paper texture deboss",
            meaning: "极简茶品牌材质与工艺全案推演",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "tea packaging deboss -mockup -template",
          },
          {
            keyword: "东方极简茶包装 材质工艺推演 全案",
            meaning: "从触觉概念到成品白模打样的完整视觉识别系统",
            language: "zh",
            searchType: "benchmark",
          },
        ],
        searchUrl: buildPlatformSearchUrl("behance", "minimal tea branding paper texture deboss"),
      },
    ];
  }

  function enrichWithJevCalibration(
    sources: PlatformSource[],
    stepTitle: string,
    themeName: string = "",
  ): PlatformSource[] {
    return sources.map((src) => {
      const reg = Object.values(PLATFORM_REGISTRY).find(
        (p) =>
          p.name.toLowerCase() === src.platform.toLowerCase() ||
          p.id === src.id.replace(/^src_/, "").toLowerCase(),
      );
      const regId = reg ? reg.id : src.id.replace(/^src_/, "").toLowerCase();

      const calibratedKeywords = src.keywords.map((kw) => {
        const cal = calibratePlatformQuery(regId, kw.keyword, {
          stepTitle,
          themeName,
          meaning: kw.meaning,
        });
        const dim = kw.dimension ?? inferKeywordDimension(kw.keyword, kw.meaning);
        return {
          ...kw,
          dimension: dim,
          calibratedQuery: cal.calibratedQuery,
          hitRateConfidence: cal.hitConfidence,
          jevJudgement: cal.jevJudgement,
          advancedQuery: cal.advancedQuery ?? kw.advancedQuery,
        };
      });

      const target =
        calibratedKeywords[0]?.calibratedQuery ||
        calibratedKeywords[0]?.keyword ||
        src.keywords[0]?.keyword;

      const clues = getPlatformInspirationClues(regId, {
        stepTitle,
        stepQuestion: currentStep.question,
        themeName,
      });

      return {
        ...src,
        keywords: calibratedKeywords,
        searchUrl: buildPlatformSearchUrl(regId, target),
        inspirationClues: clues,
        lensRole: clues.lensRole,
      };
    });
  }

  const enrichedPrimary = enrichWithJevCalibration(
    primary,
    currentStep.title,
    route.themeName,
  );
  const enrichedAlternative = enrichWithJevCalibration(
    alternative,
    currentStep.title,
    route.themeName,
  );

  return {
    id: `plan_${route.id}_${currentStep.id}`,
    routeId: route.id,
    stepId: currentStep.id,
    primarySources: enrichedPrimary,
    alternativeSources: enrichedAlternative,
    systemOne: {
      engine: "jev-native",
      latencyMs: 16,
      confidence: 0.96,
      matchPercentages: {
        ...(enrichedPrimary[0]?.id ? { [enrichedPrimary[0].id]: 98 } : {}),
        ...(enrichedPrimary[1]?.id ? { [enrichedPrimary[1].id]: 94 } : {}),
        ...(enrichedPrimary[2]?.id ? { [enrichedPrimary[2].id]: 90 } : {}),
        ...(enrichedAlternative[0]?.id ? { [enrichedAlternative[0].id]: 85 } : {}),
        ...(enrichedAlternative[1]?.id ? { [enrichedAlternative[1].id]: 82 } : {}),
      },
    },
  };
}
