"use client";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { QuestionBlock } from "../QuestionBlock";
import { useSiftStore } from "@/lib/convergence-store";
import { answerText } from "@/types/convergence";

export type FlowData = { historyId?: string };
export function AskNode({ data, selected }: NodeProps<Node<FlowData>>) {
  const { history, next } = useSiftStore();
  if (!data.historyId) {
    if (next?.type !== "ask") return null;
    return (
      <NodeShell kicker="当前问题" title="先判断这一点" selected={selected}>
        <QuestionBlock question={next.question} />
      </NodeShell>
    );
  }
  const turn = history.find((h) => h.id === data.historyId);
  if (!turn) return null;
  const text =
    turn.event.type === "correct"
      ? turn.event.text
      : turn.question
        ? answerText(turn.question, turn.event.answer)
        : "";
  return (
    <NodeShell
      kicker={`记录 · ${turn.afterRevision}`}
      title={turn.event.type === "correct" ? "已补充" : "已回答"}
      selected={selected}
    >
      {turn.question && (
        <p className="mb-3 text-sm leading-relaxed text-ink">
          {turn.question.prompt}
        </p>
      )}
      <p className="whitespace-pre-wrap rounded-xl bg-mist px-3 py-2 text-sm leading-relaxed text-ink">
        {text}
      </p>
    </NodeShell>
  );
}
