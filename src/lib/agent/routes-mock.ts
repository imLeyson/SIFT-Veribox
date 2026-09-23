import type { Route } from "@/types/routes";
import type { DesignState } from "@/types/convergence";

function attachAlignmentScores(routes: Route[], recommendedId: string | null): Route[] {
  return routes.map((r, i) => ({
    ...r,
    alignmentScore: r.id === recommendedId || r.recommendedReason ? 96 : i === 1 ? 91 : 87,
  }));
}

export function getMockRoutes(
  rawBrief: string,
  state: DesignState,
  options?: {
    excludeThemeNames?: string[];
    refreshIndex?: number;
  },
): {
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

  const isAlternate = Boolean(
    (options?.refreshIndex && options.refreshIndex % 2 === 1) ||
    (options?.excludeThemeNames && options.excludeThemeNames.length > 0),
  );

  // 0. Sustainable Material & Emotional Product Design scenario
  if (
    briefLower.includes("可持续") ||
    briefLower.includes("材料") ||
    briefLower.includes("产品") ||
    briefLower.includes("回收") ||
    briefLower.includes("毛发") ||
    briefLower.includes("器物") ||
    briefLower.includes("纤维") ||
    briefLower.includes("物料")
  ) {
    const routes: Route[] = [
      {
        id: "route_prod_fiber",
        themeName: "原生纤维与微颗粒肌理",
        title: "原生纤维与微颗粒肌理",
        visualSnapshot: "回收再生纤维压合成微孔哑光表面，保留天然毛色微杂质与漫反射暖意，触感温润微糙，摒弃廉价塑料感，散发物料本真质感。",
        startingPoint: "再生纤维原生肌理与微气孔触感",
        focusDimension: "原生材料转化与微触感",
        coreProblem: "放弃二次精细涂层掩盖，把视觉与触觉质感押在再生纤维本身的微颗粒肌理与自然漫反射上",
        purpose: "以回收纤维本身的物性转化与微气孔触感构建真实耐看的产品肌理体验",
        pros: "材料原生肌理独特且具辨识度，自然光下呈现温润微光泽，环保与品质感兼具",
        cons: "纤维若压合过于致密会失去透性质感，过于松散又显粗糙，需把控好纤维密度与微孔平衡",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: `${unknownNote}，从再生材料本身的纤维物性切入最能彰显可持续设计的真实质感，兼具环保说服力与亲肤温度。`,
        steps: [
          {
            id: "step_prod_f_1",
            title: "原生纤维压合密度与微肌理",
            question: "何种纤维压合密度与表面微气孔在自然光下最显温润触感？",
            purpose: "确立第一眼的材质基准与漫反射微光泽，保持物料真实呼吸感",
            deliverables: ["纤维微孔漫反射对比样板", "低饱和暖调色谱"],
            acceptanceCriteria: ["自然光下呈现温润漫反射无刺眼塑料感", "材质肌理层次分明"],
          },
          {
            id: "step_prod_f_2",
            title: "天然毛色微杂质与漫反射",
            question: "毛发回收原料的天然杂色如何转化为温和耐看的有机底色？",
            purpose: "提炼不依赖人工染色剂的物料本真色彩系统",
            deliverables: ["原料自然色阶分布板", "漫反射光晕打样效果稿"],
            acceptanceCriteria: ["色彩呈现柔和自然色阶", "无人工强行调色的塑料感"],
          },
          {
            id: "step_prod_f_3",
            title: "表面微光影与触觉耐看度",
            question: "在常规室内光照下，材料表面的微起伏能否形成沉静柔和的光影漫射？",
            purpose: "验证新材料在真实日常光影下的视觉耐看度",
            deliverables: ["室内漫射光影测试图", "材质微触感对比板"],
            acceptanceCriteria: ["光影柔和无刺眼杂光", "触觉体验温润亲和"],
          },
        ],
      },
      {
        id: "route_prod_vessel",
        themeName: "柔和弧度与温润器型",
        title: "柔和弧度与温润器型",
        visualSnapshot: "柔和流动的有机弧面与微握持凹槽，器型沉静如卵石，置于居家桌面或掌心抚触，通过实体形态传递无声的陪伴温度。",
        startingPoint: "有机弧面与手握抚慰度",
        focusDimension: "情感陪伴语义与器物形态",
        coreProblem: "放弃符号化具象动物装饰，通过器物本身的握持弧度与有机线条唤起深层情感陪伴共鸣",
        purpose: "以符合人体抚触习惯的有机器物形态传递情感疗愈与陪伴温度",
        pros: "器物造型温润耐看，兼具桌面静物美感与触觉互动抚慰价值，情感连接深刻",
        cons: "造型若过于具象容易流于低幼，需保持如自然卵石般的抽象雕塑线条克制",
        feasibility: "medium",
        timeframe: "1–2 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_prod_v_1",
            title: "器物造型弧度与握持触感",
            question: "日常陪伴器物的弧线尺度与手握抚慰度如何传递安定温和的心理预期？",
            purpose: "打磨符合人体工学与触觉心理的器物轮廓曲度",
            deliverables: ["微握持曲线切削草图", "有机形态弧度对照模型稿"],
            acceptanceCriteria: ["手掌贴合舒适自然", "轮廓线条洗练无多余碎线"],
          },
          {
            id: "step_prod_v_2",
            title: "桌面静物尺度与视线驻留",
            question: "器物置于居家或工位桌面时，能否形成安静舒缓的视觉停留点？",
            purpose: "校准器物在生活场景中的雕塑感与视觉分量",
            deliverables: ["桌面摆放环境合成图 3 款", "器物比例尺度分析稿"],
            acceptanceCriteria: ["比例舒展不具侵略性", "各角度均具独立美感"],
          },
          {
            id: "step_prod_v_3",
            title: "情感触觉抚慰心理反馈",
            question: "指尖抚摸材料与器型曲面时，是否直觉唤起温暖安心的情绪认知？",
            purpose: "验证情感设计在触觉层面的感知达成度",
            deliverables: ["触觉感知心理对照表", "曲面微握持打样板"],
            acceptanceCriteria: ["触觉反馈温和安定", "无冷硬锐利毛边"],
          },
        ],
      },
      {
        id: "route_prod_minimal",
        themeName: "机能卡扣与日常实用",
        title: "机能卡扣与日常实用",
        visualSnapshot: "极简克制的几何线条结合精妙微倒角构件，材料与现代铝合金或原木自然嵌合，呈现兼具实用机能与当代家居审美的优雅器物。",
        startingPoint: "现代生活机能与结合部细节",
        focusDimension: "现代机能美学与日常共生",
        coreProblem: "放弃单纯的概念展品定位，以克制利落的机能结构让可持续材料自然融入现代日常生活",
        purpose: "以现代极简机能结构与精致收口实现可持续新材料在日常产品中的优雅落地",
        pros: "结构精妙克制，轻松融入现代居家与办公空间，商业实用度与审美接受度极高",
        cons: "结合部公差若处理不当易显工件粗糙，需严控材质交界面的收口精度",
        feasibility: "medium",
        timeframe: "1–2 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_prod_m_1",
            title: "现代生活环境与光影融入",
            question: "该可持续材料置于现代原木或极简家居桌面时，如何与周围环境自然共生？",
            purpose: "验证新材料在真实日常光影与生活场景中的审美和谐度",
            deliverables: ["居家光影环境渲染板", "桌面材质并置效果图"],
            acceptanceCriteria: ["与现代空间和谐相融无突兀感", "桌面静物美感优雅耐看"],
          },
          {
            id: "step_prod_m_2",
            title: "异质材料嵌合与收口线条",
            question: "再生纤维材料与金属或木质结合部如何以极简倒角完成精致收口？",
            purpose: "打磨现代高品质产品级的工艺结合细节",
            deliverables: ["收口倒角剖面设计图 3 款", "结合部公差对照规范"],
            acceptanceCriteria: ["接缝收口干练无毛刺", "视觉分件比例匀称"],
          },
          {
            id: "step_prod_m_3",
            title: "实用机能与日常操作动线",
            question: "日常拿取、开启或放置过程中，器物的手部互动动线是否自然顺畅？",
            purpose: "检验器物在日常使用中的人机工效与耐看度",
            deliverables: ["手部操作动线分析稿", "使用场景体验对照图"],
            acceptanceCriteria: ["操作动线直觉无阻滞", "长期摆放不显视觉疲劳"],
          },
        ],
      },
    ];
    return {
      routes: attachAlignmentScores(routes, "route_prod_fiber"),
      recommendedRouteId: "route_prod_fiber",
    };
  }

  // 1. Packaging / Tea scenario
  if (briefLower.includes("茶") || briefLower.includes("罐装") || briefLower.includes("包装")) {
    if (isAlternate) {
      const altRoutes: Route[] = [
        {
          id: "route_tea_ink_alt",
          themeName: "水墨留白与宣纸肌理",
          title: "水墨留白与宣纸肌理",
          visualSnapshot: "特种手工宣纸覆合硬盒，正面仅一抹淡雅水墨晕染与朱红小印，80% 呼吸感留白，墨韵自然散开，无多余商业装饰。",
          startingPoint: "手工宣纸肌理与极简水墨意象",
          focusDimension: "传统材质手工感与当代水墨排版",
          coreProblem: "跳脱出传统茶包装厚重复杂的土气与老派，以极简艺术展品级的留白与局部淡雅水墨传递东方静心意境",
          purpose: "以大开合的负空间留白、手工纸纤维肌理与极淡墨色晕染构建静谧高远的茶道视觉体验",
          pros: "艺术格调极高，手工纸纤维在触觉上温润独特，80% 留白在杂乱货架中形成强烈的视觉静止感",
          cons: "手工纸大面积留白极易受运输摩擦影响，必须在结构上设置内凹保护槽并把控油墨防擦边界",
          feasibility: "medium",
          timeframe: "1–2 天",
          recommendedReason: `${unknownNote}，以当代东方水墨与手工纸触感切入，既能保有茶文化底蕴，又以极简留白彻底拉开与传统礼盒的档次差距。`,
          steps: [
            {
              id: "step_tea_ink_1",
              title: "手工宣纸纹理与复合打样",
              question: "何种手工宣纸覆合在硬盒表面最能保持植物原纤维的微颗粒毛羽感？",
              purpose: "确立兼具东方手工质感与硬挺挺度的材质基础",
              deliverables: ["宣纸复合样张 3 组", "纤维漫反射质感样板"],
              acceptanceCriteria: ["手感温润无塑料感", "折边处无爆裂毛边"],
            },
            {
              id: "step_tea_ink_2",
              title: "水墨晕染层次与朱印点睛",
              question: "淡墨晕染与朱红小印的色彩比例如何在视线中形成瞬间聚焦？",
              purpose: "打磨极简留白中的视觉焦点与东方神韵",
              deliverables: ["水墨晕染灰度对比稿 3 款", "朱印位置与尺度规范"],
              acceptanceCriteria: ["墨色过渡柔和无阶梯断层", "朱印成为 0.5 秒第一眼视觉落脚点"],
            },
            {
              id: "step_tea_ink_3",
              title: "单色小字与东方呼吸感排版",
              question: "品名及茶产地小字如何在留白中维持疏朗透气的呼吸节奏？",
              purpose: "构建现代东方版式的字距与负空间秩序",
              deliverables: ["正面版式网格草稿", "字阶比例对照样张"],
              acceptanceCriteria: ["信息清晰可辨", "负空间留白维持 75% 以上"],
            },
          ],
        },
        {
          id: "route_tea_ceramic_alt",
          themeName: "陶土砂砾与多边器物",
          title: "陶土砂砾与多边器物",
          visualSnapshot: "无涂层陶土质感纸张包裹八边形硬盒，单色哑光微小字符，呈现如桌面雕塑般的器物之美。",
          startingPoint: "天然陶土砂砾触感与利落多边形",
          focusDimension: "矿物微颗粒纸感与雕塑式器型",
          coreProblem: "打破传统圆罐或普通方盒的平庸形态，将茶包装升维为摆在办公桌或茶席上的几何静物艺术品",
          purpose: "通过几何切削面与砂砾矿物触感，创造具备仪式感与把玩价值的现代桌面器物包装",
          pros: "几何切面光影立体感强烈，置于桌面宛若艺术器皿，极具现代精英办公或品茗仪式感",
          cons: "多面切削结构对模切与包边精度要求极高，需严格控制折痕线与贴合公差",
          feasibility: "medium",
          timeframe: "1–2 天",
          recommendedReason: null,
          steps: [
            {
              id: "step_tea_cer_1",
              title: "矿物砂砾感特种纸选型",
              question: "何种含矿物微粒特种纸能最真实呈现自然陶土的粗粝微磨砂手感？",
              purpose: "确立质朴器物的触觉基调",
              deliverables: ["砂砾触感纸卡 3 款", "表面耐磨测试对照板"],
              acceptanceCriteria: ["触感沉稳有分量感", "自然光下微颗粒清晰可见"],
            },
            {
              id: "step_tea_cer_2",
              title: "八面几何切削光影比例",
              question: "切削棱角的倾斜角度如何在顶光下形成明暗交替的立体切面？",
              purpose: "打造如雕塑般的桌面几何光影韵律",
              deliverables: ["切面角度模型 2 款", "顶光与侧光阴影模拟图"],
              acceptanceCriteria: ["切角过渡利落分明", "不同角度光照下立体感显著"],
            },
            {
              id: "step_tea_cer_3",
              title: "暗哑烫印与微刻字阶",
              question: "暗哑古铜色烫金如何在粗粝纸面上实现极其锐利的微型字符？",
              purpose: "打磨器物表面沉敛内秀的工艺细节",
              deliverables: ["哑金烫印样张", "微型字符耐辨识打样"],
              acceptanceCriteria: ["烫金无溢胶毛刺", "暗光下微显低调光泽"],
            },
          ],
        },
        {
          id: "route_tea_black_alt",
          themeName: "炭黑暗纹与等高线微光",
          title: "炭黑暗纹与等高线微光",
          visualSnapshot: "深黑炭质触感特种纸，正面同色系亮光透明折光勾勒茶山等高线，在光线流转下若隐若现，冷峻而先锋。",
          startingPoint: "极黑炭质触感与同色系折光反差",
          focusDimension: "全黑消光材质与局部光油反差",
          coreProblem: "颠覆常规绿色、白色茶包装认知，以绝对先锋的纯黑美学打造极客与年轻群体的深邃神秘感",
          purpose: "通过极致消光炭黑与局部微透明光油反差，展现黑夜茶山的静谧与现代先锋气质",
          pros: "在所有明亮彩色包装中形成惊人的黑色磁场，光线转动时的反光细节极具探索趣味",
          cons: "深色哑光纸张易留指纹与微小划痕，必须选配高抗刮手感涂层",
          feasibility: "high",
          timeframe: "0.5–1 天",
          recommendedReason: null,
          steps: [
            {
              id: "step_tea_blk_1",
              title: "纯黑炭质触感纸与防刮测试",
              question: "何种纯黑纸浆在达到至暗黑度的同时具备极高耐磨防指纹性能？",
              purpose: "确立至黑纯净基底与长效耐久度",
              deliverables: ["3 款炭黑特种纸对比样卡", "抗指纹耐擦拭对照表"],
              acceptanceCriteria: ["黑度饱和无偏红偏蓝", "正常触碰不易留明显汗渍印记"],
            },
            {
              id: "step_tea_blk_2",
              title: "同色系亮光油等高线微反差",
              question: "茶山等高线局部光油厚度如何设定才能在转角光线下呈现最佳流转折光？",
              purpose: "打造深邃幽暗中流动若隐若现的触觉暗纹",
              deliverables: ["不同厚度光油打样 3 款", "动态视线反光模拟稿"],
              acceptanceCriteria: ["正面平视低调克制", "斜侧光下等高线层次分明清晰"],
            },
            {
              id: "step_tea_blk_3",
              title: "银白冷冽字标视距校准",
              question: "纯黑底上的微细银灰文字如何排版才能保证在昏暗环境下清晰瞬读？",
              purpose: "完成高冷黑白对比与信息穿透力校准",
              deliverables: ["微细银字排版稿", "昏暗光线视距辨识对照"],
              acceptanceCriteria: ["0.5 米内文字锐利清晰", "无散光与溢色现象"],
            },
          ],
        },
      ];
      return {
        routes: attachAlignmentScores(altRoutes, "route_tea_ink_alt"),
        recommendedRouteId: "route_tea_ink_alt",
      };
    }
    const routes: Route[] = [
      {
        id: "route_tea_material",
        themeName: "素雅棉纸与无墨压凹",
        title: "素雅棉纸与无墨压凹",
        visualSnapshot: "大面积纯白原浆棉纸留白，正面无多余彩印，仅凭 0.5mm 侧光单色深压凹显露出茶品名与暗纹，在光线下呈现极简雕塑感。",
        startingPoint: "特种纸微触感与无墨压凹",
        focusDimension: "特种纸肌理与深压凹工艺",
        coreProblem: "放弃所有花哨插画与多色印刷，把视觉质感全押在 350g 原浆棉卡与 0.5mm 侧光压凹上",
        purpose: "以大面积素雅棉纸触感、克制单色印刷与微小光影层次建立静谧高品质感",
        pros: "大面积留白在复杂环境中形成纯粹视觉真空，靠棉纸微压凹显出雕塑感，耐看且极具呼吸感",
        cons: "正面无装饰遮丑，若微压凹与纸张肌理反差不足，极易显得苍白空洞无物，必须严控纸张白度与阴影层次",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: `${unknownNote}，用纯净棉纸与侧光微压凹切入，能直接解决“既要极简高级又怕显廉价”的核心顾虑。`,
        steps: [
          {
            id: "step_tea_mat_1",
            title: "纸样白度与微肌理",
            question: "茶汤的原生透光色调与何种原浆触感纸搭配最显温润清冽？",
            purpose: "确立第一眼的触觉基准与白度微调，保持纯净呼吸感",
            deliverables: ["3 组特种原浆纸样卡", "正面留白与肌理样张"],
            acceptanceCriteria: ["自然光下无刺眼塑料反光，触感温和", "留白比例保持充足呼吸感"],
          },
          {
            id: "step_tea_mat_2",
            title: "中西文字阶与排版动线",
            question: "开盒封签到正面主品名的视线如何自然过渡？",
            purpose: "构建第一眼的视觉仪式感与信息骨架",
            deliverables: ["开盒封贴排版样张 3 款", "正面主文字阶规范稿"],
            acceptanceCriteria: ["品名与产地在 1 秒内清晰识别", "封签撕口位置不遮挡核心信息"],
          },
          {
            id: "step_tea_mat_3",
            title: "侧光浅压凹与光影微雕",
            question: "在 45 度侧光照射下，局部微压凹是否形成干净利落的阴影？",
            purpose: "验证微工艺的层次感与光影细节表现",
            deliverables: ["0.5mm 浅压凹效果样稿", "45度侧光阴影对比图"],
            acceptanceCriteria: ["45度侧光下压凹轮廓清晰无毛边", "微弱光影显出雕塑感"],
          },
        ],
      },
      {
        id: "route_tea_typography",
        themeName: "严谨网格与档案排版",
        title: "严谨网格与档案排版",
        visualSnapshot: "严谨双栏瑞士网格排版，中西文字阶 2.5 倍对比，冷冽黑白字符清晰罗列产地海拔与风味批号，呈现如专业档案般的权威可信度。",
        startingPoint: "双栏网格与微字阶层级",
        focusDimension: "双栏网格与微字阶层级",
        coreProblem: "在小尺寸罐身正面建立极度理性的文字骨架，将茶叶产地、海拔与风味批号转化为档案级信息美感",
        purpose: "通过严格的双栏网格、中西文字阶 2.5 倍对比与充盈留白呈现专业克制感",
        pros: "风味与产地信息一目了然，极具专业可信度与现代干练气质，货架正面辨识效率极高",
        cons: "西文字体与中文字标的灰度若未调匀，容易沦为生硬冰冷的药盒或说明书",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_tea_typo_1",
            title: "双栏网格与信息骨架设定",
            question: "品名、采摘年份与风味标尺如何划分为清晰的主次信息区块？",
            purpose: "确立正面版式的几何网格与留白率",
            deliverables: ["罐身正面双栏网格规范稿", "核心风味标签层级草图 3 套"],
            acceptanceCriteria: ["核心品名在 0.5 秒内被捕获", "留白面积占比保持 50% 以上"],
          },
          {
            id: "step_tea_typo_2",
            title: "中西文字阶与灰度平衡",
            question: "现代高冷无衬线西文与微古典中文如何搭配才显协调？",
            purpose: "打磨兼具国际现代感与东方克制感的字型组合",
            deliverables: ["3 组中西文字体搭配对照表", "字阶比例与字距视觉规范"],
            acceptanceCriteria: ["西文字体与中文字标视觉重心齐平", "6pt 微型小字在 1:1 打印下清晰可读"],
          },
          {
            id: "step_tea_typo_3",
            title: "视距焦点与黑白反差",
            question: "走过货架的瞬间，视线最先捕捉到的是哪个字块？",
            purpose: "验证网格排版在真实视距陈列中的穿透力",
            deliverables: ["货架陈列黑白视线对照图", "视距黑白高斯模糊草案"],
            acceptanceCriteria: ["远距离能快速识别品牌字标轮廓", "次要信息不争抢视觉第一注意力"],
          },
        ],
      },
      {
        id: "route_tea_desk",
        themeName: "极简几何与视觉大色块",
        title: "极简几何与视觉大色块",
        visualSnapshot: "低饱和莫兰迪茶色圆角罐身，正面仅居中一枚极简几何抚慰符号，在原木办公桌上呈现纯粹温和的现代艺术静物感。",
        startingPoint: "桌面静物陈列与微解压隐喻",
        focusDimension: "桌面陈列美学与视觉解压",
        coreProblem: "摆脱传统茶包装的沉重古板，以轻快纯净的几何符号让罐身成为现代办公桌上的视觉亮点",
        purpose: "以高辨识度几何符号、低饱和桌面和谐色与充盈负空间打造陪伴感",
        pros: "与都市白领桌面极其契合，兼具艺术静物感与拍照分享欲，年轻群体认可度极高",
        cons: "图形若缺乏几何克制容易显得浮躁幼稚，必须保持高比例留白",
        feasibility: "medium",
        timeframe: "1–2 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_tea_desk_1",
            title: "环境色彩与低饱和色盘",
            question: "在胡桃木/白橡木与极简白桌面上，何种低饱和茶色最显平静舒适？",
            purpose: "提取与现代办公桌面自然相融的环境色彩系统",
            deliverables: ["典型办公桌面环境对照板", "低饱和莫兰迪茶色方案 4 组"],
            acceptanceCriteria: ["在深浅桌面均自然相融不突兀", "避免高饱和荧光色干扰"],
          },
          {
            id: "step_tea_desk_2",
            title: "极简几何符号隐喻",
            question: "何种极简几何线条或形态能直观传递‘片刻抽离与放松’？",
            purpose: "打造具备情绪抚慰功能的视觉锤符号",
            deliverables: ["极简几何解压符号手稿 5 款", "负空间构图版式草案"],
            acceptanceCriteria: ["符号形态极度纯粹克制", "缩小至 16px 依然能认清轮廓"],
          },
          {
            id: "step_tea_desk_3",
            title: "多角度构图与立体平衡",
            question: "罐体在桌面上随手放置旋转到任意角度时，是否都具备完整的美感？",
            purpose: "打磨全方位无死角的桌面立体视觉构图",
            deliverables: ["罐体全圆周展开平面图", "多角度视觉效果对照稿"],
            acceptanceCriteria: ["转动任意角度均具备独立构图美感", "主次视觉重心稳定"],
          },
        ],
      },
    ];
    return {
      routes: attachAlignmentScores(routes, "route_tea_material"),
      recommendedRouteId: "route_tea_material",
    };
  }

  // 2. Skincare / Beauty scenario
  if (briefLower.includes("护肤") || briefLower.includes("美妆") || briefLower.includes("女性")) {
    const routes: Route[] = [
      {
        id: "route_skin_lab",
        themeName: "科学证据 · 极细刻度",
        title: "【刻度排版与配方图表】理性实验室证据",
        visualSnapshot: "冷白透光玻璃瓶身搭配 0.25pt 极细数据标尺与成分浓度百分比，无多余装饰，像精密实验室试剂瓶般严谨可信。",
        startingPoint: "配方逻辑图表化与科学证据感",
        focusDimension: "数据图表美学与刻度排版",
        coreProblem: "放弃浮夸的‘神奇修护’大词宣传，将活性成分纯度与配方浓度转化为严谨的刻度与图表视觉",
        purpose: "借由极细刻度标尺、浓度百分比字阶与冷白微留白呈现安全可信赖的专业感",
        pros: "直击成分党核心心智，建立强烈的科学证据感与信任壁垒，版面干练利落",
        cons: "字阶和线条若过于密集，容易沦为冰冷的处方药说明书，需注意留白呼吸感",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: `${unknownNote}，优先从配方刻度与成分证据切入，能以最低沟通成本建立专业信任。`,
        steps: [
          {
            id: "step_skin_lab_1",
            title: "核心成分符号与刻度标尺提炼",
            question: "活性成分比例与实验数据如何转化为极简的微型刻度与图表语言？",
            purpose: "提炼核心理化视觉证明资产",
            deliverables: ["极简成分图表草案 4 款", "配方比例刻度排版规范稿"],
            acceptanceCriteria: ["刻度线条极细（0.25pt–0.5pt）精致", "无生硬杂乱的工业感"],
          },
          {
            id: "step_skin_lab_2",
            title: "冷白基调与微暖灰阶校准",
            question: "在极简白底中注入何种微暖色相能消除医疗冰冷感，带来亲肤温度？",
            purpose: "平衡专业理性与温和亲肤的视觉温度",
            deliverables: ["冷白底色微调色阶样卡", "品牌辅色温润微暖色板"],
            acceptanceCriteria: ["瓶身呈现透光高级感", "白底温和不刺目"],
          },
          {
            id: "step_skin_lab_3",
            title: "关键功效信息视线动线盲测",
            question: "拿起包装的第 1 秒能否快速锁定成分与核心功效？",
            purpose: "验证功效信任信息的传递效率",
            deliverables: ["正面视线焦点热力图", "功效承诺文字层级排版稿"],
            acceptanceCriteria: ["核心功效数字居于第一视觉焦点", "次要成分表清晰易读不喧宾夺主"],
          },
        ],
      },
      {
        id: "route_skin_nature",
        themeName: "原生肌理 · 哑光通感",
        title: "【微观原生肌理与哑光留白】通感纯净亲肤",
        visualSnapshot: "细腻磨砂触感与低饱和大地原色，大面积 60% 温润留白，借由微观原料肌理传递零添加、零刺激的安心亲肤感。",
        startingPoint: "原生植物微观肌理与温和触感",
        focusDimension: "微观纹理与有机色彩通感",
        coreProblem: "摒弃千篇一律的绿叶与滴水插画套路，以微观原料纹理与细腻哑光触感传递零刺激的安全感",
        purpose: "通过低饱和大地原生色系、细腻哑光触感与大面积温润留白呈现温和纯净",
        pros: "视觉极具亲和力，对敏感肌人群打动效果极佳，温和治愈不刺目",
        cons: "市面上主打天然的概念较多，若微观肌理不够独特容易陷入平庸",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_skin_nat_1",
            title: "原生植物微观肌理与色阶提取",
            question: "从核心原料提取物中能抽象出何种纯净无添加的哑光色阶？",
            purpose: "建立无人工添加痕迹的原生色彩体系",
            deliverables: ["天然原料微观肌理情绪板", "低饱和原生哑光色谱 3 组"],
            acceptanceCriteria: ["色彩呈现柔和磨砂质感", "杜绝过度艳丽的人工调色感"],
          },
          {
            id: "step_skin_nat_2",
            title: "呼吸感版面与微气孔留白",
            question: "如何通过疏朗的排版间距表现肌肤透气呼吸的轻盈感？",
            purpose: "构建具通感维度的视觉呼吸感",
            deliverables: ["有机流动感排版草案", "负空间气孔分布规范稿"],
            acceptanceCriteria: ["版面留白比例超过 60%", "文字与背景融为一体不割裂"],
          },
          {
            id: "step_skin_nat_3",
            title: "敏感肌人群直觉安心感评估",
            question: "第一眼看到包装时，受众的直觉是‘安心温和’还是‘刺激化学感’？",
            purpose: "检验视觉预期的达成度",
            deliverables: ["直觉视觉对比测试样张", "安心感与纯净度评测表"],
            acceptanceCriteria: ["受测者直觉反馈纯净安全", "无任何多余修饰线条干扰"],
          },
        ],
      },
      {
        id: "route_skin_ritual",
        themeName: "晨暮光影 · 空间仪式",
        title: "【晨暮光影微渐变】洗漱台桌面静物",
        visualSnapshot: "瓶身带有晨光微白至暮色深灰蓝的平滑柔和微光晕渐变，放置在浴室大理石洗漱台上呈现沉静优雅的治愈静物感。",
        startingPoint: "晨暮光影流转与身心松弛",
        focusDimension: "光影微晕与情绪氛围",
        coreProblem: "突破传统护肤品工具属性，将早晚护肤流程转化为与光影共存的桌面治愈仪式",
        purpose: "通过晨光微白与暮色冷灰的柔和微渐变，配合极简字体，营造沉静的私人时光",
        pros: "视觉格调唯美高级，在社媒晒图与家居洗漱台陈列中极具自发传播力",
        cons: "渐变色若过渡生硬容易产生塑料廉价感，对印刷打样光晕渐变细腻度要求极高",
        feasibility: "medium",
        timeframe: "1–2 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_skin_rit_1",
            title: "晨光与暮色微渐变光晕调色",
            question: "晨间唤醒的微透白与夜间修护的深暮灰蓝如何形成优雅的双瓶呼应？",
            purpose: "构建随时间流转的光影仪式节奏",
            deliverables: ["晨暮光影微渐变情绪板", "早晚双瓶色彩对照效果稿"],
            acceptanceCriteria: ["两款瓶身并列陈列时气质和谐统一", "色彩渐变过渡平滑无阶梯色带"],
          },
          {
            id: "step_skin_rit_2",
            title: "瓶贴极简几何字阶与负空间",
            question: "瓶贴字体与留白比例如何营造安静静谧的视觉停留感？",
            purpose: "打磨优雅耐看的微细节",
            deliverables: ["微型几何标签排版图 3 套", "瓶身微光细节打样稿"],
            acceptanceCriteria: ["标签文字收敛紧凑", "前后两面视线流动自然"],
          },
          {
            id: "step_skin_rit_3",
            title: "洗漱台空间光照合成测试",
            question: "放置在大理石或木质洗手台上时，光线漫射效果能否提升浴室空间质感？",
            purpose: "确认家居静物维度的视觉和谐度",
            deliverables: ["现代浴室空间合成效果图 3 组", "不同台面材质搭配对照板"],
            acceptanceCriteria: ["作为空间静物美感出众", "在镜前灯与自然光下均呈现高级漫反射"],
          },
        ],
      },
    ];
    return {
      routes: attachAlignmentScores(routes, "route_skin_lab"),
      recommendedRouteId: "route_skin_lab",
    };
  }

  // 3. SaaS / Digital / Branding scenario
  if (briefLower.includes("saas") || briefLower.includes("软件") || briefLower.includes("官网") || briefLower.includes("系统")) {
    const routes: Route[] = [
      {
        id: "route_saas_clarity",
        themeName: "纯粹网格 · 高效骨架",
        title: "【纯粹栅格与高对比字阶】低认知负荷效率",
        visualSnapshot: "严格 8px 模块化布局与 3 级高对比字阶，界面以极简黑白灰为骨架，无任何冗余插画装饰，海量数据 1 秒理清。",
        startingPoint: "高密度信息的秩序化重组",
        focusDimension: "栅格系统与视觉信息层级",
        coreProblem: "放弃花哨的多彩渐变与大插画，用严谨的 8px 栅格与 3 级清晰字阶让海量复杂操作 1 秒理清",
        purpose: "以极端克制的排版骨架、高对比字重与功能性黑白灰大幅降低用户的视觉认知负荷",
        pros: "界面极其清晰耐看，专业生产力工具属性极强，方便设计系统组件化无缝扩展",
        cons: "细节若打磨不到位容易显得冷淡单调，需要极其精致的字体对齐与微边框支撑",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: `${unknownNote}，优先从核心栅格与信息层级的极度纯粹切入，直击业务决策者对效率的本质诉求。`,
        steps: [
          {
            id: "step_saas_clar_1",
            title: "8px 栅格与首屏焦点层级",
            question: "核心工作区中最重要的三项信息层级应如何排布才能零干扰扫读？",
            purpose: "确立无歧义的视觉优先级",
            deliverables: ["8px 排版栅格系统规范", "核心模块层级排版草图 3 套"],
            acceptanceCriteria: ["首要行动点在 1 秒内被锁定", "次级辅助信息保持秩序不争抢焦点"],
          },
          {
            id: "step_saas_clar_2",
            title: "状态色彩与极简功能图标",
            question: "成功、警告、运行中等业务状态如何通过克制的功能色秒级识别？",
            purpose: "制定精准的功能性色彩与轻量图标语言",
            deliverables: ["状态色系明度与对比度规范", "16px 线性功能图标集 12 枚"],
            acceptanceCriteria: ["色彩对比符合 WCAG 2.1 AA 无障碍标准", "图标线条粗细与字体协调一致"],
          },
          {
            id: "step_saas_clar_3",
            title: "高密度数据卡片留白节奏测试",
            question: "在超长表格与复杂表单场景下，如何通过微间距保持透气舒适？",
            purpose: "验证长时间工作下的抗视觉疲劳能力",
            deliverables: ["高密度模块排版对照板", "间距与负空间优化对照稿"],
            acceptanceCriteria: ["长时间浏览无刺眼疲劳感", "模块边界清晰分明无需加粗描边"],
          },
        ],
      },
      {
        id: "route_saas_modular",
        themeName: "轻盈模组 · 弥散微光",
        title: "【轻量卡片容器与弥散微阴影】现代亲和模组",
        visualSnapshot: "通透圆角卡片容器悬浮于灰白背景，搭配极其细腻的空气感弥散微阴影与胶囊标签，如同乐高积木般亲和易用。",
        startingPoint: "组件卡片化与视线轻量化",
        focusDimension: "卡片微投影与空间层次",
        coreProblem: "打破企业级软件厚重死板的陈旧印象，用轻盈圆角卡片与细腻空气感阴影让复杂功能像积木般易上手",
        purpose: "借由微妙的微投影纵深、圆角卡片容器与自适应间距降低新用户的心理门槛",
        pros: "第一眼极其友好现代，交互热区明确，非常利于产品营销官网与工作台的调性统一",
        cons: "在极高密度的数据报表场景下，卡片边距过多可能导致有效信息展示面积被压缩",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_saas_mod_1",
            title: "卡片微投影与层次规范",
            question: "卡片在灰白背景上的悬浮高度如何通过弥散阴影优雅呈现？",
            purpose: "打造轻盈舒适的视觉空间纵深感",
            deliverables: ["3 组卡片阴影与圆角参数规范", "模组容器排版效果稿"],
            acceptanceCriteria: ["阴影通透细腻无脏感", "卡片间距在响应式下保持协调"],
          },
          {
            id: "step_saas_mod_2",
            title: "胶囊标签与状态徽章排版",
            question: "标签与辅助信息如何做到既一眼可见又不让界面碎花？",
            purpose: "打磨精致轻巧的排版微细节",
            deliverables: ["字阶比例规范表", "胶囊标签样式规范 6 款"],
            acceptanceCriteria: ["标签紧凑小巧，主次分明", "文字灰度梯度自然平滑"],
          },
          {
            id: "step_saas_mod_3",
            title: "深色模式边缘微光调试",
            question: "深色背景下卡片边缘如何用微弱发光替代生硬粗边框？",
            purpose: "打磨高品质深色工作台体验",
            deliverables: ["深色主题卡片边缘光照渲染图", "深色对比色阶表"],
            acceptanceCriteria: ["深色模式下边缘微光层次丰富", "文字舒适清晰不刺眼眩光"],
          },
        ],
      },
      {
        id: "route_saas_identity",
        themeName: "暗黑先锋 · 极客字符",
        title: "【等宽排版与先锋暗色工程】极客字符美学",
        visualSnapshot: "深炭灰科技背景配合等宽代码字体排版与高穿透荧光电光青点缀，呈现先锋利落的硬核工程技术美学。",
        startingPoint: "代码美学字符与现代极客精神",
        focusDimension: "等宽字体与极客符号美学",
        coreProblem: "为技术驱动型产品赋予前沿先锋的工程气质，以等宽字型、暗黑对比与精准字符构建极高品牌壁垒",
        purpose: "融合工业工程的精准感与当代数字先锋设计，打造辨识度拉满的极客视觉符号",
        pros: "在开发者、设计师与科技先锋群体中具备极强品牌号召力与酷炫记忆度",
        cons: "对非技术大众用户可能有一定的理解门槛，需要辅以清晰的操作文字引导",
        feasibility: "medium",
        timeframe: "1–2 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_saas_id_1",
            title: "等宽字体家族与字符网格实验",
            question: "专业等宽代码字体与现代无衬线标题字体如何优雅融合？",
            purpose: "确立先锋工程美学的排版骨架",
            deliverables: ["等宽字体排版实验稿 3 套", "品牌主标与等宽字符组合图"],
            acceptanceCriteria: ["字符排版严谨工整具有节奏感", "主标题醒目现代，科技感纯正"],
          },
          {
            id: "step_saas_id_2",
            title: "深灰背景与高穿透荧光主色",
            question: "深炭灰背景下低饱和荧光绿/电光青如何既吸睛又耐看不刺目？",
            purpose: "打磨先锋暗黑视觉调性与品牌主色",
            deliverables: ["品牌暗黑工程色谱方案", "主行动点高光色彩规范"],
            acceptanceCriteria: ["主色调穿透力极强，记忆度高", "深炭灰背景具空气感不沉闷压抑"],
          },
          {
            id: "step_saas_id_3",
            title: "全链路视觉延展一致性核验",
            question: "从官网首页、登录页到工作台控制面板，视觉语言是否高度统一？",
            purpose: "检验视觉系统张力与完整度",
            deliverables: ["官网与控制台界面对照大图", "品牌视觉资产规范样稿"],
            acceptanceCriteria: ["跨界面调性高度统一，记忆点鲜明", "组件复用度与工程落地性高"],
          },
        ],
      },
    ];
    return {
      routes: attachAlignmentScores(routes, "route_saas_clarity"),
      recommendedRouteId: "route_saas_clarity",
    };
  }

  // 4. Generic / Brand / Visual scenario
  if (isAlternate) {
    const altRoutes: Route[] = [
      {
        id: "route_gen_paper_alt",
        themeName: "素雅原质 · 纸感微雕",
        title: "【特种原质材料与微压凹】极端克制美学",
        visualSnapshot: "大面积纯净材质肌理留白，正面单色侧光微浅压凹，无多余装饰，依靠自然光影产生如雕塑般的静谧耐看度。",
        startingPoint: "特种材料原生肌理与无墨微工艺",
        focusDimension: "实体材料触感与光影微雕",
        coreProblem: "放弃所有花哨的多彩印刷与繁复图案，将视觉品质完全建立在材料的高级触感与阴影明暗上",
        purpose: "以极端克制的材料原生美感与微工艺细节，营造经得起反复凝视的沉静高级体验",
        pros: "在复杂嘈杂的环境中形成独特的‘视觉静默场’，触感极具高级记忆点",
        cons: "对材料白度、肌理细腻度与压凹深度控制极高，缺乏工艺支撑容易显得空洞",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: `${unknownNote}，从原生纸感与微压凹切入，能用最低沟通成本传递纯粹高级感。`,
        steps: [
          {
            id: "step_gen_p_1",
            title: "材质肌理与白度漫反射筛选",
            question: "何种特种材质表面在自然光下呈现最柔和舒适的微颗粒漫反射？",
            purpose: "确立全案第一眼触觉与视觉基底",
            deliverables: ["特种材料对照板", "光影反射测试样张"],
            acceptanceCriteria: ["无刺眼塑料反光", "手感温润自然"],
          },
          {
            id: "step_gen_p_2",
            title: "极简文字骨架与负空间留白",
            question: "核心信息在画面中如何排布以保持 70% 以上呼吸感留白？",
            purpose: "构建从容开阔的版面视觉秩序",
            deliverables: ["版式网格规范稿", "中西文字阶层级对照"],
            acceptanceCriteria: ["留白充盈舒展", "信息层级分明秒读"],
          },
          {
            id: "step_gen_p_3",
            title: "侧光微浅压凹阴影深度校准",
            question: "在常规侧光照射下，压凹边缘形成的微阴影是否清晰立体？",
            purpose: "验证微工艺的视觉细节质感",
            deliverables: ["0.3mm与0.5mm压凹对比稿", "侧光阴影测试图"],
            acceptanceCriteria: ["轮廓锐利无毛边", "阴影微弱而具雕塑感"],
          },
        ],
      },
      {
        id: "route_gen_grid_alt",
        themeName: "秩序档案 · 理性骨架",
        title: "【严谨模块网格与中西字阶】档案式专业信息",
        visualSnapshot: "严谨双栏瑞士网格排版，中西文字阶 2.5 倍对比，冷冽黑白字符清晰罗列关键数据与属性，呈现如权威档案般的可信度。",
        startingPoint: "模块化网格与严格字阶对照",
        focusDimension: "双栏网格与微字阶层级",
        coreProblem: "将繁复信息提炼为严谨理性的视觉骨架，把说明性内容转化为现代档案美感",
        purpose: "通过极端严谨的信息排版与克制色彩，呈现高度专业且耐看的智性美感",
        pros: "信息层级一目了然，阅读效率极高，极具专业权威性与现代干练气质",
        cons: "中西文字标灰度若未调匀，容易流于冰冷生硬的表格感",
        feasibility: "high",
        timeframe: "0.5–1 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_gen_g_1",
            title: "模块化网格与信息骨架设定",
            question: "核心内容如何划分为清晰的主次信息区块？",
            purpose: "确立几何网格与留白率",
            deliverables: ["双栏网格规范稿", "核心信息层级样张"],
            acceptanceCriteria: ["核心信息 0.5 秒内识别", "留白比例保持 50% 以上"],
          },
          {
            id: "step_gen_g_2",
            title: "中西文字阶与灰度平衡",
            question: "现代无衬线西文与中文如何搭配才显平衡协调？",
            purpose: "打磨兼具国际现代感与稳重感的字型组合",
            deliverables: ["中西文字体搭配对照表", "字阶比例规范"],
            acceptanceCriteria: ["视觉重心齐平", "微型小字清晰可读"],
          },
          {
            id: "step_gen_g_3",
            title: "信息视线流向与视觉停顿",
            question: "用户的视线在网格中如何自然从上至下流畅滑动？",
            purpose: "校准阅读动线与版面韵律",
            deliverables: ["视线动线热力分析图", "最终排版效果图"],
            acceptanceCriteria: ["无阅读迷航感", "各模块呼吸感匀称"],
          },
        ],
      },
      {
        id: "route_gen_hammer_alt",
        themeName: "先锋符号 · 瞬间记忆",
        title: "【极简高反差几何符号】秒级识别视觉锤",
        visualSnapshot: "提炼极简且穿透力极强的单一几何视觉符号，高反差黑白对比，在 3 米外一眼识别，过目难忘。",
        startingPoint: "极简几何符号与瞬间视觉穿透",
        focusDimension: "符号化图形与高对比色彩",
        coreProblem: "在众多同质化设计中，用最凝练的单一符号击穿用户注意力，构建秒级记忆资产",
        purpose: "以高反差对比与利落几何形态，打造最具识别度与传播力的现代先锋视觉",
        pros: "穿透力极强，即便在缩略图或远距离下也能瞬间锁定目光，辨识度极高",
        cons: "图形若缺乏内涵支撑，容易显得空泛或过于锐利，需兼顾审美深度",
        feasibility: "medium",
        timeframe: "1–2 天",
        recommendedReason: null,
        steps: [
          {
            id: "step_gen_h_1",
            title: "核心符号形态提炼与几何化",
            question: "如何用最少线条提炼出辨识度极高的几何符号？",
            purpose: "打造标志性几何骨架",
            deliverables: ["符号形态手稿 5 款", "正负形对比测试板"],
            acceptanceCriteria: ["形态极简有力", "在 16px 下依然清晰可辨"],
          },
          {
            id: "step_gen_h_2",
            title: "高反差对比度与视距穿透力",
            question: "在 3 米开外与复杂背景下，符号识别率如何最大化？",
            purpose: "验证强记忆符号的视觉穿透效果",
            deliverables: ["视距辨识对照图", "高反差配色方案 3 组"],
            acceptanceCriteria: ["0.3 秒内瞬间锁定目光", "黑白反差清晰锐利"],
          },
          {
            id: "step_gen_h_3",
            title: "全场景跨介质应用延展",
            question: "在实体物料、移动端屏幕与社媒头像中，符号张力是否统一？",
            purpose: "校准全链路视觉一致性",
            deliverables: ["跨场景延展效果图", "规范应用手册草案"],
            acceptanceCriteria: ["各画幅下视觉重心稳定", "符号记忆点高度统一"],
          },
        ],
      },
    ];
    return {
      routes: attachAlignmentScores(altRoutes, "route_gen_paper_alt"),
      recommendedRouteId: "route_gen_paper_alt",
    };
  }

  const routes: Route[] = [
    {
      id: "route_gen_core",
      themeName: "单一视觉锤 · 极简轮廓",
      title: "【单一极简轮廓】高穿透力视觉锤",
      visualSnapshot: "大面积纯净负空间中居中一枚极度洗练的标志性图形轮廓，即便缩小至 16px 图标或 10 米外远眺也能瞬间认出。",
      startingPoint: "标志性轮廓与第一眼记忆锚定",
      focusDimension: "极简图形符号与轮廓特征",
      coreProblem: "在信息极度过载的环境中，放弃复杂的叙事组合，仅凭一个纯粹的极简轮廓在 0.5 秒内被锁死记忆",
      purpose: "提炼极简且富有个性的独特图形资产，最大化视觉辨识效率与跨介质适应力",
      pros: "记忆锚点锐利清晰，无论缩放到多小或跨越何种材质都能一眼认出，品牌沉淀价值极高",
      cons: "对单一图形形态与负空间精度要求极高，容错率极低，稍有失误就会显得单薄",
      feasibility: "high",
      timeframe: "0.5–1 天",
      recommendedReason: `${unknownNote}，先聚焦于单一核心视觉符号的提炼，能为全案提供最坚实的视觉锚点。`,
      steps: [
        {
          id: "step_gen_c_1",
          title: "核心象征物抽象与极简剪影实验",
          question: "最能代表该任务本质的单一具象或抽象符号形态是什么？",
          purpose: "提取高识别度的极简视觉轮廓",
          deliverables: ["极简符号草稿 5 套", "黑白纯剪影形态对比图"],
          acceptanceCriteria: ["轮廓特征鲜明，不依赖色彩也能秒级识别", "造型简洁耐看无多余碎角"],
        },
        {
          id: "step_gen_c_2",
          title: "16px 与超大画幅极端尺度盲测",
          question: "缩小至 16px 网页图标或在 10 米外观察时，能否依然被瞬间认出？",
          purpose: "验证符号在极端尺度下的视觉张力与辨识度",
          deliverables: ["从 16px 到超大画幅缩放测试图", "高斯模糊视线测试图"],
          acceptanceCriteria: ["16px 极限缩放下主体轮廓依然清晰", "线条无糊边粘连现象"],
        },
        {
          id: "step_gen_c_3",
          title: "跨媒介物料延展视觉统一性",
          question: "从包装贴标、周边物料到社媒头像，该符号能否保持统一的力量？",
          purpose: "验证符号系统的全场景延展能力",
          deliverables: ["平面应用延展规范图 3 组", "包装与物料应用实景效果图"],
          acceptanceCriteria: ["跨媒介应用视觉语言统一", "具备强烈品牌记忆度与一致性"],
        },
      ],
    },
    {
      id: "route_gen_narrative",
      themeName: "真实切片 · 温暖通感",
      title: "【纪实摄影与克制手绘】生活场景通感",
      visualSnapshot: "低饱和温润色调的生活纪实瞬间切片，搭配克制的手写字标与疏朗大留白，散发真诚松弛的人文温度。",
      startingPoint: "真实生活瞬间与情感氛围营造",
      focusDimension: "氛围光影与情绪场景构图",
      coreProblem: "摒弃千篇一律的商业图库摆拍感，通过真实的生活场景切片与微弱手感笔触唤起真诚共鸣",
      purpose: "围绕真实用户的生活瞬间展开视觉叙事，建立深层情绪连接与松弛信任感",
      pros: "情感感染力与生活气息浓厚，极易引发受众共鸣与自发社交分享，气质亲切真诚",
      cons: "画面如果缺乏克制容易显得琐碎杂乱，稀释核心品牌信息，必须配合严谨留白",
      feasibility: "high",
      timeframe: "0.5–1 天",
      recommendedReason: null,
      steps: [
        {
          id: "step_gen_n_1",
          title: "核心生活场景切片与情绪板",
          question: "哪一个用户互动瞬间最具备真诚的感染力与生活呼吸感？",
          purpose: "确立真实生活化的视觉叙事基调",
          deliverables: ["生活场景纪实摄影情绪板 3 组", "低饱和故事化色彩提取卡"],
          acceptanceCriteria: ["场景感真实不造作，情绪真诚", "色调统一温润无刺眼高光"],
        },
        {
          id: "step_gen_n_2",
          title: "克制手绘笔触与排版留白结合",
          question: "何种微弱的手绘线条或手写字标能为规整版面增添人文温度？",
          purpose: "打造具温润温度的视觉细节",
          deliverables: ["克制手绘符号小样 3 套", "图文排版留白规范稿"],
          acceptanceCriteria: ["画面留白充盈，不拥挤喧哗", "手绘元素克制不抢主体焦点"],
        },
        {
          id: "step_gen_n_3",
          title: "版面留白与视线流动测试",
          question: "画面是否为受众留出了恰当的情绪停留空间与呼吸感？",
          purpose: "确保视觉表现耐看不过载",
          deliverables: ["包装与海报平面构图对照稿", "视线流动焦点分析图"],
          acceptanceCriteria: ["大面积留白形成舒适呼吸感", "文字与画面主次分明一目了然"],
        },
      ],
    },
    {
      id: "route_gen_contrast",
      themeName: "经典解构 · 现代几何",
      title: "【经典符号几何重构】高反差现代平面",
      visualSnapshot: "以当代利落的几何线条将传统文化意象彻底拆解重组，高反差明快色彩对撞大留白，先锋现代且张力十足。",
      startingPoint: "传统意象与现代几何碰撞",
      focusDimension: "文化符号解构与现代几何",
      coreProblem: "在保留品类经典文化熟悉感的同时，彻底摆脱古老陈旧的老气感，以当代几何语言重塑新貌",
      purpose: "以当代利落几何排版拆解经典文化符号，创造兼具底蕴与先锋时代感的平面视觉",
      pros: "视觉张力极强，在同质化市场中极具视觉冲击与破圈话题性，现代设计感出众",
      cons: "解构如果过于抽象极端，可能削弱大众第一眼的文化认知，需拿捏现代与经典的平衡",
      feasibility: "medium",
      timeframe: "1–2 天",
      recommendedReason: null,
      steps: [
        {
          id: "step_gen_x_1",
          title: "经典文化意象提取与几何化拆解",
          question: "传统经典符号能被提炼拆解为哪些最纯粹的现代几何形态？",
          purpose: "提炼标志性平面形态骨架",
          deliverables: ["核心符号几何拆解手稿 5 款", "经典与现代对照情绪板"],
          acceptanceCriteria: ["图形简练有力，保留关键识别特征", "彻底摒弃传统繁复与陈旧感"],
        },
        {
          id: "step_gen_x_2",
          title: "高反差撞色与大面积留白韵律",
          question: "何种对比色调组合既能在货架秒级抓人眼球，又保持高级耐看？",
          purpose: "建立具备强烈记忆点的现代色彩体系",
          deliverables: ["主辅色对撞方案 3 组", "明暗对比与留白分布规范"],
          acceptanceCriteria: ["主色调在 3 米外识别清晰锐利", "大面积留白形成舒适视觉平衡"],
        },
        {
          id: "step_gen_x_3",
          title: "多介质平面延展视觉一致性",
          question: "在包装贴标、宣传海报与社媒方图中，该视觉张力是否高度一致？",
          purpose: "验证几何平面符号的全场景适应力",
          deliverables: ["展开平面排版设计稿", "社媒与海报延展实景效果图"],
          acceptanceCriteria: ["在不同画幅中均保持完美构图平衡", "视觉记忆点高度统一锐利"],
        },
      ],
    },
  ];
  return {
    routes: attachAlignmentScores(routes, "route_gen_core"),
    recommendedRouteId: "route_gen_core",
  };
}
