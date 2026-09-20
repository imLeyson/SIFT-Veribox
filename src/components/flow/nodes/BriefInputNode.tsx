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
      kicker="00 · 设计简报"
      title={state ? "设计简报" : "输入设计目标与背景"}
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
            描述设计背景、视觉意图与明确约束。
          </p>
          {importedBrief && (
            <p className="mb-2 text-xs text-accent">
              已载入草案
            </p>
          )}
          <textarea
            id="brief"
            value={rawBrief}
            onChange={(e) => setRawBrief(e.target.value)}
            disabled={Boolean(activeRequest)}
            maxLength={10000}
            rows={5}
            placeholder="例：冷泡茶包装，克制日常感，避免大插画与红金罐，探索特种纸与极简排版…"
            className="w-full resize-y rounded-xl border border-line bg-cream/70 px-3 py-2 text-xs sm:text-sm leading-relaxed outline-none focus:border-accent"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              className="btn-primary w-full text-xs"
              disabled={Boolean(activeRequest) || !rawBrief.trim()}
            >
              {activeRequest ? "正在分析…" : "对齐视觉取舍"}
            </button>
            <button
              type="button"
              className="btn-ghost w-full text-xs"
              disabled={Boolean(activeRequest) || !rawBrief.trim()}
              onClick={() => void siftActions.fastStart()}
            >
              直接推导收敛
            </button>
          </div>
          <div className="mt-3.5 border-t border-line/60 pt-2.5">
            <p className="text-[11px] font-medium text-stone-500 mb-1.5">
              参考场景：
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
