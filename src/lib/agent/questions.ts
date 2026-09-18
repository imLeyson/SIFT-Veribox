import type {
  AgentAnswer,
  AgentQuestion,
  Brief,
  QuestionOption,
  QuestionStage,
} from "@/types";
import { AgentAnswerSchema } from "./schema";

export function newRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function parseAnswers(value: unknown): AgentAnswer[] {
  if (!Array.isArray(value)) return [];
  const out: AgentAnswer[] = [];
  for (const item of value) {
    const parsed = AgentAnswerSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function normalizePrompt(value?: string | null) {
  return (value ?? "").replace(/\s+/g, "").replace(/[？?。．，,、]/g, "");
}

export function dedupeQuestions(
  questions: AgentQuestion[],
  asked: { id?: string; prompt?: string }[]
): AgentQuestion[] {
  const ids = new Set(asked.map((item) => item.id).filter(Boolean) as string[]);
  const prompts = new Set(
    asked.map((item) => normalizePrompt(item.prompt)).filter(Boolean)
  );
  return questions.filter((q) => {
    const prompt = normalizePrompt(q.prompt);
    return !ids.has(q.id) && (!prompt || !prompts.has(prompt));
  });
}

function answerLabel(
  answer: AgentAnswer,
  questions: AgentQuestion[]
): string {
  if (answer.custom?.trim()) return answer.custom.trim();
  const question = questions.find((q) => q.id === answer.questionId);
  const option = question?.options.find((o) => o.id === answer.optionId);
  return option?.label?.trim() ?? "";
}

function isFactPrompt(prompt: string) {
  return /给谁|受众|用户|谁用|做什么|交付|范围|工种|包装|产品|品牌|App|小程序|界面/.test(
    prompt
  );
}

export function applyAnswersToBrief(
  brief: Brief,
  answers: AgentAnswer[],
  questions: AgentQuestion[]
): Brief {
  const known = [...brief.known];
  const preferences = [...brief.preferences];
  const assumptions = [...brief.assumptions];
  let targetUser = brief.targetUser;
  let deliverable = brief.deliverable;
  let goal = brief.goal;

  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    const prompt = question?.prompt ?? "";
    if (answer.kind === "uncertain") {
      if (prompt) assumptions.push(`暂不确定：${prompt}`);
      continue;
    }
    const label = answerLabel(answer, questions);
    if (!label) continue;
    if (isFactPrompt(prompt)) {
      if (!known.includes(label)) known.push(label);
      if (/给谁|受众|用户|谁用/.test(prompt) && /待确认/.test(targetUser)) {
        targetUser = label;
      }
      if (/交付|范围/.test(prompt) && /先找到|视觉探索/.test(deliverable)) {
        deliverable = label;
      }
      if (/做什么/.test(prompt) && goal.length < 8) {
        goal = label;
      }
    } else {
      if (!preferences.includes(label)) preferences.push(label);
    }
  }

  return {
    ...brief,
    goal,
    targetUser,
    deliverable,
    known,
    preferences,
    assumptions,
    openQuestions: [],
    clarifyQuestions: [],
  };
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];
  const out: QuestionOption[] = [];
  value.forEach((item, i) => {
    if (typeof item === "string" && item.trim()) {
      out.push({ id: `opt_${i + 1}`, label: item.trim() });
      return;
    }
    const row = (item ?? {}) as Record<string, unknown>;
    const label = text(row.label ?? row.text ?? row.title);
    if (!label) return;
    out.push({
      id: text(row.id, `opt_${i + 1}`),
      label,
      rationale: text(row.rationale ?? row.why) || undefined,
      recommended: Boolean(row.recommended),
    });
  });
  return out.slice(0, 4);
}

export function normalizeQuestions(
  value: unknown,
  stage: QuestionStage,
  cardId?: string | null
): AgentQuestion[] {
  if (!Array.isArray(value)) return [];
  const out: AgentQuestion[] = [];
  value.forEach((item, i) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const prompt = text(row.prompt ?? row.question);
    const options = asOptions(row.options);
    if (!prompt || options.length < 2) return;
    out.push({
      id: text(row.id, `${stage}_q${i + 1}`),
      stage: (text(row.stage, stage) as QuestionStage) || stage,
      cardId: text(row.cardId ?? row.card_id) || cardId || null,
      prompt,
      options,
    });
  });
  return out.slice(0, 3);
}
