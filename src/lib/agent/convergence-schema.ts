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
  brief: z.object({ goal: shortText.nullable(), audience: shortText.nullable(), deliverable: shortText.nullable() }),
  constraints: z.array(JudgmentSchema),
  direction: z.object({
    intent: JudgmentSchema.nullable(),
    priorities: z.array(JudgmentSchema),
    avoid: z.array(JudgmentSchema),
    criteria: z.array(JudgmentSchema),
  }),
  uncertainties: z.array(UncertaintySchema).refine(items => new Set(items.map(x => x.id)).size === items.length, "未决判断 ID 重复"),
});
export const QuestionSchema = z.object({
  id: text,
  uncertaintyId: text,
  prompt: text.max(40),
  options: z.array(z.object({ id: text, label: text.max(32) })).max(3)
    .refine(items => items.length !== 1, "选项应为 0 个或 2–3 个")
    .refine(items => new Set(items.map(x => x.id)).size === items.length, "选项 ID 重复"),
});
export const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({ questionId: text, kind: z.literal("option"), optionId: text }),
  z.object({ questionId: text, kind: z.literal("custom"), text: text.max(2000) }),
  z.object({ questionId: text, kind: z.literal("uncertain") }),
]);
export const EventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("answer"), answer: AnswerSchema }),
  z.object({ type: z.literal("correct"), text: text.max(2000) }),
]);
export const HistoryEntrySchema = z.object({
  id: text,
  question: QuestionSchema.nullable(),
  event: z.union([EventSchema.options[1], EventSchema.options[2]]),
  beforeRevision: z.number().int().nonnegative(),
  afterRevision: z.number().int().positive(),
});
export const NextSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ask"), question: QuestionSchema }),
  z.object({ type: z.literal("checkpoint"), reason: z.enum(["ready", "needs_evidence", "user_requested"]) }),
]);
export const TurnPayloadSchema = z.object({ state: DesignStateSchema, next: NextSchema }).superRefine(({ state, next }, ctx) => {
  if (state.status === "questioning" && next.type !== "ask" || state.status !== "questioning" && next.type !== "checkpoint") {
    ctx.addIssue({ code: "custom", message: "状态与下一步不一致" });
  }
  if (next.type === "ask" && !state.uncertainties.some(u => u.id === next.question.uncertaintyId && u.status === "open" && u.impact !== "minor")) {
    ctx.addIssue({ code: "custom", message: "问题必须对应一个值得回答的未决判断" });
  }
});
export const ConvergenceInputSchema = z.object({
  sessionId: text,
  requestId: text,
  rawBrief: text.max(10000),
  state: DesignStateSchema.nullable(),
  history: z.array(HistoryEntrySchema),
  pendingQuestion: QuestionSchema.nullable(),
  event: EventSchema,
}).superRefine((value, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (value.event.type === "start") {
    if (value.state || value.history.length || value.pendingQuestion) issue("开始时不能携带旧状态");
    return;
  }
  if (!value.state) issue("缺少当前状态");
  if (value.history.some(h => h.id === value.requestId)) issue("该回答已提交");
  if (value.event.type === "answer") {
    const { answer } = value.event;
    const question = value.pendingQuestion;
    if (!question || question.id !== answer.questionId || value.state?.status !== "questioning") issue("答案不属于当前问题");
    if (answer.kind === "option" && !question?.options.some(o => o.id === answer.optionId)) issue("选项无效");
  }
});
export const TurnResultSchema = TurnPayloadSchema.and(z.object({
  sessionId: text,
  requestId: text,
  baseRevision: z.number().int().nonnegative(),
  history: z.array(HistoryEntrySchema),
  mode: z.enum(["live", "mock"]),
  model: z.string().nullable(),
}));

export function parseContract<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues.slice(0, 3).map(x => x.message).join("；"));
  return result.data;
}
