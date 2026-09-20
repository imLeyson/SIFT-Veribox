"use client";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { EXAMPLES } from "@/lib/agent/examples";

export function BriefInputNode({ selected }: NodeProps) {
  const { rawBrief, state, activeRequest, importedBrief, setRawBrief } =
    useSiftStore();
  return (
    <NodeShell
      kicker="BRIEF · 任务"
      title={state ? "原始任务" : "先把任务说清楚"}
      selected={selected}
    >
      {state ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink font-serif">
          {rawBrief}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void siftActions.start();
          }}
        >
          <p className="mb-3 text-xs leading-relaxed text-muted">
            输入你的设计需求与视觉意向，SIFT 将协助提炼收敛视觉探索方向。
          </p>
          {importedBrief && (
            <p className="mb-2 text-xs text-accent">
              已载入设计草案，点击开始收敛。
            </p>
          )}
          <textarea
            id="brief"
            value={rawBrief}
            onChange={(e) => setRawBrief(e.target.value)}
            disabled={Boolean(activeRequest)}
            maxLength={10000}
            rows={5}
            placeholder="例：为冷泡茶做罐装包装视觉方向，希望克制有日常仪式感，不要大插画和红金茶叶罐，探索纸感质朴与极简排版…"
            className="w-full resize-y rounded-xl border border-line bg-cream/70 px-3 py-2 text-xs sm:text-sm leading-relaxed outline-none focus:border-accent"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              className="btn-primary w-full text-xs"
              disabled={Boolean(activeRequest) || !rawBrief.trim()}
            >
              {activeRequest ? "正在分析任务…" : "开始收敛"}
            </button>
            <button
              type="button"
              className="btn-ghost w-full text-xs"
              disabled={Boolean(activeRequest) || !rawBrief.trim()}
              onClick={() => void siftActions.fastStart()}
            >
              一键快速收敛
            </button>
          </div>
          <div className="mt-3.5 border-t border-line/60 pt-2.5">
            <p className="text-[11px] font-medium text-muted mb-1.5">
              快速载入视觉设计场景：
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  disabled={Boolean(activeRequest)}
                  onClick={() => setRawBrief(example.brief)}
                  className="rounded-lg border border-line/70 bg-white/70 px-2 py-0.5 text-[11px] text-ink transition-colors hover:border-ink hover:bg-white active:scale-98"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}
    </NodeShell>
  );
}
