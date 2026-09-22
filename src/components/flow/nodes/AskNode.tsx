"use client";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { QuestionBlock } from "../QuestionBlock";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { answerText } from "@/types/convergence";

export type FlowData = { historyId?: string };
export function AskNode({ id, data, selected }: NodeProps<Node<FlowData>>) {
  const { history, next, activeRequest } = useSiftStore();
  if (!data.historyId) {
    if (next?.type !== "ask") return null;
    return (
      <NodeShell
        nodeId={id}
        stage="01"
        kicker="01 关键提问 · 视觉抉择"
        title="关键视觉抉择"
        selected={selected}
      >
        <QuestionBlock questions={next.questions} />
        <div className="mt-3 border-t border-line/60 pt-2.5">
          <button
            type="button"
            className="btn-ghost w-full text-xs !py-1.5 text-stone-600 hover:text-ink cursor-pointer"
            disabled={Boolean(activeRequest)}
            onClick={siftActions.converge}
          >
            跳过提问，按已有判断收敛 →
          </button>
          <p className="mt-1 text-center text-[10px] text-stone-400">
            通过关键视觉提问排除模糊地带，快速收敛出有画面感的设计主题
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

  const collapsedSummary = (
    <div className="flex items-center justify-between gap-1.5 w-full text-stone-600">
      <span className="truncate">
        {turn.event.type === "answer" && turn.event.answers.length > 0
          ? `已确认 ${turn.event.answers.length} 项视觉抉择`
          : text.slice(0, 30)}
      </span>
      <span className="text-[9.5px] font-mono text-stone-400 shrink-0">
        R{turn.afterRevision}
      </span>
    </div>
  );

  return (
    <NodeShell
      nodeId={id || `turn-${turn.id}`}
      stage="01"
      kicker={`01 记录 · R${turn.afterRevision}`}
      title={
        turn.event.type === "correct"
          ? "已补充修改"
          : turn.event.type === "checkpoint"
            ? "检查点选择"
            : "视觉抉择记录"
      }
      collapsedSummary={collapsedSummary}
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
