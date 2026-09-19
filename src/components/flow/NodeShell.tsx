"use client";
import { Handle, Position } from "@xyflow/react";
import { GripHorizontal } from "lucide-react";

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
  return (
    <article
      className={`vb-node card w-[360px] ${selected ? "vb-node-selected" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!pointer-events-none !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!pointer-events-none !opacity-0"
      />
      <div className="overflow-hidden rounded-[1.25rem]">
        <div className="card-drag cursor-grab border-b border-line/70 bg-white/40 px-5 py-4 active:cursor-grabbing">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-wide text-muted">
              {kicker}
            </p>
            <GripHorizontal className="h-3.5 w-3.5 text-muted" aria-hidden />
          </div>
          <h2 className="mt-1 font-serif text-xl leading-snug text-ink">
            {title}
          </h2>
        </div>
        <div className="nowheel nodrag break-words bg-[var(--card)] p-5">
          {children}
        </div>
      </div>
    </article>
  );
}
