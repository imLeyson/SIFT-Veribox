"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import type { Route } from "@/types/routes";
import {
  Sparkles,
  Check,
  ArrowRight,
  Compass,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";

export type RouteNodeData = {
  route: Route;
  index: number;
};

export function RouteNode({ data, selected }: NodeProps<Node<RouteNodeData>>) {
  const { route, index } = data;
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const activeRequest = useSiftStore((s) => s.activeRequest);

  const isSelected = selectedRouteId === route.id;
  const hasSelection = Boolean(selectedRouteId);
  const isWeakened = hasSelection && !isSelected;
  const isRecommended = Boolean(route.recommendedReason);

  const kicker = isRecommended
    ? `0${index + 1} · 推荐路线`
    : `0${index + 1} · 探索路线`;

  return (
    <div
      className={`transition-all duration-300 w-[390px] ${
        isWeakened
          ? "opacity-40 hover:opacity-90 grayscale-[30%] hover:grayscale-0"
          : isSelected
            ? "ring-2 ring-accent/60 shadow-lg"
            : "hover:shadow-md"
      }`}
    >
      <NodeShell
        kicker={kicker}
        title={route.title}
        selected={selected || isSelected}
      >
        <div className="space-y-3 text-xs">
          {/* Starting Dimension & Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-0.5 text-[11px] font-medium text-ink">
              <Compass className="h-3 w-3 text-accent" />
              {route.startingPoint}
            </span>
            {route.focusDimension && (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600">
                {route.focusDimension}
              </span>
            )}
            {route.timeframe && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 font-medium border border-blue-100/80">
                <Clock className="h-2.5 w-2.5" />
                {route.timeframe}
              </span>
            )}
            {route.feasibility && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                  route.feasibility === "high"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : route.feasibility === "medium"
                      ? "bg-amber-50 text-amber-700 border-amber-100"
                      : "bg-rose-50 text-rose-700 border-rose-100"
                }`}
              >
                {route.feasibility === "high"
                  ? "稳妥落地"
                  : route.feasibility === "medium"
                    ? "需打样验证"
                    : "工艺挑战"}
              </span>
            )}
          </div>

          {/* Recommended Reason */}
          {isRecommended && route.recommendedReason && (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-2.5 text-xs text-amber-900 leading-snug">
              <div className="flex items-center gap-1 font-semibold text-amber-800 text-[11px] mb-0.5">
                <Sparkles className="h-3 w-3 text-amber-600" />
                <span>为什么推荐（针对前期未决死结）</span>
              </div>
              <p className="leading-relaxed text-[11px]">{route.recommendedReason}</p>
            </div>
          )}

          {/* Core Visual Strategy */}
          <div className="rounded-xl bg-cream/70 p-2.5 border border-line/60 space-y-1">
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              核心设计抉择与手法
            </span>
            <p className="font-semibold text-ink leading-snug text-[11.5px]">
              {route.coreProblem}
            </p>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              {route.purpose}
            </p>
          </div>

          {/* Pitch Pros & Landing Cons */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-emerald-50/90 p-2 border border-emerald-100 text-emerald-950 flex flex-col justify-between">
              <div>
                <span className="font-semibold text-emerald-800 flex items-center gap-1 text-[10px]">
                  <Lightbulb className="h-3 w-3 text-emerald-600" />
                  提案卖点 (Pros)
                </span>
                <p className="leading-snug mt-1 text-[11px]">{route.pros}</p>
              </div>
            </div>
            <div className="rounded-lg bg-stone-100/90 p-2 border border-stone-200 text-stone-800 flex flex-col justify-between">
              <div>
                <span className="font-semibold text-stone-600 flex items-center gap-1 text-[10px]">
                  <ShieldAlert className="h-3 w-3 text-stone-500" />
                  避坑提示 (Cons)
                </span>
                <p className="leading-snug mt-1 text-[11px]">{route.cons}</p>
              </div>
            </div>
          </div>

          {/* Collapsible Steps Preview */}
          <details className="text-[11px] text-muted group pt-1">
            <summary className="cursor-pointer font-medium text-stone-700 flex items-center justify-between hover:text-ink">
              <span>{route.steps.length} 个工位实操步骤清单</span>
              <span className="text-[10px] text-muted group-open:rotate-90 transition-transform">
                ▶
              </span>
            </summary>
            <ol className="mt-2 space-y-2 border-l-2 border-line/80 pl-2.5">
              {route.steps.map((st, i) => (
                <li key={st.id} className="leading-tight">
                  <div className="flex items-center gap-1 font-medium text-ink">
                    <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />
                    <span>0{i + 1}. {st.title}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 pl-4 mt-0.5">
                    {st.question}
                  </p>
                  {st.deliverables && st.deliverables.length > 0 && (
                    <div className="pl-4 mt-1 flex flex-wrap gap-1">
                      {st.deliverables.slice(0, 2).map((d, di) => (
                        <span
                          key={di}
                          className="rounded bg-stone-100/90 px-1.5 py-0.2 text-[9.5px] text-stone-600"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </details>

          {/* Action Button */}
          <div className="pt-2 border-t border-line/60">
            {isSelected ? (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="h-4 w-4" />
                  已选此路线
                </span>
                <button
                  type="button"
                  className="btn-ghost !py-1 !px-2.5 text-xs hover:text-red-700"
                  onClick={() => siftActions.reselectRoute()}
                >
                  重选
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`w-full text-xs font-medium py-2 flex items-center justify-center gap-1.5 rounded-xl transition-all ${
                  hasSelection
                    ? "btn-ghost border border-line hover:border-ink"
                    : "btn-primary shadow-sm hover:shadow"
                }`}
                disabled={Boolean(activeRequest)}
                onClick={() => siftActions.selectRoute(route.id)}
              >
                <span>{hasSelection ? "切换路线" : "选择此路线"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </NodeShell>
    </div>
  );
}
