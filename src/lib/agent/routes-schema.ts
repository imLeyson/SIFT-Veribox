import { z } from "zod";
import {
  DecisionContextSchema,
  DesignStateSchema,
  HistoryEntrySchema,
  parseContract,
} from "./convergence-schema";

const text = z.string().trim().min(1);
const shortText = text.max(240);

const GENERIC_STYLE_REGEX =
  /^(自然|极简|高级|复古|现代|轻奢|科技感|温暖|可爱|优雅|大气|高端|简约|清新|质感|时尚|酷炫|潮流)$/;

export const RouteStepSchema = z.object({
  id: text,
  title: text.max(80),
  question: shortText,
  purpose: shortText,
  deliverables: z.array(shortText).optional(),
  acceptanceCriteria: z.array(shortText).optional(),
});

export const RouteSchema = z
  .object({
    id: text,
    title: text.max(80).superRefine((val, ctx) => {
      if (GENERIC_STYLE_REGEX.test(val)) {
        ctx.addIssue({
          code: "custom",
          message: "设计主题标题必须描述探索方法，不能只是空泛的风格词",
        });
      }
    }),
    themeName: text.max(60).optional(),
    visualSnapshot: text.max(300).optional(),
    startingPoint: text.max(120),
    coreProblem: shortText,
    purpose: shortText,
    pros: text.max(300),
    cons: text.max(300),
    recommendedReason: text.max(300).nullable(),
    timeframe: text.max(60).optional(),
    feasibility: z.enum(["high", "medium", "challenging"]).optional(),
    focusDimension: text.max(60).optional(),
    alignmentScore: z.number().min(0).max(100).optional(),
    steps: z
      .array(RouteStepSchema)
      .min(3, "每条路线至少包含 3 个步骤")
      .max(5, "每条路线最多包含 5 个步骤")
      .superRefine((steps, ctx) => {
        const ids = new Set(steps.map((s) => s.id));
        if (ids.size !== steps.length) {
          ctx.addIssue({ code: "custom", message: "路线步骤 ID 重复" });
        }
        const titles = new Set(steps.map((s) => s.title));
        if (titles.size !== steps.length) {
          ctx.addIssue({ code: "custom", message: "路线步骤标题重复" });
        }
      }),
  });

export const PlatformKeywordSchema = z.object({
  keyword: text.max(100),
  meaning: shortText,
  language: z.enum(["zh", "en"]),
  searchType: z.enum(["moodboard", "detail", "consumer", "benchmark"]).optional(),
  dimension: z.enum(["form", "craft", "mood", "reality"]).optional(),
  advancedQuery: text.max(160).optional(),
  calibratedQuery: text.max(100).optional(),
  hitRateConfidence: z.number().min(0).max(100).optional(),
  jevJudgement: text.max(200).optional(),
});

export const PlatformSourceSchema = z.object({
  id: text,
  platform: text.max(60),
  roleTag: text.max(60),
  reason: shortText,
  keywords: z
    .array(PlatformKeywordSchema)
    .min(2, "每个来源至少提供 2 个关键词")
    .max(4, "每个来源最多提供 4 个关键词"),
  searchUrl: text,
  inspirationClues: z
    .object({
      lookFor: text.max(300),
      avoid: text.max(300),
    })
    .optional(),
  lensRole: z.enum(["benchmark", "avant_garde", "proofing"]).optional(),
});

export const PlatformPlanSchema = z
  .object({
    id: text,
    routeId: text,
    stepId: text,
    primarySources: z
      .array(PlatformSourceSchema)
      .length(3, "必须返回正好 3 个主来源"),
    alternativeSources: z
      .array(PlatformSourceSchema)
      .min(2, "至少返回 2 个备选来源")
      .max(4, "最多返回 4 个备选来源"),
    systemOne: z
      .object({
        engine: z.enum(["jev-cloud", "jev-native"]),
        latencyMs: z.number(),
        confidence: z.number().optional(),
        scores: z.record(z.string(), z.number()).optional(),
        matchPercentages: z.record(z.string(), z.number()).optional(),
      })
      .optional(),
  })
  .superRefine((plan, ctx) => {
    const primaryRoles = new Set(plan.primarySources.map((s) => s.roleTag));
    if (primaryRoles.size !== plan.primarySources.length) {
      ctx.addIssue({
        code: "custom",
        message: "3 个主来源的角色必须互不相同",
      });
    }
    const allPlatforms = [
      ...plan.primarySources.map((s) => s.platform),
      ...plan.alternativeSources.map((s) => s.platform),
    ];
    if (new Set(allPlatforms).size !== allPlatforms.length) {
      ctx.addIssue({
        code: "custom",
        message: "主来源与备选来源平台不能重复",
      });
    }
  });

export const RoutesInputSchema = z
  .object({
    sessionId: text,
    requestId: text,
    baseRevision: z.number().int().nonnegative(),
    rawBrief: text.max(10000),
    state: DesignStateSchema,
    history: z.array(HistoryEntrySchema).optional(),
    excludeThemeNames: z.array(text).optional(),
    refreshIndex: z.number().int().nonnegative().optional(),
    decisions: DecisionContextSchema.optional(),
    images: z.array(z.string()).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.state.status !== "confirmed") {
      ctx.addIssue({
        code: "custom",
        message: "必须在方向确认后才能生成探索路线",
      });
    }
  });

export const RoutesResultSchema = z
  .object({
    sessionId: text,
    requestId: text,
    routes: z.array(RouteSchema).length(3, "必须生成正好 3 条探索路线"),
    recommendedRouteId: text.nullable(),
    mode: z.enum(["live", "mock"]),
    model: z.string().nullable(),
  })
  .superRefine((result, ctx) => {
    const startingPoints = new Set(result.routes.map((r) => r.startingPoint));
    if (startingPoints.size !== result.routes.length) {
      ctx.addIssue({
        code: "custom",
        message: "三条路线的探索起点必须不同",
      });
    }
    if (result.recommendedRouteId) {
      const rec = result.routes.find((r) => r.id === result.recommendedRouteId);
      if (!rec) {
        ctx.addIssue({
          code: "custom",
          message: "推荐路线必须是 3 条路线之一",
        });
      } else if (!rec.recommendedReason || !rec.recommendedReason.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "推荐路线必须给出推荐理由",
        });
      }
    }
  });

export const PlatformPlanInputSchema = z
  .object({
    sessionId: text,
    requestId: text,
    state: DesignStateSchema,
    selectedRoute: RouteSchema,
    currentStep: RouteStepSchema,
    completedStepIds: z.array(text).default([]),
    decisions: DecisionContextSchema.optional(),
    images: z.array(z.string()).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.state.status !== "confirmed") {
      ctx.addIssue({
        code: "custom",
        message: "必须在方向确认后才能生成搜索计划",
      });
    }
  });

export const PlatformPlanResultSchema = z.object({
  sessionId: text,
  requestId: text,
  plan: PlatformPlanSchema,
  mode: z.enum(["live", "mock"]),
  model: z.string().nullable(),
});

export { parseContract };
