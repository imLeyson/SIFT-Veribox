"use client";

import type { NodeProps } from "@xyflow/react";
import { Loader2 } from "lucide-react";
import { NodeShell } from "../NodeShell";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
const SAMPLE =
  "为一个面向 20–30 岁女性的新护肤品牌寻找视觉方向，希望自然、年轻、有品质感，但不要太少女，也不要传统有机品牌感。";

export function BriefInputNode({ selected }: NodeProps) {
  const { rawBrief, loading, setRawBrief } = useVeriboxStore();
  const { analyzeBrief } = useVeriboxActions();

  return (
    <NodeShell kicker="01 任务" title="先把任务变成能搜的词" selected={selected}>
      <p className="text-sm text-muted">粘贴 Brief。Agent 会理解任务，再在画布上长出方案。</p>
      <textarea
        id="brief"
        value={rawBrief}
        onChange={(e) => setRawBrief(e.target.value)}
        rows={6}
        placeholder="粘贴或输入项目 Brief…"
        className="mt-3 w-full resize-y rounded-xl border border-line bg-cream/70 px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={loading || !rawBrief.trim()}
          onClick={() => void analyzeBrief()}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              理解中…
            </>
          ) : (
            "开始分析"
          )}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setRawBrief(SAMPLE)}
        >
          示例
        </button>
      </div>
    </NodeShell>
  );
}
