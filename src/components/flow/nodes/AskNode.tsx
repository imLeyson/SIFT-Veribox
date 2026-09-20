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
      <NodeShell
        kicker="01 · 视觉抉择"
        title="视觉取向对齐"
        selected={selected}
      >
        <QuestionBlock questions={next.questions} />
        <div className="mt-3 border-t border-line/60 pt-2.5">
          <button
            type="button"
            className="btn-ghost w-full text-xs !py-1.5 text-stone-600 hover:text-ink"
            disabled={Boolean(activeRequest)}
            onClick={siftActions.converge}
          >
            跳过提问，按已有判断收敛 →
          </button>
          <p className="mt-1 text-center text-[10px] text-stone-400">
            未选问题将保留为待定项
          </p>
        </div>
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
      kicker={`RECORD · R${turn.afterRevision}`}
      title={
        turn.event.type === "correct"
          ? "已补充修改"
          : turn.event.type === "checkpoint"
            ? "检查点选择"
            : "视觉抉择记录"
      }
      selected={selected}
    >
      {turn.questions && turn.event.type === "answer" ? (
        <div className="space-y-2">
          {turn.questions.map((question, index) => {
            const answer =
              turn.event.type === "answer"
                ? turn.event.answers.find(
                    (a) => a.questionId === question.id,
                  )
                : null;
            const isCustom = answer?.kind === "custom";
            const isUncertain = answer?.kind === "uncertain";
            return (
              <div
                key={question.id}
                className="rounded-xl border border-line/60 bg-white/60 p-2.5 text-xs space-y-1"
              >
                <p className="font-medium text-ink leading-snug">
                  {index + 1}. {question.prompt}
                </p>
                <div className="pt-0.5">
                  {isCustom ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 border border-amber-200/70">
                      <span>其他：</span>
                      <span>{answer.text}</span>
                    </span>
                  ) : isUncertain ? (
                    <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                      <span>暂不确定</span>
                    </span>
                  ) : answer ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 border border-emerald-200/70">
                      <span>已选：</span>
                      <span>{answerText(question, answer)}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="whitespace-pre-wrap rounded-xl bg-mist px-3 py-2 text-xs leading-relaxed text-ink">
          {text}
        </p>
      )}
    </NodeShell>
  );
}
