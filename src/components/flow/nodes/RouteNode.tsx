"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Loader2 } from "lucide-react";
import { NodeShell } from "../NodeShell";
import { QuestionBlock } from "../QuestionBlock";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { VBData } from "@/types";

export function RouteNode({ data, selected }: NodeProps<Node<VBData, "route">>) {
  const { loading, nodes, pendingQuestions } = useVeriboxStore();
  const { chooseRoute, submitAnswers } = useVeriboxActions();
  const route = data.route;
  if (!route) return null;
  const branched = nodes.some(
    (n) => n.data.kind === "platform" && n.data.routeId === route.id
  );

  return (
    <NodeShell
      kicker={data.recommended ? "方案 · 推荐" : "搜索方案"}
      title={route.title}
      selected={selected}
      dimmed={data.dimmed}
    >
      <p className="text-sm leading-relaxed text-ink/80">
        {route.steps.join(" → ")}
      </p>
      <p className="mt-2 text-sm text-muted">{route.purpose}</p>
      <p className="mt-3 text-sm">
        <span className="text-accent-ink">＋</span> {route.advantage}
      </p>
      <p className="text-sm">
        <span className="text-muted">△</span> {route.watchOut}
      </p>
      {pendingQuestions.some((q) => q.stage === "routes") && (
        <div className="mt-3">
          <QuestionBlock
            questions={pendingQuestions.filter((q) => q.stage === "routes")}
            disabled={loading}
            onSubmit={(answers, proceed) =>
              void submitAnswers(answers, proceed, "routes")
            }
          />
        </div>
      )}
      <button
        type="button"
        className="btn-primary mt-4 w-full"
        disabled={loading}
        onClick={() => void chooseRoute(route)}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            正在想关键词…
          </>
        ) : branched ? (
          "已有搜索分支"
        ) : (
          "用这套去搜"
        )}
      </button>
    </NodeShell>
  );
}
