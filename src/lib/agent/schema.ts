import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const QuestionOptionSchema = z.object({
  id: nonEmpty,
  label: nonEmpty,
  rationale: z.string().optional(),
  recommended: z.boolean().optional(),
});

export const AgentQuestionSchema = z.object({
  id: nonEmpty,
  stage: z.enum(["brief", "routes", "platform", "chat"]),
  cardId: z.string().nullable().optional(),
  prompt: nonEmpty,
  options: z.array(QuestionOptionSchema).min(2).max(4),
});

export const AgentAnswerSchema = z.object({
  questionId: nonEmpty,
  kind: z.enum(["option", "custom", "uncertain"]),
  optionId: z.string().optional(),
  custom: z.string().optional(),
});

export const ClarifyQuestionSchema = z.object({
  id: nonEmpty,
  prompt: nonEmpty,
  options: z.array(nonEmpty).min(2).max(5),
});

export const BriefSchema = z.object({
  goal: nonEmpty,
  targetUser: nonEmpty,
  known: z.array(nonEmpty),
  unknown: z.array(z.string().trim()),
  constraints: z.array(z.string().trim()),
  deliverable: nonEmpty,
  preferences: z.array(z.string().trim()).default([]),
  assumptions: z.array(z.string().trim()).default([]),
  openQuestions: z.array(nonEmpty).max(3).default([]),
  clarifyQuestions: z.array(ClarifyQuestionSchema).max(4).default([]),
});

export const RouteSchema = z.object({
  id: z.string().regex(/^route_0[1-3]$/),
  title: nonEmpty,
  question: nonEmpty,
  steps: z.array(nonEmpty).min(3).max(5),
  purpose: nonEmpty,
  advantage: nonEmpty,
  watchOut: nonEmpty,
  recommendationReason: nonEmpty,
});

const STYLE_AS_ROUTE =
  /^(自然|极简|高级|甜美|赛博|ins风|日系|韩系|奢华|可爱)$/i;

export const RoutesPayloadSchema = z
  .object({
    recommendedRouteId: z
      .enum(["route_01", "route_02", "route_03"])
      .nullable(),
    routes: z.array(RouteSchema).length(3),
  })
  .superRefine((value, ctx) => {
    const ids = new Set(value.routes.map((r) => r.id));
    if (ids.size !== 3) {
      ctx.addIssue({
        code: "custom",
        message: "三条路线的 id 必须互不相同",
      });
    }
    const starts = value.routes.map((r) => r.steps[0]);
    if (new Set(starts).size !== 3) {
      ctx.addIssue({
        code: "custom",
        message: "三条路线的探索起点必须不同",
      });
    }
    for (const route of value.routes) {
      if (STYLE_AS_ROUTE.test(route.title.trim())) {
        ctx.addIssue({
          code: "custom",
          message: `路线标题不能是最终风格名：${route.title}`,
        });
      }
    }
    if (
      value.recommendedRouteId &&
      !value.routes.some((r) => r.id === value.recommendedRouteId)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "推荐路线必须存在于三条路线中",
      });
    }
  });

export const QuerySchema = z.object({
  query: nonEmpty,
  translation: nonEmpty,
});

export const PlatformSourceSchema = z.object({
  rank: z.number().int().positive(),
  name: nonEmpty,
  label: nonEmpty,
  reason: nonEmpty,
  queries: z.array(QuerySchema).min(2).max(4),
  searchUrl: z.string().optional(),
});

export const PlatformPlanSchema = z.object({
  goal: nonEmpty,
  sources: z.array(PlatformSourceSchema).length(3),
  alternatives: z.array(PlatformSourceSchema).min(2).max(4),
});

export const CanvasChatCardSchema = z.object({
  title: nonEmpty,
  body: nonEmpty,
  parentId: z.string().nullable(),
});

export const CanvasChatSchema = z.object({
  reply: nonEmpty,
  cards: z.array(CanvasChatCardSchema).max(3).default([]),
  intent: z
    .enum(["answer", "ask", "edit", "compare", "deepen"])
    .optional(),
});

export const EnvelopeMetaSchema = z.object({
  questions: z.array(AgentQuestionSchema).max(3).default([]),
  requestId: nonEmpty,
  sessionVersion: z.number().int().nonnegative(),
  mode: z.enum(["live", "mock"]),
  model: z.string().nullable(),
});

export function parseOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => i.message)
      .slice(0, 3)
      .join("；");
    throw new Error(`${label}不符合约定：${detail}`);
  }
  return result.data;
}
