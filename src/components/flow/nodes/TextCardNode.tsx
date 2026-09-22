"use client";

import { useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  CheckCircle,
  HelpCircle,
  XCircle,
  GitBranch,
  Loader2,
  Tag,
} from "lucide-react";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import type { ItemStatus } from "@/types/canvas";

export type TextCardNodeData = {
  itemId: string;
};

export function TextCardNode({
  data,
  selected,
}: NodeProps<Node<TextCardNodeData>>) {
  const item = useSiftStore((s) => s.canvasItems[data.itemId]);
  const schemeGroups = useSiftStore((s) => s.schemeGroups);
  const activeRequest = useSiftStore((s) => s.activeRequest);
  const setStatus = useSiftStore((s) => s.setCanvasItemStatus);
  const [isBranching, setIsBranching] = useState(false);

  if (!item) return null;

  const parentGroups = Object.values(schemeGroups).filter((g) =>
    g.itemIds.includes(item.id),
  );

  const handleStatusChange = (newStatus: ItemStatus) => {
    setStatus(item.id, newStatus);
  };

  const handleBranchOut = async () => {
    if (activeRequest || isBranching) return;
    setIsBranching(true);
    try {
      await siftActions.exploreBranch(item.id);
    } finally {
      setIsBranching(false);
    }
  };

  const statusStyles: Record<
    ItemStatus,
    { badge: string; icon: React.ReactNode; text: string }
  > = {
    determined: {
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
      text: "确定项",
    },
    undetermined: {
      badge: "bg-stone-100 text-stone-600 border border-stone-200",
      icon: <HelpCircle className="w-3.5 h-3.5 text-stone-500" />,
      text: "待定想法",
    },
    discarded: {
      badge: "bg-rose-50 text-rose-600 border border-rose-200 line-through",
      icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
      text: "已舍弃",
    },
  };

  const currentStatus = statusStyles[item.status];
  const isDiscarded = item.status === "discarded";

  return (
    <div
      className={`vb-node card w-[340px] rounded-xl border bg-white shadow-sm transition-all duration-200 ${
        selected ? "ring-2 ring-stone-900 border-transparent shadow-md" : "border-stone-200"
      } ${isDiscarded ? "opacity-60 bg-stone-50" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-stone-400 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-stone-400 !border-white"
      />

      {/* Card Header */}
      <div className="card-drag flex items-center justify-between px-3.5 py-2.5 border-b border-stone-100 bg-stone-50/70 rounded-t-xl cursor-move">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono tracking-wider text-stone-500 uppercase">
            {item.type === "exploration_card" ? "探索视点" : "灵感卡片"}
          </span>
          {parentGroups.map((g) => (
            <span
              key={g.id}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100/80 text-emerald-800"
              title={`已归入方案组：${g.name}`}
            >
              📦 {g.name}
            </span>
          ))}
        </div>
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${currentStatus.badge}`}
        >
          {currentStatus.icon}
          <span>{currentStatus.text}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 space-y-2">
        {item.title && (
          <h4
            className={`text-sm font-semibold text-stone-900 leading-snug ${
              isDiscarded ? "line-through text-stone-500" : ""
            }`}
          >
            {item.title}
          </h4>
        )}
        <p
          className={`text-xs text-stone-700 leading-relaxed whitespace-pre-wrap ${
            isDiscarded ? "line-through text-stone-400" : ""
          }`}
        >
          {item.content}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-stone-100 text-stone-600 font-mono"
              >
                <Tag className="w-2.5 h-2.5 opacity-60" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="px-3.5 py-2.5 bg-stone-50/50 border-t border-stone-100 rounded-b-xl flex items-center justify-between gap-2">
        {/* Status toggles */}
        <div className="flex items-center gap-1 bg-stone-200/60 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => handleStatusChange("determined")}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              item.status === "determined"
                ? "bg-white text-emerald-700 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
            title="标记为确定项，成为后续分支约束"
          >
            确定
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange("undetermined")}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              item.status === "undetermined"
                ? "bg-white text-stone-800 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
            title="保留为待定想法"
          >
            待定
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange("discarded")}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              item.status === "discarded"
                ? "bg-white text-rose-700 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
            title="舍弃此项，从后续推演中排除"
          >
            舍弃
          </button>
        </div>

        {/* Branch Out action */}
        <button
          type="button"
          onClick={handleBranchOut}
          disabled={Boolean(activeRequest) || isBranching}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          title="以此项及已有确定项为硬约束，开启新分支探索"
        >
          {isBranching ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>推演中...</span>
            </>
          ) : (
            <>
              <GitBranch className="w-3 h-3" />
              <span>开新分支</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
