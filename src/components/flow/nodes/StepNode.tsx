"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { cleanStepLabel } from "@/types/routes";
import {
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  StickyNote,
  ExternalLink,
} from "lucide-react";

function renderNoteContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-accent underline hover:bg-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 22)}…</span>
            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function StepNode({ selected }: NodeProps) {
  const routes = useSiftStore((s) => s.routes);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const activeStepId = useSiftStore((s) => s.activeStepId);
  const platformPlans = useSiftStore((s) => s.platformPlans);
  const stepNotes = useSiftStore((s) => s.stepNotes);
  const addStepNote = useSiftStore((s) => s.addStepNote);
  const removeStepNote = useSiftStore((s) => s.removeStepNote);
  const activeRequest = useSiftStore((s) => s.activeRequest);

  const [noteInput, setNoteInput] = useState("");

  const route = routes.find((r) => r.id === selectedRouteId);
  if (!route) return null;

  const activeIdx = route.steps.findIndex((s) => s.id === activeStepId);
  const currentStep = route.steps[activeIdx] ?? route.steps[0];
  const hasPlanForCurrent = platformPlans.some(
    (p) => p.stepId === currentStep.id,
  );
  const hasNextStep = activeIdx < route.steps.length - 1;
  const currentNotes = stepNotes[currentStep.id] ?? [];

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addStepNote(currentStep.id, noteInput);
    setNoteInput("");
  };

  return (
    <div className="w-[390px]">
      <NodeShell
        stage="05"
        kicker={`灵感切入 · 视点 0${activeIdx + 1}/${route.steps.length}`}
        title={route.themeName || route.title}
        selected={selected}
      >
        <div className="space-y-3.5 text-xs">
          {/* Step Timeline Indicator - All tabs fit evenly, 100% visible, no cut-off */}
          <div className="flex items-center gap-1.5 w-full">
            {route.steps.map((st, i) => {
              const isCurrent = st.id === currentStep.id;
              const isCompleted = i < activeIdx;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    if (i !== activeIdx) siftActions.activateStep(st.id);
                  }}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors ${
                    isCurrent
                      ? "bg-ink text-white font-semibold shadow-xs"
                      : isCompleted
                        ? "bg-stone-100 text-stone-700 hover:text-ink hover:bg-stone-200"
                        : "bg-stone-50 text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <span className="text-[10px] font-mono shrink-0">
                    {isCompleted ? "✓" : `0${i + 1}`}
                  </span>
                  <span className="truncate">{cleanStepLabel(st.title)}</span>
                </button>
              );
            })}
          </div>

          {/* Current Step Focus Box - Pure Visual Inspiration */}
          <div className="rounded-xl border border-line/80 bg-white/95 p-3.5 shadow-xs space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                <span>视点 0{activeIdx + 1} · {cleanStepLabel(currentStep.title)}</span>
                <span className="font-mono text-[9px] text-stone-400">VISUAL FOCUS</span>
              </div>
              <p className="text-xs sm:text-[13px] font-semibold text-ink leading-snug">
                {currentStep.question}
              </p>
            </div>

            {currentStep.purpose && (
              <div className="pt-2 border-t border-line/40 text-[11px] text-stone-600 leading-relaxed">
                <span className="font-medium text-stone-700">视觉意图：</span>
                {currentStep.purpose}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col gap-1.5">
            {!hasPlanForCurrent ? (
              <button
                type="button"
                className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2.5 shadow-xs"
                disabled={Boolean(activeRequest)}
                onClick={() =>
                  void siftActions.generatePlatformPlan(currentStep.id)
                }
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span className="font-medium">推荐搜索方案 (07) →</span>
              </button>
            ) : (
              hasNextStep && (
                <button
                  type="button"
                  className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2.5 shadow-xs"
                  disabled={Boolean(activeRequest)}
                  onClick={() => void siftActions.nextStep()}
                >
                  <span>下一个切入视点：{cleanStepLabel(route.steps[activeIdx + 1]?.title)}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )
            )}
            <button
              type="button"
              className="btn-ghost w-full !py-1 text-[11px] text-muted hover:text-red-700"
              onClick={() => siftActions.reselectRoute()}
            >
              重选设计主题
            </button>
          </div>

          {/* Designer Step Notes (灵感速记与参考链接) */}
          <div className="rounded-xl border border-line/60 bg-cream/40 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink">
              <span className="flex items-center gap-1 text-[11px]">
                <StickyNote className="h-3 w-3 text-amber-600" />
                灵感速记与参考链接
              </span>
              <span className="text-[10px] text-muted">
                {currentNotes.length}
              </span>
            </div>

            {currentNotes.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {currentNotes.map((note, nIdx) => (
                  <div
                    key={nIdx}
                    className="flex items-start justify-between gap-1.5 rounded-lg bg-white/80 px-2 py-1 text-[11px] text-ink group"
                  >
                    <span className="leading-snug break-all">
                      {renderNoteContent(note)}
                    </span>
                    <button
                      type="button"
                      title="删除此记录"
                      className="text-muted hover:text-red-600 opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                      onClick={() => removeStepNote(currentStep.id, nIdx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddNote} className="flex gap-1.5 pt-0.5">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="记录灵感或参考链接…"
                className="flex-1 rounded-lg border border-line bg-white px-2 py-1 text-[11px] text-ink outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!noteInput.trim()}
                className="btn-ghost !py-1 !px-2 text-[11px] flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3 w-3" />
                <span>添加</span>
              </button>
            </form>
          </div>
        </div>
      </NodeShell>
    </div>
  );
}
