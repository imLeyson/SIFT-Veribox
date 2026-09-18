"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { VBData } from "@/types";

export function BriefNode({ data, selected }: NodeProps<Node<VBData, "brief">>) {
  const { updateBriefField, loading } = useVeriboxStore();
  const { confirmBriefAndContinue } = useVeriboxActions();
  const brief = data.brief;
  const questions = brief?.clarifyQuestions ?? [];
  const [picks, setPicks] = useState<Record<string, string | null>>({});
  if (!brief) return null;

  const pending = questions.filter((q) => picks[q.id] === undefined);

  return (
    <NodeShell kicker="任务" title="点选项就行，不用填空" selected={selected}>
      <p className="text-xs text-muted">
        Agent 听完 Brief 后，不清楚的地方会给选项。点选或跳过，它会再想一轮。
      </p>
      <dl className="mt-3 space-y-2 text-sm">
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
        <Row label="已经知道" value={brief.known.join(" / ") || "—"} />
        <Row label="还不知道" value={brief.unknown.join(" / ") || "—"} />
        <Row label="不要" value={brief.constraints.join(" / ") || "—"} />
      </dl>

      {questions.length > 0 && (
        <div className="mt-3 space-y-4 rounded-xl bg-mist/80 p-3">
          {questions.map((q) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-ink">{q.prompt}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.options.map((opt) => {
                  const on = picks[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={[
                        "rounded-full px-2.5 py-1 text-xs",
                        on
                          ? "bg-ink text-cream"
                          : "border border-line bg-cream/80 text-ink hover:border-ink/40",
                      ].join(" ")}
                      onClick={() =>
                        setPicks((p) => ({ ...p, [q.id]: on ? null : opt }))
                      }
                    >
                      {opt}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={[
                    "rounded-full px-2.5 py-1 text-xs",
                    picks[q.id] === null
                      ? "bg-ink text-cream"
                      : "border border-dashed border-line text-muted",
                  ].join(" ")}
                  onClick={() => setPicks((p) => ({ ...p, [q.id]: null }))}
                >
                  这题先不管
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn-primary mt-4 w-full"
        disabled={loading}
        onClick={() => {
          const payload = questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            choice: picks[q.id] ?? null,
          }));
          void confirmBriefAndContinue(payload);
          setPicks({});
        }}
      >
        {loading
          ? "正在根据你的选择想…"
          : questions.length === 0
            ? "确认，继续"
            : pending.length
              ? "按已选的继续（没点的当跳过）"
              : "按这些选择继续"}
      </button>
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
