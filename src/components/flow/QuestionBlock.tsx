"use client";
import { useEffect, useRef, useState } from "react";
import type { Answer, Question } from "@/types/convergence";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { PenLine, Check, HelpCircle, ArrowRight } from "lucide-react";

function answerFor(drafts: Answer[], questionId: string) {
  return drafts.find((answer) => answer.questionId === questionId) ?? null;
}

export function QuestionBlock({ questions }: { questions: Question[] }) {
  const { drafts, activeRequest, setDrafts } = useSiftStore();
  const title = useRef<HTMLParagraphElement>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});

  const questionIds = questions.map((question) => question.id).join(",");

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [questionIds]);

  const disabled = Boolean(activeRequest);

  const selectOption = (questionId: string, optionId: string) => {
    setCustomMode((prev) => ({ ...prev, [questionId]: false }));
    setDrafts([
      ...drafts.filter((draft) => draft.questionId !== questionId),
      { questionId, kind: "option", optionId },
    ]);
  };

  const selectCustom = (questionId: string) => {
    setCustomMode((prev) => ({ ...prev, [questionId]: true }));
    const existing = customTexts[questionId]?.trim();
    if (existing) {
      setDrafts([
        ...drafts.filter((draft) => draft.questionId !== questionId),
        { questionId, kind: "custom", text: existing },
      ]);
    } else {
      // Empty text is not a valid answer yet; remove previous draft option
      setDrafts(drafts.filter((draft) => draft.questionId !== questionId));
    }
    setTimeout(() => {
      textareaRefs.current[questionId]?.focus();
    }, 40);
  };

  const handleCustomTextChange = (questionId: string, text: string) => {
    setCustomTexts((prev) => ({ ...prev, [questionId]: text }));
    if (text.trim()) {
      setDrafts([
        ...drafts.filter((draft) => draft.questionId !== questionId),
        { questionId, kind: "custom", text },
      ]);
    } else {
      setDrafts(drafts.filter((draft) => draft.questionId !== questionId));
    }
  };

  const selectUncertain = (questionId: string) => {
    const current = answerFor(drafts, questionId);
    if (current?.kind === "uncertain") {
      setDrafts(drafts.filter((draft) => draft.questionId !== questionId));
    } else {
      setCustomMode((prev) => ({ ...prev, [questionId]: false }));
      setDrafts([
        ...drafts.filter((draft) => draft.questionId !== questionId),
        { questionId, kind: "uncertain" },
      ]);
    }
  };

  // Validation: each question must have a valid answer in drafts
  const isQuestionComplete = (q: Question) => {
    const current = answerFor(drafts, q.id);
    if (!current) return false;
    if (current.kind === "custom") return Boolean(current.text.trim());
    return true;
  };

  const complete = questions.every(isQuestionComplete);
  const incompleteCount = questions.filter((q) => !isQuestionComplete(q)).length;
  const firstIncompleteIdx = questions.findIndex((q) => !isQuestionComplete(q));
  const firstIncompleteQ =
    firstIncompleteIdx >= 0 ? questions[firstIncompleteIdx] : null;
  const isFirstIncompleteCustom = firstIncompleteQ
    ? Boolean(
        customMode[firstIncompleteQ.id] ??
          (answerFor(drafts, firstIncompleteQ.id)?.kind === "custom"),
      ) || firstIncompleteQ.options.length === 0
    : false;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (complete) void siftActions.answer();
      }}
      className="space-y-4"
    >
      <p
        ref={title}
        tabIndex={-1}
        className="text-[11px] leading-relaxed text-muted outline-none"
      >
        动笔前，对齐核心视觉取向。若预设选项不符合你的想法，可直接选择自定义输入。
      </p>

      {questions.map((question, index) => {
        const current = answerFor(drafts, question.id);
        const isCustomActive =
          (customMode[question.id] ?? (current?.kind === "custom")) ||
          question.options.length === 0;
        const isCustomFilled =
          current?.kind === "custom" && Boolean(current.text.trim());
        const isCustomEmpty = isCustomActive && !isCustomFilled;
        const isOptionSelected = current?.kind === "option";
        const isUncertain = current?.kind === "uncertain";

        return (
          <fieldset
            key={question.id}
            className="space-y-2.5 rounded-2xl border border-line/70 bg-white/70 p-3 shadow-xs transition-all hover:border-line"
          >
            <legend className="sr-only">第 {index + 1} 题</legend>

            {/* Question Header */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                0{index + 1} · 视觉取舍
              </span>
              {current && isQuestionComplete(question) && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>已确认</span>
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-medium leading-snug text-ink">
              {question.prompt}
            </p>

            {/* Options List */}
            <div
              role="group"
              aria-label={`第 ${index + 1} 题选项`}
              className="flex flex-col gap-1.5 pt-0.5"
            >
              {question.options.map((option) => {
                const isSelected =
                  isOptionSelected && current.optionId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectOption(question.id, option.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                      isSelected
                        ? "border-ink bg-ink text-cream shadow-xs font-medium"
                        : "border-line/70 bg-white text-ink hover:border-ink/50 hover:bg-cream/40"
                    }`}
                  >
                    <span>{option.label}</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full border transition-all ${
                        isSelected
                          ? "border-white bg-accent ring-2 ring-white/30"
                          : "border-stone-300 bg-transparent"
                      }`}
                    />
                  </button>
                );
              })}

              {/* Custom Input Option Button */}
              {question.options.length > 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => selectCustom(question.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                    isCustomActive
                      ? "border-accent/80 bg-accent/10 text-accent font-medium shadow-xs"
                      : "border-dashed border-line bg-cream/30 text-stone-600 hover:border-ink/40 hover:bg-cream/70"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <PenLine className="h-3.5 w-3.5 shrink-0" />
                    <span>没有我想选的，自己输入具体偏好…</span>
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full border transition-all ${
                      isCustomActive
                        ? "border-accent bg-accent ring-2 ring-accent/30"
                        : "border-stone-300 bg-transparent"
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Custom Input Textarea */}
            {isCustomActive && (
              <div className="pt-1.5 space-y-1">
                <label className="block text-[11px] font-medium text-stone-600">
                  {question.options.length > 0
                    ? "输入你的具体视觉倾向或偏好："
                    : "用一两句话描述你的视觉倾向："}
                </label>
                <textarea
                  ref={(el) => {
                    textareaRefs.current[question.id] = el;
                  }}
                  rows={2}
                  maxLength={2000}
                  value={customTexts[question.id] ?? ""}
                  disabled={disabled}
                  placeholder="例：希望采用低饱和茶青色，配合大面积负空间留白与中英文细线排版，突出冷冽克制感…"
                  onChange={(e) =>
                    handleCustomTextChange(question.id, e.target.value)
                  }
                  className={`w-full resize-y rounded-xl border bg-white px-3 py-2 text-xs leading-relaxed text-ink outline-none transition-all ${
                    isCustomEmpty
                      ? "border-amber-400 focus:border-accent ring-1 ring-amber-200"
                      : "border-line focus:border-accent"
                  }`}
                />
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>
                    {isCustomEmpty ? (
                      <span className="text-amber-700 font-medium">
                        ⚠️ 请输入具体内容以确认此项
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">
                        ✓ 已就绪
                      </span>
                    )}
                  </span>
                  <span>{(customTexts[question.id] ?? "").length}/2000</span>
                </div>
              </div>
            )}

            {/* Uncertain Option */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => selectUncertain(question.id)}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] transition-all ${
                  isUncertain
                    ? "bg-stone-200 text-stone-900 font-semibold"
                    : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                }`}
              >
                <HelpCircle className="h-3 w-3" />
                <span>
                  {isUncertain ? "已标记为暂不确定" : "暂不确定（先跳过此项）"}
                </span>
              </button>
            </div>
          </fieldset>
        );
      })}

      <button
        type="submit"
        className={`w-full py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 rounded-xl shadow-xs transition-all ${
          complete && !disabled
            ? "btn-primary hover:shadow"
            : "bg-stone-200 text-stone-400 cursor-not-allowed"
        }`}
        disabled={disabled || !complete}
      >
        {disabled ? (
          "正在整理视觉判断…"
        ) : complete ? (
          <>
            <span>确认视觉取向，收敛方向</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </>
        ) : isFirstIncompleteCustom ? (
          `第 ${(firstIncompleteIdx ?? 0) + 1} 题：请填写自定义内容`
        ) : (
          `还差 ${incompleteCount} 项视觉抉择未完成`
        )}
      </button>
    </form>
  );
}
