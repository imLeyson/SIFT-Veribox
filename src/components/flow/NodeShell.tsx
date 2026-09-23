"use client";

import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { GripHorizontal, Copy, Trash2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
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
    pillText: "00 简报解析",
    pillBg: "bg-stone-700 text-white",
    topBorder: "bg-stone-500",
  },
  "01": {
    id: "01",
    pillText: "01 视觉抉择",
    pillBg: "bg-sky-800 text-white",
    topBorder: "bg-sky-600",
  },
  "02": {
    id: "02",
    pillText: "02 策略基准",
    pillBg: "bg-emerald-800 text-white",
    topBorder: "bg-emerald-600",
  },
  "03": {
    id: "03",
    pillText: "03 风格主题",
    pillBg: "bg-indigo-900 text-white",
    topBorder: "bg-indigo-600",
  },
  "04": {
    id: "04",
    pillText: "04 视点推进",
    pillBg: "bg-zinc-800 text-white",
    topBorder: "bg-zinc-700",
  },
  "05": {
    id: "05",
    pillText: "05 灵感检索",
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
  if (/^02\b|DIRECTION|策略|基准|收敛|方向|主张/.test(kicker)) return STAGE_MAP["02"];
  if (/^03\b|主题|风格|领地|路线/.test(kicker)) return STAGE_MAP["03"];
  if (/^(?:04|05)\b|视点|推进|焦点|切入|工位|实操/.test(kicker)) return STAGE_MAP["04"];
  if (/^(?:05|07)\b|检索|灵感|搜索|方案|探索/.test(kicker)) return STAGE_MAP["05"];
  return null;
}

export function NodeShell({
  kicker,
  title,
  badge,
  selected,
  className,
  stage,
  nodeId,
  collapsedContent,
  onRegenerate,
  children,
}: {
  kicker: string;
  title: string;
  badge?: React.ReactNode;
  selected?: boolean;
  className?: string;
  stage?: StageId;
  nodeId?: string;
  collapsedContent?: React.ReactNode;
  onRegenerate?: () => void;
  children: React.ReactNode;
}) {
  const duplicateNode = useSiftStore((s) => s.duplicateNode);
  const deleteNodeById = useSiftStore((s) => s.deleteNodeById);
  const collapsedNodeIds = useSiftStore((s) => s.collapsedNodeIds);
  const toggleNodeCollapse = useSiftStore((s) => s.toggleNodeCollapse);

  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = nodeId ? collapsedNodeIds.includes(nodeId) : localCollapsed;

  const handleToggle = () => {
    if (nodeId) {
      toggleNodeCollapse(nodeId);
    } else {
      setLocalCollapsed((prev) => !prev);
    }
  };

  const stageConfig = resolveStage(kicker, stage);
  const cleanKicker = kicker
    .replace(/^(?:0[0-7]|简报解析|视觉抉择|策略基准|风格主题|视点推进|灵感检索|DIRECTION|RECORD|领地\s*0[1-3])\s*·\s*/i, "")
    .trim();

  return (
    <article
      className={`vb-node card relative transition-all duration-200 ${className ?? "w-[380px]"} ${selected ? "vb-node-selected" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        className="!w-3 !h-3 !rounded-full !bg-stone-400 hover:!bg-accent !border-2 !border-white transition-all cursor-crosshair !-left-[6px] opacity-75 hover:opacity-100 hover:scale-125 z-10"
        title="拖动或吸附连线（输入）"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        className="!w-3 !h-3 !rounded-full !bg-stone-400 hover:!bg-accent !border-2 !border-white transition-all cursor-crosshair !-right-[6px] opacity-75 hover:opacity-100 hover:scale-125 z-10"
        title="拖动引线连接下游卡片或释放呼出下一步"
      />
      <div className="overflow-hidden rounded-[1.25rem]">
        {/* Top 3px Semantic Stage Accent Strip */}
        {stageConfig && (
          <div className={`h-[3px] w-full ${stageConfig.topBorder}`} />
        )}
        <div
          className="card-drag cursor-grab border-b border-line/70 bg-white/50 px-5 py-3 active:cursor-grabbing select-none"
          onDoubleClick={handleToggle}
          title="双击折叠或展开卡片"
        >
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

            <div className="flex items-center gap-1 shrink-0">
              {/* Collapse / Expand Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
                className="rounded p-1 text-stone-400 hover:bg-stone-200/70 hover:text-ink transition-colors cursor-pointer"
                title={isCollapsed ? "展开卡片完整内容" : "收缩卡片（仅展示关键内容）"}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-3.5 w-3.5 text-stone-700" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
                )}
              </button>

              {onRegenerate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegenerate();
                  }}
                  className="rounded p-1 text-stone-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="根据已连上下文重新生成内容"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}

              {nodeId && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateNode(nodeId);
                    }}
                    className="rounded p-1 text-stone-400 hover:bg-stone-200/70 hover:text-ink transition-colors cursor-pointer"
                    title="复制分支 (Duplicate)"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNodeById(nodeId);
                    }}
                    className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    title="删除卡片 (Delete)"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
              <GripHorizontal className="h-3.5 w-3.5 text-stone-400 shrink-0" aria-hidden />
            </div>
          </div>
          <h2
            className={`mt-1 font-serif text-ink transition-all ${
              isCollapsed ? "text-base leading-snug line-clamp-1" : "text-xl leading-snug"
            }`}
          >
            {title}
          </h2>
        </div>

        {/* Collapsible Card Body */}
        {isCollapsed ? (
          <div className="nowheel nodrag break-words bg-[var(--card)] px-5 py-3.5 border-t border-line/40 animate-in fade-in duration-150">
            {collapsedContent ?? (
              <div className="text-xs text-stone-500 italic py-0.5 flex items-center justify-between">
                <span>已收缩卡片详情</span>
                <button
                  type="button"
                  onClick={handleToggle}
                  className="text-accent hover:underline text-[11px] not-italic cursor-pointer"
                >
                  展开查看全部
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="nowheel nodrag break-words bg-[var(--card)] p-5">
            {children}
          </div>
        )}
      </div>
    </article>
  );
}
