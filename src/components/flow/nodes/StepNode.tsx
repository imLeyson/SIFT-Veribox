"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { cleanStepLabel } from "@/types/routes";
import {
  getBriefAnchor,
  getConvergenceAnchor,
  toInspirationCopy,
} from "@/lib/exploration-copy";
import {
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  StickyNote,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { InlineEditableText } from "../InlineEditableText";

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

export function StepNode({ id, selected }: NodeProps) {
  const routes = useSiftStore((s) => s.routes);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const activeStepId = useSiftStore((s) => s.activeStepId);
  const platformPlans = useSiftStore((s) => s.platformPlans);
  const stepNotes = useSiftStore((s) => s.stepNotes);
  const addStepNote = useSiftStore((s) => s.addStepNote);
  const removeStepNote = useSiftStore((s) => s.removeStepNote);
  const activeRequest = useSiftStore((s) => s.activeRequest);
  const rawBrief = useSiftStore((s) => s.rawBrief);
  const state = useSiftStore((s) => s.state);
  const updateRouteStep = useSiftStore((s) => s.updateRouteStep);

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

  const collapsedSummary = (
    <div className="flex items-center justify-between gap-1.5 w-full">
      <span className="truncate text-stone-600 font-sans">
        视点 0{activeIdx + 1}/{route.steps.length} · {cleanStepLabel(currentStep.title)}
      </span>
      <span className="text-[9.5px] font-mono text-stone-400 shrink-0">
        {hasPlanForCurrent ? "方案已就绪" : "待检索"}
      </span>
    </div>
  );

  return (
    <div className="w-[380px] sm:w-[390px]">
      <NodeShell
        nodeId={id || "steps"}
        stage="04"
        kicker={`灵感切入 · 视点 0${activeIdx + 1}/${route.steps.length}`}
        title={route.themeName || route.title}
        collapsedSummary={collapsedSummary}
        selected={selected}
      >
        <div className="space-y-3 text-xs">

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
                <div className="flex items-center gap-1">
                  <span>视点 0{activeIdx + 1} ·</span>
                  <InlineEditableText
                    value={cleanStepLabel(currentStep.title)}
                    onSave={(newTitle) =>
                      updateRouteStep(route.id, currentStep.id, { title: newTitle })
                    }
                    as="span"
                    className="font-semibold text-stone-700"
                    label="视点标题"
                  />
                </div>
                <span className="font-mono text-[9px] text-stone-400">VISUAL FOCUS</span>
              </div>
              <InlineEditableText
                value={toInspirationCopy(currentStep.question)}
                onSave={(newQuestion) =>
                  updateRouteStep(route.id, currentStep.id, { question: newQuestion })
                }
                multiline
                as="p"
                className="text-xs sm:text-[13px] font-semibold text-ink leading-snug block w-full"
                label="视点设问"
                showEditIcon
              />
            </div>

            {currentStep.purpose && (
              <div className="pt-2 border-t border-line/40 text-[11px] text-stone-600 leading-relaxed flex items-start gap-1">
                <span className="font-medium text-stone-700 shrink-0">这一步要观察：</span>
                <InlineEditableText
                  value={toInspirationCopy(currentStep.purpose)}
                  onSave={(newPurpose) =>
                    updateRouteStep(route.id, currentStep.id, { purpose: newPurpose })
                  }
                  multiline
                  as="span"
                  className="text-stone-600 block flex-1"
                  label="观察重点"
                />
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
                <span className="font-medium">为这个视点找灵感 (05) →</span>
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
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                className="btn-ghost flex-1 !py-1 text-[11px] text-muted hover:text-ink"
                onClick={() => siftActions.reselectRoute()}
              >
                重选设计主题
              </button>
              <button
                type="button"
                className="btn-ghost flex-1 !py-1 text-[11px] text-muted hover:text-ink flex items-center justify-center gap-1"
                onClick={() => void siftActions.regenerateRoutes()}
                title="重新构思一组全新主题"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>换一批主题</span>
              </button>
            </div>
          </div>

          {/* Designer Step Notes (灵感速记与参考链接) */}
          <details
            open={currentNotes.length > 0}
            className="group rounded-xl border border-line/60 bg-cream/40 p-2 text-xs"
          >
            <summary className="flex items-center justify-between cursor-pointer font-medium text-stone-600 hover:text-ink select-none px-1 py-0.5">
              <span className="flex items-center gap-1.5 text-[11px]">
                <StickyNote className="h-3 w-3 text-amber-600" />
                灵感速记与参考链接
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                {currentNotes.length > 0 ? `${currentNotes.length} 条记录` : "点击添加 +"}
              </span>
            </summary>

            <div className="pt-2 space-y-2">
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
                        className="text-muted hover:text-red-600 opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5 cursor-pointer"
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
                  className="btn-ghost !py-1 !px-2 text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>添加</span>
                </button>
              </form>
            </div>
          </details>
        </div>
      </NodeShell>
    </div>
  );
}
