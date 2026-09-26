"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { GripHorizontal, Copy, Trash2, ChevronDown, ChevronUp, RefreshCw, Bookmark, Check, Star, MessageSquare } from "lucide-react";
import { useSiftStore, type CardTag } from "@/lib/convergence-store";

export type CardTagType = CardTag;

export const CARD_TAG_CONFIG: Record<CardTag, {
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
  activeClass: string;
  description: string;
}> = {
  primary: {
    label: "核心候选",
    shortLabel: "核心",
    icon: "⭐️",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
    activeClass: "ring-1 ring-amber-400/60 border-amber-400/40 shadow-xs",
    description: "经过验证的核心主推方案，优先进入导出提案",
  },
  serendipity: {
    label: "意外灵感",
    shortLabel: "灵感",
    icon: "💡",
    badgeClass: "bg-purple-50 text-purple-900 border-purple-300",
    activeClass: "ring-1 ring-purple-400/60 border-purple-400/40 shadow-xs",
    description: "突破性跨界偶然启发，极具探索价值",
  },
  review: {
    label: "待团队评估",
    shortLabel: "待评",
    icon: "❓",
    badgeClass: "bg-sky-50 text-sky-900 border-sky-300",
    activeClass: "ring-1 ring-sky-400/60 border-sky-400/40 shadow-xs",
    description: "关键分水岭卡片，需团队/导师协助表决",
  },
  stashed: {
    label: "备选归档",
    shortLabel: "归档",
    icon: "💤",
    badgeClass: "bg-stone-100 text-stone-600 border-stone-300",
    activeClass: "opacity-65",
    description: "暂不行通或已替代，沉淀备选",
  },
};

export type StageId = "00" | "01" | "02" | "03" | "04" | "05" | "0" | "1" | "2" | "3" | "4" | "5";

export type StageStyle = {
  id: StageId;
  pillText: string;
  pillBg: string;
  topBorder: string;
};

export const STAGE_MAP: Record<StageId, StageStyle> = {
  "0": {
    id: "0",
    pillText: "0 简报解析",
    pillBg: "bg-stone-700 text-white",
    topBorder: "bg-stone-500",
  },
  "00": {
    id: "0",
    pillText: "0 简报解析",
    pillBg: "bg-stone-700 text-white",
    topBorder: "bg-stone-500",
  },
  "1": {
    id: "1",
    pillText: "1 视觉抉择",
    pillBg: "bg-sky-800 text-white",
    topBorder: "bg-sky-600",
  },
  "01": {
    id: "1",
    pillText: "1 视觉抉择",
    pillBg: "bg-sky-800 text-white",
    topBorder: "bg-sky-600",
  },
  "2": {
    id: "2",
    pillText: "2 策略基准",
    pillBg: "bg-emerald-800 text-white",
    topBorder: "bg-emerald-600",
  },
  "02": {
    id: "2",
    pillText: "2 策略基准",
    pillBg: "bg-emerald-800 text-white",
    topBorder: "bg-emerald-600",
  },
  "3": {
    id: "3",
    pillText: "3 风格主题",
    pillBg: "bg-indigo-900 text-white",
    topBorder: "bg-indigo-600",
  },
  "03": {
    id: "3",
    pillText: "3 风格主题",
    pillBg: "bg-indigo-900 text-white",
    topBorder: "bg-indigo-600",
  },
  "4": {
    id: "4",
    pillText: "灵感检索",
    pillBg: "bg-amber-800 text-white",
    topBorder: "bg-amber-600",
  },
  "04": {
    id: "4",
    pillText: "灵感检索",
    pillBg: "bg-amber-800 text-white",
    topBorder: "bg-amber-600",
  },
  "5": {
    id: "5",
    pillText: "画面生成",
    pillBg: "bg-violet-900 text-white",
    topBorder: "bg-violet-600",
  },
  "05": {
    id: "5",
    pillText: "画面生成",
    pillBg: "bg-violet-900 text-white",
    topBorder: "bg-violet-600",
  },
};

function resolveStage(kicker: string, explicitStage?: StageId): StageStyle | null {
  if (explicitStage && STAGE_MAP[explicitStage]) {
    return STAGE_MAP[explicitStage];
  }
  if (/^(?:00|0)\b|简报/.test(kicker)) return STAGE_MAP["0"];
  if (/^(?:01|1)\b|RECORD|抉择|问答/.test(kicker)) return STAGE_MAP["1"];
  if (/^(?:02|2)\b|DIRECTION|策略|基准|收敛|方向|主张/.test(kicker)) return STAGE_MAP["2"];
  if (/^(?:03|3)\b|主题|风格|领地|路线/.test(kicker)) return STAGE_MAP["3"];
  if (/^(?:04|4)\b|视点|推进|焦点|切入|工位|实操|检索|灵感|搜索|方案/.test(kicker)) return STAGE_MAP["4"];
  if (/^(?:05|5)\b|生图|出图|画图|生成图片|视觉生成|画面生成|意象出图/.test(kicker)) return STAGE_MAP["5"];
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
  title: React.ReactNode;
  badge?: React.ReactNode;
  selected?: boolean;
  className?: string;
  stage?: StageId;
  nodeId?: string;
  collapsedContent?: React.ReactNode;
  onRegenerate?: () => void;
  children?: React.ReactNode;
}) {
  const duplicateNode = useSiftStore((s) => s.duplicateNode);
  const deleteNodeById = useSiftStore((s) => s.deleteNodeById);
  const collapsedNodeIds = useSiftStore((s) => s.collapsedNodeIds);
  const toggleNodeCollapse = useSiftStore((s) => s.toggleNodeCollapse);
  const cardTags = useSiftStore((s) => s.cardTags);
  const activeFilterTag = useSiftStore((s) => s.activeFilterTag);
  const setCardTag = useSiftStore((s) => s.setCardTag);

  const [localCollapsed, setLocalCollapsed] = useState(false);
  const activeCollapsedList = typeof window === "undefined" ? useSiftStore.getState().collapsedNodeIds : (collapsedNodeIds ?? []);
  const isCollapsed = nodeId ? activeCollapsedList.includes(nodeId) : localCollapsed;

  const activeCardTags = typeof window === "undefined" ? useSiftStore.getState().cardTags : cardTags;
  const currentFilterTag = typeof window === "undefined" ? useSiftStore.getState().activeFilterTag : activeFilterTag;
  const currentTag = (nodeId && activeCardTags ? activeCardTags[nodeId] : undefined) as CardTag | undefined;

  const handleToggle = () => {
    if (nodeId) {
      toggleNodeCollapse(nodeId);
    } else {
      setLocalCollapsed((prev) => !prev);
    }
  };

  const stageConfig = resolveStage(kicker, stage);
  const cleanKicker = kicker
    .replace(/^(?:0?[0-7]|简报解析|视觉抉择|策略基准|风格主题|视点推进|灵感检索|画面生成|生成图片|DIRECTION|RECORD|领地\s*0?[1-3])\s*·\s*/i, "")
    .trim();

  // Spotlight Calculation
  const isSpotlightActive = currentFilterTag !== "all";
  const isSpotlightMatched =
    currentFilterTag === "curated"
      ? Boolean(currentTag)
      : Boolean(currentTag && currentTag === currentFilterTag);

  let spotlightClass = "";
  if (isSpotlightActive) {
    if (isSpotlightMatched) {
      spotlightClass = "ring-2 ring-stone-900/70 shadow-2xl scale-[1.01] z-30 opacity-100";
    } else {
      spotlightClass = "opacity-20 blur-[0.2px] hover:opacity-60 hover:blur-none transition-all duration-200";
    }
  } else if (currentTag) {
    spotlightClass = CARD_TAG_CONFIG[currentTag]?.activeClass ?? "";
  }

  return (
    <article
      className={`vb-node card relative transition-all duration-200 ${className ?? "w-[380px]"} ${selected ? "vb-node-selected" : ""} ${spotlightClass}`}
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
          className={`card-drag group cursor-grab bg-white/50 px-5 py-3 active:cursor-grabbing select-none ${
            isCollapsed && !collapsedContent ? "" : "border-b border-line/70"
          }`}
          onDoubleClick={handleToggle}
          title="双击折叠或展开卡片"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {stageConfig && (
                <span
                  className={`inline-flex items-center font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs shrink-0 select-none ${stageConfig.pillBg}`}
                >
                  {stageConfig.pillText}
                </span>
              )}
              {badge ? (
                <div className="shrink-0 whitespace-nowrap">{badge}</div>
              ) : cleanKicker && cleanKicker !== stageConfig?.pillText && !stageConfig?.pillText.includes(cleanKicker) ? (
                <span className="text-[10px] font-medium text-stone-600 bg-stone-100/90 px-1.5 py-0.5 rounded border border-stone-200/60 shrink-0 whitespace-nowrap">
                  {cleanKicker}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Direct Intuitive Card Actions: Star & Review */}
              {nodeId && (
                <div className="flex items-center gap-1">
                  {/* Star / Curate Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardTag(nodeId, currentTag === "primary" ? null : "primary");
                    }}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                      currentTag === "primary"
                        ? CARD_TAG_CONFIG.primary.badgeClass
                        : "border-transparent text-stone-400 hover:text-amber-500 hover:bg-stone-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    }`}
                    title={currentTag === "primary" ? "已收藏为核心方案 (点击取消)" : "收藏为核心方案 (★ 收藏)"}
                  >
                    <Star
                      className={`h-3 w-3 ${
                        currentTag === "primary"
                          ? "fill-amber-500 text-amber-500"
                          : "text-stone-400"
                      }`}
                    />
                    {currentTag === "primary" && (
                      <>
                        <span className="text-[10px]">⭐️</span>
                        <span>{CARD_TAG_CONFIG.primary.shortLabel}</span>
                      </>
                    )}
                  </button>

                  {/* Review / Doubt Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardTag(nodeId, currentTag === "review" ? null : "review");
                    }}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                      currentTag === "review"
                        ? CARD_TAG_CONFIG.review.badgeClass
                        : "border-transparent text-stone-400 hover:text-sky-500 hover:bg-stone-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    }`}
                    title={currentTag === "review" ? "已标记待团队评估 (点击取消)" : "标记待团队评估 (💬 待评)"}
                  >
                    <MessageSquare
                      className={`h-3 w-3 ${
                        currentTag === "review"
                          ? "fill-sky-100 text-sky-600"
                          : "text-stone-400"
                      }`}
                    />
                    {currentTag === "review" && (
                      <>
                        <span className="text-[10px]">❓</span>
                        <span>{CARD_TAG_CONFIG.review.shortLabel}</span>
                      </>
                    )}
                  </button>

                  {/* Secondary/Legacy tags if present */}
                  {currentTag && currentTag !== "primary" && currentTag !== "review" && CARD_TAG_CONFIG[currentTag] && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardTag(nodeId, null);
                      }}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${CARD_TAG_CONFIG[currentTag].badgeClass}`}
                      title={`${CARD_TAG_CONFIG[currentTag].label} (点击取消)`}
                    >
                      <span>{CARD_TAG_CONFIG[currentTag].icon}</span>
                      <span>{CARD_TAG_CONFIG[currentTag].shortLabel}</span>
                    </button>
                  )}
                </div>
              )}

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
          <div
            role="heading"
            aria-level={2}
            className={`mt-1 font-serif text-ink transition-all ${
              isCollapsed ? "text-base leading-snug line-clamp-1" : "text-xl leading-snug"
            }`}
          >
            {title}
          </div>
        </div>

        {/* Collapsible Card Body / Chat Mode Body */}
        {isCollapsed ? (
          collapsedContent ? (
            <div className="nowheel nodrag break-words bg-[var(--card)] px-5 py-3.5 border-t border-line/40 animate-in fade-in duration-150">
              {collapsedContent}
            </div>
          ) : null
        ) : (
          <div className="nowheel nodrag break-words bg-[var(--card)] p-5">
            {children}
          </div>
        )}
      </div>
    </article>
  );
}
