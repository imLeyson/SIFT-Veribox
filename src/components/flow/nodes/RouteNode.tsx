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
    ? `ROUTE 0${index + 1} · 推荐路线`
    : `ROUTE 0${index + 1} · 探索路线`;

  return (
    <div
      className={`transition-all duration-300 w-[380px] ${
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
          {/* Starting Dimension Tag */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-0.5 text-[11px] font-medium text-ink">
              <Compass className="h-3 w-3 text-accent" />
              {route.startingPoint}
            </span>
            {route.focusDimension && (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600">
                {route.focusDimension}
              </span>
            )}
          </div>

          {/* Recommended Reason */}
          {isRecommended && route.recommendedReason && (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-2.5 text-xs text-amber-900 leading-snug">
              <div className="flex items-center gap-1 font-semibold text-amber-800 text-[11px] mb-0.5">
                <Sparkles className="h-3 w-3 text-amber-600" />
                <span>推荐归因</span>
              </div>
              <p className="leading-relaxed">{route.recommendedReason}</p>
            </div>
          )}

          {/* Core Visual Strategy */}
          <div className="rounded-xl bg-cream/70 p-2.5 border border-line/60 space-y-1">
            <p className="font-semibold text-ink leading-snug">
              {route.coreProblem}
            </p>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              {route.purpose}
            </p>
          </div>

          {/* Highlights / Pros & Cons */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded-lg bg-emerald-50/80 p-2 border border-emerald-100/90 text-emerald-950">
              <span className="font-semibold text-emerald-800 block text-[10px]">
                视觉亮点
              </span>
              <p className="leading-snug mt-0.5">{route.pros}</p>
            </div>
            <div className="rounded-lg bg-stone-100/80 p-2 border border-stone-200/80 text-stone-800">
              <span className="font-semibold text-stone-600 block text-[10px]">
                设计考量
              </span>
              <p className="leading-snug mt-0.5">{route.cons}</p>
            </div>
          </div>

          {/* Collapsible Steps Preview (Collapsed by default to eliminate text wall) */}
          <details className="text-[11px] text-muted group pt-1">
            <summary className="cursor-pointer font-medium text-stone-700 flex items-center justify-between hover:text-ink">
              <span>包含 {route.steps.length} 个递进步骤</span>
              <span className="text-[10px] text-muted group-open:rotate-90 transition-transform">
                ▶
              </span>
            </summary>
            <ol className="mt-2 space-y-1.5 border-l-2 border-line/80 pl-2.5">
              {route.steps.map((st, i) => (
                <li key={st.id} className="leading-tight">
                  <div className="flex items-center gap-1 font-medium text-ink">
                    <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />
                    <span>{i + 1}. {st.title}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 pl-4 mt-0.5">
                    {st.question}
                  </p>
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
                  当前已选此路线
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
                <span>{hasSelection ? "切换至此路线" : "选择此路线推进"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </NodeShell>
    </div>
  );
}
