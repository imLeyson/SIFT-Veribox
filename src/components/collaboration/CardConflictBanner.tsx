"use client";

import type { CardConflict } from "@/lib/collaboration/types";
import { collabManager } from "@/lib/collaboration/collab-manager";

export function CardConflictBanner({ conflict }: { conflict: CardConflict }) {
  return (
    <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] text-amber-950">
      <div className="font-semibold">{conflict.remotePeer.name} 同时编辑了这张卡片</div>
      <div className="mt-1 text-amber-800/80">
        {conflict.fields.includes("content") || conflict.fields.includes("data")
          ? "文字内容发生冲突，请选择保留方式。"
          : "部分内容发生冲突，请选择保留方式。"}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => collabManager.resolveCardConflict(conflict.cardId, "local")}
          className="rounded-md border border-amber-300 bg-white px-2 py-1 font-medium text-amber-900 hover:bg-amber-100"
        >
          保留我的
        </button>
        <button
          type="button"
          onClick={() => collabManager.resolveCardConflict(conflict.cardId, "remote")}
          className="rounded-md border border-amber-300 bg-white px-2 py-1 font-medium text-amber-900 hover:bg-amber-100"
        >
          采用对方
        </button>
        {conflict.fields.includes("content") && (
          <button
            type="button"
            onClick={() => collabManager.resolveCardConflict(conflict.cardId, "merge")}
            className="rounded-md bg-amber-900 px-2 py-1 font-medium text-white hover:bg-amber-800"
          >
            合并文字
          </button>
        )}
      </div>
    </div>
  );
}
