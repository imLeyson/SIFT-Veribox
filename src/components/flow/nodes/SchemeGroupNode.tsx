"use client";

import { useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  Folder,
  FolderOpen,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  Layers,
} from "lucide-react";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";

export type SchemeGroupNodeData = {
  groupId: string;
};

export function SchemeGroupNode({
  data,
  selected,
}: NodeProps<Node<SchemeGroupNodeData>>) {
  const group = useSiftStore((s) => s.schemeGroups[data.groupId]);
  const canvasItems = useSiftStore((s) => s.canvasItems);
  const toggleCollapse = useSiftStore((s) => s.toggleSchemeGroupCollapse);
  const removeGroup = useSiftStore((s) => s.removeSchemeGroup);
  const activeRequest = useSiftStore((s) => s.activeRequest);
  const [isBranching, setIsBranching] = useState(false);

  if (!group) return null;

  const items = group.itemIds
    .map((id) => canvasItems[id])
    .filter(Boolean);

  const handleBranchFromGroup = async () => {
    if (activeRequest || isBranching || items.length === 0) return;
    setIsBranching(true);
    try {
      // Branch out from first item with all group items as constraints
      await siftActions.exploreBranch(
        items[0].id,
        `基于方案组「${group.name}」综合深化`,
        {
          customBranchName: `方案深化：${group.name}`,
          extraConstraintItemIds: group.itemIds,
        },
      );
    } finally {
      setIsBranching(false);
    }
  };

  const isCollapsed = group.collapsed;

  return (
    <div
      className={`vb-node card w-[380px] rounded-2xl border-2 transition-all duration-200 shadow-md ${
        selected ? "border-stone-900 shadow-lg" : "border-emerald-600/40 bg-emerald-50/20"
      } bg-white overflow-hidden`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-emerald-600 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-emerald-600 !border-white"
      />

      {/* Header */}
      <div className="card-drag flex items-center justify-between px-4 py-3 bg-emerald-800 text-white cursor-move select-none">
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <Folder className="w-4 h-4 text-emerald-300" />
          ) : (
            <FolderOpen className="w-4 h-4 text-emerald-300" />
          )}
          <span className="font-semibold text-xs tracking-wide">
            方案组 · {group.name}
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-900/80 text-emerald-200 font-mono">
            {items.length} 项
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleCollapse(group.id)}
            className="p-1 rounded hover:bg-emerald-700/80 text-emerald-200 hover:text-white transition-colors"
            title={isCollapsed ? "展开方案组详情" : "折叠方案组"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => removeGroup(group.id)}
            className="p-1 rounded hover:bg-rose-900/80 text-emerald-300 hover:text-rose-200 transition-colors"
            title="解散方案组（保留原卡片）"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed ? (
        <div className="p-3.5 space-y-2.5">
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between p-2 rounded-lg border border-stone-200/80 bg-stone-50/60 text-xs"
              >
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      it.status === "determined"
                        ? "bg-emerald-500"
                        : it.status === "discarded"
                        ? "bg-rose-500"
                        : "bg-stone-400"
                    }`}
                  />
                  <span className="font-medium text-stone-800 truncate">
                    {it.title || it.content.slice(0, 20)}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 font-mono flex-shrink-0">
                  {it.status === "determined" ? "确定项" : "待定"}
                </span>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-stone-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-stone-400" />
              打包为独立设计提案
            </span>
            <button
              type="button"
              onClick={handleBranchFromGroup}
              disabled={Boolean(activeRequest) || isBranching || items.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-800 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xs"
              title="将该方案组所有确定项作为硬约束，开辟新分支深度推导"
            >
              {isBranching ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>深化中...</span>
                </>
              ) : (
                <>
                  <GitBranch className="w-3 h-3" />
                  <span>以此方案开新分支</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Summary */
        <div className="p-3 bg-stone-50/50 flex items-center justify-between">
          <p className="text-xs text-stone-600 truncate max-w-[220px]">
            {items.map((i) => i.title || i.content.slice(0, 10)).join(" · ") || "空方案组"}
          </p>
          <button
            type="button"
            onClick={handleBranchFromGroup}
            disabled={Boolean(activeRequest) || isBranching || items.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-800 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            <GitBranch className="w-3 h-3" />
            <span>深化</span>
          </button>
        </div>
      )}
    </div>
  );
}
