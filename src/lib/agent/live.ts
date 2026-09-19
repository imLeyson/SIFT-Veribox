import type {
  Brief,
  ExplorationRoute,
  PlatformPlan,
  PlatformSource,
  StartingState,
} from "@/types";
import { completeJson } from "./llm";
import { rankSources, SOURCE_REGISTRY, withSearchUrl } from "./sources";
import { craftGuide, craftLabel, inferCraft } from "./craft";
import { dedupeQuestions, normalizeQuestions } from "./questions";
import type { AgentAnswer, AgentContext, AgentQuestion } from "@/types";
import {
  BriefSchema,
  CanvasChatSchema,
  parseOrThrow,
  PlatformPlanSchema,
  RoutesPayloadSchema,
} from "./schema";

const TONE = `直接说理解、具体问题和下一步。不要固定以「我看到了」开头。
不要提案腔、空泛赞美、口号、亲昵称呼。
专业词该用就用，不要为了去 AI 味牺牲准确性。
不要强制八字标题，不要把所有未知都写成「不知道搜什么」。
区分：用户已经说的事实、你的建议、还没确认的假设。`;

function list(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function camelBrief(data: Record<string, unknown>) {
  const unknown = list(data.unknown);
  const clarifyQuestions = normalizeClarify(
    data.clarify_questions ?? data.clarifyQuestions
  );
  const openQuestions = list(data.open_questions ?? data.openQuestions).slice(
    0,
    3
  );
  return {
    goal: text(data.goal, "寻找视觉方向"),
    targetUser: text(data.target_user ?? data.targetUser, "待确认目标用户"),
    known: list(data.known),
    unknown,
    constraints: list(data.constraints),
    deliverable: text(data.deliverable, "先找到能搜的方向"),
    preferences: list(data.preferences),
    assumptions: list(data.assumptions),
    openQuestions: openQuestions.length
      ? openQuestions
      : clarifyQuestions.map((q) => q.prompt),
    clarifyQuestions,
  };
}

function normalizeClarify(value: unknown): Brief["clarifyQuestions"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, i) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const prompt = text(row.prompt ?? row.question, "");
      const options = list(row.options);
      if (!prompt || options.length < 2) return null;
      return {
        id: text(row.id, `q${i + 1}`),
        prompt,
        options: options.slice(0, 5),
      };
    })
    .filter((q): q is Brief["clarifyQuestions"][number] => Boolean(q))
    .slice(0, 4);
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

// 模型不总是照抄 prompt 里的字段名。这里只做同义映射，绝不替它编内容：
// 缺字段就留空，让卡片少显示一行，而不是填一句放在任何项目都成立的话。
const ROUTE_KEYS = {
  title: ["title", "origin", "name"],
  question: ["question", "exploration_question", "key_question"],
  steps: ["steps", "next_steps", "actions"],
  purpose: ["purpose", "why", "intent"],
  advantage: ["advantage", "pros", "benefit", "strength"],
  watchOut: ["watch_out", "watchOut", "risk", "pitfall", "cons"],
  recommendationReason: [
    "recommendation_reason",
    "recommendationReason",
    "rationale",
  ],
} as const;

function pickText(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickList(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = row[key];
    if (!Array.isArray(value)) continue;
    const items = value
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
    if (items.length) return items;
  }
  return [];
}

function camelRoutes(data: Record<string, unknown>) {
  const routes = Array.isArray(data.routes)
    ? data.routes.map((item, i) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          id: text(row.id, `route_0${i + 1}`),
          title: pickText(row, ROUTE_KEYS.title) || `探索方法 ${i + 1}`,
          question: pickText(row, ROUTE_KEYS.question),
          steps: pickList(row, ROUTE_KEYS.steps),
          purpose: pickText(row, ROUTE_KEYS.purpose),
          advantage: pickText(row, ROUTE_KEYS.advantage),
          watchOut: pickText(row, ROUTE_KEYS.watchOut),
          recommendationReason: pickText(row, ROUTE_KEYS.recommendationReason),
        };
      })
    : [];
  const rec = data.recommended_route_id ?? data.recommendedRouteId ?? null;
  return {
    recommendedRouteId: rec === "" ? null : rec,
    routes,
  };
}

export async function liveParseBrief(
  raw: string
): Promise<{ brief: Brief; questions: AgentQuestion[] }> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT。整理 Brief。只保留用户明确说过的事实。把缺失信息和探索问题分开。
${TONE}
只返回 JSON：
{
  "goal": "",
  "target_user": "",
  "known": [],
  "unknown": [],
  "constraints": [],
  "deliverable": "",
  "preferences": [],
  "assumptions": [],
  "questions": [
    {
      "id": "brief_q1",
      "prompt": "",
      "options": [
        { "id": "a", "label": "", "rationale": "选这个会怎样", "recommended": false }
      ]
    }
  ]
}

提问规则：
- 只有答案会改变后续规划时才问。优先：目标、受众、交付范围、互相打架的限制。
- 用户已经写清的受众、不要项、产品类型、交付物、渠道不要再问。
- 信息够就 questions=[]。宁可少问。目标、受众、品类、不要项都清楚时，最多 1 道仍会改路线的题；没有就空数组。
- 每轮 1–3 题，每题 2–4 个有实际差异的选项。
- 选项贴这个 Brief 的工种，不要把所有项目都问成「先看页面还是流程」。
- 不要替用户提交推荐项。`,
    raw,
    "low"
  );
  const brief = parseOrThrow(BriefSchema, camelBrief(data), "Brief");
  const questions = normalizeQuestions(
    data.questions ?? data.clarify_questions,
    "brief",
    "card-brief"
  );
  return { brief, questions };
}

function askedFrom(ctx?: AgentContext, extra?: AgentAnswer[]) {
  return [
    ...(ctx?.askedQuestions ?? []),
    ...((ctx?.answers ?? extra ?? []).map((a) => ({ id: a.questionId }))),
  ];
}

export async function liveClarifyBrief(
  brief: Brief,
  answers: unknown[],
  round: number,
  previousQuestions: AgentQuestion[] = []
): Promise<{ brief: Brief; questions: AgentQuestion[]; stall: boolean }> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT。用户用选项/自定义/暂不确定做了回答。更新理解，决定还要不要问。
${TONE}
只返回 JSON：{ "brief": { goal, target_user, known, unknown, constraints, deliverable, preferences, assumptions }, "questions": [] }

规则：
- 选项进 preferences 或 known：用户明确的事实进 known；偏好进 preferences；你提出的未确认内容进 assumptions。不要一律写成 known。
- 暂不确定不要编答案。
- 只有还会改变路线时才继续问。questions 1–3 题，每题 2–4 选项，不要重复已问过的题。
- 信息够则 questions=[]。
- 不要强制在第 2 轮结束；不要替用户提交推荐项。`,
    JSON.stringify({ brief, answers, round, previous_questions: previousQuestions }, null, 2),
    "low"
  );
  const briefRaw = (data.brief ?? data) as Record<string, unknown>;
  const next = parseOrThrow(BriefSchema, camelBrief(briefRaw), "Brief");
  const questions = dedupeQuestions(
    normalizeQuestions(data.questions, "brief", "card-brief"),
    previousQuestions
  );
  const stall = round >= 2 && questions.length > 0;
  return { brief: next, questions, stall };
}

export async function liveGenerateRoutes(
  brief: Brief,
  startingState: StartingState,
  userInitialIdea: string[],
  ctx: AgentContext = {}
): Promise<{
  payload: { recommendedRouteId: string | null; routes: ExplorationRoute[] } | null;
  questions: AgentQuestion[];
}> {
  const craft = inferCraft(
    brief.goal,
    brief.deliverable,
    brief.known.join(" "),
    brief.unknown.join(" ")
  );
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT。根据主要不确定性生成三种不同探索方法。不要套固定模板。
${TONE}
判断：更像「${craftLabel(craft)}」。${craftGuide(craft)}

只返回 JSON。如果有一个未决选择会改变三条路线，先问，不要硬编路线：
{ "questions": [{ "id": "routes_q1", "prompt": "", "options": [{ "id": "a", "label": "", "rationale": "" }] }], "routes": [] }

信息够则按这个结构给三条路线，字段名照抄，不要改名、不要加字段：
{
  "questions": [],
  "recommended_route_id": "route_01",
  "routes": [
    {
      "id": "route_01",
      "title": "从什么切入，一句话，不是风格名",
      "question": "这条路线要回答的那个探索问题",
      "steps": ["一个能直接去搜或去做的动作", "第二个动作", "第三个动作"],
      "purpose": "为什么这条路线这么排",
      "advantage": "这么探索的好处",
      "watch_out": "这么探索容易踩的坑",
      "recommendation_reason": "为什么推荐它，对应 Brief 的哪个未知项；不推荐就留空"
    }
  ]
}

硬性规则：
1. 只有未决选择会改变路线时才提问。不能把「先看页面还是流程」当成所有项目的固定问题。
2. 有路线时正好 3 条，起点不同，不是三个风格名。
3. steps 必须是字符串数组，每条路线 3-5 步。每步一句话、不超过 30 字，写清去哪里、看什么、比什么差异。不要写成一段话，不要只写「调研」「收集参考」这类空动作。
4. title 不超过 18 字。purpose、advantage、watch_out 各一句话、不超过 40 字，都要跟这份 Brief 有关。写不出具体的就省略该字段，不要用「一次只搜一类东西」「比较好下手」这种放在任何项目都成立的话凑数。
5. 整体保持短：三张卡要能一眼看完，不要写成长报告。
6. 推荐理由对应这份 Brief，区分事实和建议。
7. 非包装不要出现货架/瓶型。
8. 不要重复已经问过的题。force=true 时不要再问，直接给三条路线。`,
    JSON.stringify(
      {
        brief,
        starting_state: startingState,
        user_initial_idea: userInitialIdea,
        answers: ctx.answers ?? [],
        asked_questions: ctx.askedQuestions ?? [],
        recent_messages: ctx.recentMessages ?? [],
        canvas: ctx.canvas ?? null,
        force: Boolean(ctx.force),
        craft: craftLabel(craft),
      },
      null,
      2
    ),
    "low"
  );
  const questions = ctx.force
    ? []
    : dedupeQuestions(normalizeQuestions(data.questions, "routes"), askedFrom(ctx));
  if (questions.length) return { payload: null, questions };
  return {
    payload: parseOrThrow(RoutesPayloadSchema, camelRoutes(data), "探索路线"),
    questions: [],
  };
}

export async function livePlatformPlan(
  brief: Brief,
  selectedRoute: { title: string; steps: string[]; purpose: string } | undefined,
  activeStep: string,
  ctx: AgentContext = {}
): Promise<{ plan: PlatformPlan | null; questions: AgentQuestion[] }> {
  const ranked = rankSources(activeStep, brief);
  const craft = inferCraft(
    brief.goal,
    brief.deliverable,
    selectedRoute?.title ?? "",
    activeStep
  );
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT。结合选定路线、当前步骤和用户偏好生成搜索任务。
${TONE}
工种：${craftLabel(craft)}。${craftGuide(craft)}
仅在语言、地区、平台能不能用会改变结果时提问：
{ "questions": [{ "id": "platform_q1", "prompt": "", "options": [{ "id": "a", "label": "", "rationale": "" }] }], "sources": [] }
信息够则 questions=[] 并给出 sources。
参考来源（按当前步骤粗排，必须按目的重排）：
${ranked
  .map((s, i) => `${i + 1}. ${s.name}｜${s.capabilities.join("/")}｜${s.language}`)
  .join("\n")}

只返回 JSON：
{
  "goal": "这一步去搜什么",
  "sources": [{
    "rank": 1,
    "name": "小红书",
    "label": "国内案例",
    "reason": "先看国内实际长什么样",
    "queries": [{"query": "记账 app 首页", "translation": "搜国内记账首页"}]
  }],
  "alternatives": []
}

硬性规则：
1. sources 正好 3 个，角色不同。alternatives 2-4 个。
2. name 只能来自：${SOURCE_REGISTRY.join("、")}。
3. 排序跟着当前步骤走。看货架就国内站靠前；看项目就 Behance 靠前。
4. 每源 2-4 个词。英文词要能直接粘进 Pinterest。中文释义写「拿去搜什么」，不要复读关键词。
5. 禁止空词：aesthetic, vibe, premium, luxury, editorial, 高级感, 氛围感。
6. 词要从 Brief 里的产品/对象来。App 就搜页面和流程，不要搜瓶子和货架。
7. reason 一句：为什么现在先来这个站。
8. 不要让用户跑遍所有站。
9. 不要重复已经问过的题。force=true 时不要再问，直接给搜索计划。`,
    JSON.stringify(
      {
        brief,
        selected_route: selectedRoute ?? null,
        active_step: activeStep,
        answers: ctx.answers ?? [],
        asked_questions: ctx.askedQuestions ?? [],
        recent_messages: ctx.recentMessages ?? [],
        canvas: ctx.canvas ?? null,
        force: Boolean(ctx.force),
      },
      null,
      2
    ),
    "low"
  );

  const questions = ctx.force
    ? []
    : dedupeQuestions(
        normalizeQuestions(data.questions, "platform"),
        askedFrom(ctx)
      );
  if (questions.length) {
    return { plan: null, questions };
  }

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
      goal: text(data.goal, `这一步搜「${activeStep}」`),
      sources,
      alternatives,
    },
    "平台搜索计划"
  );
  return { plan: parsed, questions: [] };
}

export async function liveCanvasChatRaw(
  message: string,
  canvas: unknown,
  ctx: AgentContext = {}
): Promise<{
  reply: string;
  cards: { title: string; body: string; parentId: string | null }[];
  questions: AgentQuestion[];
  intent: "answer" | "ask" | "edit" | "compare" | "deepen";
}> {
  const data = await completeJson<Record<string, unknown>>(
    `你是 SIFT。先判断用户是在询问、解释、修改、比较还是深化。
${TONE}
只返回 JSON：
{
  "intent": "answer" | "ask" | "edit" | "compare" | "deepen",
  "reply": "",
  "questions": [],
  "cards": []
}

规则：
- 普通问答：intent=answer，只回复，cards=[]。
- 需要澄清：intent=ask，给 1–3 道点选题，先问再做。不要重复已问过的题。
- 明确要求新增内容：intent=deepen 或 edit，只在相关分支加卡，不要每次默认 1–3 张。
- compare 只比较，不加卡，除非用户明确要求新增。
- 不要重做 Brief 和三条主路线。
- parentId 必须是已有卡片 id。`,
    JSON.stringify(
      {
        message,
        canvas,
        answers: ctx.answers ?? [],
        asked_questions: ctx.askedQuestions ?? [],
        recent_messages: ctx.recentMessages ?? [],
      },
      null,
      2
    ),
    "low"
  );
  const parsed = parseOrThrow(CanvasChatSchema, data, "画布对话");
  const intent =
    parsed.intent ??
    (Array.isArray(data.questions) && data.questions.length ? "ask" : parsed.cards.length ? "deepen" : "answer");
  return {
    reply: parsed.reply,
    cards: parsed.cards,
    questions: normalizeQuestions(data.questions, "chat"),
    intent,
  };
}

export type { PlatformSource };
