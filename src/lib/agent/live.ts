import type {
  Brief,
  ExplorationRoute,
  PlatformPlan,
  PlatformSource,
  SearchQuery,
  StartingState,
} from "@/types";
import { completeJson } from "./llm";
import { SOURCE_REGISTRY, withSearchUrl } from "./sources";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export async function liveParseBrief(raw: string): Promise<Brief> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 Veribox 的 Brief Parser。把设计师的自然语言 Brief 结构化。
只返回 JSON，字段：
goal, target_user, known[], unknown[], constraints[], deliverable。

规则：
- 只提取 Brief 里已经说清或明确未决的信息，不要编造品牌名、成分、包装结构。
- known：已明确的调性 / 用户 / 事实，短词或短句。
- unknown：仍需通过视觉探索回答的问题，不是项目执行清单。
- constraints：明确不要什么。
- 不要给出最终风格方案。
- 中文输出。`,
    raw,
    "low"
  );

  return {
    goal: asString(data.goal) || "寻找视觉方向",
    targetUser: asString(data.target_user ?? data.targetUser) || "待确认目标用户",
    known: asStringList(data.known),
    unknown: asStringList(data.unknown),
    constraints: asStringList(data.constraints),
    deliverable: asString(data.deliverable) || "视觉探索方向",
  };
}

export async function liveGenerateRoutes(
  brief: Brief,
  startingState: StartingState,
  userInitialIdea: string[]
): Promise<{ recommendedRouteId: string | null; routes: ExplorationRoute[] }> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 Veribox 的搜索方案生成器。设计师马上要去 Pinterest / Behance / 小红书搜参考。
根据 Brief 生成 3 套「搜索顺序方案」，让人勾选一套后就能按顺序去搜。
只返回 JSON：
{
  "recommended_route_id": "route_01" | "route_02" | "route_03" | null,
  "routes": [
    {
      "id": "route_01",
      "title": "",
      "question": "",
      "steps": ["", "", "", ""],
      "purpose": "",
      "advantage": "",
      "watch_out": "",
      "recommendation_reason": ""
    }
  ]
}

硬性规则：
1. 必须正好 3 套方案，id 为 route_01 / route_02 / route_03。
2. 三套的起点必须不同。常见起点：品类/竞品、气质/调性、结构/材质、摄影/画面、字体/图形。
3. 每套 3-4 步。steps 是要去搜的对象（短词），不是最终风格名。禁止「自然/极简/高级」当步骤。
4. 这是搜索顺序，不是三个设计方案。
5. purpose、advantage、watch_out 各一句，短。
6. 最多推荐 1 套；推荐不等于自动选择。
7. recommendation_reason 说明为什么这套顺序更适合当前任务。
8. 中文输出。`,
    JSON.stringify(
      {
        brief,
        starting_state: startingState,
        user_initial_idea: userInitialIdea,
      },
      null,
      2
    ),
    "medium"
  );

  const routesRaw = Array.isArray(data.routes) ? data.routes : [];
  const routes: ExplorationRoute[] = routesRaw.slice(0, 3).map((item, i) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const steps = asStringList(row.steps).slice(0, 5);
    return {
      id: asString(row.id) || `route_0${i + 1}`,
      title: asString(row.title) || `探索路线 ${i + 1}`,
      question: asString(row.question),
      steps: steps.length >= 3 ? steps : ["风格", "色彩", "摄影", "字体"],
      purpose: asString(row.purpose),
      advantage: asString(row.advantage),
      watchOut: asString(row.watch_out ?? row.watchOut),
      recommendationReason: asString(
        row.recommendation_reason ?? row.recommendationReason
      ),
    };
  });

  if (routes.length !== 3) {
    throw new Error("模型没有生成 3 条探索路线");
  }

  const rec = asString(data.recommended_route_id ?? data.recommendedRouteId);
  const recommendedRouteId = routes.some((r) => r.id === rec) ? rec : routes[0].id;

  return { recommendedRouteId, routes };
}

function normalizeSource(
  item: unknown,
  rank: number
): PlatformSource | null {
  const row = (item ?? {}) as Record<string, unknown>;
  const name = asString(row.name ?? row.source);
  if (!name) return null;
  const queryObjs: SearchQuery[] = Array.isArray(row.queries)
    ? row.queries
        .map((q) => {
          if (typeof q === "string") {
            return { query: q, translation: q };
          }
          const obj = (q ?? {}) as Record<string, unknown>;
          const query = asString(obj.query);
          if (!query) return null;
          return {
            query,
            translation: asString(obj.translation) || query,
          };
        })
        .filter((q): q is SearchQuery => Boolean(q))
        .slice(0, 4)
    : [];

  return {
    rank: Number(row.rank) || rank,
    name,
    label: asString(row.label) || "参考来源",
    reason: asString(row.reason),
    queries: queryObjs,
  };
}

export async function livePlatformPlan(
  brief: Brief,
  selectedRoute: { title: string; steps: string[]; purpose: string } | undefined,
  activeStep: string
): Promise<PlatformPlan> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 Veribox 的搜索执行器。设计师选好了搜索顺序，现在要执行其中一步。
为当前步骤给出「去哪个站、打什么中文/英文词」。人会复制关键词并离开去搜，不要替他决定风格。
只返回 JSON：
{
  "goal": "",
  "sources": [
    {
      "rank": 1,
      "name": "Pinterest",
      "label": "视觉扩散",
      "reason": "",
      "queries": [{"query": "english or native search terms", "translation": "中文释义"}]
    }
  ],
  "alternatives": []
}

硬性规则：
1. sources 正好 3 个，rank 1-3，角色必须不同。
2. alternatives 2-4 个备选来源。
3. name 只能来自：${SOURCE_REGISTRY.join("、")}。
4. 顺序必须跟随当前探索目的变化，不要每次都是固定排行榜。
5. 每个来源 2-4 个关键词。外文关键词必须有中文释义；若关键词本身是中文，translation 用一句用途说明，不要重复关键词。
6. 关键词要平台化，不要机械中英互译，也不要一次生成大量词。
7. reason 必须解释「为什么现在先看这里」，短句。
8. 中文输出（query 可用英文）。`,
    JSON.stringify(
      {
        brief,
        selected_route: selectedRoute ?? null,
        active_step: activeStep,
      },
      null,
      2
    ),
    "low"
  );

  const sources = (Array.isArray(data.sources) ? data.sources : [])
    .map((item, i) => normalizeSource(item, i + 1))
    .filter((s): s is PlatformSource => Boolean(s))
    .slice(0, 3)
    .map((s, i) => withSearchUrl({ ...s, rank: i + 1 }));

  let alternatives = (Array.isArray(data.alternatives) ? data.alternatives : [])
    .map((item, i) => normalizeSource(item, i + 4))
    .filter((s): s is PlatformSource => Boolean(s))
    .map((s, i) => withSearchUrl({ ...s, rank: i + 4 }));

  if (alternatives.length === 0) {
    const used = new Set(sources.map((s) => s.name));
    alternatives = SOURCE_REGISTRY.filter((name) => !used.has(name))
      .slice(0, 3)
      .map((name, i) =>
        withSearchUrl({
          rank: i + 4,
          name,
          label: "备选来源",
          reason: "当前步骤的补充入口",
          queries: sources[0]?.queries?.slice(0, 2) ?? [],
        })
      );
  }

  if (sources.length < 3) {
    throw new Error("模型没有生成足够的搜索来源");
  }

  return {
    goal: asString(data.goal) || `探索「${activeStep}」`,
    sources,
    alternatives,
  };
}
