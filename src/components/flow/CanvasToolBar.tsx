"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  MousePointer,
  Hand,
  LayoutGrid,
  Maximize2,
  FileText,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Layers,
  Search,
  StickyNote,
  Image as ImageIcon,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Wand2,
  Star,
} from "lucide-react";
import { useSiftStore } from "@/lib/convergence-store";
import { useReactFlow } from "@xyflow/react";

export type ToolType =
  | "brief"
  | "ask"
  | "state"
  | "route"
  | "step"
  | "platformPlan"
  | "imageGen"
  | "note"
  | "image";

interface CanvasToolBarProps {
  panOnDrag: boolean;
  onTogglePanMode: () => void;
  onTidyUp: () => void;
  onAddCard: (type: ToolType, position?: { x: number; y: number }) => void;
}

const TOOL_OPTIONS: {
  type: ToolType;
  label: string;
  stageBadge?: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    type: "brief",
    label: "0 简报解析",
    stageBadge: "0",
    desc: "输入设计目标、受众与意向参考图",
    icon: FileText,
    color: "text-stone-300 bg-stone-800",
  },
  {
    type: "ask",
    label: "1 视觉抉择",
    stageBadge: "1",
    desc: "分水岭两极提问，排除模糊地带",
    icon: HelpCircle,
    color: "text-sky-300 bg-sky-950",
  },
  {
    type: "state",
    label: "2 策略基准",
    stageBadge: "2",
    desc: "固化视觉假设、主张与评价准则",
    icon: ShieldCheck,
    color: "text-emerald-300 bg-emerald-950",
  },
  {
    type: "route",
    label: "3 风格主题",
    stageBadge: "3",
    desc: "展开差异化风格方案与血统溯源",
    icon: Sparkles,
    color: "text-indigo-300 bg-indigo-950",
  },
  {
    type: "platformPlan",
    label: "灵感检索",
    stageBadge: "4",
    desc: "跨平台去噪语法与中英专业词库",
    icon: Search,
    color: "text-amber-300 bg-amber-950",
  },
  {
    type: "imageGen",
    label: "画面生成",
    stageBadge: "5",
    desc: "基于风格主题或意向描述，推导渲染高保真概念画面",
    icon: Wand2,
    color: "text-violet-300 bg-violet-950",
  },
  {
    type: "note",
    label: "设计便签",
    desc: "随手标注灵感、竞品参考或评审意见",
    icon: StickyNote,
    color: "text-amber-200 bg-stone-800",
  },
  {
    type: "image",
    label: "参考图片",
    desc: "支持粘贴与拖拽拖放，Figma 风格自由缩放",
    icon: ImageIcon,
    color: "text-blue-300 bg-blue-950",
  },
];

export function CanvasToolBar({
  panOnDrag,
  onTogglePanMode,
  onTidyUp,
  onAddCard,
}: CanvasToolBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { fitView, getNodes } = useReactFlow();
  const collapsedNodeIds = useSiftStore((s) => s.collapsedNodeIds);
  const collapseAllNodes = useSiftStore((s) => s.collapseAllNodes);
  const expandAllNodes = useSiftStore((s) => s.expandAllNodes);
  const cardTags = useSiftStore((s) => s.cardTags);
  const activeFilterTag = useSiftStore((s) => s.activeFilterTag);
  const setActiveFilterTag = useSiftStore((s) => s.setActiveFilterTag);

  const tagCounts = useMemo(() => {
    const counts = { primary: 0, review: 0, serendipity: 0, stashed: 0, totalTagged: 0 };
    for (const tag of Object.values(cardTags || {})) {
      if (tag && tag in counts) {
        counts[tag as keyof typeof counts]++;
        counts.totalTagged++;
      }
    }
    return counts;
  }, [cardTags]);

  const allCollapsed = collapsedNodeIds.length > 0;
  const handleToggleAll = () => {
    if (allCollapsed) {
      expandAllNodes();
    } else {
      const allIds = getNodes()
        .filter((n) => n.type !== "stickyNote" && n.type !== "note")
        .map((n) => n.id);
      collapseAllNodes(allIds);
    }
  };

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Keyboard shortcut: Press 'c' to open add card menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "c" || e.key === "C" || e.key === "/") &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setMenuOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      ref={menuRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 select-none flex flex-col items-center"
    >

      {/* Popover Card Picker */}
      {menuOpen && (
        <div className="mb-3 w-80 rounded-2xl bg-stone-900/95 p-2 shadow-2xl backdrop-blur-md border border-white/15 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-300">
              添加工具卡片到画布
            </span>
            <span className="text-[10px] text-stone-500 font-mono">
              快捷键: C
            </span>
          </div>
          <div className="mt-1 space-y-1 p-0.5 no-scrollbar max-h-[min(540px,80vh)] overflow-y-auto overscroll-contain">
            {TOOL_OPTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    onAddCard(item.type);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 ${item.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-200 group-hover:text-white">
                        {item.label}
                      </span>
                      {item.stageBadge && (
                        <span className="rounded bg-white/10 px-1 py-0.2 font-mono text-[9px] text-stone-400">
                          TOOL
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Figma-like Toolbar Dock */}
      <div className="flex items-center gap-1 rounded-2xl bg-stone-900/90 p-1.5 shadow-2xl backdrop-blur-md border border-white/15 text-stone-200">
        {/* Pan / Select Mode Switch */}
        <button
          type="button"
          onClick={onTogglePanMode}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
            !panOnDrag
              ? "bg-white/20 text-white shadow-xs"
              : "hover:bg-white/10 text-stone-400 hover:text-stone-200"
          }`}
          title={!panOnDrag ? "当前：选择模式 (V)" : "切换至选择模式 (V)"}
        >
          <MousePointer className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onTogglePanMode}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
            panOnDrag
              ? "bg-white/20 text-white shadow-xs"
              : "hover:bg-white/10 text-stone-400 hover:text-stone-200"
          }`}
          title={panOnDrag ? "当前：抓手平移模式 (H)" : "切换至抓手平移模式 (H)"}
        >
          <Hand className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-white/20 mx-1" />

        {/* Add Card Menu Trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 h-9 px-3 rounded-xl transition-all cursor-pointer font-medium text-xs ${
            menuOpen
              ? "bg-accent text-white shadow-xs"
              : "bg-white/10 hover:bg-white/20 text-stone-100"
          }`}
          title="呼出并放置新卡片 (快捷键 C 或 /)"
        >
          <Plus className="h-4 w-4" />
          <span>添加卡片</span>
          <ChevronUp
            className={`h-3 w-3 transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <div className="h-4 w-px bg-white/20 mx-1" />

        {/* Tidy Up Auto Layout */}
        <button
          type="button"
          onClick={onTidyUp}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10 text-stone-300 hover:text-white transition-all cursor-pointer"
          title="整理画布：按设计流向整齐对齐所有卡片"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>

        {/* Toggle All Cards Collapse / Expand */}
        <button
          type="button"
          onClick={handleToggleAll}
          className={`flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10 transition-all cursor-pointer ${
            allCollapsed ? "text-amber-300 bg-white/10" : "text-stone-300 hover:text-white"
          }`}
          title={
            allCollapsed
              ? "展开全部卡片完整内容（快捷键 G 可针对选中卡片或分支收放）"
              : "全部卡片收缩为紧凑胶囊（快捷键 G 可针对选中卡片或分支收放）"
          }
        >
          {allCollapsed ? (
            <ChevronsUpDown className="h-4 w-4" />
          ) : (
            <ChevronsDownUp className="h-4 w-4" />
          )}
        </button>

        {/* Fit View */}
        <button
          type="button"
          onClick={() => void fitView({ duration: 350, padding: 0.25 })}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10 text-stone-300 hover:text-white transition-all cursor-pointer"
          title="适中全览所有卡片"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Curated View Toggle (when any cards are starred/tagged) */}
        {tagCounts.totalTagged > 0 && (
          <>
            <div className="h-4 w-px bg-white/20 mx-1" />
            <button
              type="button"
              onClick={() => setActiveFilterTag(activeFilterTag === "curated" ? "all" : "curated")}
              className={`flex h-9 items-center gap-1.5 px-2.5 rounded-xl transition-all cursor-pointer text-xs ${
                activeFilterTag === "curated"
                  ? "bg-amber-400/20 text-amber-200 border border-amber-400/40 font-medium shadow-xs"
                  : "hover:bg-white/10 text-stone-300 hover:text-white"
              }`}
              title={activeFilterTag === "curated" ? "退出精选：显示全部探索链路" : "仅看精选：聚焦已收藏与重点卡片"}
            >
              <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
              <span>精选</span>
              <span className="text-[10px] opacity-70 font-mono">({tagCounts.totalTagged})</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
