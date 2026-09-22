"use client";

import { useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  CheckCircle,
  HelpCircle,
  XCircle,
  GitBranch,
  Loader2,
  ImageIcon,
  Tag,
} from "lucide-react";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import type { ItemStatus } from "@/types/canvas";

export type ImageCardNodeData = {
  itemId: string;
};

export function ImageCardNode({
  data,
  selected,
}: NodeProps<Node<ImageCardNodeData>>) {
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
      text: "确定素材",
    },
    undetermined: {
      badge: "bg-stone-100 text-stone-600 border border-stone-200",
      icon: <HelpCircle className="w-3.5 h-3.5 text-stone-500" />,
      text: "参考候选",
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
      className={`vb-node card w-[320px] rounded-xl border bg-white shadow-sm transition-all duration-200 overflow-hidden ${
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

      {/* Header */}
      <div className="card-drag flex items-center justify-between px-3.5 py-2 border-b border-stone-100 bg-stone-50/70 cursor-move">
        <div className="flex items-center gap-1.5 text-stone-600 flex-wrap">
          <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-[11px] font-mono tracking-wider uppercase text-stone-500">
            视觉参考
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

      {/* Image Preview */}
      <div className="relative aspect-video bg-stone-100 overflow-hidden border-b border-stone-100">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title || "参考素材"}
            className={`w-full h-full object-cover transition-opacity ${
              isDiscarded ? "grayscale opacity-50" : ""
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-stone-400">
            <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
            <span className="text-xs">暂无图像预览</span>
          </div>
        )}
      </div>

      {/* Caption & Content */}
      <div className="p-3 space-y-1.5">
        {item.title && (
          <h4
            className={`text-xs font-semibold text-stone-900 ${
              isDiscarded ? "line-through text-stone-400" : ""
            }`}
          >
            {item.title}
          </h4>
        )}
        {item.content && (
          <p
            className={`text-[11px] text-stone-600 leading-relaxed ${
              isDiscarded ? "line-through text-stone-400" : ""
            }`}
          >
            {item.content}
          </p>
        )}

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

      {/* Footer */}
      <div className="px-3 py-2 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-stone-200/60 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => handleStatusChange("determined")}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              item.status === "determined"
                ? "bg-white text-emerald-700 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
            title="确认此视觉特征，作为后续探索约束"
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
          >
            舍弃
          </button>
        </div>

        <button
          type="button"
          onClick={handleBranchOut}
          disabled={Boolean(activeRequest) || isBranching}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          title="以该参考图审美特征为约束，推导新分支"
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
