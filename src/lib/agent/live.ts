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

const TONE = `说话像工作室里带组员搜图的设计师，不要像品牌提案、也不要像大模型。
禁止：品质感如何落地、视觉语言、探索切口、可执行分支、调性边界、系统性、方法论、酒店感、仪式感（除非用户原话里有）。
要用：先看货架 / 先看瓶型 / 先看别人怎么拍 / 别一上来搜氛围图。
标题不超过 8 个字。句子短。能指向具体该搜什么。`;

function list(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function camelBrief(data: Record<string, unknown>) {
  const unknown = list(data.unknown);
  return {
    goal: text(data.goal, "寻找视觉方向"),
    targetUser: text(data.target_user ?? data.targetUser, "待确认目标用户"),
    known: list(data.known),
    unknown: unknown.length ? unknown : ["还不知道先去搜什么"],
    constraints: list(data.constraints),
    deliverable: text(data.deliverable, "先找到能搜的方向"),
    openQuestions: list(data.open_questions ?? data.openQuestions).slice(0, 3),
  };
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function camelRoutes(data: Record<string, unknown>) {
  const routes = Array.isArray(data.routes)
    ? data.routes.map((item, i) => {
        const row = (item ?? {}) as Record<string, unknown>;
        const steps = Array.isArray(row.steps)
          ? row.steps
              .map((s) => (typeof s === "string" ? s.trim() : ""))
              .filter(Boolean)
          : [];
        return {
          id: text(row.id, `route_0${i + 1}`),
          title: text(row.title, `探索方法 ${i + 1}`),
          question: text(row.question, "这一步先去搜什么？"),
          steps,
          purpose: text(row.purpose, "一次只搜一类东西。"),
          advantage: text(row.advantage, "比较好下手。"),
          watchOut: text(row.watch_out ?? row.watchOut, "别把搜到的图当成最终方案。"),
          recommendationReason: text(
            row.recommendation_reason ?? row.recommendationReason,
            "Brief 里这块还没想清楚。"
          ),
        };
      })
    : [];
  const rec = data.recommended_route_id ?? data.recommendedRouteId ?? null;
  return {
    recommendedRouteId: rec === "" ? null : rec,
    routes,
  };
}

export async function liveParseBrief(raw: string): Promise<Brief> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT。把设计师随口说的 Brief 收成一张工作卡。
${TONE}
只返回 JSON：goal, target_user, known[], unknown[], constraints[], deliverable, open_questions[]。

规则：
- 只用用户原话里的词，不拔高、不翻译成提案腔。
- known 用短词：自然、年轻、不要太粉。
- unknown 写成「还不知道先看瓶还是先看场景」这种，不要「视觉语言如何表达」。
- constraints 保留「不要…」。
- open_questions 最多 3 个，像同事追问：有没有现成包装？主要做包装还是主图？
- 不要给风格结论。`,
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
    `你是 SIFT。给马上要打开 Pinterest / 小红书搜图的设计师 3 套搜法。
${TONE}
只返回 JSON：
{
  "recommended_route_id": "route_01" | "route_02" | "route_03" | null,
  "routes": [{
    "id": "route_01",
    "title": "先看货架",
    "question": "同类产品现在长什么样？",
    "steps": ["货架", "瓶型", "材质", "拍照"],
    "purpose": "先看市场上都在卖什么样子",
    "advantage": "下手快，不容易飘",
    "watch_out": "别看完就被大牌带跑",
    "recommendation_reason": "你还不知道先看产品还是先看氛围，建议先看货。"
  }]
}

硬性规则：
1. 正好 3 条。id 为 route_01 / route_02 / route_03。
2. 标题像口令：先看货架 / 先看瓶和材质 / 先看别人怎么拍。不要「从禁忌边界找切口」。
3. 不是三个风格方案。steps 是要搜的东西：货架、瓶型、材质、字体、竞品官网、使用场景。
4. 三条起点必须不同。
5. 每条 3-5 步。purpose / advantage / watch_out / question 各一句大白话。
6. 最多推荐 1 条。理由说人话，挂钩 Brief 里没想清的那件事。
7. 禁止书面词：落地、视觉语言、叙事、气质框架。`,
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
    `你是 SIFT。告诉设计师这一步去哪个站、打什么字。
${TONE}
参考来源（按当前步骤粗排，你必须按目的重排，不能每次同一顺序）：
${ranked
  .map((s, i) => `${i + 1}. ${s.name}｜${s.capabilities.join("/")}｜${s.language}`)
  .join("\n")}

只返回 JSON：
{
  "goal": "这一步去搜货架图",
  "sources": [{
    "rank": 1,
    "name": "小红书",
    "label": "国内货架",
    "reason": "先看国内实际在卖的长什么样",
    "queries": [{"query": "独立香薰 包装", "translation": "搜国内独立香薰包装"}]
  }],
  "alternatives": []
}

硬性规则：
1. sources 正好 3 个，角色不同。alternatives 2-4 个。
2. name 只能来自：${SOURCE_REGISTRY.join("、")}。
3. 排序跟着当前步骤走。看货架就国内站靠前；看项目就 Behance 靠前。
4. 每源 2-4 个词。英文词要能直接粘进 Pinterest。中文释义写「拿去搜什么」，不要复读关键词。
5. 禁止空词：aesthetic, vibe, premium, luxury, editorial, 高级感, 氛围感。
6. reason 一句：为什么现在先来这个站。
7. 不要让用户跑遍所有站。`,
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

  const allowed = new Set(SOURCE_REGISTRY);

  const normalizeQuery = (q: unknown) => {
    if (typeof q === "string" && q.trim()) {
      return { query: q.trim(), translation: q.trim() };
    }
    const row = (q ?? {}) as Record<string, unknown>;
    const query = text(row.query, "");
    if (!query) return null;
    return { query, translation: text(row.translation, query) };
  };

  const normalizeSource = (item: unknown, i: number): PlatformSource | null => {
    const row = (item ?? {}) as Record<string, unknown>;
    const name = text(row.name ?? row.source, "");
    if (!name || !allowed.has(name)) return null;
    let queries = Array.isArray(row.queries)
      ? row.queries.map(normalizeQuery).filter((q): q is { query: string; translation: string } => Boolean(q))
      : [];
    if (queries.length < 2) {
      queries = [
        ...queries,
        { query: `${activeStep} ${name}`, translation: `在${name}检索「${activeStep}」` },
        { query: `${brief.goal} ${activeStep}`, translation: "围绕任务补充检索" },
      ].slice(0, 4);
    }
    return {
      rank: Number(row.rank) || i + 1,
      name,
      label: text(row.label, ranked.find((s) => s.name === name)?.role ?? "参考"),
      reason: text(row.reason, "当前步骤需要这个来源"),
      queries: queries.slice(0, 4),
    };
  };

  let sources = (Array.isArray(data.sources) ? data.sources : [])
    .map(normalizeSource)
    .filter((s): s is PlatformSource => Boolean(s));
  for (const def of ranked) {
    if (sources.length >= 3) break;
    if (sources.some((s) => s.name === def.name)) continue;
    sources.push(
      normalizeSource(
        {
          name: def.name,
          label: def.role,
          queries: [
            { query: activeStep, translation: `检索「${activeStep}」` },
            { query: brief.goal, translation: "围绕任务检索" },
          ],
        },
        sources.length
      ) as PlatformSource
    );
  }
  sources = sources.slice(0, 3).map((s, i) => withSearchUrl({ ...s, rank: i + 1 }));

  let alternatives = (Array.isArray(data.alternatives) ? data.alternatives : [])
    .map(normalizeSource)
    .filter((s): s is PlatformSource => s != null)
    .filter((s) => !sources.some((x) => x.name === s.name));
  for (const def of ranked) {
    if (alternatives.length >= 2) break;
    if (sources.some((s) => s.name === def.name) || alternatives.some((s) => s.name === def.name)) {
      continue;
    }
    alternatives.push(
      normalizeSource(
        {
          name: def.name,
          label: def.role,
          queries: [
            { query: activeStep, translation: `备选检索「${activeStep}」` },
            { query: brief.known[0] ?? brief.goal, translation: "备选方向" },
          ],
        },
        alternatives.length + 4
      ) as PlatformSource
    );
  }
  alternatives = alternatives.slice(0, 4).map((s, i) => withSearchUrl({ ...s, rank: i + 4 }));

  const parsed = parseOrThrow(
    PlatformPlanSchema,
    {
      goal: text(data.goal, `探索「${activeStep}」`),
      sources,
      alternatives,
    },
    "平台搜索计划"
  );
  return parsed;
}

export async function liveCanvasChatRaw(
  message: string,
  canvas: unknown
): Promise<{ reply: string; cards: { title: string; body: string; parentId: string | null }[] }> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT。画布上坐着的搜图搭子。先看已有卡片和连线，再说话。
${TONE}
只返回 JSON：
{
  "reply": "两三句。先说你看见画布上有什么，再说你补了哪两张卡。",
  "cards": [{ "title": "先搜瓶型", "body": "小红书：独立香薰 瓶身\\nPinterest：stone vessel perfume\\n别搜酒店房间。", "parentId": "已有id" }]
}

硬性规则：
1. 先读 cards[] / links[]，别装没看见。
2. 默认加 1-3 张新卡，挂在焦点上。不要重做 Brief 和三条路线。
3. 卡片要能马上拿去搜：站点 + 中文词 + 英文词。
4. parentId 必须是已有 id。
5. 不替用户定风格。禁止提案腔。`,
    JSON.stringify({ message, canvas }, null, 2),
    "low"
  );
  return parseOrThrow(CanvasChatSchema, data, "画布对话");
}

export type { PlatformSource };
