"use client";

import { useState } from "react";
import type { AgentAnswer, AgentQuestion } from "@/types";

export function QuestionBlock({
  questions,
  stall,
  disabled,
  onSubmit,
}: {
  questions: AgentQuestion[];
  stall?: boolean;
  disabled?: boolean;
  onSubmit: (answers: AgentAnswer[], proceed: boolean) => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [uncertain, setUncertain] = useState<Record<string, boolean>>({});

  if (!questions.length && !stall) return null;

  function build(): AgentAnswer[] {
    return questions.map((q) => {
      if (uncertain[q.id]) {
        return { questionId: q.id, kind: "uncertain" as const };
      }
      const text = custom[q.id]?.trim();
      if (text) {
        return { questionId: q.id, kind: "custom" as const, custom: text };
      }
      if (picked[q.id]) {
        return {
          questionId: q.id,
          kind: "option" as const,
          optionId: picked[q.id],
          custom: q.options.find((o) => o.id === picked[q.id])?.label,
        };
      }
      return { questionId: q.id, kind: "uncertain" as const };
    });
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id}>
          <p className="text-sm font-medium text-ink">{q.prompt}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {q.options.map((opt) => {
              const on = picked[q.id] === opt.id && !uncertain[q.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  className={[
                    "rounded-xl border px-3 py-2 text-left text-sm",
                    on
                      ? "border-ink bg-ink text-cream"
                      : "border-line bg-cream/70 text-ink hover:border-ink/40",
                  ].join(" ")}
                  onClick={() => {
                    setUncertain((u) => ({ ...u, [q.id]: false }));
                    setPicked((p) => ({ ...p, [q.id]: opt.id }));
                  }}
                >
                  <span className="font-medium">
                    {opt.label}
                    {opt.recommended ? (
                      <span className="ml-2 text-[10px] opacity-80">建议</span>
                    ) : null}
                  </span>
                  {opt.rationale ? (
                    <span
                      className={`mt-0.5 block text-xs ${on ? "text-cream/80" : "text-muted"}`}
                    >
                      {opt.rationale}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <input
            value={custom[q.id] ?? ""}
            disabled={disabled}
            placeholder="自己补充一句"
            className="mt-2 w-full rounded-lg border border-line bg-cream/80 px-2 py-1.5 text-sm outline-none focus:border-accent"
            onChange={(e) => {
              setCustom((c) => ({ ...c, [q.id]: e.target.value }));
              setUncertain((u) => ({ ...u, [q.id]: false }));
            }}
          />
          <button
            type="button"
            disabled={disabled}
            className={`mt-1 text-xs ${uncertain[q.id] ? "text-ink" : "text-muted"}`}
            onClick={() =>
              setUncertain((u) => ({ ...u, [q.id]: !u[q.id] }))
            }
          >
            暂不确定
          </button>
        </div>
      ))}
      {stall ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={disabled}
            onClick={() => onSubmit(build(), true)}
          >
            按这些假设继续
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={disabled}
            onClick={() => onSubmit(build(), false)}
          >
            继续补充
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-primary w-full"
          disabled={disabled}
          onClick={() => onSubmit(build(), true)}
        >
          按这些选择继续
        </button>
      )}
    </div>
  );
}
