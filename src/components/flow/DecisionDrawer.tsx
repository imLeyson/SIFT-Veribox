"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSiftStore } from "@/lib/convergence-store";
import type { DecisionStatus, ItemDecision } from "@/lib/agent/convergence-schema";
import {
  X,
  Check,
  HelpCircle,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  GitFork,
  ExternalLink,
  Target,
  Trash2,
} from "lucide-react";

export function DecisionDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const itemDecisions = useSiftStore((s) => s.itemDecisions);
  const toggleItemStatus = useSiftStore((s) => s.toggleItemStatus);
  const removeItemDecision = useSiftStore((s) => s.removeItemDecision);
  const setItemDecision = useSiftStore((s) => s.setItemDecision);

  const [mounted, setMounted] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | DecisionStatus>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const items = Object.values(itemDecisions);
  const confirmedItems = items.filter((i) => i.status === "confirmed");
  const uncertainItems = items.filter((i) => i.status === "uncertain");
  const discardedItems = items.filter((i) => i.status === "discarded");

  const displayItems =
    filterTab === "all" ? items : items.filter((i) => i.status === filterTab);

  const getTypeIcon = (type: ItemDecision["type"]) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-3.5 w-3.5 text-stone-500" />;
      case "theme":
        return <GitFork className="h-3.5 w-3.5 text-amber-600" />;
      case "link":
        return <ExternalLink className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-stone-600" />;
    }
  };

  const getTypeLabel = (type: ItemDecision["type"]) => {
    switch (type) {
      case "image":
        return "参考图";
      case "theme":
        return "设计主题";
      case "link":
        return "灵感链接";
      default:
        return "文字要素";
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-md sm:max-w-lg flex-col bg-white shadow-2xl border-l border-line/80 animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-ink">
                决策基石与约束清单
              </h2>
              <p className="text-[11px] text-stone-500">
                已确认项作为下一轮 AI 硬约束，舍弃项不再干扰生成
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-ink transition-colors"
            title="关闭面板"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 border-b border-line/60 bg-white px-5 py-2.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              filterTab === "all"
                ? "bg-ink text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            全部 ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("confirmed")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
              filterTab === "confirmed"
                ? "bg-emerald-800 text-white"
                : "text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            <Check className="h-3 w-3" />
            <span>确定项 ({confirmedItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("uncertain")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
              filterTab === "uncertain"
                ? "bg-amber-800 text-white"
                : "text-amber-800 hover:bg-amber-50"
            }`}
          >
            <HelpCircle className="h-3 w-3" />
            <span>待定想法 ({uncertainItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("discarded")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
              filterTab === "discarded"
                ? "bg-stone-700 text-white"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            <X className="h-3 w-3" />
            <span>已舍弃 ({discardedItems.length})</span>
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400 space-y-2">
              <Target className="h-8 w-8 stroke-1 text-stone-300" />
              <p className="text-xs">
                {filterTab === "all"
                  ? "暂无手动标记项。在画布卡片中点击关键词、参考图或主题即可标记。"
                  : "当前分类下暂无要素。"}
              </p>
            </div>
          ) : (
            displayItems.map((item) => (
              <div
                key={item.id}
                className={`group rounded-xl border p-3 transition-all space-y-1.5 ${
                  item.status === "confirmed"
                    ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                    : item.status === "uncertain"
                      ? "border-amber-200 bg-amber-50/30 hover:border-amber-300"
                      : "border-line/70 bg-stone-100/60 opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
                    {getTypeIcon(item.type)}
                    <span>{item.label || getTypeLabel(item.type)}</span>
                    {item.sourceNode && (
                      <span className="text-[10px] text-stone-400 font-mono">
                        · {item.sourceNode}
                      </span>
                    )}
                  </div>

                  {/* Status Badges & Quick Switchers */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleItemStatus(item.id, "confirmed")}
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                        item.status === "confirmed"
                          ? "bg-emerald-700 text-white shadow-2xs font-semibold"
                          : "text-stone-400 hover:text-emerald-800 hover:bg-emerald-100"
                      }`}
                      title="标记为确定项（下轮 AI 硬约束）"
                    >
                      <Check className="h-2.5 w-2.5" />
                      <span>确定</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleItemStatus(item.id, "uncertain")}
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                        item.status === "uncertain"
                          ? "bg-amber-700 text-white shadow-2xs font-semibold"
                          : "text-stone-400 hover:text-amber-800 hover:bg-amber-100"
                      }`}
                      title="保留为待定想法（待验证探索）"
                    >
                      <HelpCircle className="h-2.5 w-2.5" />
                      <span>待定</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleItemStatus(item.id, "discarded")}
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                        item.status === "discarded"
                          ? "bg-stone-700 text-white shadow-2xs font-semibold"
                          : "text-stone-400 hover:text-red-700 hover:bg-red-50"
                      }`}
                      title="舍弃此项（下轮不再干扰或推荐）"
                    >
                      <X className="h-2.5 w-2.5" />
                      <span>舍弃</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItemDecision(item.id)}
                      className="rounded p-0.5 text-stone-300 hover:text-stone-600 transition-colors ml-1"
                      title="移除此标记"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Content rendering */}
                {item.type === "image" ? (
                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={item.content}
                      alt={item.label || "参考图"}
                      className="h-12 w-12 rounded object-cover border border-line"
                    />
                    <span className="text-[11px] text-stone-600">
                      {item.status === "confirmed"
                        ? "作为核心参考图（提取色彩与肌理）"
                        : item.status === "uncertain"
                          ? "备选意向图（暂定保留）"
                          : "已舍弃参考（下轮彻底剔除）"}
                    </span>
                  </div>
                ) : (
                  <p
                    className={`text-xs leading-relaxed ${
                      item.status === "discarded"
                        ? "line-through text-stone-400"
                        : "text-stone-800 font-medium"
                    }`}
                  >
                    {item.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-line/70 px-5 py-3 bg-stone-50/60 text-xs">
          <div className="flex items-center gap-2">
            {discardedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  discardedItems.forEach((item) => removeItemDecision(item.id));
                }}
                className="text-[11px] text-stone-500 hover:text-ink transition-colors flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>清空舍弃项</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs py-1.5 px-3"
          >
            完成
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
