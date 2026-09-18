"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { VBData } from "@/types";

export function BriefNode({ data, selected }: NodeProps<Node<VBData, "brief">>) {
  const { updateBriefField } = useVeriboxStore();
  const { confirmBriefAndContinue } = useVeriboxActions();
  const brief = data.brief;
  if (!brief) return null;

  return (
    <NodeShell kicker="任务" title="确认理解" selected={selected}>
      <p className="text-xs text-muted">确认后，右侧会生长出搜索方案。</p>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Goal" value={brief.goal} />
        <Row label="User" value={brief.targetUser} />
        <Row label="Known" value={brief.known.join(" / ")} />
        <Row label="Explore" value={brief.unknown.join(" / ")} />
        <Row label="Avoid" value={brief.constraints.join(" / ")} />
      </dl>
      <button
        type="button"
        className="btn-primary mt-4 w-full"
        onClick={confirmBriefAndContinue}
      >
        生成搜索方案
      </button>
      <button
        type="button"
        className="btn-ghost mt-2 w-full"
        onClick={() => {
          const next = window.prompt("修改 Goal", brief.goal);
          if (next?.trim()) updateBriefField("goal", next.trim());
        }}
      >
        修改 Goal
      </button>
    </NodeShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 leading-snug text-ink">{value || "—"}</dd>
    </div>
  );
}
