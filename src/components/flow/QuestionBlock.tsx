"use client";
import { useEffect, useRef } from "react";
import type { Answer, Question } from "@/types/convergence";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";

function answerFor(drafts: Answer[], questionId: string) {
  return drafts.find((answer) => answer.questionId === questionId) ?? null;
}

export function QuestionBlock({ questions }: { questions: Question[] }) {
  const { drafts, activeRequest, setDrafts } = useSiftStore();
  const title = useRef<HTMLParagraphElement>(null);
  const questionIds = questions.map((question) => question.id).join(",");
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [questionIds]);
  const disabled = Boolean(activeRequest);
  const setAnswer = (answer: Answer | null) => {
    const questionId = answer?.questionId;
    if (!questionId) return;
    setDrafts([
      ...drafts.filter((draft) => draft.questionId !== questionId),
      ...(answer ? [answer] : []),
    ]);
  };
  const complete = questions.every((question) =>
    drafts.some((draft) => draft.questionId === question.id),
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (complete) void siftActions.answer();
      }}
      className="space-y-5"
    >
      <p ref={title} tabIndex={-1} className="text-xs leading-relaxed text-muted outline-none">
        这一轮一起回答，提交后 SIFT 会重新整理当前设计假设。
      </p>
      {questions.map((question, index) => {
        const current = answerFor(drafts, question.id);
        return (
          <fieldset key={question.id} className="space-y-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
            <legend className="text-base font-medium leading-relaxed text-ink">
              {index + 1}. {question.prompt}
            </legend>
            {question.options.length > 0 && (
              <div role="group" aria-label={`第 ${index + 1} 题选项`} className="flex flex-col gap-2">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={current?.kind === "option" && current.optionId === option.id}
                    disabled={disabled}
                    onClick={() =>
                      setAnswer({ questionId: question.id, kind: "option", optionId: option.id })
                    }
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm ${current?.kind === "option" && current.optionId === option.id ? "border-ink bg-ink text-cream" : "border-line bg-cream/70 text-ink hover:border-ink/50"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            <label className="block text-xs text-muted">
              自己补充一句
              <textarea
                rows={2}
                maxLength={2000}
                value={current?.kind === "custom" ? current.text : ""}
                disabled={disabled}
                onChange={(event) =>
                  setAnswer(
                    event.target.value.trim()
                      ? { questionId: question.id, kind: "custom", text: event.target.value }
                      : null,
                  )
                }
                className="mt-1.5 w-full resize-y rounded-xl border border-line bg-cream/70 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <button
              type="button"
              aria-pressed={current?.kind === "uncertain"}
              disabled={disabled}
              onClick={() =>
                setAnswer(
                  current?.kind === "uncertain"
                    ? null
                    : { questionId: question.id, kind: "uncertain" },
                )
              }
              className={`btn-ghost w-full text-sm ${current?.kind === "uncertain" ? "!border-ink !bg-mist" : ""}`}
            >
              暂不确定
            </button>
          </fieldset>
        );
      })}
      <button type="submit" className="btn-primary w-full" disabled={disabled || !complete}>
        {disabled ? "正在更新判断…" : complete ? "提交这一轮回答" : `还差 ${questions.filter((question) => !drafts.some((draft) => draft.questionId === question.id)).length} 题`}
      </button>
    </form>
  );
}
