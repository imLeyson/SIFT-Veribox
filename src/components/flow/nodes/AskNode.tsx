"use client";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { QuestionBlock } from "../QuestionBlock";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { answerText } from "@/types/convergence";

export type FlowData = { historyId?: string };
export function AskNode({ data, selected }: NodeProps<Node<FlowData>>) {
  const { history, next, activeRequest } = useSiftStore();
  if (!data.historyId) {
    if (next?.type !== "ask") return null;
    return (
      <NodeShell kicker="当前问题 · 一轮" title="先一起判断这几件事" selected={selected}>
        <QuestionBlock questions={next.questions} />
        <button
          type="button"
          className="btn-ghost mt-3 w-full text-sm"
          disabled={Boolean(activeRequest)}
          onClick={siftActions.converge}
        >
          一键收敛
        </button>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          停止追问，按当前判断进入检查点。未决项会保留。
        </p>
      </NodeShell>
    );
  }
  const turn = history.find((h) => h.id === data.historyId);
  if (!turn) return null;
  let text = "";
  if (turn.event.type === "correct") text = turn.event.text;
  if (turn.event.type === "checkpoint") {
    const labels = {
      converge: "一键收敛",
      start_design: "开始设计",
      deepen: "继续深化",
      revise: "回退修改",
    } as const;
    text = `用户选择：${labels[turn.event.action]}`;
  }
  if (turn.event.type === "answer") {
    const answers = turn.event.answers;
    text = (turn.questions ?? [])
      .map((question) => {
        const answer = answers.find((item) => item.questionId === question.id);
        return answer
          ? `${question.prompt}\n${answerText(question, answer)}`
          : question.prompt;
      })
      .join("\n\n");
  }
  return (
    <NodeShell
      kicker={`记录 · ${turn.afterRevision}`}
      title={turn.event.type === "correct" ? "已补充" : turn.event.type === "checkpoint" ? "检查点选择" : "已回答一轮"}
      selected={selected}
    >
      {turn.questions && (
        <div className="mb-3 space-y-2 text-sm leading-relaxed text-ink">
          {turn.questions.map((question, index) => (
            <p key={question.id}>{index + 1}. {question.prompt}</p>
          ))}
        </div>
      )}
      <p className="whitespace-pre-wrap rounded-xl bg-mist px-3 py-2 text-sm leading-relaxed text-ink">
        {text}
      </p>
    </NodeShell>
  );
}
