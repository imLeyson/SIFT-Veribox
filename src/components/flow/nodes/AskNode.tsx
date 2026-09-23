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
    if (next?.type === "ask") {
      return (
        <NodeShell
          nodeId={id}
          stage="01"
          kicker="01 视觉抉择 · 排除模糊地带"
          title="关键视觉抉择"
          selected={selected}
          collapsedContent={
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-semibold text-sky-900 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                  正在进行分水岭抉择
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {next.questions.length} 道核心提问
                </span>
              </div>
              <div className="space-y-1 pt-0.5">
                {next.questions.map((q, qIdx) => (
                  <p key={q.id} className="text-xs text-ink font-medium leading-snug line-clamp-1">
                    {qIdx + 1}. {q.prompt}
                  </p>
                ))}
              </div>
            </div>
          }
        >
          <QuestionBlock questions={next.questions} />
          <div className="mt-3 border-t border-line/60 pt-2.5">
            <button
              type="button"
              className="btn-ghost w-full text-xs !py-1.5 text-stone-600 hover:text-ink cursor-pointer"
              disabled={Boolean(activeRequest)}
              onClick={siftActions.converge}
            >
              跳过提问，收敛策略基准 →
            </button>
            <p className="mt-1 text-center text-[10px] text-stone-400">
              通过分水岭提问排除模糊地带，精准收敛设计策略基准
            </p>
          </div>
        </NodeShell>
      );
    }
    return (
      <NodeShell
        nodeId={id}
        stage="01"
        kicker="01 视觉抉择 · 探索分支"
        title="关键视觉抉择（探索）"
        selected={selected}
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="rounded-xl bg-sky-50/60 border border-sky-200/70 p-3 space-y-1.5">
            <span className="text-[10px] font-semibold text-sky-900 uppercase tracking-wider block">
              视觉分水岭抉择
            </span>
            <p className="text-xs text-sky-950 font-medium leading-relaxed">
              在此提出针对核心材质与视觉边界的排除式提问，帮助收敛策略基准。
            </p>
          </div>
          <button
            type="button"
            className="btn-primary w-full text-xs py-2 shadow-xs"
            onClick={siftActions.converge}
            disabled={Boolean(activeRequest)}
          >
            直接收敛策略基准 →
          </button>
        </div>
      </NodeShell>
    );
  }
  const turn = history.find((h) => h.id === data.historyId);
  if (!turn) {
    return (
      <NodeShell
        nodeId={id}
        stage="01"
        kicker="01 视觉抉择 · 决策记录"
        title="已记录的视觉抉择"
        selected={selected}
      >
        <p className="text-xs text-stone-500">此轮决策已整合进全局会话上下文。</p>
      </NodeShell>
    );
  }
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
      nodeId={id}
      stage="01"
      kicker={`01 视觉抉择 · R${turn.afterRevision}`}
      title={
        turn.event.type === "correct"
          ? "已补充修改"
          : turn.event.type === "checkpoint"
            ? "检查点选择"
            : "视觉抉择记录"
      }
      selected={selected}
      collapsedContent={
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="font-semibold text-sky-900 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
              已确认视觉抉择
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              R{turn.afterRevision}
            </span>
          </div>
          {turn.questions && turn.event.type === "answer" ? (
            <div className="space-y-1 pt-0.5">
              {turn.questions.map((question) => {
                const ans = (turn.event as any)?.answers?.find(
                  (a: any) => a.questionId === question.id,
                );
                return (
                  <div key={question.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="text-stone-500 truncate">{question.prompt}</span>
                    <span className="font-medium text-ink shrink-0 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                      {ans ? answerText(question, ans) : "已确认"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-stone-700 font-medium line-clamp-2">
              {text || "视觉决策记录"}
            </p>
          )}
        </div>
      }
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
