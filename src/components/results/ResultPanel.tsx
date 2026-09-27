"use client";

import { useMemo, useState } from "react";
import { Check, Layers, Trash2, X } from "lucide-react";
import { resolveNodeContext, useSiftStore } from "@/lib/convergence-store";

type ResultPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ResultPanel({ isOpen, onClose }: ResultPanelProps) {
  const store = useSiftStore();
  const outcomeGroups = useSiftStore((s) => s.outcomeGroups);
  const addOutcomeItems = useSiftStore((s) => s.addOutcomeItems);
  const createOutcomeGroup = useSiftStore((s) => s.createOutcomeGroup);
  const deleteOutcomeGroup = useSiftStore((s) => s.deleteOutcomeGroup);
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");

  const likedIds = useMemo(
    () => Object.entries(store.cardTags ?? {})
      .filter(([, tag]) => tag === "primary")
      .map(([id]) => id),
    [store.cardTags],
  );

  const likedItems = likedIds
    .map((id) => ({ id, context: resolveNodeContext(id, store) }))
    .filter((item) => Boolean(item.context));

  const itemLabel = (id: string) =>
    resolveNodeContext(id, store)?.label ?? "来源卡片已移除";

  const toggleGroupSelection = (id: string) => {
    setGroupSelection((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleCreateGroup = () => {
    const cleanTitle = groupTitle.trim();
    if (!cleanTitle || groupSelection.length < 2) return;
    addOutcomeItems(groupSelection);
    const created = createOutcomeGroup(cleanTitle, groupSelection);
    if (!created) return;
    setGroupTitle("");
    setGroupSelection([]);
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="方案"
      className="flex h-full w-[350px] shrink-0 flex-col border-l border-stone-200/80 bg-white/95 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-start justify-between border-b border-stone-200/70 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold tracking-tight text-stone-900">方案</h2>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            把喜欢的方向组合成可以继续讨论的方案。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭方案"
          className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <section aria-labelledby="liked-directions-title">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="liked-directions-title" className="text-xs font-semibold text-stone-800">喜欢的方向</h3>
              <p className="mt-0.5 text-[11px] text-stone-500">在卡片上标记“喜欢”后会出现在这里</p>
            </div>
            <span className="text-[10px] text-stone-400">{likedItems.length} 张</span>
          </div>

          {likedItems.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 px-4 py-7 text-center">
              <p className="text-xs text-stone-500">还没有喜欢的方向</p>
              <p className="mt-1 text-[10px] leading-relaxed text-stone-400">
                先回到画布，在值得继续的卡片上点“喜欢”。
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-1.5">
              {likedItems.map(({ id }) => {
                const checked = groupSelection.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleGroupSelection(id)}
                    aria-pressed={checked}
                    className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                      checked
                        ? "border-stone-400 bg-stone-50"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-white text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-stone-800">{itemLabel(id)}</span>
                    <span className="text-[10px] text-amber-500">喜欢</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="create-group-title" className="mt-6 border-t border-stone-200/70 pt-4">
          <div>
            <h3 id="create-group-title" className="text-xs font-semibold text-stone-800">组成方案</h3>
            <p className="mt-0.5 text-[11px] text-stone-500">
              选择至少两个喜欢的方向，再给它一个名称。
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={groupTitle}
              onChange={(event) => setGroupTitle(event.target.value)}
              placeholder="方案名称"
              aria-label="方案名称"
              maxLength={80}
              className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400"
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={groupSelection.length < 2 || !groupTitle.trim()}
              className="rounded-md border border-stone-900 bg-stone-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
            >
              创建
            </button>
          </div>
          {groupSelection.length > 0 && (
            <p className="mt-1.5 text-[10px] text-stone-500">已选择 {groupSelection.length} 张</p>
          )}
        </section>

        {outcomeGroups.length > 0 && (
          <section aria-labelledby="existing-groups-title" className="mt-6 border-t border-stone-200/70 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 id="existing-groups-title" className="text-xs font-semibold text-stone-800">已有方案</h3>
                <p className="mt-0.5 text-[11px] text-stone-500">方案保留来源，可回到画布继续编辑。</p>
              </div>
              <span className="text-[10px] text-stone-400">{outcomeGroups.length} 个</span>
            </div>
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
                  <div className="mt-1.5 space-y-0.5">
                    {group.itemIds.slice(0, 3).map((id) => (
                      <p key={id} className="truncate text-[10px] text-stone-500">{itemLabel(id)}</p>
                    ))}
                    {group.itemIds.length > 3 && (
                      <p className="text-[10px] text-stone-400">还有 {group.itemIds.length - 3} 张</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
