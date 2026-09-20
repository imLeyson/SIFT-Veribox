"use client";
import { Handle, Position } from "@xyflow/react";
import { GripHorizontal } from "lucide-react";

export type StageId = "00" | "01" | "02" | "03" | "05" | "07";

export type StageStyle = {
  id: StageId;
  pillText: string;
  pillBg: string;
  topBorder: string;
};

export const STAGE_MAP: Record<StageId, StageStyle> = {
  "00": {
    id: "00",
    pillText: "00 简报",
    pillBg: "bg-stone-700 text-white",
    topBorder: "bg-stone-500",
  },
  "01": {
    id: "01",
    pillText: "01 方向",
    pillBg: "bg-emerald-800 text-white",
    topBorder: "bg-emerald-600",
  },
  "02": {
    id: "02",
    pillText: "02 抉择",
    pillBg: "bg-sky-800 text-white",
    topBorder: "bg-sky-600",
  },
  "03": {
    id: "03",
    pillText: "03 主题",
    pillBg: "bg-indigo-900 text-white",
    topBorder: "bg-indigo-600",
  },
  "05": {
    id: "05",
    pillText: "05 视点",
    pillBg: "bg-zinc-800 text-white",
    topBorder: "bg-zinc-700",
  },
  "07": {
    id: "07",
    pillText: "07 搜索",
    pillBg: "bg-amber-800 text-white",
    topBorder: "bg-amber-600",
  },
};

function resolveStage(kicker: string, explicitStage?: StageId): StageStyle | null {
  if (explicitStage && STAGE_MAP[explicitStage]) {
    return STAGE_MAP[explicitStage];
  }
  if (/^00\b|简报/.test(kicker)) return STAGE_MAP["00"];
  if (/^01\b|DIRECTION|收敛|方向/.test(kicker)) return STAGE_MAP["01"];
  if (/^02\b|RECORD|抉择|问答/.test(kicker)) return STAGE_MAP["02"];
  if (/^03\b|领地|主题|路线/.test(kicker)) return STAGE_MAP["03"];
  if (/^05\b|视点|焦点|推进|切入|工位|实操/.test(kicker)) return STAGE_MAP["05"];
  if (/^07\b|搜索|方案|探索/.test(kicker)) return STAGE_MAP["07"];
  return null;
}

export function NodeShell({
  kicker,
  title,
  badge,
  selected,
  className,
  stage,
  children,
}: {
  kicker: string;
  title: string;
  badge?: React.ReactNode;
  selected?: boolean;
  className?: string;
  stage?: StageId;
  children: React.ReactNode;
}) {
  const stageConfig = resolveStage(kicker, stage);
  const cleanKicker = kicker
    .replace(/^(?:0[0-7]|DIRECTION|RECORD|领地\s*0[1-3])\s*·\s*/i, "")
    .trim();

  return (
    <article
      className={`vb-node card ${className ?? "w-[380px]"} ${selected ? "vb-node-selected" : ""}`}
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
        {/* Top 3px Semantic Stage Accent Strip */}
        {stageConfig && (
          <div className={`h-[3px] w-full ${stageConfig.topBorder}`} />
        )}
        <div className="card-drag cursor-grab border-b border-line/70 bg-white/50 px-5 py-3.5 active:cursor-grabbing">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {stageConfig && (
                <span
                  className={`inline-flex items-center font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs shrink-0 select-none ${stageConfig.pillBg}`}
                >
                  {stageConfig.pillText}
                </span>
              )}
              <p className="text-[11px] font-medium tracking-wide text-stone-500 truncate">
                {cleanKicker || kicker}
              </p>
              {badge}
            </div>
            <GripHorizontal className="h-3.5 w-3.5 text-stone-400 shrink-0" aria-hidden />
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
