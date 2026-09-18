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
      <p className="text-xs text-muted">Agent 只结构化，不替你选风格。</p>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Goal" value={brief.goal} />
        <Row label="User" value={brief.targetUser} />
        <Row label="Known" value={brief.known.join(" / ")} />
        <Row label="Explore" value={brief.unknown.join(" / ")} />
        <Row label="Avoid" value={brief.constraints.join(" / ")} />
      </dl>
      {brief.openQuestions.length > 0 && (
        <div className="mt-3 rounded-xl bg-mist/80 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            待确认
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink">
            {brief.openQuestions.slice(0, 3).map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        className="btn-primary mt-4 w-full"
        onClick={confirmBriefAndContinue}
      >
        确认，选择探索入口
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
