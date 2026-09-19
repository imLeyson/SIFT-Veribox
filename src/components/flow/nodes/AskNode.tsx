"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { QuestionBlock } from "../QuestionBlock";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import { formatAskAnswer } from "@/lib/agent/questions";
import type { VBData } from "@/types";

const STAGE_KICKER = {
  brief: "询问 · 任务",
  routes: "询问 · 方案",
  platform: "询问 · 去搜",
  chat: "询问 · 对话",
} as const;

export function AskNode({ data, selected }: NodeProps<Node<VBData, "ask">>) {
  const { loading, askRoundByStage } = useVeriboxStore();
  const { submitAnswers } = useVeriboxActions();
  const ask = data.ask;
  if (!ask) return null;
  const stall = ask.status === "open" && askRoundByStage[ask.stage] >= 2;

  return (
    <NodeShell
      kicker={ask.status === "answered" ? "问答" : STAGE_KICKER[ask.stage]}
      title={ask.status === "answered" ? "已选" : "还需要确认"}
      selected={selected}
    >
      {ask.status === "open" ? (
        <QuestionBlock
          key={ask.questions.map((q) => q.id).join("|")}
          questions={ask.questions}
          stall={stall}
          disabled={loading}
          onSubmit={(answers, proceed) =>
            void submitAnswers(answers, proceed, ask.stage)
          }
        />
      ) : (
        <ol className="space-y-3">
          {ask.questions.map((q) => {
            const answer = ask.answers.find((a) => a.questionId === q.id);
            const chosen = q.options.find((o) => o.id === answer?.optionId);
            return (
              <li key={q.id} className="rounded-xl bg-cream/80 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  问题
                </p>
                <p className="mt-0.5 text-sm font-medium text-ink">{q.prompt}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">
                  回答
                </p>
                <p className="mt-1 rounded-lg border border-ink bg-ink px-3 py-2 text-sm text-cream">
                  {formatAskAnswer(q, answer)}
                </p>
                {chosen?.rationale && answer?.kind === "option" ? (
                  <p className="mt-1 text-xs text-muted">{chosen.rationale}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </NodeShell>
  );
}
