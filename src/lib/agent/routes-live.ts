import type { Route, RouteStep } from "@/types/routes";
import { completeJson } from "./llm";
import type { z } from "zod";
import type { RoutesInputSchema } from "./routes-schema";

type RoutesInput = z.infer<typeof RoutesInputSchema>;

const SYSTEM = `你是 SIFT 路线探索 Agent。当前设计任务的方向（Design State）已经收敛并由用户正式确认。
你的任务是为该设计任务生成正好 3 条截然不同的探索路线，帮助包装设计师、视觉设计师与平面设计师展开视觉美学层面的探索。

关键受众与范畴约束：
- 目标用户为包装设计师、视觉设计师、平面设计师。
- 严禁涉及工厂生产制造、模具开模、公差测试、单套成本等工业工程步骤，只考虑视觉效果与美学表现。
- 完全聚焦于视觉层面：视觉质感与光影、版式网格系统、字体字阶排版、图形符号隐喻、色彩情绪搭配、开箱视觉序列。
- 表达必须极其简练精炼，避免大段长篇文字，降低视觉负担。

生成规则：
1. 必须生成正好 3 条路线，每条路线拥有截然不同的美学探索起点（startingPoint），例如从“视觉材质与微光质感”、“版式网格与字体秩序”、“图形意象与当代解构”等不同维度切入。
2. 路线标题必须是描述探索方法的“方法型标题”，严禁使用“自然”、“极简”、“高级”、“轻奢”等空洞风格词。
3. 每条路线必须包含 3–5 个具有逻辑递进关系的步骤（steps），每个步骤需指明具体探索问题与目的。
4. 最多推荐 1 条路线（recommendedRouteId），并在该路线中给出 recommendedReason。推荐理由必须具体引用当前任务中尚未确定的未决判断或盲区。
5. 必须且只能返回纯 JSON，格式严格如下：
{
  "routes": [
    {
      "id": "route_1",
      "title": "具体方法型标题",
      "startingPoint": "独特的探索起点",
      "coreProblem": "该路线要解决的核心设计问题",
      "purpose": "该路线的探索目的",
      "pros": "该路线的优势与亮点",
      "cons": "该路线的潜在风险或难点",
      "recommendedReason": "推荐理由，引用任务未决判断；非推荐路线填 null",
      "steps": [
        {
          "id": "step_1_1",
          "title": "步骤一标题",
          "question": "该步骤要探索的具体问题？",
          "purpose": "该步骤的目的"
        },
        {
          "id": "step_1_2",
          "title": "步骤二标题",
          "question": "该步骤要探索的具体问题？",
          "purpose": "该步骤的目的"
        },
        {
          "id": "step_1_3",
          "title": "步骤三标题",
          "question": "该步骤要探索的具体问题？",
          "purpose": "该步骤的目的"
        }
      ]
    }
  ],
  "recommendedRouteId": "route_1 或 null"
}`;

type RecordLike = Record<string, unknown>;
function record(v: unknown): RecordLike {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as RecordLike)
    : {};
}

function nonEmpty(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
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
    "实体材料触感与工艺细节",
    "信息层级架构与排版网格",
    "真实消费场景与用户共鸣",
  ];

  const routes: Route[] = rawRoutes.slice(0, 3).map((r, i) => {
    const routeId = nonEmpty(r.id, `route_${i + 1}`);
    let starting = nonEmpty(r.startingPoint, defaultStarts[i] ?? `探索维度 ${i + 1}`);
    if (seenStarting.has(starting)) {
      starting = `${starting}（维度 ${i + 1}）`;
    }
    seenStarting.add(starting);

    let title = nonEmpty(r.title, `探索路线 ${i + 1}`);
    if (/^(自然|极简|高级|复古|现代|轻奢|科技感|温暖|可爱|优雅|大气|高端)$/.test(title)) {
      title = `${title}风格的系统化转译与落地法`;
    }

    const rawSteps = Array.isArray(r.steps) ? r.steps.map(record) : [];
    const seenStepIds = new Set<string>();
    const seenStepTitles = new Set<string>();
    let steps: RouteStep[] = rawSteps.map((s, si) => {
      let sid = nonEmpty(s.id, `step_${i + 1}_${si + 1}`);
      if (seenStepIds.has(sid)) sid = `${sid}_${si + 1}`;
      seenStepIds.add(sid);

      let stitle = nonEmpty(s.title, `阶段探索 ${si + 1}`);
      if (seenStepTitles.has(stitle)) stitle = `${stitle}（${si + 1}）`;
      seenStepTitles.add(stitle);

      return {
        id: sid,
        title: stitle,
        question: nonEmpty(s.question, "此阶段需要探索什么关键问题？"),
        purpose: nonEmpty(s.purpose, "验证设计可行性"),
      };
    });

    if (steps.length < 3) {
      const needed = 3 - steps.length;
      for (let k = 0; k < needed; k++) {
        const idx = steps.length + 1;
        steps.push({
          id: `step_${i + 1}_${idx}`,
          title: `后续推演与验证 ${idx}`,
          question: "如何对照目标受众验证此方案？",
          purpose: "完善探索闭环",
        });
      }
    } else if (steps.length > 5) {
      steps = steps.slice(0, 5);
    }

    const recReason =
      typeof r.recommendedReason === "string" && r.recommendedReason.trim()
        ? r.recommendedReason.trim()
        : null;

    return {
      id: routeId,
      title,
      startingPoint: starting,
      coreProblem: nonEmpty(r.coreProblem, "如何平衡核心诉求与设计表现？"),
      purpose: nonEmpty(r.purpose, "建立明确的设计探索切入点"),
      pros: nonEmpty(r.pros, "探索切入点明确，便于快速展开视觉检索"),
      cons: nonEmpty(r.cons, "需注意把控细节落地的可行性"),
      recommendedReason: recReason,
      steps,
    };
  });

  // Ensure exactly 3 routes
  while (routes.length < 3) {
    const i = routes.length;
    routes.push({
      id: `route_${i + 1}`,
      title: `全景对比与多维推演法 ${i + 1}`,
      startingPoint: defaultStarts[i] ?? `维度 ${i + 1}`,
      coreProblem: "如何平衡品牌认知与落地限制？",
      purpose: "提供互补的探索切入路径",
      pros: "覆盖面广，易于形成差异化对比",
      cons: "需要兼顾多个要素之间的平衡",
      recommendedReason: null,
      steps: [
        {
          id: `step_${i + 1}_1`,
          title: "核心要素拆解",
          question: "关键矛盾与机会点是什么？",
          purpose: "明确切入点",
        },
        {
          id: `step_${i + 1}_2`,
          title: "视觉参照比对",
          question: "行业优秀案例如何处理同类问题？",
          purpose: "获取标杆灵感",
        },
        {
          id: `step_${i + 1}_3`,
          title: "方案草样验证",
          question: "初步设想是否符合约束？",
          purpose: "验证方向合理性",
        },
      ],
    });
  }

  const recommendedRouteId =
    typeof root.recommendedRouteId === "string" &&
    routes.some((r) => r.id === root.recommendedRouteId)
      ? root.recommendedRouteId
      : routes.find((r) => r.recommendedReason !== null)?.id ?? null;

  if (recommendedRouteId) {
    const recRoute = routes.find((r) => r.id === recommendedRouteId);
    if (recRoute && !recRoute.recommendedReason) {
      recRoute.recommendedReason =
        "结合当前任务的核心诉求与待验证项，该路线最具针对性。";
    }
  }

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
