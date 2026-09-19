import type { z } from "zod";
import type { AnswerSchema, ConvergenceInputSchema, DesignStateSchema, EventSchema, HistoryEntrySchema, JudgmentSchema, NextSchema, QuestionSchema, TurnPayloadSchema, TurnResultSchema } from "@/lib/agent/convergence-schema";

export type Judgment = z.infer<typeof JudgmentSchema>;
export type DesignState = z.infer<typeof DesignStateSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type TurnEvent = z.infer<typeof EventSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type Next = z.infer<typeof NextSchema>;
export type ConvergenceInput = z.infer<typeof ConvergenceInputSchema>;
export type TurnPayload = z.infer<typeof TurnPayloadSchema>;
export type TurnResult = z.infer<typeof TurnResultSchema>;

export function answerText(question: Question, answer: Answer): string {
  if (answer.kind === "uncertain") return "暂不确定";
  if (answer.kind === "custom") return answer.text;
  return question.options.find(o => o.id === answer.optionId)?.label ?? "";
}

export function hasDirection(state: DesignState): boolean {
  return Boolean(state.direction.intent || state.direction.priorities.length || state.direction.criteria.length);
}
