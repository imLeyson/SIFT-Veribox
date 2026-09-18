"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Loader2 } from "lucide-react";
import { NodeShell } from "../NodeShell";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { VBData } from "@/types";

export function StateNode({ data, selected }: NodeProps<Node<VBData, "state">>) {
  const { loading, routes, brief } = useVeriboxStore();
  const { chooseStartingState } = useVeriboxActions();
  const done = routes.length > 0;
  const chips = (brief?.known ?? []).slice(0, 5);

  return (
    <NodeShell kicker="状态" title="怎么开始搜？" selected={selected}>
      {done ? (
        <p className="text-sm text-ink">{data.body}</p>
      ) : (
        <>
          <p className="text-sm text-muted">点一下就行，不用打字。</p>
          {chips.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Brief 里已经有：{chips.join(" / ")}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() => void chooseStartingState("has_idea", chips)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  在出三条路…
                </>
              ) : (
                "心里有点数，按这些出路线"
              )}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={loading}
              onClick={() => void chooseStartingState("no_idea")}
            >
              还没谱，你先给三条路
            </button>
          </div>
        </>
      )}
    </NodeShell>
  );
}
