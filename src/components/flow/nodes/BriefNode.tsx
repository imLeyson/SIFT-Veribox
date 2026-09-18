"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { QuestionBlock } from "../QuestionBlock";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { VBData } from "@/types";

export function BriefNode({ data, selected }: NodeProps<Node<VBData, "brief">>) {
  const {
    updateBriefField,
    loading,
    pendingQuestions,
    routes,
    askRoundByStage,
  } = useVeriboxStore();
  const { confirmBriefAndContinue, submitAnswers } = useVeriboxActions();
  const brief = data.brief;
  if (!brief) return null;
  const questions = pendingQuestions.filter(
    (q) => q.stage === "brief" || (routes.length === 0 && q.stage === "routes")
  );
  const stall =
    questions.length > 0 &&
    (questions.some((q) => q.stage === "routes")
      ? askRoundByStage.routes >= 2
      : askRoundByStage.brief >= 2);

  return (
    <NodeShell kicker="任务" title="当前理解" selected={selected}>
      <dl className="mt-1 space-y-2 text-sm">
        <EditableRow
          label="要做什么"
          value={brief.goal}
          onSave={(v) => updateBriefField("goal", v)}
        />
        <EditableRow
          label="给谁"
          value={brief.targetUser}
          onSave={(v) => updateBriefField("targetUser", v)}
        />
        <Row label="已经明确" value={brief.known.join(" / ") || "—"} />
        <Row label="还缺" value={brief.unknown.join(" / ") || "—"} />
        <Row label="不要" value={brief.constraints.join(" / ") || "—"} />
        {brief.preferences.length > 0 && (
          <Row label="偏好" value={brief.preferences.join(" / ")} />
        )}
        {brief.assumptions.length > 0 && (
          <Row label="暂定假设" value={brief.assumptions.join(" / ")} />
        )}
      </dl>

      {questions.length > 0 ? (
        <div className="mt-4">
          <QuestionBlock
            key={questions.map((q) => q.id).join("|")}
            questions={questions}
            stall={stall}
            disabled={loading}
            onSubmit={(answers, proceed) =>
              void submitAnswers(
                answers,
                proceed,
                questions.some((q) => q.stage === "routes") ? "routes" : "brief"
              )
            }
          />
        </div>
      ) : (
        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={loading}
          onClick={() => void confirmBriefAndContinue([])}
        >
          {loading ? "正在规划路线…" : "按这个理解继续"}
        </button>
      )}
    </NodeShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 leading-snug text-ink">{value}</dd>
    </div>
  );
}

function EditableRow({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        defaultValue={value}
        onBlur={(e) => {
          const next = e.target.value.trim();
          if (next && next !== value) onSave(next);
        }}
        className="mt-0.5 w-full rounded-lg border border-transparent bg-transparent px-0 py-0.5 text-sm text-ink outline-none hover:border-line focus:border-accent focus:bg-cream/60 focus:px-2"
      />
    </label>
  );
}
