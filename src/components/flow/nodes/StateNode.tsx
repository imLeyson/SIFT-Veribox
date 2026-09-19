"use client";
import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { hasDirection, type Judgment } from "@/types/convergence";

function JudgmentList({ items }: { items: Judgment[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className="text-muted">尚未明确</p>;
  return (
    <>
      <ul className="space-y-1.5">
        {(expanded ? items : items.slice(0, 3)).map((item, i) => (
          <li key={i}>
            {item.text}
            {item.basis === "assumption" && (
              <span className="ml-1.5 rounded bg-mist px-1.5 py-0.5 text-[10px] text-muted">
                待确认
              </span>
            )}
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <button
          type="button"
          className="mt-2 text-xs text-muted underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起" : `另有 ${items.length - 3} 项`}
        </button>
      )}
    </>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="mb-1 text-[11px] tracking-wide text-muted">{label}</dt>
      <dd className="text-sm leading-relaxed text-ink">{children}</dd>
    </div>
  );
}
const reasons = {
  ready: "当前没有明显高价值问题了。由你决定下一步。",
  needs_evidence: "剩余判断需要更多依据。由你决定继续深化还是先做验证。",
  user_requested: "已暂停追问。请检查当前假设和待定项。",
};

export function StateNode({ selected }: NodeProps) {
  const {
    state,
    next,
    history,
    correctionDraft,
    activeRequest,
    storageWarning,
    setCorrectionDraft,
  } = useSiftStore();
  const [editing, setEditing] = useState(false);
  if (!state) return null;
  const checkpoint = next?.type === "checkpoint";
  const confirmed = state.status === "confirmed";
  return (
    <NodeShell
      kicker={
        confirmed
          ? "已由你确认"
          : checkpoint
            ? "HUMAN CHECKPOINT · 请你判断"
            : "DESIGN STATE · 持续更新"
      }
      title="当前设计方向"
      selected={selected}
    >
      <dl className="space-y-4">
        <Field label="任务">
          <p>{state.brief.goal ?? "尚未明确"}</p>
          {(state.brief.audience || state.brief.deliverable) && (
            <p className="mt-1 text-xs text-muted">
              {[state.brief.audience, state.brief.deliverable]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {state.constraints.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted">
                任务约束 · {state.constraints.length}
              </summary>
              <div className="mt-2">
                <JudgmentList items={state.constraints} />
              </div>
            </details>
          )}
        </Field>
        <Field label="当前方向">
          <JudgmentList
            items={state.direction.intent ? [state.direction.intent] : []}
          />
        </Field>
        <Field label="当前设计假设">
          <p>{state.currentHypothesis ?? "还没有足够依据形成假设"}</p>
        </Field>
        {state.validationAction && (
          <Field label="轻量验证">
            <p>{state.validationAction.label}</p>
            <p className="mt-1 text-xs text-muted">{state.validationAction.instruction}</p>
          </Field>
        )}
        <Field label="优先">
          <JudgmentList items={state.direction.priorities} />
        </Field>
        <Field label="避免">
          <JudgmentList items={state.direction.avoid} />
        </Field>
        <Field label="判断标准">
          <JudgmentList items={state.direction.criteria} />
        </Field>
        <Field label="待定">
          {state.uncertainties.length ? (
            <PendingList />
          ) : (
            <p className="text-muted">暂无关键未决项</p>
          )}
        </Field>
      </dl>
      <details className="mt-4 border-t border-line pt-3 text-xs text-muted">
        <summary className="cursor-pointer">查看判断依据</summary>
        <ul className="mt-2 space-y-2">
          {[
            ...state.constraints,
            ...(state.direction.intent ? [state.direction.intent] : []),
            ...state.direction.priorities,
            ...state.direction.avoid,
            ...state.direction.criteria,
          ].map((j, i) => (
            <li key={i}>
              <p>{j.text}</p>
              <p className="mt-0.5">
                {j.basis === "assumption" ? "推导，待确认 · " : ""}
                {j.sourceIds
                  .map((id) =>
                    id === "brief"
                      ? "原始 Brief"
                      : `记录 ${history.find((h) => h.id === id)?.afterRevision ?? "—"}`,
                  )
                  .join("、")}
              </p>
            </li>
          ))}
        </ul>
      </details>
      {checkpoint && !confirmed && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-3 text-xs leading-relaxed text-muted">
            {reasons[next.reason]}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={Boolean(activeRequest) || editing || !hasDirection(state) || Boolean(storageWarning)}
              onClick={siftActions.confirm}
            >
              开始设计
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={Boolean(activeRequest) || editing}
              onClick={() => void siftActions.deepen()}
            >
              继续深化
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={Boolean(activeRequest)}
              onClick={() => setEditing(true)}
            >
              回退修改
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">SIFT 不会替你宣布完成。</p>
        </div>
      )}
      {confirmed && (
        <p role="status" className="mt-5 rounded-xl bg-mist px-3 py-2 text-sm">
          方向已确认。待定项和待确认假设仍保留。
        </p>
      )}
      {!editing && !checkpoint && (
        <button
          type="button"
          className="btn-ghost mt-3 w-full text-sm"
          onClick={() => setEditing(true)}
        >
          修改 / 补充
        </button>
      )}
      {editing && (
        <form
          className="mt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await siftActions.correct();
            if (!useSiftStore.getState().correctionDraft) setEditing(false);
          }}
        >
          <label className="block text-xs text-muted">
            要修改或补充什么？
            <textarea
              autoFocus
              rows={3}
              maxLength={2000}
              value={correctionDraft}
              onChange={(e) => setCorrectionDraft(e.target.value)}
              className="mt-2 w-full resize-y rounded-xl border border-line bg-cream/70 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={!correctionDraft.trim()}
              className="btn-primary flex-1 text-sm"
            >
              {activeRequest ? "取消当前请求并更新" : "更新方向"}
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => setEditing(false)}
            >
              收起
            </button>
          </div>
        </form>
      )}
    </NodeShell>
  );
}

function PendingList() {
  const uncertainties = useSiftStore((s) => s.state!.uncertainties);
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <ul className="space-y-2">
        {(expanded ? uncertainties : uncertainties.slice(0, 3)).map((u) => (
          <li key={u.id}>
            <span>{u.topic}</span>
            {u.status === "deferred" && (
              <span className="ml-1.5 text-xs text-muted">暂缓</span>
            )}
            <p className="text-xs text-muted">{u.decisionAffected}</p>
          </li>
        ))}
      </ul>
      {uncertainties.length > 3 && (
        <button
          className="mt-2 text-xs underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起" : `另有 ${uncertainties.length - 3} 项`}
        </button>
      )}
    </>
  );
}
