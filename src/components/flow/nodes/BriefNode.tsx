"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { VBData } from "@/types";

export function BriefNode({ data, selected }: NodeProps<Node<VBData, "brief">>) {
  const { updateBriefField, answerOpenQuestion, skipOpenQuestion } =
    useVeriboxStore();
  const { confirmBriefAndContinue } = useVeriboxActions();
  const brief = data.brief;
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  if (!brief) return null;

  const pending = brief.openQuestions.length;

  return (
    <NodeShell kicker="任务" title="核对一下，有问就答" selected={selected}>
      <p className="text-xs text-muted">
        上面是 Agent 听懂的内容。下面的问题能答就答，不会就跳过，然后点确认。
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

      {pending > 0 && (
        <div className="mt-3 space-y-3 rounded-xl bg-mist/80 p-3">
          <p className="text-xs font-medium text-ink">
            待确认 · 共 {pending} 条，答完或跳过即可
          </p>
          {brief.openQuestions.slice(0, 3).map((q, i) => (
            <div key={`${q}-${i}`}>
              <p className="text-sm text-ink">{q}</p>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={drafts[i] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [i]: e.target.value }))
                  }
                  placeholder="在这儿回答"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-cream/80 px-2 py-1.5 text-sm outline-none focus:border-accent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = (drafts[i] ?? "").trim();
                      if (v) {
                        answerOpenQuestion(i, v);
                        setDrafts({});
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary !px-2.5 !py-1.5 text-xs"
                  disabled={!(drafts[i] ?? "").trim()}
                  onClick={() => {
                    answerOpenQuestion(i, drafts[i] ?? "");
                    setDrafts({});
                  }}
                >
                  记下
                </button>
                <button
                  type="button"
                  className="btn-ghost !px-2.5 !py-1.5 text-xs"
                  onClick={() => {
                    skipOpenQuestion(i);
                    setDrafts({});
                  }}
                >
                  跳过
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn-primary mt-4 w-full"
        onClick={confirmBriefAndContinue}
      >
        {pending > 0 ? "剩下的先跳过，继续" : "确认，继续选搜法"}
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
