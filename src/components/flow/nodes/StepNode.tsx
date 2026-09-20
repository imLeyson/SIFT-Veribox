"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import {
  Check,
  ArrowRight,
  Play,
  PackageCheck,
  CheckCircle2,
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
  const completedCriteria = useSiftStore((s) => s.completedCriteria);
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
  const currentChecked = completedCriteria[currentStep.id] ?? [];

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addStepNote(currentStep.id, noteInput);
    setNoteInput("");
  };

  return (
    <div className="w-[390px]">
      <NodeShell
        kicker="05 · 步骤推进"
        title={route.title}
        selected={selected}
      >
        <div className="space-y-3.5 text-xs">
          {/* Step Timeline Indicator */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all shrink-0 ${
                    isCurrent
                      ? "bg-accent text-white shadow-xs"
                      : isCompleted
                        ? "bg-emerald-100/80 text-emerald-900 hover:bg-emerald-200/80"
                        : "bg-mist/70 text-muted hover:bg-mist"
                  }`}
                >
                  <span className="text-[10px]">
                    {isCompleted ? <Check className="h-3 w-3 inline" /> : i + 1}
                  </span>
                  <span>{st.title.slice(0, 8)}</span>
                </button>
              );
            })}
          </div>

          {/* Current Step Focus Box */}
          <div className="rounded-xl border border-line/80 bg-white/90 p-3 shadow-xs space-y-2.5">
            <div>
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wider block mb-0.5">
                Step 0{activeIdx + 1} · {currentStep.title}
              </span>
              <p className="text-xs sm:text-sm font-semibold text-ink leading-snug">
                {currentStep.question}
              </p>
            </div>

            {/* Deliverables */}
            {currentStep.deliverables && currentStep.deliverables.length > 0 && (
              <div className="pt-2 border-t border-line/40">
                <span className="text-[10px] font-medium text-stone-500 flex items-center gap-1 mb-1">
                  <PackageCheck className="h-3 w-3 text-accent" />
                  阶段物料
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentStep.deliverables.map((item, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Acceptance Checklist */}
            {currentStep.acceptanceCriteria && currentStep.acceptanceCriteria.length > 0 && (
              <div className="pt-2 border-t border-line/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    验收标准
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-full">
                    {currentChecked.length}/{currentStep.acceptanceCriteria.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {currentStep.acceptanceCriteria.map((crit, cIdx) => {
                    const isChecked = currentChecked.includes(crit);
                    return (
                      <label
                        key={cIdx}
                        className={`flex items-start gap-1.5 rounded-lg p-1.5 text-[11px] transition-colors cursor-pointer select-none ${
                          isChecked
                            ? "bg-emerald-50/90 text-emerald-950 font-medium"
                            : "bg-mist/40 text-stone-700 hover:bg-mist"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            siftActions.toggleAcceptanceCriterion(
                              currentStep.id,
                              crit,
                            )
                          }
                          className="mt-0.5 h-3 w-3 rounded border-line text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span
                          className={`leading-snug ${
                            isChecked ? "line-through opacity-75" : ""
                          }`}
                        >
                          {crit}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Designer Step Notes (手记) */}
          <div className="rounded-xl border border-line/60 bg-cream/40 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink">
              <span className="flex items-center gap-1 text-[11px]">
                <StickyNote className="h-3 w-3 text-amber-600" />
                探索手记
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
                      title="删除此手记"
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

          {/* Action Buttons */}
          <div className="pt-2 border-t border-line/60 flex flex-col gap-1.5">
            {!hasPlanForCurrent ? (
              <button
                type="button"
                className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2 shadow-xs"
                disabled={Boolean(activeRequest)}
                onClick={() =>
                  void siftActions.generatePlatformPlan(currentStep.id)
                }
              >
                <Play className="h-3 w-3 fill-current" />
                <span>推荐搜索方案 →</span>
              </button>
            ) : (
              hasNextStep && (
                <button
                  type="button"
                  className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2 shadow-xs"
                  disabled={Boolean(activeRequest)}
                  onClick={() => void siftActions.nextStep()}
                >
                  <span>下一步：{route.steps[activeIdx + 1]?.title}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )
            )}
            <button
              type="button"
              className="btn-ghost w-full !py-1 text-[11px] text-muted hover:text-red-700"
              onClick={() => siftActions.reselectRoute()}
            >
              重选路线
            </button>
          </div>
        </div>
      </NodeShell>
    </div>
  );
}
