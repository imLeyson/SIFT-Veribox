import type { PlatformPlan, PlatformSource } from "@/types/routes";
import type { Route, RouteStep } from "@/types/routes";
import type { DesignState } from "@/types/convergence";
import { buildPlatformSearchUrl, PLATFORM_REGISTRY } from "./platform-registry";

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
    route.title
  ).toLowerCase();

  const isDigital =
    stepText.includes("界面") ||
    stepText.includes("组件") ||
    stepText.includes("saas") ||
    stepText.includes("后台系统") ||
    stepText.includes("交互") ||
    stepText.includes("微交互") ||
    stepText.includes("动效");

  const isTypography =
    stepText.includes("排版") ||
    stepText.includes("字体") ||
    stepText.includes("网格") ||
    stepText.includes("层级") ||
    stepText.includes("版式");

  const isSceneOrEmotion =
    stepText.includes("工位") ||
    stepText.includes("场景") ||
    stepText.includes("情绪") ||
    stepText.includes("故事") ||
    stepText.includes("陪伴") ||
    stepText.includes("心理");

  let primary: PlatformSource[];
  let alternative: PlatformSource[];

  if (isDigital) {
    primary = [
      {
        id: "src_dribbble",
        platform: PLATFORM_REGISTRY.dribbble.name,
        roleTag: PLATFORM_REGISTRY.dribbble.roleTag,
        reason: "高保真界面组件、暗黑发光微交互与高密度数据看板设计细节",
        keywords: [
          {
            keyword: "b2b saas dashboard dark mode",
            meaning: "专业深色系 B 端高密度数据看板界面",
            language: "en",
          },
          {
            keyword: "data visualization micro interaction",
            meaning: "数据流高精度微动效与状态反馈",
            language: "en",
          },
          {
            keyword: "效率工具 界面设计规范",
            meaning: "检索国内优秀团队的组件设计系统与规范",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("dribbble", "b2b saas dashboard dark mode"),
      },
      {
        id: "src_behance",
        platform: PLATFORM_REGISTRY.behance.name,
        roleTag: PLATFORM_REGISTRY.behance.roleTag,
        reason: "深入查看成套大型系统设计推演全貌与复杂工作流规范",
        keywords: [
          {
            keyword: "design system saas enterprise",
            meaning: "企业级 SaaS 设计系统完整项目推演案",
            language: "en",
          },
          {
            keyword: "workflow data platform case study",
            meaning: "数据工作流平台端到端落地实测全流程",
            language: "en",
          },
          {
            keyword: "B端后台设计系统 落地案例",
            meaning: "中文语境下的多团队协同设计系统案例",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("behance", "design system saas enterprise"),
      },
      {
        id: "src_google",
        platform: PLATFORM_REGISTRY.google.name,
        roleTag: PLATFORM_REGISTRY.google.roleTag,
        reason: "检索顶级科技工具的设计哲学、官方指引与技术白皮书",
        keywords: [
          {
            keyword: "linear app design engineering philosophy",
            meaning: "深入分析 Linear 等先锋效率工具的工程美学设计理念",
            language: "en",
          },
          {
            keyword: "enterprise design system guidelines",
            meaning: "权威企业级设计系统公开设计指南与原则",
            language: "en",
          },
          {
            keyword: "产研协同工具 用户体验测评",
            meaning: "查看专业开发者与产品经理对于工具易用性的深度测评",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("google", "linear app design engineering philosophy"),
      },
    ];
    alternative = [
      {
        id: "src_pinterest",
        platform: PLATFORM_REGISTRY.pinterest.name,
        roleTag: PLATFORM_REGISTRY.pinterest.roleTag,
        reason: "发散收集极客几何图形、代码美学与暗色渐变情绪板",
        keywords: [
          {
            keyword: "cyberpunk developer aesthetics minimal",
            meaning: "极简极客工程美学视觉发散",
            language: "en",
          },
          {
            keyword: "futuristic ui graphic elements",
            meaning: "未来感数据图形与科技感线框元素",
            language: "en",
          },
        ],
        searchUrl: buildPlatformSearchUrl("pinterest", "cyberpunk developer aesthetics minimal"),
      },
      {
        id: "src_xiaohongshu",
        platform: PLATFORM_REGISTRY.xiaohongshu.name,
        roleTag: PLATFORM_REGISTRY.xiaohongshu.roleTag,
        reason: "了解国内数字化产研从业者对于工作台界面易用性与痛点的讨论",
        keywords: [
          {
            keyword: "宝藏生产力工具 界面审美",
            meaning: "中文从业者自发安利的高颜值实用生产力工具切片",
            language: "zh",
          },
          {
            keyword: "程序员桌面软件 效率神器",
            meaning: "一线工程师对工具界面美感与纯粹性的口碑评价",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("xiaohongshu", "宝藏生产力工具 界面审美"),
      },
    ];
  } else if (isTypography) {
    primary = [
      {
        id: "src_behance",
        platform: PLATFORM_REGISTRY.behance.name,
        roleTag: PLATFORM_REGISTRY.behance.roleTag,
        reason: "深入查看高水准国际平面案例的网格系统与多语种字体排版规范",
        keywords: [
          {
            keyword: "swiss typography grid system packaging",
            meaning: "瑞士国际主义网格系统在包装上的严谨应用",
            language: "en",
          },
          {
            keyword: "minimalist editorial typography branding",
            meaning: "极简编辑式版面编排与品牌视觉系统",
            language: "en",
          },
          {
            keyword: "中西文混排 包装设计 规范",
            meaning: "中文与西文在有限版面中的字重搭配与视觉对齐参考",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("behance", "swiss typography grid system packaging"),
      },
      {
        id: "src_pinterest",
        platform: PLATFORM_REGISTRY.pinterest.name,
        roleTag: PLATFORM_REGISTRY.pinterest.roleTag,
        reason: "视觉发散收集极端克制排版、数字编码与标签版式灵感",
        keywords: [
          {
            keyword: "brutalist label typography layout",
            meaning: "粗野主义与工业标签式的极端醒目字块排版",
            language: "en",
          },
          {
            keyword: "minimal tea can typography layout",
            meaning: "极简罐装茶包装正面的纯文字层级构图",
            language: "en",
          },
          {
            keyword: "冷泡茶 文字版式 留白",
            meaning: "大面积留白与高对比字体的东方克制韵味",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("pinterest", "brutalist label typography layout"),
      },
      {
        id: "src_xiaohongshu",
        platform: PLATFORM_REGISTRY.xiaohongshu.name,
        roleTag: PLATFORM_REGISTRY.xiaohongshu.roleTag,
        reason: "检验年轻消费者在几秒浏览时对文字信息主次的直观偏好",
        keywords: [
          {
            keyword: "极简高级包装 拍照测评",
            meaning: "国内年轻人自发打卡拍照时的包装文字第一眼吸引力",
            language: "zh",
          },
          {
            keyword: "小众冷泡茶 包装好看",
            meaning: "消费者评价某款茶包装“高级”时重点提及的信息细节",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("xiaohongshu", "极简高级包装 拍照测评"),
      },
    ];
    alternative = [
      {
        id: "src_instagram",
        platform: PLATFORM_REGISTRY.instagram.name,
        roleTag: PLATFORM_REGISTRY.instagram.roleTag,
        reason: "跟踪海外前沿独立设计工作室的即时版式实验作品",
        keywords: [
          {
            keyword: "graphicdesignpost typography",
            meaning: "国际先锋平面设计社区最新排版快照",
            language: "en",
          },
          {
            keyword: "packagedesign typography",
            meaning: "纯文字构成的前沿包装探索标签",
            language: "en",
          },
        ],
        searchUrl: buildPlatformSearchUrl("instagram", "packagedesign"),
      },
      {
        id: "src_google",
        platform: PLATFORM_REGISTRY.google.name,
        roleTag: PLATFORM_REGISTRY.google.roleTag,
        reason: "检索经典排版准则、可读性对比数据与字体版权方案",
        keywords: [
          {
            keyword: "packaging readability hierarchy distance study",
            meaning: "包装货架阅读距离与视觉识别效率学术研究",
            language: "en",
          },
          {
            keyword: "商用字体 国际化中西文搭配 推荐",
            meaning: "专业字体厂商对品牌国际化排版的官方搭配指南",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("google", "packaging readability hierarchy distance study"),
      },
    ];
  } else if (isSceneOrEmotion) {
    primary = [
      {
        id: "src_xiaohongshu",
        platform: PLATFORM_REGISTRY.xiaohongshu.name,
        roleTag: PLATFORM_REGISTRY.xiaohongshu.roleTag,
        reason: "洞察上班族在真实工位桌面的摆设生态、情绪喘息与晒单买点",
        keywords: [
          {
            keyword: "工位桌面美学 治愈系摆件",
            meaning: "打工人如何在有限工位打造私密呼吸感与陪伴感",
            language: "zh",
          },
          {
            keyword: "上班喝什么茶 桌面好物",
            meaning: "真实办公场景下用户对茶饮包装与仪式感的直观评价",
            language: "zh",
          },
          {
            keyword: "下午三点续命茶 拍照",
            meaning: "抓取下午疲惫时段最能激发购买欲的情感切片",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("xiaohongshu", "工位桌面美学 治愈系摆件"),
      },
      {
        id: "src_pinterest",
        platform: PLATFORM_REGISTRY.pinterest.name,
        roleTag: PLATFORM_REGISTRY.pinterest.roleTag,
        reason: "发散收集高质感桌面静物摄影、自然光影与情绪解压氛围图",
        keywords: [
          {
            keyword: "aesthetic workspace desk setup calming",
            meaning: "沉静治愈系办公桌面布置与静物光影情绪板",
            language: "en",
          },
          {
            keyword: "zen beverage packaging still life",
            meaning: "具禅意与冥想氛围的现代饮品静物陈列",
            language: "en",
          },
          {
            keyword: "桌面微解压 设计小物",
            meaning: "国内精巧设计品在办公场景下的陪伴感表达",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("pinterest", "aesthetic workspace desk setup calming"),
      },
      {
        id: "src_instagram",
        platform: PLATFORM_REGISTRY.instagram.name,
        roleTag: PLATFORM_REGISTRY.instagram.roleTag,
        reason: "探索全球独立创意人与远程工作者的日常桌面切片与流行趋势",
        keywords: [
          {
            keyword: "deskaesthetics dailyroutine",
            meaning: "极简主义工作者的日间桌面静物动态",
            language: "en",
          },
          {
            keyword: "tearitual mindfulwork",
            meaning: "高压工作状态下的现代茶饮微仪式切片",
            language: "en",
          },
        ],
        searchUrl: buildPlatformSearchUrl("instagram", "deskaesthetics"),
      },
    ];
    alternative = [
      {
        id: "src_behance",
        platform: PLATFORM_REGISTRY.behance.name,
        roleTag: PLATFORM_REGISTRY.behance.roleTag,
        reason: "验证情感化生活方式品牌的周边延展物与整体视觉体系",
        keywords: [
          {
            keyword: "lifestyle beverage branding desk accessory",
            meaning: "把饮料包装作为生活方式陈列物的完整品牌案例",
            language: "en",
          },
          {
            keyword: "emotional packaging design storytelling",
            meaning: "故事化与情感化包装设计的系统落地推演",
            language: "en",
          },
        ],
        searchUrl: buildPlatformSearchUrl("behance", "lifestyle beverage branding desk accessory"),
      },
      {
        id: "src_google",
        platform: PLATFORM_REGISTRY.google.name,
        roleTag: PLATFORM_REGISTRY.google.roleTag,
        reason: "检索年轻群体办公桌心理学研究与办公室消费行为白皮书",
        keywords: [
          {
            keyword: "desk setup psychology workplace wellness report",
            meaning: "工作空间心理学与桌面疗愈相关行业研究报告",
            language: "en",
          },
          {
            keyword: "年轻白领 情绪消费 饮品趋势",
            meaning: "国内权威消费数据机构关于情绪价值饮品的洞察报告",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("google", "年轻白领 情绪消费 饮品趋势"),
      },
    ];
  } else {
    // Default: Material, tactile, craftsmanship focus
    primary = [
      {
        id: "src_pinterest",
        platform: PLATFORM_REGISTRY.pinterest.name,
        roleTag: PLATFORM_REGISTRY.pinterest.roleTag,
        reason: "从特种纸触感与微观肌理切入，快速发散构建高密度质感情绪板",
        keywords: [
          {
            keyword: "embossed paper texture luxury packaging",
            meaning: "高阶特种纸凹凸压纹与手持触感参考",
            language: "en",
            searchType: "moodboard",
            advancedQuery: "embossed paper texture luxury packaging -mockup -render",
          },
          {
            keyword: "minimal tactile tea packaging unboxing",
            meaning: "极简触感包装与精致开盒过程静态切片",
            language: "en",
            searchType: "detail",
            advancedQuery: "minimal tactile tea packaging unboxing real photo",
          },
          {
            keyword: "特种纸 触感 包装 压凹",
            meaning: "国内高品质纸张肌理与微工艺实物案例",
            language: "zh",
            searchType: "detail",
            advancedQuery: "特种纸 触感 包装 压凹实拍细节",
          },
        ],
        searchUrl: buildPlatformSearchUrl("pinterest", "embossed paper texture luxury packaging"),
      },
      {
        id: "src_behance",
        platform: PLATFORM_REGISTRY.behance.name,
        roleTag: PLATFORM_REGISTRY.behance.roleTag,
        reason: "寻找落地成熟的包装全案，验证特种纸工艺与盒型打样可行性",
        keywords: [
          {
            keyword: "specialty paper packaging craft case study",
            meaning: "特种纸工艺打样与工程落地的完整项目案",
            language: "en",
            searchType: "benchmark",
            advancedQuery: "specialty paper packaging craft case study -mockup",
          },
          {
            keyword: "tea packaging opening ritual design",
            meaning: "注重开启仪式感与物理阻尼的结构设计案",
            language: "en",
            searchType: "detail",
            advancedQuery: "tea packaging opening ritual design structure",
          },
          {
            keyword: "东方茶包装 工艺细节 落地",
            meaning: "东方克制风格下精湛工艺与材质的系统展示",
            language: "zh",
            searchType: "benchmark",
            advancedQuery: "东方茶包装 工艺细节 落地 实拍",
          },
        ],
        searchUrl: buildPlatformSearchUrl("behance", "specialty paper packaging craft case study"),
      },
      {
        id: "src_xiaohongshu",
        platform: PLATFORM_REGISTRY.xiaohongshu.name,
        roleTag: PLATFORM_REGISTRY.xiaohongshu.roleTag,
        reason: "了解目标受众对手持触感、开箱体验与真实品质感的心智反馈",
        keywords: [
          {
            keyword: "高级感茶包装 摸起来有质感",
            meaning: "消费者评价包装“高级触感”时的第一心理关键词",
            language: "zh",
            searchType: "consumer",
            advancedQuery: "高级感茶包装 摸起来有质感 -广告",
          },
          {
            keyword: "开箱仪式感 罐装冷泡茶",
            meaning: "真实拆盒时用户最愿意拍摄发圈的仪式细节",
            language: "zh",
            searchType: "consumer",
            advancedQuery: "开箱仪式感 罐装冷泡茶 晒单",
          },
        ],
        searchUrl: buildPlatformSearchUrl("xiaohongshu", "高级感茶包装 摸起来有质感"),
      },
    ];
    alternative = [
      {
        id: "src_instagram",
        platform: PLATFORM_REGISTRY.instagram.name,
        roleTag: PLATFORM_REGISTRY.instagram.roleTag,
        reason: "参考海外先锋小众品牌的静物摄影光感与自然物性质感",
        keywords: [
          {
            keyword: "minimalistpackaging craftpaper",
            meaning: "全球独立设计品牌手工纸与微工艺标签切片",
            language: "en",
          },
          {
            keyword: "tactiledesign materials",
            meaning: "探索前沿材质与触觉交互的新锐设计动态",
            language: "en",
          },
        ],
        searchUrl: buildPlatformSearchUrl("instagram", "minimalistpackaging"),
      },
      {
        id: "src_google",
        platform: PLATFORM_REGISTRY.google.name,
        roleTag: PLATFORM_REGISTRY.google.roleTag,
        reason: "查询专业特种纸厂工艺标准、防水防冷凝涂层规范与打样指南",
        keywords: [
          {
            keyword: "waterproof coating specialty paper packaging condensation",
            meaning: "纸包装在冷藏防冷凝水条件下的涂层技术指标与厂商方案",
            language: "en",
          },
          {
            keyword: "特种纸 触感膜 防潮 印刷工艺",
            meaning: "国内主流印刷包装厂对触感膜与防潮纸盒的工艺说明",
            language: "zh",
          },
        ],
        searchUrl: buildPlatformSearchUrl("google", "特种纸 触感膜 防潮 印刷工艺"),
      },
    ];
  }

  return {
    id: `plan_${route.id}_${currentStep.id}`,
    routeId: route.id,
    stepId: currentStep.id,
    primarySources: primary,
    alternativeSources: alternative,
  };
}
