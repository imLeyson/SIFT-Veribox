"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import type { VBData } from "@/types";

export function InsightNode({
  data,
  selected,
}: NodeProps<Node<VBData, "insight">>) {
  return (
    <NodeShell kicker="深化" title={data.title} selected={selected}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
        {data.body}
      </p>
    </NodeShell>
  );
}
