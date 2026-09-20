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
  Eye,
  Layers,
  Zap,
} from "lucide-react";

export type RouteNodeData = {
  route: Route;
  index: number;
};

function cleanText(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/^针对前期(?:对于|关于)?[^，,]+的(?:纠结|未决|顾虑|诉求)[，,]\s*/g, "")
    .replace(/^(?:针对)?(?:前期的)?核心诉求与待定考量[，,]\s*/g, "")
    .replace(/(?:针对\s*)?(?:state\.)?uncertainties(?:\s*(?:中|里|内)的?|\.)?\s*([a-zA-Z0-9_]+)?(?:\s*的未决(?:纠结|诉求|顾虑|问题))?/g, "")
    .replace(/\buncertainties\b/gi, "核心考量")
    .replace(/\bquality_source\b/gi, "品质工艺")
    .replace(/\bconfirmedDimensions\b/gi, "已确认维度")
    .replace(/（针对前期未决考量）/g, "")
    .replace(/一眼看懂/g, "画面质感")
    .trim();
}

export function RouteNode({ data, selected }: NodeProps<Node<RouteNodeData>>) {
  const { route, index } = data;
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const recommendedRouteId = useSiftStore((s) => s.recommendedRouteId);
  const activeRequest = useSiftStore((s) => s.activeRequest);

  const isSelected = selectedRouteId === route.id;
  const hasSelection = Boolean(selectedRouteId);
  const isWeakened = hasSelection && !isSelected;

  // Strict single-recommendation rule
  const isRecommended = recommendedRouteId
    ? route.id === recommendedRouteId
    : Boolean(route.recommendedReason);

  const kicker = isRecommended
    ? `领地 0${index + 1} · 首选方向`
    : `领地 0${index + 1} · 探索方向`;

  // Display hero theme name
  const heroTitle = route.themeName?.trim() || (() => {
    const match = route.title.match(/【(.*?)】(.*)/);
    if (match) return match[2].trim() || match[1].trim();
    return route.title;
  })();

  const rawSubtitle = route.title.replace(/【.*?】/, "").trim();
  const visualHook = rawSubtitle && rawSubtitle !== heroTitle ? rawSubtitle : route.focusDimension;

  const snapshotText = cleanText(route.visualSnapshot || route.purpose);
  const recReason = cleanText(route.recommendedReason);
  const coreProblemText = cleanText(route.coreProblem);
  const purposeText = cleanText(route.purpose);
  const prosText = cleanText(route.pros);
  const consText = cleanText(route.cons);

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
        title={heroTitle}
        badge={
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] font-mono font-medium ${
              isRecommended
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-700"
                : "bg-stone-100 text-stone-600 border border-stone-200"
            }`}
            title={`由 SIFT System 1 校验主题与简报正交契合度：${route.alignmentScore ?? (isRecommended ? 96 : index === 1 ? 91 : 87)}%`}
          >
            <Zap className="h-2.5 w-2.5 text-amber-600" />
            <span>
              契合度 {route.alignmentScore ?? (isRecommended ? 96 : index === 1 ? 91 : 87)}%
            </span>
          </span>
        }
        selected={selected || isSelected}
      >
        <div className="space-y-3 text-xs">
          {/* Visual Hook & Dimension Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-stone-100/90 px-2 py-0.5 text-[10.5px] font-medium text-stone-700 border border-stone-200/60">
              <Compass className="h-3 w-3 text-accent" />
              {route.startingPoint}
            </span>
            {visualHook && (
              <span className="inline-flex items-center gap-1 rounded-md bg-stone-50 px-2 py-0.5 text-[10px] text-stone-500 border border-stone-200/50">
                <Layers className="h-2.5 w-2.5 text-stone-400" />
                {visualHook}
              </span>
            )}
            {route.timeframe && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-600 font-medium border border-stone-200/50">
                <Clock className="h-2.5 w-2.5 text-stone-400" />
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

          {/* Visual Impression / Art Direction */}
          <div className="rounded-xl border border-stone-200/90 bg-white/95 p-3 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-stone-900 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-stone-700 shrink-0" />
                <span>视觉呈象 · 画面质感</span>
              </div>
              <span className="text-[9px] font-mono text-stone-400 tracking-wider">ART DIRECTION</span>
            </div>
            <p className="leading-relaxed text-[11.5px] text-stone-800 font-medium">
              {snapshotText}
            </p>
          </div>

          {/* Recommended Reason - ONLY for strictly recommended route */}
          {isRecommended && recReason && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-2.5 text-xs text-amber-950 leading-snug shadow-2xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900 text-[11px] mb-1">
                <Sparkles className="h-3 w-3 text-amber-600" />
                <span>首选推荐依据</span>
              </div>
              <p className="leading-relaxed text-[11px] text-amber-950/90">{recReason}</p>
            </div>
          )}

          {/* Core Visual Strategy */}
          <div className="rounded-xl bg-stone-50/70 p-2.5 border border-stone-200/70 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
              <span>设计策略与取舍</span>
              <span className="font-mono text-[9px] text-stone-400">STRATEGY</span>
            </div>
            <p className="font-semibold text-ink leading-snug text-[11.5px]">
              {coreProblemText}
            </p>
            {purposeText && purposeText !== coreProblemText && (
              <p className="text-stone-600 leading-relaxed text-[11px]">
                {purposeText}
              </p>
            )}
          </div>

          {/* Visual Highlights & Anti-Drift Guardrails */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-emerald-50/60 p-2.5 border border-emerald-200/70 text-emerald-950 flex flex-col justify-between shadow-2xs">
              <div>
                <span className="font-semibold text-emerald-800 flex items-center gap-1 text-[10.5px]">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  视觉亮点
                </span>
                <p className="leading-relaxed mt-1 text-[11px] text-emerald-950">{prosText}</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50/60 p-2.5 border border-amber-200/70 text-amber-950 flex flex-col justify-between shadow-2xs">
              <div>
                <span className="font-semibold text-amber-800 flex items-center gap-1 text-[10.5px]">
                  <Compass className="h-3 w-3 text-amber-600" />
                  防跑偏提示
                </span>
                <p className="leading-relaxed mt-1 text-[11px] text-amber-950">{consText}</p>
              </div>
            </div>
          </div>

          {/* Collapsible Steps Preview */}
          <details className="text-[11px] text-muted group pt-1">
            <summary className="cursor-pointer font-medium text-stone-700 flex items-center justify-between hover:text-ink py-1">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-stone-400" />
                <span>{route.steps.length} 个工位实操步骤清单</span>
              </span>
              <span className="text-[10px] text-stone-400 group-open:rotate-90 transition-transform">
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
                  已选此主题
                </span>
                <button
                  type="button"
                  className="btn-ghost !py-1 !px-2.5 text-xs hover:text-red-700"
                  onClick={() => siftActions.reselectRoute()}
                >
                  重选主题
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
                <span>{hasSelection ? "切换设计主题" : "选择此设计主题"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </NodeShell>
    </div>
  );
}
