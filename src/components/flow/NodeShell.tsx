"use client";

import { Handle, NodeToolbar, Position } from "@xyflow/react";
import { GitBranch, GripHorizontal } from "lucide-react";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import { useVeriboxStore } from "@/lib/store";

export function NodeShell({
  kicker,
  title,
  selected,
  children,
}: {
  kicker: string;
  title: string;
  selected?: boolean;
  children: React.ReactNode;
}) {
  const { sendCanvasChat } = useVeriboxActions();
  const loading = useVeriboxStore((s) => s.loading);

  return (
    <article
      className={[
        "vb-node card w-[320px] overflow-visible",
        selected ? "vb-node-selected" : "",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="vb-handle vb-handle-in"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="vb-handle vb-handle-out"
      />

      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        align="center"
        offset={12}
      >
        <button
          type="button"
          className="btn-primary !py-1.5 !text-xs shadow-sm"
          disabled={loading}
          onClick={() =>
            void sendCanvasChat(
              `从「${title}」这张卡片深化。请读整张画布，再长出 2 个不同方向的新分支卡片。`
            )
          }
        >
          <GitBranch className="h-3.5 w-3.5" />
          从这里深化
        </button>
      </NodeToolbar>

      <div className="overflow-hidden rounded-[1.25rem]">
        <div className="card-drag cursor-grab border-b border-line/70 bg-white/40 px-4 py-3 active:cursor-grabbing">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              {kicker}
            </p>
            <GripHorizontal className="h-3.5 w-3.5 text-muted/70" aria-hidden />
          </div>
          <h3 className="mt-1 font-serif text-lg leading-snug text-ink">{title}</h3>
        </div>
        <div className="nowheel nodrag bg-[var(--card)] p-4">{children}</div>
      </div>
    </article>
  );
}
