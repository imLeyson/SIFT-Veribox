"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Loader2 } from "lucide-react";
import { NodeShell } from "../NodeShell";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { VBData } from "@/types";

export function StateNode({ data, selected }: NodeProps<Node<VBData, "state">>) {
  const { loading, routes } = useVeriboxStore();
  const { chooseStartingState } = useVeriboxActions();
  const [ideas, setIdeas] = useState("");
  const done = routes.length > 0;

  return (
    <NodeShell kicker="03 状态" title="你现在有视觉想法吗？" selected={selected}>
      {done ? (
        <p className="text-sm text-ink">{data.body}</p>
      ) : (
        <>
          <p className="text-sm text-muted">{data.body ?? "选一个入口，会在右侧长出三条路线。"}</p>
          <input
            value={ideas}
            onChange={(e) => setIdeas(e.target.value)}
            placeholder="可选：自然 / 纸感 / 克制"
            className="mt-3 w-full rounded-xl border border-line bg-cream/60 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() => {
                const words = ideas
                  .split(/[\s,，/、]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                void chooseStartingState(
                  words.length ? "has_idea" : "no_idea",
                  words
                );
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  编排路线…
                </>
              ) : ideas.trim() ? (
                "用这些感觉生成路线"
              ) : (
                "没有想法，直接生成"
              )}
            </button>
          </div>
        </>
      )}
    </NodeShell>
  );
}
