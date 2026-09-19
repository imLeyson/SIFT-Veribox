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
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {rawBrief}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void siftActions.start();
          }}
        >
          <p className="mb-4 text-sm leading-relaxed text-muted">
            从最影响方向的一个判断开始。每次只问一题。
          </p>
          {importedBrief && (
            <p className="mb-3 text-xs text-muted">
              已带入旧 Brief 草稿，点击开始后重新收敛。
            </p>
          )}
          <label className="block text-xs text-muted" htmlFor="brief">
            设计 Brief
          </label>
          <textarea
            id="brief"
            value={rawBrief}
            onChange={(e) => setRawBrief(e.target.value)}
            disabled={Boolean(activeRequest)}
            maxLength={10000}
            rows={7}
            placeholder="要设计什么、给谁、希望传达什么、有哪些限制…"
            className="mt-2 w-full resize-y rounded-xl border border-line bg-cream/70 px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="btn-primary mt-3 w-full"
            disabled={Boolean(activeRequest) || !rawBrief.trim()}
          >
            {activeRequest ? "正在理解任务…" : "开始收敛"}
          </button>
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer">试一份示例 Brief</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  disabled={Boolean(activeRequest)}
                  onClick={() => setRawBrief(example.brief)}
                  className="btn-ghost !px-3 !py-1.5 text-xs"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </details>
        </form>
      )}
    </NodeShell>
  );
}
