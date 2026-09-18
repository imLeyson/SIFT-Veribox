import type { AgentQuestion, QuestionOption, QuestionStage } from "@/types";

export function newRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
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
