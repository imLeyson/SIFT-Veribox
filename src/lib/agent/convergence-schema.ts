import { z } from "zod";

const text = z.string().trim().min(1);
const shortText = text.max(240);
export const JudgmentSchema = z.object({
  text: shortText,
  basis: z.enum(["user", "assumption"]),
  sourceIds: z.array(text).min(1),
});
export const UncertaintySchema = z.object({
  id: text,
  topic: shortText,
  impact: z.enum(["blocking", "material", "minor"]),
  decisionAffected: shortText,
  status: z.enum(["open", "deferred"]),
});
export const DesignStateSchema = z.object({
  revision: z.number().int().nonnegative(),
  status: z.enum(["questioning", "checkpoint", "confirmed"]),
  brief: z.object({
    goal: shortText.nullable(),
    audience: shortText.nullable(),
    deliverable: shortText.nullable(),
  }),
  constraints: z.array(JudgmentSchema),
  direction: z.object({
    intent: JudgmentSchema.nullable(),
    priorities: z.array(JudgmentSchema),
    avoid: z.array(JudgmentSchema),
    criteria: z.array(JudgmentSchema),
  }),
  currentHypothesis: z.string().trim().max(240).nullable(),
  validationAction: z
    .object({
      label: text.max(80),
      instruction: shortText,
    })
    .nullable(),
  uncertainties: z
    .array(UncertaintySchema)
    .refine(
      (items) => new Set(items.map((x) => x.id)).size === items.length,
      "未决判断 ID 重复",
    ),
});
export const QuestionSchema = z.object({
  id: text,
  uncertaintyId: text,
  prompt: text.max(80),
  constraintRefs: z.array(shortText).default([]),
  options: z
    .array(z.object({ id: text, label: text.max(32) }))
    .max(3)
    .refine((items) => items.length !== 1, "选项应为 0 个或 2–3 个")
    .refine(
      (items) => new Set(items.map((x) => x.id)).size === items.length,
      "选项 ID 重复",
    ),
});
export const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({ questionId: text, kind: z.literal("option"), optionId: text }),
  z.object({
    questionId: text,
    kind: z.literal("custom"),
    text: text.max(2000),
  }),
  z.object({ questionId: text, kind: z.literal("uncertain") }),
]);
export const AnswerBatchSchema = z
  .object({
    answers: z.array(AnswerSchema).min(2).max(3),
  })
  .superRefine(({ answers }, ctx) => {
    if (new Set(answers.map((answer) => answer.questionId)).size !== answers.length)
      ctx.addIssue({ code: "custom", message: "同一轮不能重复回答同一题" });
  });
export const EventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({
    type: z.literal("answer"),
    answers: z.array(AnswerSchema).min(2).max(3),
  }),
  z.object({ type: z.literal("correct"), text: text.max(2000) }),
  z.object({
    type: z.literal("checkpoint"),
    action: z.enum(["start_design", "deepen", "revise"]),
  }),
]);
export const HistoryEntrySchema = z.object({
  id: text,
  questions: z.array(QuestionSchema).min(2).max(3).nullable(),
  event: z.union([
    EventSchema.options[1],
    EventSchema.options[2],
    EventSchema.options[3],
  ]),
  beforeRevision: z.number().int().nonnegative(),
  afterRevision: z.number().int().positive(),
});
export const NextSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ask"),
    questions: z.array(QuestionSchema).min(2).max(3),
  }),
  z.object({
    type: z.literal("checkpoint"),
    reason: z.enum(["ready", "needs_evidence", "user_requested"]),
  }),
]);
export const TurnPayloadSchema = z
  .object({ state: DesignStateSchema, next: NextSchema })
  .superRefine(({ state, next }, ctx) => {
    if (
      (state.status === "questioning" && next.type !== "ask") ||
      (state.status !== "questioning" && next.type !== "checkpoint")
    ) {
      ctx.addIssue({ code: "custom", message: "状态与下一步不一致" });
    }
    if (next.type === "ask") {
      const ids = next.questions.map((question) => question.uncertaintyId);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: "custom", message: "同一轮不能重复追问同一判断" });
      for (const question of next.questions) {
        if (
          !state.uncertainties.some(
            (u) =>
              u.id === question.uncertaintyId &&
              u.status === "open" &&
              u.impact !== "minor",
          )
        ) {
          ctx.addIssue({
            code: "custom",
            message: "问题必须对应一个值得回答的未决判断",
          });
        }
      }
    }
  });
export const ConvergenceInputSchema = z
  .object({
    sessionId: text,
    requestId: text,
    rawBrief: text.max(10000),
    state: DesignStateSchema.nullable(),
    history: z.array(HistoryEntrySchema),
    pendingQuestions: z.array(QuestionSchema).min(2).max(3).nullable(),
    event: EventSchema,
  })
  .superRefine((value, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (value.event.type === "start") {
      if (value.state || value.history.length || value.pendingQuestions)
        issue("开始时不能携带旧状态");
      return;
    }
    if (!value.state) issue("缺少当前状态");
    if (value.history.some((h) => h.id === value.requestId))
      issue("该回答已提交");
    if (value.event.type === "answer") {
      const answers = value.event.answers;
      if (new Set(answers.map((answer) => answer.questionId)).size !== answers.length)
        issue("同一轮不能重复回答同一题");
      const questions = value.pendingQuestions;
      if (
        !questions ||
        questions.length !== answers.length ||
        value.state?.status !== "questioning"
      )
        issue("答案不属于当前问题");
      for (const answer of answers) {
        const question = questions?.find((item) => item.id === answer.questionId);
        if (
          !question ||
          !value.state?.uncertainties.some(
            (u) =>
              u.id === question.uncertaintyId &&
              u.status === "open" &&
              u.impact !== "minor",
          )
        )
          issue("当前问题没有对应的未决判断");
        if (
          answer.kind === "option" &&
          !question?.options.some((o) => o.id === answer.optionId)
        )
          issue("选项无效");
        if (
          question?.constraintRefs.some(
            (ref) => !value.state?.constraints.some((c) => c.text === ref),
          )
        )
          issue("问题引用了不存在的约束");
      }
    }
    if (
      value.event.type === "checkpoint" &&
      value.event.action === "deepen" &&
      (value.state?.status !== "checkpoint" || value.pendingQuestions)
    )
      issue("继续深化必须从人工检查点开始");
  });
export const TurnResultSchema = TurnPayloadSchema.and(
  z.object({
    sessionId: text,
    requestId: text,
    baseRevision: z.number().int().nonnegative(),
    history: z.array(HistoryEntrySchema),
    mode: z.enum(["live", "mock"]),
    model: z.string().nullable(),
  }),
);

export function parseContract<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new Error(
      result.error.issues
        .slice(0, 3)
        .map((x) => x.message)
        .join("；"),
    );
  return result.data;
}
