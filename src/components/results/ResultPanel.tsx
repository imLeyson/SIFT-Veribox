"use client";

import { useState } from "react";
import { Check, Layers, Plus, Trash2, X } from "lucide-react";
import {
  resolveNodeContext,
  useSiftStore,
} from "@/lib/convergence-store";

type ResultPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedNodeIds: string[];
};

function itemLabel(id: string, store: ReturnType<typeof useSiftStore.getState>) {
  return resolveNodeContext(id, store)?.label ?? "已移除的画布内容";
}

function itemDetail(id: string, store: ReturnType<typeof useSiftStore.getState>) {
  const resolved = resolveNodeContext(id, store);
  if (!resolved) return "来源卡片已移除";
  const data = resolved.data ?? {};
  const route = resolved.route;
  if (route?.visualSnapshot || route?.purpose) {
    return route.visualSnapshot || route.purpose;
  }
  if (typeof data.content === "string" && data.content.trim()) return data.content;
  if (typeof data.fileName === "string" && data.fileName.trim()) return data.fileName;
  if (typeof data.prompt === "string" && data.prompt.trim()) return data.prompt;
  return "保留原卡片来源，可回到画布继续编辑";
}

export function ResultPanel({
  isOpen,
  onClose,
  selectedNodeIds,
}: ResultPanelProps) {
  const store = useSiftStore();
  const outcomeItems = useSiftStore((s) => s.outcomeItems);
  const outcomeGroups = useSiftStore((s) => s.outcomeGroups);
  const addOutcomeItems = useSiftStore((s) => s.addOutcomeItems);
  const removeOutcomeItem = useSiftStore((s) => s.removeOutcomeItem);
  const createOutcomeGroup = useSiftStore((s) => s.createOutcomeGroup);
  const deleteOutcomeGroup = useSiftStore((s) => s.deleteOutcomeGroup);
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");

  if (!isOpen) return null;

  const toggleGroupSelection = (id: string) => {
    setGroupSelection((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleCreateGroup = () => {
    const created = createOutcomeGroup(groupTitle, groupSelection);
    if (!created) return;
    setGroupTitle("");
    setGroupSelection([]);
  };

  const outcomeRoutes = outcomeItems
    .map((id) => resolveNodeContext(id, store))
    .filter((item) => item?.type === "route");
  const outcomeImages = outcomeItems
    .map((id) => resolveNodeContext(id, store))
    .filter((item) => item?.type === "image" || item?.type === "imageGen");
  const reviewCount = outcomeItems.filter((id) => store.cardTags[id] === "review").length;
  const groupedIds = new Set(outcomeGroups.flatMap((group) => group.itemIds));
  const ungroupedCount = outcomeItems.filter((id) => !groupedIds.has(id)).length;

  return (
    <aside
      aria-label="探索成果"
      className="flex h-full w-[380px] shrink-0 flex-col border-l border-stone-200/80 bg-white/95 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-start justify-between border-b border-stone-200/70 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold tracking-tight text-stone-900">探索成果</h2>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            收纳准备继续使用的内容，来源始终保留在原卡片。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭探索成果"
          className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-stone-200/70 bg-stone-50/70 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-stone-800">当前选择</h3>
            <p className="mt-0.5 text-[11px] text-stone-500">
              在画布上框选卡片后加入成果
            </p>
          </div>
          <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] font-medium text-stone-500">
            {selectedNodeIds.length} 张
          </span>
        </div>
        {selectedNodeIds.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {selectedNodeIds.slice(0, 4).map((id) => (
              <div key={id} className="truncate rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] text-stone-700">
                {itemLabel(id, store)}
              </div>
            ))}
            {selectedNodeIds.length > 4 && (
              <p className="text-[10px] text-stone-400">还有 {selectedNodeIds.length - 4} 张卡片</p>
            )}
            <button
              type="button"
              onClick={() => addOutcomeItems(selectedNodeIds)}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700"
            >
              <Plus className="h-3.5 w-3.5" />
              加入成果
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-stone-800">已收纳内容</h3>
            <p className="mt-0.5 text-[11px] text-stone-500">勾选内容后可组成一个方案</p>
          </div>
          <span className="text-[10px] text-stone-400">{outcomeItems.length} 项</span>
        </div>

        {outcomeItems.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 px-4 py-7 text-center">
            <p className="text-xs text-stone-500">还没有收纳内容</p>
            <p className="mt-1 text-[10px] leading-relaxed text-stone-400">
              选择主题、图片或策略卡片后加入成果
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {outcomeItems.map((id) => {
              const checked = groupSelection.includes(id);
              return (
                <div
                  key={id}
                  className={`rounded-lg border bg-white px-3 py-2.5 transition-colors ${
                    checked ? "border-stone-400" : "border-stone-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleGroupSelection(id)}
                      aria-label={checked ? `取消选择 ${itemLabel(id, store)}` : `选择 ${itemLabel(id, store)}`}
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checked
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-white text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-stone-800">{itemLabel(id, store)}</p>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-stone-500">{itemDetail(id, store)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOutcomeItem(id)}
                      aria-label={`移除 ${itemLabel(id, store)}`}
                      className="rounded p-1 text-stone-300 transition-colors hover:bg-stone-100 hover:text-stone-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {outcomeItems.length > 0 && (
          <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-800">成果摘要</h3>
              <span className="text-[10px] text-stone-400">随来源卡片更新</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
              <div>
                <span className="text-stone-400">主题方向</span>
                <p className="mt-0.5 font-medium text-stone-700">{outcomeRoutes.length} 个</p>
              </div>
              <div>
                <span className="text-stone-400">视觉素材</span>
                <p className="mt-0.5 font-medium text-stone-700">{outcomeImages.length} 项</p>
              </div>
              <div>
                <span className="text-stone-400">待审内容</span>
                <p className="mt-0.5 font-medium text-stone-700">{reviewCount} 项</p>
              </div>
              <div>
                <span className="text-stone-400">尚未分组</span>
                <p className="mt-0.5 font-medium text-stone-700">{ungroupedCount} 项</p>
              </div>
            </div>
            {outcomeRoutes.length > 0 && (
              <p className="mt-3 border-t border-stone-200/80 pt-2 text-[10px] leading-relaxed text-stone-500">
                {outcomeRoutes.map((item) => item?.route?.coreProblem).filter(Boolean).slice(0, 1).join("") || "主题方向已收纳，可继续组成方案。"}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-stone-200/70 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-stone-800">方案分组</h3>
              <p className="mt-0.5 text-[11px] text-stone-500">把已收纳内容整理成可复用方向</p>
            </div>
            <span className="text-[10px] text-stone-400">{outcomeGroups.length} 个</span>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={groupTitle}
              onChange={(event) => setGroupTitle(event.target.value)}
              placeholder="方案名称"
              maxLength={80}
              className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400"
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={groupSelection.length === 0 || !groupTitle.trim()}
              className="rounded-md border border-stone-900 bg-stone-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
            >
              创建
            </button>
          </div>
          {groupSelection.length > 0 && (
            <p className="mt-1.5 text-[10px] text-stone-500">已选择 {groupSelection.length} 项</p>
          )}

          {outcomeGroups.length > 0 && (
            <div className="mt-3 space-y-2">
              {outcomeGroups.map((group) => (
                <div key={group.id} className="rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-stone-800">{group.title}</p>
                    <button
                      type="button"
                      onClick={() => deleteOutcomeGroup(group.id)}
                      aria-label={`删除 ${group.title}`}
                      className="rounded p-1 text-stone-300 transition-colors hover:bg-white hover:text-stone-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-stone-500">包含 {group.itemIds.length} 项，可回到来源卡片继续编辑</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
