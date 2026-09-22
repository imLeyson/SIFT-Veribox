"use client";
import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { GripHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { useSiftStore } from "@/lib/convergence-store";

export type StageId = "00" | "01" | "02" | "03" | "04" | "05";

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
    pillText: "01 抉择",
    pillBg: "bg-sky-800 text-white",
    topBorder: "bg-sky-600",
  },
  "02": {
    id: "02",
    pillText: "02 方向",
    pillBg: "bg-emerald-800 text-white",
    topBorder: "bg-emerald-600",
  },
  "03": {
    id: "03",
    pillText: "03 主题",
    pillBg: "bg-indigo-900 text-white",
    topBorder: "bg-indigo-600",
  },
  "04": {
    id: "04",
    pillText: "04 视点",
    pillBg: "bg-zinc-800 text-white",
    topBorder: "bg-zinc-700",
  },
  "05": {
    id: "05",
    pillText: "05 搜索",
    pillBg: "bg-amber-800 text-white",
    topBorder: "bg-amber-600",
  },
};

function resolveStage(kicker: string, explicitStage?: StageId): StageStyle | null {
  if (explicitStage && STAGE_MAP[explicitStage]) {
    return STAGE_MAP[explicitStage];
  }
  if (/^00\b|简报/.test(kicker)) return STAGE_MAP["00"];
  if (/^01\b|RECORD|抉择|问答/.test(kicker)) return STAGE_MAP["01"];
  if (/^02\b|DIRECTION|收敛|方向|视觉主张/.test(kicker)) return STAGE_MAP["02"];
  if (/^03\b|领地|主题|路线/.test(kicker)) return STAGE_MAP["03"];
  if (/^(?:04|05)\b|视点|焦点|推进|切入|工位|实操/.test(kicker)) return STAGE_MAP["04"];
  if (/^(?:05|07)\b|搜索|方案|探索/.test(kicker)) return STAGE_MAP["05"];
  return null;
}

export function NodeShell({
  nodeId,
  kicker,
  title,
  badge,
  selected,
  className,
  stage,
  collapsible = true,
  collapsed: explicitCollapsed,
  onToggleCollapse,
  collapsedSummary,
  children,
}: {
  nodeId?: string;
  kicker: string;
  title: string;
  badge?: React.ReactNode;
  selected?: boolean;
  className?: string;
  stage?: StageId;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  collapsedSummary?: React.ReactNode;
  children: React.ReactNode;
}) {
  const stageConfig = resolveStage(kicker, stage);
  const cleanKicker = kicker
    .replace(/^(?:0[0-7]|DIRECTION|RECORD|领地\s*0[1-3])\s*·\s*/i, "")
    .trim();

  const storeCollapsed = useSiftStore((s) =>
    nodeId ? Boolean(s.collapsedNodes[nodeId]) : false,
  );
  const toggleStore = useSiftStore((s) => s.toggleNodeCollapse);
  const [localCollapsed, setLocalCollapsed] = useState(false);

  const isCollapsed =
    explicitCollapsed ?? (nodeId ? storeCollapsed : localCollapsed);

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else if (nodeId) {
      toggleStore(nodeId);
    } else {
      setLocalCollapsed((prev) => !prev);
    }
  };

  return (
    <article
      className={`vb-node card transition-all duration-200 ${className ?? "w-[380px]"} ${
        selected ? "vb-node-selected" : ""
      } ${isCollapsed ? "shadow-xs ring-1 ring-line/70" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={{ top: "26px" }}
        className="!pointer-events-none !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={{ top: "26px" }}
        className="!pointer-events-none !opacity-0"
      />
      <div className="overflow-hidden rounded-[1.25rem]">
        {/* Top 3px Semantic Stage Accent Strip */}
        {stageConfig && (
          <div className={`h-[3px] w-full ${stageConfig.topBorder}`} />
        )}
        <div
          className={`card-drag cursor-grab border-b border-line/70 bg-white/60 px-4 py-3 active:cursor-grabbing select-none transition-colors ${
            isCollapsed ? "hover:bg-white/80 cursor-pointer" : ""
          }`}
          onDoubleClick={(e) => {
            if (collapsible) {
              e.stopPropagation();
              handleToggle();
            }
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
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
            <div className="flex items-center gap-1 shrink-0">
              {collapsible && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle();
                  }}
                  className="rounded-md p-0.5 text-stone-400 hover:text-ink hover:bg-stone-200/60 transition-all cursor-pointer"
                  title={isCollapsed ? "展开卡片详情" : "折叠卡片 (收起减少视觉负担)"}
                  aria-label={isCollapsed ? "展开卡片" : "折叠卡片"}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <GripHorizontal className="h-3.5 w-3.5 text-stone-400 shrink-0" aria-hidden />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-1">
            <h2
              className={`font-serif leading-snug text-ink truncate ${
                isCollapsed ? "text-base font-medium" : "text-xl"
              }`}
              title={title}
            >
              {title}
            </h2>
            {isCollapsed && (
              <span className="text-[10px] font-sans text-stone-400 shrink-0 select-none">
                已收起
              </span>
            )}
          </div>

          {/* Collapsed Summary Banner */}
          {isCollapsed && collapsedSummary && (
            <div className="mt-1.5 pt-1.5 border-t border-line/40 text-[11px] text-stone-600 line-clamp-1">
              {collapsedSummary}
            </div>
          )}
        </div>

        {/* Card Body (only rendered when expanded) */}
        {!isCollapsed && (
          <div className="nowheel nodrag break-words bg-[var(--card)] p-4 sm:p-5">
            {children}
          </div>
        )}
      </div>
    </article>
  );
}
