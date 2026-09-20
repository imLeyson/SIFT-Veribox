"use client";
import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { hasDirection } from "@/types/convergence";
import { Check, Sparkles, ArrowRight, ShieldCheck, Ban, Palette } from "lucide-react";

export function StateNode({ selected }: NodeProps) {
  const {
    state,
    next,
    correctionDraft,
    activeRequest,
    storageWarning,
    routes,
    briefImages,
    setCorrectionDraft,
  } = useSiftStore();
  const [editing, setEditing] = useState(false);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  const handleCopyKeyword = (keyword: string) => {
    void navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    setTimeout(() => {
      setCopiedKeyword((prev) => (prev === keyword ? null : prev));
    }, 1800);
  };

  if (!state) return null;

  const checkpoint = next?.type === "checkpoint";
  const confirmed = state.status === "confirmed";

  return (
    <NodeShell
      stage="01"
      kicker={
        confirmed
          ? "视觉主张 · 已确认"
          : checkpoint
            ? "视觉主张 · 检查点"
            : "视觉主张 · 收敛推导"
      }
      title="核心视觉方向"
      selected={selected}
    >
      <div className="space-y-3 text-xs leading-relaxed">
        {/* Core Intent Box */}
        {state.direction.intent?.text ? (
          <div className="rounded-xl bg-white/90 border border-line/80 p-3 shadow-xs space-y-1">
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              视觉主张
            </span>
            <p className="text-xs sm:text-sm font-medium text-ink leading-relaxed font-serif">
              {state.direction.intent.text}
            </p>
          </div>
        ) : (
          <p className="text-muted">方向推导中…</p>
        )}

        {/* Target Meta */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-md bg-mist px-2 py-0.5 font-medium text-ink">
            {state.brief.goal ?? "设计任务"}
          </span>
          {state.brief.audience && (
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-600">
              {state.brief.audience}
            </span>
          )}
        </div>

        {/* Visual Hypothesis */}
        {state.currentHypothesis && (
          <div className="rounded-lg bg-cream/70 p-2.5 border border-line/60">
            <span className="text-[10px] font-semibold text-stone-500 block mb-0.5">
              设计假设
            </span>
            <p className="text-stone-800 leading-snug">
              {state.currentHypothesis}
            </p>
          </div>
        )}

        {/* Extracted Visual Keywords */}
        {state.visualKeywords && state.visualKeywords.length > 0 && (
          <div className="rounded-xl bg-white/70 p-2.5 border border-line/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-medium text-ink">
                视觉关键词
              </span>
              <span className="text-[9.5px] text-stone-400 font-mono">
                {briefImages.length > 0 ? "参考图与简报提炼" : "简报提炼"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {state.visualKeywords.map((keyword, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCopyKeyword(keyword)}
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border transition-colors cursor-pointer select-none ${
                    copiedKeyword === keyword
                      ? "bg-stone-100 text-ink border-ink/40"
                      : "bg-white text-stone-800 border-line hover:border-ink/50 hover:text-ink"
                  }`}
                  title="点击复制关键词"
                >
                  {copiedKeyword === keyword ? (
                    <Check className="h-2.5 w-2.5 text-emerald-600 mr-1" />
                  ) : (
                    <span className="text-stone-400 mr-0.5 font-mono">#</span>
                  )}
                  <span>{copiedKeyword === keyword ? "已复制" : keyword}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visual Guardrails: Priorities & Avoid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Priorities */}
          <div className="rounded-xl bg-white/70 p-2.5 border border-line/70">
            <span className="text-[10px] font-semibold text-stone-600 block mb-1">
              视觉坚持
            </span>
            {state.direction.priorities.length > 0 ? (
              <div className="space-y-1">
                {state.direction.priorities.slice(0, 3).map((p, i) => (
                  <span
                    key={i}
                    className="inline-block rounded bg-mist/60 px-1.5 py-0.5 text-[10.5px] text-stone-800 mr-1 mb-1 border border-line/50"
                  >
                    {p.text}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-muted">尚未明确</span>
            )}
          </div>

          {/* Avoid */}
          <div className="rounded-xl bg-white/70 p-2.5 border border-line/70">
            <span className="text-[10px] font-semibold text-stone-600 block mb-1">
              视觉红线
            </span>
            {state.direction.avoid.length > 0 ? (
              <div className="space-y-1">
                {state.direction.avoid.slice(0, 3).map((a, i) => (
                  <span
                    key={i}
                    className="inline-block rounded bg-stone-100/80 px-1.5 py-0.5 text-[10.5px] text-stone-700 mr-1 mb-1 border border-stone-200/60"
                  >
                    {a.text}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-muted">暂无</span>
            )}
          </div>
        </div>

        {/* Visual Criteria */}
        {state.direction.criteria.length > 0 && (
          <div className="rounded-lg bg-mist/50 p-2 border border-line/40 text-[11px]">
            <span className="font-semibold text-stone-700 block mb-0.5">
              评估准则
            </span>
            <ul className="space-y-0.5 text-stone-800">
              {state.direction.criteria.slice(0, 2).map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="text-accent">▪</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Collapsible Details: Traceability & Uncertainties */}
        <details className="pt-1 text-[11px] text-muted">
          <summary className="cursor-pointer hover:text-ink">
            依据来源与未决项
          </summary>
          <div className="mt-2 space-y-2 rounded-lg bg-white/60 p-2 border border-line/40 text-[10px]">
            {state.uncertainties.length > 0 && (
              <div>
                <p className="font-semibold text-stone-700">待定未决项：</p>
                <ul className="mt-0.5 space-y-0.5 text-muted">
                  {state.uncertainties.map((u) => (
                    <li key={u.id}>▪ {u.topic}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="font-semibold text-stone-700">推导依据：</p>
              <ul className="mt-0.5 space-y-0.5 text-muted">
                {state.constraints.map((c, i) => (
                  <li key={i}>▪ {c.text}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>

        {/* Checkpoint Actions */}
        {checkpoint && !confirmed && (
          <div className="border-t border-line/60 pt-3 space-y-2">
            <div className="grid gap-2 grid-cols-2">
              <button
                type="button"
                className="btn-primary text-xs py-2 flex items-center justify-center gap-1"
                disabled={
                  Boolean(activeRequest) ||
                  editing ||
                  !hasDirection(state) ||
                  Boolean(storageWarning)
                }
                onClick={siftActions.confirm}
              >
                <span>确认方向并推进</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="btn-ghost text-xs py-2"
                disabled={Boolean(activeRequest)}
                onClick={() => setEditing(true)}
              >
                调整意见
              </button>
            </div>
          </div>
        )}

        {/* Confirmed State Actions */}
        {confirmed && (
          <div className="border-t border-line/60 pt-2.5">
            {routes.length === 0 ? (
              <button
                type="button"
                className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 shadow-sm"
                disabled={Boolean(activeRequest)}
                onClick={() => void siftActions.generateRoutes()}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{activeRequest ? "正在构思设计主题…" : "生成设计主题"}</span>
              </button>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 rounded-lg px-2.5 py-1.5 border border-emerald-200">
                <span className="flex items-center gap-1 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  设计主题已就绪，于右侧选择
                </span>
                <ArrowRight className="h-3 w-3 text-emerald-600" />
              </div>
            )}
          </div>
        )}

        {/* Inline Editing */}
        {editing && (
          <form
            className="border-t border-line/60 pt-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await siftActions.correct();
              if (!useSiftStore.getState().correctionDraft) setEditing(false);
            }}
          >
            <textarea
              autoFocus
              rows={2}
              maxLength={2000}
              value={correctionDraft}
              onChange={(e) => setCorrectionDraft(e.target.value)}
              placeholder="修改或补充方向意见…"
              className="w-full resize-y rounded-lg border border-line bg-cream/70 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="submit"
                disabled={!correctionDraft.trim()}
                className="btn-primary flex-1 text-xs !py-1"
              >
                更新方向
              </button>
              <button
                type="button"
                className="btn-ghost text-xs !py-1"
                onClick={() => setEditing(false)}
              >
                收起
              </button>
            </div>
          </form>
        )}
      </div>
    </NodeShell>
  );
}
