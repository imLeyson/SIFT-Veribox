"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { cleanStepLabel, type Route } from "@/types/routes";
import {
  getBriefAnchor,
  getConvergenceAnchor,
  toInspirationCopy,
} from "@/lib/exploration-copy";
import {
  Sparkles,
  Check,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
  Layers,
  LayoutGrid,
  Zap,
  RefreshCw,
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

function getTerritoryInfo(index: number, title: string, themeName?: string) {
  const combined = `${title} ${themeName ?? ""}`.toLowerCase();
  if (
    combined.includes("网格") ||
    combined.includes("理性") ||
    combined.includes("排版") ||
    combined.includes("档案") ||
    index === 1
  ) {
    return {
      tag: "领地 02 · 信息网格与秩序",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200/80",
      icon: LayoutGrid,
    };
  }
  if (
    combined.includes("符号") ||
    combined.includes("视觉锤") ||
    combined.includes("几何") ||
    combined.includes("轮廓") ||
    index === 2
  ) {
    return {
      tag: "领地 03 · 视觉符号与记忆锤",
      badgeClass: "bg-purple-50 text-purple-800 border-purple-200/80",
      icon: Zap,
    };
  }
  return {
    tag: "领地 01 · 材质工艺与微触感",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
    icon: Layers,
  };
}

export function RouteNode({ data, selected }: NodeProps<Node<RouteNodeData>>) {
  const { route, index } = data;
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const recommendedRouteId = useSiftStore((s) => s.recommendedRouteId);
  const activeRequest = useSiftStore((s) => s.activeRequest);
  const rawBrief = useSiftStore((s) => s.rawBrief);
  const state = useSiftStore((s) => s.state);

  const isSelected = selectedRouteId === route.id;
  const hasSelection = Boolean(selectedRouteId);
  const isWeakened = hasSelection && !isSelected;

  // Strict single-recommendation rule
  const isRecommended = recommendedRouteId
    ? route.id === recommendedRouteId
    : Boolean(route.recommendedReason);

  const kicker = isSelected
    ? `主题 0${index + 1} · 当前选定`
    : isRecommended
      ? `主题 0${index + 1} · 首选推荐`
      : `主题 0${index + 1} · 备选方向`;

  // Display hero theme name
  const heroTitle = route.themeName?.trim() || (() => {
    const match = route.title.match(/【(.*?)】(.*)/);
    if (match) return match[2].trim() || match[1].trim();
    return route.title;
  })();

  const rawSubtitle = route.title.replace(/【.*?】/, "").trim();
  const visualHook = rawSubtitle && rawSubtitle !== heroTitle ? rawSubtitle : route.focusDimension;

  const snapshotText = toInspirationCopy(cleanText(route.visualSnapshot || route.purpose));
  const recReason = toInspirationCopy(cleanText(route.recommendedReason));
  const coreProblemText = toInspirationCopy(cleanText(route.coreProblem));
  const prosText = toInspirationCopy(cleanText(route.pros));
  const consText = toInspirationCopy(cleanText(route.cons));
  const briefAnchor = getBriefAnchor(rawBrief, state?.brief.goal);
  const convergenceAnchor = getConvergenceAnchor(state);

  const territory = getTerritoryInfo(index, route.title, route.themeName);
  const TerritoryIcon = territory.icon;

  return (
    <div
      className={`transition-all duration-300 w-[390px] ${
        isWeakened
          ? "opacity-60 hover:opacity-100"
          : isSelected
            ? "ring-2 ring-indigo-600/70 shadow-md"
            : "hover:shadow-md"
      }`}
    >
      <NodeShell
        stage="03"
        kicker={kicker}
        title={heroTitle}
        badge={
          isSelected ? (
            <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded font-sans">
              ✓ 当前激活
            </span>
          ) : (
            <span className="text-[10px] font-mono text-stone-400">
              契合度 {route.alignmentScore ?? (isRecommended ? 96 : index === 1 ? 91 : 87)}%
            </span>
          )
        }
        selected={selected || isSelected}
      >
        <div className="space-y-3 text-xs">
          {/* Territory Archetype Badge & Feasibility */}
            <div className="flex items-center justify-between gap-1.5 text-[10.5px]">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium border ${territory.badgeClass}`}
            >
              <TerritoryIcon className="h-3 w-3" />
              <span>{territory.tag}</span>
            </span>

            <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-stone-500 border border-line/60">
              开放式视觉探索
            </span>
          </div>

          {/* Brief → convergence → theme trace: make the source of this route explicit. */}
          <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/45 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-900">
              <span>这条主题从哪里来</span>
              <span className="font-mono text-[9px] text-indigo-500">BRIEF → DIRECTION → THEME</span>
            </div>
            <div className="grid gap-1.5 text-[10.5px] text-indigo-950/80">
              <p><span className="font-semibold text-indigo-900">Brief：</span>{briefAnchor}</p>
              <p><span className="font-semibold text-indigo-900">收敛线索：</span>{convergenceAnchor}</p>
            </div>
          </div>

          {/* Hero: invite a visual imagination, not a production decision. */}
          <div className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-ink">
              <span className="flex items-center gap-1 text-accent">
                <Sparkles className="h-3 w-3 text-amber-500" />
                视觉想象 · 灵感画面
              </span>
              <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider">
                VISUAL SNAPSHOT
              </span>
            </div>
            <p className="text-xs sm:text-[12.5px] text-ink font-medium leading-relaxed font-serif bg-white/95 p-2.5 rounded-lg border border-line/60 shadow-2xs">
              “{snapshotText}”
            </p>
          </div>

          {/* Recommended Reason - ONLY for strictly recommended route */}
          {isRecommended && recReason && (
            <div className="border-l-2 border-accent pl-2.5 py-0.5 text-[11px] text-stone-600 leading-relaxed bg-amber-50/40 rounded-r-md">
              <span className="font-semibold text-ink">推荐考量：</span>
              {recReason}
            </div>
          )}

          {/* 3-Point Structured Design Breakdown (三维速览) */}
          <div className="rounded-xl border border-line/70 bg-white/90 p-2.5 space-y-2 text-[11.5px]">
            <div className="flex items-start gap-2">
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-stone-100 font-medium text-[10px] text-stone-600">
                视觉基调
              </span>
              <span className="text-ink font-semibold leading-snug">{route.startingPoint}</span>
            </div>
            {visualHook && (
              <div className="flex items-start gap-2">
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-stone-100 font-medium text-[10px] text-stone-600">
                  核心手法
                </span>
                <span className="text-stone-700 leading-snug">{visualHook}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-stone-100 font-medium text-[10px] text-stone-600">
                  探索张力
              </span>
              <span className="text-stone-600 leading-snug">{coreProblemText}</span>
            </div>
          </div>

          {/* Visual Highlights & Guardrails */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-white/80 p-2.5 border border-line/70 space-y-0.5">
              <span className="font-semibold text-emerald-800 flex items-center gap-1 text-[10.5px]">
                <Lightbulb className="h-3 w-3 text-emerald-600" />
                可收集的视觉线索
              </span>
              <p className="leading-relaxed text-stone-700 text-[11px]">{prosText}</p>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 border border-line/70 space-y-0.5">
              <span className="font-semibold text-amber-800 flex items-center gap-1 text-[10.5px]">
                <ShieldAlert className="h-3 w-3 text-amber-600" />
                保持主题纯度
              </span>
              <p className="leading-relaxed text-stone-700 text-[11px]">{consText}</p>
            </div>
          </div>

          {/* Visual Inspiration Angles */}
          <div className="pt-2 border-t border-line/60 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
              <span>由主题继续追问</span>
              <span className="font-mono text-[9px] text-stone-400">INSPIRATION ANGLES</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {route.steps.map((st, i) => (
                <span
                  key={st.id}
                  className="inline-flex items-center gap-1 rounded-md bg-stone-50 border border-line/70 px-2 py-0.5 text-[10.5px] text-stone-700"
                >
                  <span className="font-mono text-[9.5px] text-stone-400">0{i + 1}</span>
                  <span>{cleanStepLabel(st.title)}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Actions: Select or Swap Themes */}
          <div className="pt-2 border-t border-line/60 space-y-1.5">
            {isSelected ? (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="h-4 w-4" />
                  已选此主题
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="btn-ghost !py-1 !px-2 text-xs hover:text-ink"
                    onClick={() => siftActions.reselectRoute()}
                  >
                    重选主题
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !py-1 !px-2 text-xs hover:text-ink flex items-center gap-1"
                    title="重新构思一组互不相同的全新主题"
                    disabled={Boolean(activeRequest)}
                    onClick={() => void siftActions.regenerateRoutes()}
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>换一批</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
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
                  <span>{hasSelection ? "切换为此设计主题" : "选择此设计主题"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="text-[10.5px] text-stone-400 hover:text-ink flex items-center gap-1 py-0.5 transition-colors cursor-pointer"
                    disabled={Boolean(activeRequest)}
                    onClick={() => void siftActions.regenerateRoutes()}
                    title="重新推导一组互不相同的全新设计主题"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    <span>都不喜欢？换一批全新主题</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </NodeShell>
    </div>
  );
}
