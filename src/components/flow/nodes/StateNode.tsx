"use client";
import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { CardChatPanel } from "../CardChatPanel";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { hasDirection, type DesignState } from "@/types/convergence";
import { Sparkles, ArrowRight, RefreshCw, RotateCcw, SlidersHorizontal } from "lucide-react";
import { runIndependentStateRoutes } from "@/lib/independent-chain-runner";

export function StateNode({ id, data, selected }: NodeProps) {
  const isCustomState = Boolean((data as any)?.state);
  const storeState = useSiftStore((s) => s.state);
  const storeRawBrief = useSiftStore((s) => s.rawBrief);
  const [generatingRoutes, setGeneratingRoutes] = useState(false);

  const {
    next,
    correctionDraft,
    activeRequest,
    storageWarning,
    routes,
    customCards,
    deletedNodeIds,
    setCorrectionDraft,
    restoreRoutes,
  } = useSiftStore();
  const [editing, setEditing] = useState(false);

  const state: DesignState | null = isCustomState
    ? ((data as any).state as DesignState)
    : storeState;
  const rawBrief = isCustomState ? ((data as any).rawBrief || "") : storeRawBrief;

  const customRouteIds = new Set(
    customCards
      .filter((c) => c.type === "route")
      .map((c) => (c.data?.route?.id as string) || c.id),
  );
  const visiblePrimaryRoutes = routes.filter(
    (r) =>
      !customRouteIds.has(r.id) &&
      !deletedNodeIds.includes(`route-${r.id}`) &&
      !deletedNodeIds.includes(r.id),
  );
  const visibleCustomRoutes = customCards.filter(
    (c) => c.type === "route" && !deletedNodeIds.includes(c.id),
  );
  const totalVisibleThemes = visiblePrimaryRoutes.length + visibleCustomRoutes.length;
  const primaryRoutesTotal = routes.filter((r) => !customRouteIds.has(r.id));
  const deletedThemeCount = primaryRoutesTotal.length - visiblePrimaryRoutes.length;
  const hasDeletedThemes = deletedThemeCount > 0;

  if (!state) {
    return (
      <NodeShell
        nodeId={id}
        stage="2"
        kicker="2 策略基准"
        title="核心策略基准（草稿）"
        badge={
          <span className="text-[10px] font-medium text-stone-600 bg-stone-100 border border-stone-200/80 px-1.5 py-0.5 rounded">
            待收敛
          </span>
        }
        selected={selected}
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/70 p-3 space-y-1.5">
            <span className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wider block">
              视觉策略推导提示
            </span>
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              简报解析完成后，系统将在此收敛视觉主张、设计坚持与避开的雷区。
            </p>
          </div>
          <button
            type="button"
            className="btn-primary w-full text-xs py-2 shadow-xs"
            onClick={() => siftActions.converge()}
            disabled={Boolean(activeRequest)}
          >
            开始收敛策略基准 →
          </button>
        </div>
      </NodeShell>
    );
  }

  const checkpoint = next?.type === "checkpoint";
  const confirmed = state.status === "confirmed";

  const [viewMode, setViewMode] = useState<"card" | "chat">("card");

  const directionStarterChips = [
    "强化纯粹几何与秩序感",
    "增加触感温润与亲肤阻尼",
    "突出人机工效与握持舒适",
    "坚决规避塑料玩具廉价感",
  ];

  const handleNextStep = async () => {
    if (activeRequest) return;
    if (isCustomState) {
      setGeneratingRoutes(true);
      try {
        await runIndependentStateRoutes({
          stateCardId: id,
          rawBrief,
          state,
        });
      } finally {
        setGeneratingRoutes(false);
      }
    } else {
      if (!confirmed) {
        await siftActions.confirm();
      } else {
        await siftActions.regenerateRoutes();
      }
    }
  };

  const chatPanel = (
    <CardChatPanel
      nodeId={id}
      cardType="state"
      cardTitle="核心策略基准"
      cardData={{
        goal: state?.brief?.goal,
        hypothesis: state?.currentHypothesis,
        intent: state?.direction?.intent?.text,
        priorities: state?.direction?.priorities?.map((p) => p.text),
        avoid: state?.direction?.avoid?.map((a) => a.text),
        criteria: state?.direction?.criteria?.map((c) => c.text),
      }}
      upstreamContext={{
        goal: state?.brief?.goal ?? undefined,
        strategyIntent: state?.direction?.intent?.text ?? undefined,
        priorities: state?.direction?.priorities?.map((p) => p.text) ?? undefined,
        avoid: state?.direction?.avoid?.map((a) => a.text) ?? undefined,
      }}
      starterChips={[
        "强化设计假设在工业落地中的可行性",
        "补充坚决规避的视觉红线",
        "细化视觉坚持与设计工效",
      ]}
      onApplyUpdate={async (patch) => {
        const feedback = patch.cons || patch.pros || patch.feedback || patch.correction;
        if (feedback) {
          setCorrectionDraft(feedback);
          await siftActions.correct();
        }
      }}
      onClose={() => setViewMode("card")}
    />
  );

  return (
    <NodeShell
      nodeId={id}
      stage="2"
      kicker="2 策略基准"
      title="核心策略基准"
      badge={
        confirmed ? (
          <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>已锁定</span>
          </span>
        ) : checkpoint ? (
          <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
            检查点
          </span>
        ) : (
          <span className="text-[10px] font-medium text-stone-600 bg-stone-100 border border-stone-200/80 px-1.5 py-0.5 rounded">
            核心收敛
          </span>
        )
      }
      selected={selected}
      collapsedContent={
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="font-semibold text-emerald-900 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              策略收敛主张
            </span>
            {confirmed ? (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                ✓ 已锁定
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 font-mono">
                {state.direction.priorities.length} 项坚持
              </span>
            )}
          </div>
          <p className="text-xs font-serif font-medium text-ink leading-relaxed line-clamp-2">
            “{state.direction.intent?.text || state.currentHypothesis || state.brief.goal || "设计主张收敛完毕"}”
          </p>
          {state.direction.priorities.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {state.direction.priorities.slice(0, 3).map((p, i) => (
                <span
                  key={i}
                  className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-200/60"
                >
                  {p.text}
                </span>
              ))}
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-3 text-xs leading-relaxed">
        {/* Core Intent Box */}
        {state.direction.intent?.text ? (
          <div className="rounded-xl bg-white/90 border border-line/80 p-3 shadow-xs space-y-1">
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              视觉主张
            </span>
            <p className="text-xs sm:text-sm font-medium text-ink leading-relaxed font-serif">
              {state.direction.intent.text}
            </p>
          </div>
        ) : state.direction.priorities.length > 0 ? (
          <div className="rounded-xl bg-stone-50/80 border border-line/60 p-2.5 text-[11px] text-stone-600">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-0.5">
              设计驱动
            </span>
            <span className="text-stone-700 font-medium">形式与物性约束驱动（主张由后续探索定义）</span>
          </div>
        ) : (
          <p className="text-muted">方向推导中…</p>
        )}

        {/* Target Meta */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-md bg-mist px-2 py-0.5 font-medium text-ink">
            {state.brief.goal ?? "设计任务"}
          </span>
          {state.brief.audience && (
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-600">
              {state.brief.audience}
            </span>
          )}
        </div>

        {/* Visual Hypothesis */}
        {state.currentHypothesis && (
          <div className="rounded-lg bg-cream/70 p-2.5 border border-line/60">
            <span className="text-[10px] font-semibold text-stone-500 block mb-0.5">
              设计假设
            </span>
            <p className="text-stone-800 leading-snug">
              {state.currentHypothesis}
            </p>
          </div>
        )}

        {/* Visual Guardrails: Priorities & Avoid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Priorities */}
          <div className="rounded-xl bg-white/70 p-2.5 border border-line/70">
            <span className="text-[10px] font-semibold text-stone-600 block mb-1">
              视觉坚持
            </span>
            {state.direction.priorities.length > 0 ? (
              <div className="space-y-1">
                {state.direction.priorities.slice(0, 3).map((p, i) => (
                  <span
                    key={i}
                    className="inline-block rounded bg-mist/60 px-1.5 py-0.5 text-[10.5px] text-stone-800 mr-1 mb-1 border border-line/50"
                  >
                    {p.text}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-muted">尚未明确</span>
            )}
          </div>

          {/* Avoid */}
          <div className="rounded-xl bg-white/70 p-2.5 border border-line/70">
            <span className="text-[10px] font-semibold text-stone-600 block mb-1">
              视觉红线
            </span>
            {state.direction.avoid.length > 0 ? (
              <div className="space-y-1">
                {state.direction.avoid.slice(0, 3).map((a, i) => (
                  <span
                    key={i}
                    className="inline-block rounded bg-stone-100/80 px-1.5 py-0.5 text-[10.5px] text-stone-700 mr-1 mb-1 border border-stone-200/60"
                  >
                    {a.text}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-muted">暂无</span>
            )}
          </div>
        </div>

        {/* Visual Criteria */}
        {state.direction.criteria.length > 0 && (
          <div className="rounded-lg bg-mist/50 p-2 border border-line/40 text-[11px]">
            <span className="font-semibold text-stone-700 block mb-0.5">
              评估准则
            </span>
            <ul className="space-y-0.5 text-stone-800">
              {state.direction.criteria.slice(0, 2).map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="text-accent">▪</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Collapsible Details: Traceability & Uncertainties */}
        <details className="pt-1 text-[11px] text-muted">
          <summary className="cursor-pointer hover:text-ink">
            依据来源与未决项
          </summary>
          <div className="mt-2 space-y-2 rounded-lg bg-white/60 p-2 border border-line/40 text-[10px]">
            {state.uncertainties.length > 0 && (
              <div>
                <p className="font-semibold text-stone-700">待定未决项：</p>
                <ul className="mt-0.5 space-y-0.5 text-muted">
                  {state.uncertainties.map((u) => (
                    <li key={u.id}>▪ {u.topic}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="font-semibold text-stone-700">推导依据：</p>
              <ul className="mt-0.5 space-y-0.5 text-muted">
                {state.constraints.map((c, i) => (
                  <li key={i}>▪ {c.text}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>

        {/* Actions Bar: 下一步 & 调整方向 (统一常驻展示，确保随时可推进与微调) */}
        <div className="border-t border-line/70 pt-2.5 space-y-2">
          {/* Main Action Pair */}
          <div className="flex items-center gap-2">
            {/* 调整方向 Button */}
            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              disabled={Boolean(activeRequest)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                editing
                  ? "bg-stone-900 text-white border-stone-900 shadow-2xs"
                  : "bg-white hover:bg-stone-50 border-stone-200/90 text-stone-700 shadow-2xs hover:border-stone-300"
              }`}
              title="修改或补充策略方向意见，重新校准设计假设与视觉准则"
            >
              <SlidersHorizontal className={`h-3.5 w-3.5 ${editing ? "text-amber-400" : "text-stone-500"}`} />
              <span>{editing ? "收起调整" : "调整方向"}</span>
            </button>

            {/* 下一步 Button */}
            <button
              type="button"
              onClick={handleNextStep}
              disabled={Boolean(activeRequest) || generatingRoutes}
              className="flex-[1.2] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="确认当前策略基准，进入下一步推导 3 套风格主题"
            >
              {generatingRoutes || activeRequest ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  <span>正在推导主题…</span>
                </>
              ) : (
                <>
                  <span>
                    {totalVisibleThemes > 0 && confirmed
                      ? "换一批风格主题"
                      : "下一步：推导风格主题"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-stone-300" />
                </>
              )}
            </button>
          </div>

          {/* If there are deleted themes, offer quick restore */}
          {hasDeletedThemes && (
            <div className="flex items-center justify-between text-[11px] text-stone-500 bg-stone-50 rounded-lg px-2.5 py-1.5 border border-stone-200/70">
              <span>存在 {deletedThemeCount} 个历史删除主题</span>
              <button
                type="button"
                onClick={() => restoreRoutes()}
                className="text-stone-700 hover:text-stone-900 font-semibold cursor-pointer flex items-center gap-1"
                title="恢复先前删除的主题卡片"
              >
                <RotateCcw className="h-3 w-3" />
                <span>一键恢复</span>
              </button>
            </div>
          )}

          {/* Inline Direction Adjustment Form */}
          {editing && (
            <form
              className="rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 space-y-2 animate-in fade-in duration-150"
              onSubmit={async (e) => {
                e.preventDefault();
                await siftActions.correct();
                if (!useSiftStore.getState().correctionDraft) setEditing(false);
              }}
            >
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-semibold text-stone-700">微调策略意见与设计假设</span>
                <span className="text-stone-400">Enter 或点击更新</span>
              </div>

              {/* Starter feedback chips for quick adjustment */}
              <div className="flex flex-wrap gap-1">
                {directionStarterChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCorrectionDraft(
                        correctionDraft ? `${correctionDraft}；${chip}` : chip
                      );
                    }}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 text-[10px] transition-colors cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <textarea
                autoFocus
                rows={2}
                maxLength={2000}
                value={correctionDraft}
                onChange={(e) => setCorrectionDraft(e.target.value)}
                placeholder="例如：希望形态更偏向克制纯粹几何，增强掌心握持亲肤质感，避免廉价塑料感…"
                className="w-full resize-none rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 outline-none focus:border-stone-400 leading-relaxed placeholder:text-stone-400"
              />

              <div className="flex items-center justify-end gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!correctionDraft.trim() || Boolean(activeRequest)}
                  className="px-3 py-1 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  更新策略方向
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </NodeShell>
  );
}
