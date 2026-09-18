import type {
  Brief,
  ExplorationRoute,
  PlatformPlan,
  PlatformSource,
  StartingState,
} from "@/types";
import { completeJson } from "./llm";
import { rankSources, SOURCE_REGISTRY, withSearchUrl } from "./sources";
import {
  BriefSchema,
  CanvasChatSchema,
  parseOrThrow,
  PlatformPlanSchema,
  RoutesPayloadSchema,
} from "./schema";

function camelBrief(data: Record<string, unknown>) {
  return {
    goal: data.goal,
    targetUser: data.target_user ?? data.targetUser,
    known: data.known,
    unknown: data.unknown,
    constraints: data.constraints,
    deliverable: data.deliverable,
    openQuestions: data.open_questions ?? data.openQuestions ?? [],
  };
}

function camelRoutes(data: Record<string, unknown>) {
  const routes = Array.isArray(data.routes)
    ? data.routes.map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          title: row.title,
          question: row.question,
          steps: row.steps,
          purpose: row.purpose,
          advantage: row.advantage,
          watchOut: row.watch_out ?? row.watchOut,
          recommendationReason:
            row.recommendation_reason ?? row.recommendationReason,
        };
      })
    : [];
  return {
    recommendedRouteId:
      data.recommended_route_id ?? data.recommendedRouteId ?? null,
    routes,
  };
}

export async function liveParseBrief(raw: string): Promise<Brief> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT 的 Brief Parser。把设计师的自然语言 Brief 结构化。
只返回 JSON：
goal, target_user, known[], unknown[], constraints[], deliverable, open_questions[]。

规则：
- 只提取用户明确说出的内容，不编造品牌名、产品成分、包装结构或视觉结论。
- known：已明确的调性 / 用户 / 事实。
- unknown：仍需通过视觉探索回答的问题，不是执行清单。
- constraints：明确不要什么。
- 信息不足时，open_questions 最多 3 个待确认问题；信息充分则为 []。
- 不要给出最终风格方案。
- 中文输出。`,
    raw,
    "low"
  );
  return parseOrThrow(BriefSchema, camelBrief(data), "Brief");
}

export async function liveGenerateRoutes(
  brief: Brief,
  startingState: StartingState,
  userInitialIdea: string[]
): Promise<{ recommendedRouteId: string | null; routes: ExplorationRoute[] }> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT 的 Route Generator。根据 Brief 的最大视觉不确定性，生成 3 条不同的探索方法。
只返回 JSON：
{
  "recommended_route_id": "route_01" | "route_02" | "route_03" | null,
  "routes": [{
    "id": "route_01",
    "title": "",
    "question": "",
    "steps": ["", "", ""],
    "purpose": "",
    "advantage": "",
    "watch_out": "",
    "recommendation_reason": ""
  }]
}

硬性规则：
1. 正好 3 条，id 为 route_01 / route_02 / route_03。
2. 三条是三种探索方法，不是三个最终风格。禁止标题或步骤使用「自然/极简/高级/甜美」等风格名冒充路线。
3. 三条起点必须不同。起点可来自：品类、元素、竞品、场景、材质、跨品类。
4. 每条 3-5 步，优先 4 步。steps 是要去搜的对象。
5. 每条 question 回答一个明确的探索问题。
6. purpose / advantage / watch_out 各一句。
7. 最多推荐 1 条；推荐理由必须挂钩当前 Brief 的未知项。推荐不等于自动选择。
8. 中文输出。`,
    JSON.stringify({ brief, starting_state: startingState, user_initial_idea: userInitialIdea }, null, 2),
    "low"
  );
  return parseOrThrow(RoutesPayloadSchema, camelRoutes(data), "探索路线");
}

export async function livePlatformPlan(
  brief: Brief,
  selectedRoute: { title: string; steps: string[]; purpose: string } | undefined,
  activeStep: string
): Promise<PlatformPlan> {
  const ranked = rankSources(activeStep, brief);
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT 的 Platform Planner。为当前探索步骤推荐先去哪里搜、搜什么。
参考来源（已按当前步骤粗排，你必须按当前目的重排，不能每次固定同一顺序）：
${ranked
  .map((s, i) => `${i + 1}. ${s.name}｜能力：${s.capabilities.join("/")}｜语言：${s.language}`)
  .join("\n")}

只返回 JSON：
{
  "goal": "",
  "sources": [{
    "rank": 1,
    "name": "Pinterest",
    "label": "视觉扩散",
    "reason": "",
    "queries": [{"query": "search terms", "translation": "中文释义"}]
  }],
  "alternatives": []
}

硬性规则：
1. sources 正好 3 个，角色必须不同。
2. alternatives 2-4 个备选。
3. name 只能来自：${SOURCE_REGISTRY.join("、")}。
4. 排序必须随当前 Route 步骤和 Brief 变化，禁止永远 Pinterest 第一。
5. 每个来源 2-4 个可执行关键词。外文必须有中文释义；中文关键词的 translation 写用途，不要重复。
6. 不要空泛词或机械中英互译。
7. reason 解释「为什么现在先看这里」。
8. 不要求用户访问所有平台。
9. 中文输出（query 可用英文）。`,
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

  const parsed = parseOrThrow(PlatformPlanSchema, data, "平台搜索计划");
  const names = new Set(SOURCE_REGISTRY);
  const sources = parsed.sources
    .filter((s) => names.has(s.name))
    .map((s, i) => withSearchUrl({ ...s, rank: i + 1 }));
  const alternatives = parsed.alternatives
    .filter((s) => names.has(s.name) && !sources.some((x) => x.name === s.name))
    .slice(0, 4)
    .map((s, i) => withSearchUrl({ ...s, rank: i + 4 }));

  if (sources.length !== 3) {
    throw new Error("平台计划来源必须正好 3 个，且名称在来源表内");
  }
  if (alternatives.length < 2) {
    throw new Error("平台计划备选来源必须 2–4 个");
  }

  return { goal: parsed.goal, sources, alternatives };
}

export async function liveCanvasChatRaw(
  message: string,
  canvas: unknown
): Promise<{ reply: string; cards: { title: string; body: string; parentId: string | null }[] }> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT，画布上的视觉探索智能体。你会看见整张无限画布：卡片、连线、当前焦点。
先思考：已有什么、缺什么、用户这句话是开新枝还是收窄。
只返回 JSON：
{
  "reply": "短，像同事。先点明你从画布读到了什么，再说你加了什么。",
  "cards": [{ "title": "", "body": "可执行。若是搜索任务，写出中文词+英文词+建议网站。", "parentId": "已有卡片id" }]
}

硬性规则：
1. 先读 cards[] 和 links[]，禁止伪造不存在的上下文。
2. 默认生成 1-3 张新分支，不重写主流程，不重复已有卡片。
3. 卡片必须可执行。parentId 必须是画布已有 id。
4. 不替用户做最终视觉判断。
5. 中文。`,
    JSON.stringify({ message, canvas }, null, 2),
    "low"
  );
  return parseOrThrow(CanvasChatSchema, data, "画布对话");
}

export type { PlatformSource };
