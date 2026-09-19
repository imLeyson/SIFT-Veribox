"use client";
import { useEffect, useRef } from "react";
import type { Question } from "@/types/convergence";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";

export function QuestionBlock({ question }: { question: Question }) {
  const { draft, activeRequest, setDraft } = useSiftStore();
  const current = draft?.questionId === question.id ? draft : null;
  const title = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [question.id]);
  const disabled = Boolean(activeRequest);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void siftActions.answer();
      }}
      className="space-y-3"
    >
      <p
        ref={title}
        tabIndex={-1}
        className="text-base font-medium leading-relaxed text-ink outline-none"
      >
        {question.prompt}
      </p>
      {question.options.length > 0 && (
        <div
          role="group"
          aria-label="选择一个回答"
          className="flex flex-col gap-2"
        >
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={
                current?.kind === "option" && current.optionId === option.id
              }
              disabled={disabled}
              onClick={() =>
                setDraft({
                  questionId: question.id,
                  kind: "option",
                  optionId: option.id,
                })
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
          onChange={(e) =>
            setDraft(
              e.target.value.trim()
                ? {
                    questionId: question.id,
                    kind: "custom",
                    text: e.target.value,
                  }
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
          setDraft(
            current?.kind === "uncertain"
              ? null
              : { questionId: question.id, kind: "uncertain" },
          )
        }
        className={`btn-ghost w-full text-sm ${current?.kind === "uncertain" ? "!border-ink !bg-mist" : ""}`}
      >
        暂不确定
      </button>
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={disabled || !current}
      >
        {disabled ? "正在更新判断…" : "提交回答"}
      </button>
    </form>
  );
}
