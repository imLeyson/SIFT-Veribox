import type { Route } from "@/types/routes";
import type { DesignState } from "@/types/convergence";

export function getMockRoutes(rawBrief: string, state: DesignState): {
  routes: Route[];
  recommendedRouteId: string | null;
} {
  const briefLower = (rawBrief + (state.brief.goal ?? "")).toLowerCase();
  const unknowns = state.uncertainties
    .filter((u) => u.status === "open")
    .map((u) => u.topic);
  const unknownNote = unknowns.length
    ? `针对未决判断“${unknowns[0]}”`
    : "当前方向已收敛";

  // 1. Packaging / Tea scenario
  if (briefLower.includes("茶") || briefLower.includes("罐装") || briefLower.includes("包装")) {
    const routes: Route[] = [
      {
        id: "route_tea_material",
        title: "纸感光泽与微触觉视觉表达",
        startingPoint: "纸张质朴意象与低反光质感",
        coreProblem: "如何在罐身正面通过质感留白传达清冽与日常仪式感？",
        purpose: "以素雅纸质视觉、微光泽细节与克制排版建立静谧品质感",
        pros: "视觉气质沉静高级，耐看持久，规避网红风审美疲劳",
        cons: "极度考验排版构图与留白比例，缺少装饰元素遮丑",
        recommendedReason: `${unknownNote}，先从纸质意象与低反光质感切入，可规避反复摇摆的繁复图形。`,
        focusDimension: "视觉质感与微光泽细节",
        steps: [
          {
            id: "step_tea_mat_1",
            title: "冷萃茶色与天然纸质情绪板搭建",
            question: "茶汤的原色透光感与何种纸张色调搭配最显清冽？",
            purpose: "确立第一眼的视觉色彩基调与纸张肌理",
            deliverables: ["茶汤透光色彩提取色卡", "大地纸感视觉情绪板 3 组"],
            acceptanceCriteria: ["茶汤色与包装主色调自然沉静", "整体基调克制无刺眼高饱和色"],
          },
          {
            id: "step_tea_mat_2",
            title: "开盒封签与内衬版式视觉序列",
            question: "从外封签到内层说明卡片的视觉视线动线如何层层递进？",
            purpose: "构建拆启过程中的视觉仪式感",
            deliverables: ["开盒封贴排版草稿 3 款", "内卡视觉构图与信息层级稿"],
            acceptanceCriteria: ["封签拆启视线焦点明确", "内卡排版兼顾阅读舒适度与美感"],
          },
          {
            id: "step_tea_mat_3",
            title: "暗纹微印与微光泽光影效果测试",
            question: "在柔和光线与自然采光下，微弱图形细节能否若隐若现？",
            purpose: "打磨低调高级感的局部微观视觉效果",
            deliverables: ["局部微光视觉效果图", "不同光影对比效果图"],
            acceptanceCriteria: ["侧光下暗纹肌理隐现", "正面直视整体干净透气不喧宾夺主"],
          },
        ],
      },
      {
        id: "route_tea_typography",
        title: "信息网格与极端排版秩序法",
        startingPoint: "文字层级与阅读视线动线",
        coreProblem: "如何在小尺寸正面空间构建极度严谨醒目的版式骨架？",
        purpose: "通过字体字重对比与留白比例呈现专业克制的视觉秩序",
        pros: "信息传达极其清晰高效，货架正面识别度高",
        cons: "若字体选型欠缺细节容易沦为生硬普通的说明书版式",
        recommendedReason: null,
        focusDimension: "文字网格与视觉层级",
        steps: [
          {
            id: "step_tea_typo_1",
            title: "茶品档案网格系统规范",
            question: "品名、产地与风味批号应如何排布成秩序感骨架？",
            purpose: "确立正面核心信息层级骨架",
            deliverables: ["正面版式网格规范图", "核心风味标签层级草图 3 套"],
            acceptanceCriteria: ["品名与产地在 0.5 秒内清晰被捕获", "次级文字不争抢视觉重心"],
          },
          {
            id: "step_tea_typo_2",
            title: "中西文字体搭配与字阶设计",
            question: "现代无衬线西文与微古典中文如何优雅平衡？",
            purpose: "打造兼具国际现代感与东方克制感的字型组合",
            deliverables: ["3 组中西文字体家族对照表", "字阶比例与字距视觉规范"],
            acceptanceCriteria: ["西文字体与中文字标重心协调", "小字号依然清晰透气可读"],
          },
          {
            id: "step_tea_typo_3",
            title: "货架远视力黑白对比测试",
            question: "视线扫过的瞬间最先被捕捉的视觉焦点是哪个字块？",
            purpose: "验证极端排版下的视觉冲击效率",
            deliverables: ["货架陈列黑白视线对照图", "高对比模糊测试图"],
            acceptanceCriteria: ["远距离能快速识别品牌字标轮廓", "留白比率保持在 40% 以上"],
          },
        ],
      },
      {
        id: "route_tea_desk",
        title: "工位桌面静物与极简视觉陪伴",
        startingPoint: "办公桌面空间视觉与微解压心理",
        coreProblem: "罐体放置在办公桌面时如何提供视觉呼吸感？",
        purpose: "将包装转化为桌面视觉静物，融入现代极简办公陈列",
        pros: "与都市白领桌面极度契合，易引发自发审美共鸣与社媒分享",
        cons: "图形元素若过多容易显得杂乱，破坏沉静感",
        recommendedReason: null,
        focusDimension: "桌面陈列美学与视觉解压",
        steps: [
          {
            id: "step_tea_desk_1",
            title: "办公桌面环境色基调搭配",
            question: "在常见办公光线与木质/白色桌面上，何种低饱和度色彩最显沉静？",
            purpose: "提取与办公桌面和谐相融的低饱和色彩系统",
            deliverables: ["办公桌面典型环境色卡对照板", "低饱和沉静配色方案 4 组"],
            acceptanceCriteria: ["在木纹与白桌面均和谐融入", "避免高饱和荧光色彩"],
          },
          {
            id: "step_tea_desk_2",
            title: "微型解压图形隐喻设计",
            question: "何种抽象线条或图案能隐喻短暂抽离与放松？",
            purpose: "植入具备情绪抚慰功能的极简视觉符号",
            deliverables: ["极简线条治愈图形手稿 5 组", "几何抽象意境构图草案"],
            acceptanceCriteria: ["图形线条极度克制干净", "留白充盈具有舒缓呼吸感"],
          },
          {
            id: "step_tea_desk_3",
            title: "360度旋转视觉平衡检验",
            question: "罐身转动到任意角度时是否都具备视觉完整性？",
            purpose: "打造全方位无死角的桌面立体美感",
            deliverables: ["罐体全圆周展开视觉平铺图", "360度旋转视觉效果图"],
            acceptanceCriteria: ["各个角度均具备独立构图美感", "条形码与说明性文字收拢于背面"],
          },
        ],
      },
    ];
    return { routes, recommendedRouteId: "route_tea_material" };
  }

  // 2. Skincare / Beauty scenario
  if (briefLower.includes("护肤") || briefLower.includes("美妆") || briefLower.includes("女性")) {
    const routes: Route[] = [
      {
        id: "route_skin_lab",
        title: "纯净配方图表与理性网格排版法",
        startingPoint: "配方逻辑图表化与科学证据感",
        coreProblem: "如何将功效成分的专业可信度转化为视觉可感知的安全感？",
        purpose: "借由图表符号、刻度语汇与配方比例呈现不浮夸的极简视觉",
        pros: "建立极高专业壁垒与成分党认可度，版面现代干练",
        cons: "若处理不好易过于像医药制品，缺乏护肤愉悦感",
        recommendedReason: `${unknownNote}，优先从成分与数据网格切入可快速建立专业信任。`,
        focusDimension: "数据图表美学与刻度排版",
        steps: [
          {
            id: "step_skin_lab_1",
            title: "核心成分符号与图表语言提取",
            question: "哪些活性成分与配方数据适合转化为极简视觉图形？",
            purpose: "提炼核心理化视觉证明资产",
            deliverables: ["极简成分符号草案 4 套", "配方比例数据版式设计稿"],
            acceptanceCriteria: ["符号线条克制，信息一目了然", "无医药说明书的生硬沉闷感"],
          },
          {
            id: "step_skin_lab_2",
            title: "冷白底色与微暖色调的平衡",
            question: "在极简白底中注入何种微暖色相能消除冰冷距离感？",
            purpose: "校准专业理性与亲和愉悦的视觉温度",
            deliverables: ["冷白底色微调色阶卡", "品牌辅色温润微暖色板"],
            acceptanceCriteria: ["呈现高级通透感", "柔和亲肤不刺目"],
          },
          {
            id: "step_skin_lab_3",
            title: "关键功效信息阅读动线测试",
            question: "第一眼扫过包装能否在 3 秒内理解其核心功效？",
            purpose: "验证科学信任感的传达效率",
            deliverables: ["正面视线焦点层级图", "功效承诺文字层级排版规范"],
            acceptanceCriteria: ["核心功效承诺居于第一视线区", "辅助文字与主视觉协调平衡"],
          },
        ],
      },
      {
        id: "route_skin_nature",
        title: "微观植物肌理与温润通感法",
        startingPoint: "天然原生肌理与温和触感通感",
        coreProblem: "如何避免俗套绿叶图案，用通感传达植物的纯净与滋养？",
        purpose: "通过微观纹理、柔和渐变与有机留白传达零负担的亲肤感受",
        pros: "视觉亲和力极强，自然打动注重温和敏感肌的用户群体",
        cons: "市面天然概念泛滥，需严防同质化平庸表达",
        recommendedReason: null,
        focusDimension: "微观纹理与有机色彩通感",
        steps: [
          {
            id: "step_skin_nat_1",
            title: "原生植物微观纹理与色彩提取",
            question: "从原料提取物中能抽象出何种纯净无添加的温润色阶？",
            purpose: "确立去人工痕迹的天然色彩体系",
            deliverables: ["天然原料微观肌理板", "低饱和原生色谱方案 3 组"],
            acceptanceCriteria: ["色彩呈现柔和哑光质感", "避免人工调色感与过度艳丽"],
          },
          {
            id: "step_skin_nat_2",
            title: "呼吸感版面与微观气孔留白",
            question: "如何借由版面虚实对比表现肌肤的通透呼吸？",
            purpose: "构建具通感维度的视觉呼吸感",
            deliverables: ["有机流动感版面排版草稿", "渐变微晕效果对照图"],
            acceptanceCriteria: ["版面留白具有流动感", "文字与视觉图形融为一体"],
          },
          {
            id: "step_skin_nat_3",
            title: "敏感肌人群视觉安心感评估",
            question: "看到包装时第一视觉直觉是纯净安心还是刺激浮夸？",
            purpose: "检验温和无负担视觉预期的达成度",
            deliverables: ["直觉视觉对比测试样稿", "视觉纯净度评测表"],
            acceptanceCriteria: ["直觉传达纯净安全感", "无多余杂乱修饰线"],
          },
        ],
      },
      {
        id: "route_skin_ritual",
        title: "早晚护肤时空光影与极简渐变韵律",
        startingPoint: "晨暮光影流转与身心松弛",
        coreProblem: "如何通过光晕色彩变化传达早晚护肤的情绪治愈？",
        purpose: "通过柔光渐变、极简几何排版引发情感共鸣",
        pros: "视觉格调唯美高级，极具情绪吸引力与自发拍照欲",
        cons: "色彩渐变若过重易流于俗套，需极其克制",
        recommendedReason: null,
        focusDimension: "光影微晕与情绪氛围",
        steps: [
          {
            id: "step_skin_rit_1",
            title: "晨间微光与暮色微暗视觉推演",
            question: "晨间唤醒的微透白与夜间修护的暮灰蓝如何自然呼应？",
            purpose: "构建随时间流淌的光影仪式节奏",
            deliverables: ["晨暮光影微渐变情绪板", "早晚双瓶视觉对照效果图"],
            acceptanceCriteria: ["两款瓶身在同一空间中陈列和谐", "光影渐变过渡极度平滑细腻"],
          },
          {
            id: "step_skin_rit_2",
            title: "瓶贴几何版式与高质感细节",
            question: "瓶贴字体与负空间比例如何营造安静静谧感？",
            purpose: "打磨视觉上的优雅停留感",
            deliverables: ["微型几何标签排版图 3 套", "瓶贴微光细节渲染图"],
            acceptanceCriteria: ["标签文字极为收敛", "正反两面视线流动自然"],
          },
          {
            id: "step_skin_rit_3",
            title: "洗漱台居家静物陈列审美检验",
            question: "放置在现代浴室洗手台上能否提升空间视觉美感？",
            purpose: "确认居家静物维度的视觉和谐度",
            deliverables: ["现代浴室空间合成效果图 3 组", "不同台面材质搭配对照板"],
            acceptanceCriteria: ["作为桌面静物美感出众", "与大理石/木质台面自然相映"],
          },
        ],
      },
    ];
    return { routes, recommendedRouteId: "route_skin_lab" };
  }

  // 3. SaaS / Digital / Branding scenario
  if (briefLower.includes("saas") || briefLower.includes("软件") || briefLower.includes("官网") || briefLower.includes("系统")) {
    const routes: Route[] = [
      {
        id: "route_saas_clarity",
        title: "信息架构极度纯粹与数据层级法",
        startingPoint: "高密度信息的秩序化重组",
        coreProblem: "如何让复杂的功能操作转化为直观透明的视觉指引？",
        purpose: "以严谨的排版栅格为骨架，通过清晰层级大幅降低视觉认知负荷",
        pros: "界面极其清晰耐看，功能实力感强，视觉体系易于规范化扩展",
        cons: "若缺乏精致细节容易显得冰冷刻板，缺乏品牌性格",
        recommendedReason: `${unknownNote}，优先从核心信息层级的极度清晰切入，直击决策者的效率诉求。`,
        focusDimension: "栅格系统与视觉信息层级",
        steps: [
          {
            id: "step_saas_clar_1",
            title: "视觉注意力热区与排版栅格映射",
            question: "首屏视觉中最重要的三项信息层级应如何排布？",
            purpose: "确立无歧义的视觉优先级",
            deliverables: ["首屏视觉栅格系统规范", "核心模块排版层级草图 3 套"],
            acceptanceCriteria: ["核心视线焦点在 1 秒内被锁定", "次级信息保持秩序不干扰"],
          },
          {
            id: "step_saas_clar_2",
            title: "状态色彩与功能图标视觉系统",
            question: "不同业务状态如何通过克制的色彩语汇秒级分辨？",
            purpose: "制定精准的功能性色彩与轻量图标语言",
            deliverables: ["状态色系明度与对比度规范", "16px 极简线性图标集 12 枚"],
            acceptanceCriteria: ["色彩对比符合无障碍无干扰标准", "图标风格极度统一干净"],
          },
          {
            id: "step_saas_clar_3",
            title: "视觉呼吸感与大留白平衡检验",
            question: "在高密度数据卡片之间如何保持舒适的留白节奏？",
            purpose: "验证认知负荷降低效果",
            deliverables: ["高密度模块排版对照板", "留白比例优化对照方案"],
            acceptanceCriteria: ["长时间浏览无视觉疲劳感", "界面模块分界清晰透气"],
          },
        ],
      },
      {
        id: "route_saas_modular",
        title: "轻量卡片容器与渐进式层级法",
        startingPoint: "组件卡片化与视线轻量化",
        coreProblem: "如何让功能强大的系统界面看起来像积木一样轻巧？",
        purpose: "借由圆角卡片、微弱投影与自适应间距降低视觉心理门槛",
        pros: "第一眼极其友好亲近，现代设计感强",
        cons: "在极端高密度数据报表场景下排版容易分散",
        recommendedReason: null,
        focusDimension: "卡片微投影与空间层次",
        steps: [
          {
            id: "step_saas_mod_1",
            title: "卡片圆角与微弱阴影层次规范",
            question: "卡片在背景上的悬浮层次如何通过弥散阴影优雅呈现？",
            purpose: "打造轻盈舒适的视觉空间纵深感",
            deliverables: ["3 组卡片阴影参数与间距规范", "模块容器排版效果图"],
            acceptanceCriteria: ["阴影轻盈通透无厚重脏感", "卡片间距均匀舒适"],
          },
          {
            id: "step_saas_mod_2",
            title: "字体字阶与轻盈标签排版",
            question: "标签与辅助文字如何做到既清晰可见又不显杂乱？",
            purpose: "打磨精致轻巧的排版微细节",
            deliverables: ["字阶比例规范表", "胶囊标签视觉样式 6 款"],
            acceptanceCriteria: ["标签小巧紧凑，信息主次分明", "文字灰度梯度自然"],
          },
          {
            id: "step_saas_mod_3",
            title: "暗夜模式下的卡片边缘发光调试",
            question: "深色背景下卡片边缘如何用微弱发光替代生硬边框？",
            purpose: "打磨高品质暗黑模式视觉体验",
            deliverables: ["深色主题卡片边缘光照渲染图", "暗黑配色对比表"],
            acceptanceCriteria: ["暗黑模式下边缘微光层次丰富", "文字清晰舒适不刺目"],
          },
        ],
      },
      {
        id: "route_saas_identity",
        title: "先锋工程美学与等宽排版法",
        startingPoint: "代码美学字符与现代极客精神",
        coreProblem: "如何通过现代字体、字符美学与暗黑高对比传递前沿品质？",
        purpose: "打造兼具工业精准感与先锋设计感的视觉符号系统",
        pros: "在设计师与技术人群中具有极强号召力，辨识度高",
        cons: "对偏大众用户可能有一定理解门槛，需辅助视觉平衡",
        recommendedReason: null,
        focusDimension: "等宽字体与极客符号美学",
        steps: [
          {
            id: "step_saas_id_1",
            title: "等宽排版与极客字符美学实验",
            question: "代码等宽字型与现代无衬线中西文如何优雅融合？",
            purpose: "确立先锋工程美学的排版骨架",
            deliverables: ["等宽字体排版实验稿 3 套", "品牌主标与辅助字符组合图"],
            acceptanceCriteria: ["字符排版严谨工整具有节奏感", "主标题醒目现代"],
          },
          {
            id: "step_saas_id_2",
            title: "高质感深色主题与荧光主色打磨",
            question: "深灰背景下低饱和荧光绿/青色如何既吸睛又沉稳？",
            purpose: "打磨先锋暗黑视觉调性与品牌主色",
            deliverables: ["品牌先锋暗色系色板", "主行动点高光色彩规范"],
            acceptanceCriteria: ["主色调具有极强穿透力与辨识度", "深色背景有空气感不沉闷"],
          },
          {
            id: "step_saas_id_3",
            title: "视觉延展全案统一性评估",
            question: "从官网首页到控制台主界面视觉语言是否高度贯通？",
            purpose: "检验视觉系统的完整度与张力",
            deliverables: ["官网首页与产品界面对照大图", "品牌视觉资产规范小样"],
            acceptanceCriteria: ["视觉调性一致具有强烈品牌记忆", "组件复用度高"],
          },
        ],
      },
    ];
    return { routes, recommendedRouteId: "route_saas_clarity" };
  }

  // 4. Generic / Brand / Visual scenario
  const routes: Route[] = [
    {
      id: "route_gen_core",
      title: "核心视觉符号与极简记忆锚点法",
      startingPoint: "标志性轮廓与第一眼记忆锚定",
      coreProblem: "如何在信息繁杂的市场中凭一个纯粹的视觉符号被秒级记住？",
      purpose: "提炼极简且富有个性的独特图形资产，最大化视觉辨识效率",
      pros: "记忆锚点清晰锐利，跨介质延展适应性极强",
      cons: "对单一图形或排版精度要求极高，容错率低",
      recommendedReason: `${unknownNote}，先聚焦于核心视觉符号的提炼，能为后续细节探索提供明确指南针。`,
      focusDimension: "极简图形符号与轮廓特征",
      steps: [
        {
          id: "step_gen_c_1",
          title: "核心象征物抽象与极简轮廓实验",
          question: "最能代表该任务本质的单一具象或抽象符号是什么？",
          purpose: "提取高识别度的极简视觉轮廓",
          deliverables: ["极简符号草稿 5 套", "黑白剪影形态对比图"],
          acceptanceCriteria: ["轮廓特征鲜明，无需依赖色彩也能秒级识别", "造型简洁耐看"],
        },
        {
          id: "step_gen_c_2",
          title: "远距离与缩微尺寸辨识度检验",
          question: "缩小至 16px 小图标或数十米外观察能否被清晰辨认？",
          purpose: "验证符号在极端尺度下的视觉张力",
          deliverables: ["从 16px 到超大画幅缩放测试图", "模糊滤镜视线测试图"],
          acceptanceCriteria: ["极端缩放下依然能识别主体特征", "线条清晰不糊边"],
        },
        {
          id: "step_gen_c_3",
          title: "跨平面物料延展视觉统一性",
          question: "从包装贴标到海报与社媒头像该符号如何保持统一力量？",
          purpose: "验证符号系统的全场景延展能力",
          deliverables: ["平面应用延展规范图 3 组", "包装与物料应用渲染图"],
          acceptanceCriteria: ["跨媒介应用视觉语言统一", "具备强烈品牌记忆度"],
        },
      ],
    },
    {
      id: "route_gen_narrative",
      title: "生活场景叙事与氛围通感法",
      startingPoint: "真实生活瞬间与情感氛围营造",
      coreProblem: "如何让设计不止于好看，而是通过视觉唤起打动人心的具体场景？",
      purpose: "围绕典型用户的生活瞬间展开视觉叙事，建立深层情绪连接",
      pros: "情感感染力强烈，易引发共鸣与自发分享",
      cons: "若缺乏节制易导致视觉元素冗杂，稀释核心焦点",
      recommendedReason: null,
      focusDimension: "氛围光影与情绪场景构图",
      steps: [
        {
          id: "step_gen_n_1",
          title: "核心情感场景剧本与情绪板搭建",
          question: "哪一个用户互动瞬间最具备戏剧张力与情感感染力？",
          purpose: "确立核心故事化叙事氛围基调",
          deliverables: ["生活场景情绪摄影板 3 组", "故事化色彩基调提取卡"],
          acceptanceCriteria: ["场景感强烈，情绪传达真诚", "色调统一和谐"],
        },
        {
          id: "step_gen_n_2",
          title: "极简插画与摄影语言的融合",
          question: "何种图形或摄影风格最能传达克制温馨的情感？",
          purpose: "打造包裹感强烈的视觉语言",
          deliverables: ["克制图形手绘小样 3 套", "摄影配图视觉规范草案"],
          acceptanceCriteria: ["画面留白充盈，不拥挤喧哗", "气质温润有生活气息"],
        },
        {
          id: "step_gen_n_3",
          title: "平面构图与留白呼吸感测试",
          question: "画面是否为受众留出了恰当的情绪空间与视觉呼吸感？",
          purpose: "确保视觉表现克制耐看",
          deliverables: ["包装与海报平面构图对照稿", "视线流动焦点图"],
          acceptanceCriteria: ["留白形成舒适呼吸感", "文字与画面主次分明"],
        },
      ],
    },
    {
      id: "route_gen_contrast",
      title: "经典元素解构与当代平面重塑法",
      startingPoint: "传统意象与现代几何碰撞",
      coreProblem: "如何在保留品类熟悉感的同时带来前卫醒目的视觉新意？",
      purpose: "以当代几何排版拆解经典文化符号，创造兼具底蕴与新潮的平面视觉",
      pros: "视觉张力强烈，容易在同质化市场中脱颖而出",
      cons: "若解构过于极端可能削弱核心可读性",
      recommendedReason: null,
      focusDimension: "文化符号解构与现代几何",
      steps: [
        {
          id: "step_gen_x_1",
          title: "经典文化意象提取与几何拆解",
          question: "传统符号能被拆解为哪些极简的几何基底形态？",
          purpose: "提炼标志性平面形态骨架",
          deliverables: ["核心符号几何拆解草图 5 套", "经典与现代对照情绪板"],
          acceptanceCriteria: ["图形简练有力，保留关键识别特征", "摒弃传统陈旧繁复感"],
        },
        {
          id: "step_gen_x_2",
          title: "高反差色彩碰撞与留白韵律",
          question: "何种对撞色彩组合既能抓人眼球又不失质感？",
          purpose: "建立具备强烈记忆点的现代色彩体系",
          deliverables: ["主辅色对撞方案 3 组", "明暗对比与留白分布规范"],
          acceptanceCriteria: ["主色调在 3 米外识别清晰", "大面积留白形成舒适平衡"],
        },
        {
          id: "step_gen_x_3",
          title: "多介质平面延展视觉一致性",
          question: "在包装贴标、海报与社媒方图中视觉张力是否统一？",
          purpose: "验证平面视觉符号的全场景适应力",
          deliverables: ["包装展开平面稿", "社媒与海报延展效果图"],
          acceptanceCriteria: ["在不同画幅中均保持完美构图平衡", "视觉记忆点高度统一"],
        },
      ],
    },
  ];
  return { routes, recommendedRouteId: "route_gen_core" };
}
