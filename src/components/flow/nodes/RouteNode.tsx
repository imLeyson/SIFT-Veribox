"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { cleanStepLabel, type Route } from "@/types/routes";
import {
  getBriefAnchor,
  getConvergenceAnchor,
  getPrioritiesAnchor,
  getAvoidAnchor,
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
  Compass,
} from "lucide-react";
import { InlineEditableText } from "../InlineEditableText";

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

function getDimensionInfo(
  index: number,
  title: string,
  themeName?: string,
  focusDimension?: string,
) {
  const cleanFocus = focusDimension
    ?.replace(/^(?:领地|维度|探索维度|切入维度)\s*0?[1-3]\s*·?\s*/, "")
    ?.replace(/（(?:领地|维度)\s*\d+）/, "")
    ?.trim();

  const defaultDimensions = [
    {
      name: "物料与表面微触感",
      icon: Layers,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
    },
    {
      name: "情感形态与器物隐喻",
      icon: Sparkles,
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200/80",
    },
    {
      name: "视觉符号与记忆锤",
      icon: Zap,
      badgeClass: "bg-purple-50 text-purple-800 border-purple-200/80",
    },
  ];

  let dimName = "";
  let icon = defaultDimensions[index % 3].icon;
  let badgeClass = defaultDimensions[index % 3].badgeClass;

  const combined = `${title} ${themeName ?? ""} ${focusDimension ?? ""}`.toLowerCase();

  // Route-specific semantic cues to ensure 3 cards are distinctly labeled
  if (index === 0) {
    if (/纤维|物料|材质|肌理|纸|触感|气孔/.test(combined)) {
      dimName = "物料质感与微触感";
      icon = Layers;
      badgeClass = "bg-amber-50 text-amber-800 border-amber-200/80";
    } else if (/软体|圆胖|陪伴|温润|卵石/.test(combined)) {
      dimName = "软体陪伴与亲和形态";
      icon = Sparkles;
      badgeClass = "bg-rose-50 text-rose-800 border-rose-200/80";
    } else if (cleanFocus && cleanFocus.length <= 12) {
      dimName = cleanFocus;
    } else {
      dimName = "材质感知与微触感";
      icon = Layers;
      badgeClass = "bg-amber-50 text-amber-800 border-amber-200/80";
    }
  } else if (index === 1) {
    if (/握持|指尖|同心圆|阻尼|手感|触觉/.test(combined)) {
      dimName = "握持工学与触觉感知";
      icon = Compass;
      badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
    } else if (/网格|排版|字阶|秩序|双栏/.test(combined)) {
      dimName = "版式骨架与信息秩序";
      icon = LayoutGrid;
      badgeClass = "bg-blue-50 text-blue-800 border-blue-200/80";
    } else if (/机能|共生|结构|卡扣/.test(combined)) {
      dimName = "结构机能与日常共生";
      icon = Compass;
      badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
    } else if (cleanFocus && cleanFocus.length <= 12) {
      dimName = cleanFocus;
    } else {
      dimName = "器物形态与功能细节";
      icon = Compass;
      badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
    }
  } else {
    // index === 2
    if (/糖果|几何|色彩|分区|色块/.test(combined)) {
      dimName = "几何拼接与色彩分区";
      icon = Zap;
      badgeClass = "bg-purple-50 text-purple-800 border-purple-200/80";
    } else if (/符号|记忆|视觉锤|超级符号/.test(combined)) {
      dimName = "视觉符号与记忆锚点";
      icon = Zap;
      badgeClass = "bg-purple-50 text-purple-800 border-purple-200/80";
    } else if (/穿透|机能|极客|暗黑/.test(combined)) {
      dimName = "先锋张力与视觉焦点";
      icon = Zap;
      badgeClass = "bg-purple-50 text-purple-800 border-purple-200/80";
    } else if (cleanFocus && cleanFocus.length <= 12) {
      dimName = cleanFocus;
    } else {
      dimName = "视觉张力与记忆锚点";
      icon = Zap;
      badgeClass = "bg-purple-50 text-purple-800 border-purple-200/80";
    }
  }

  return {
    tag: `切入维度 · ${dimName}`,
    badgeClass,
    icon,
  };
}

export function RouteNode({ id, data, selected }: NodeProps<Node<RouteNodeData>>) {
  const { route, index } = data;
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const recommendedRouteId = useSiftStore((s) => s.recommendedRouteId);
  const activeRequest = useSiftStore((s) => s.activeRequest);
  const rawBrief = useSiftStore((s) => s.rawBrief);
  const state = useSiftStore((s) => s.state);
  const updateRoute = useSiftStore((s) => s.updateRoute);

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

  const itemDecisions = useSiftStore((s) => s.itemDecisions);
  const setItemDecision = useSiftStore((s) => s.setItemDecision);
  const removeItemDecision = useSiftStore((s) => s.removeItemDecision);
  const themeDecision = itemDecisions[`theme_${route.id}`];
  const isDiscarded = themeDecision?.status === "discarded";

  const snapshotText = toInspirationCopy(cleanText(route.visualSnapshot || route.purpose));
  const recReason = toInspirationCopy(cleanText(route.recommendedReason));
  const coreProblemText = toInspirationCopy(cleanText(route.coreProblem));
  const prosText = toInspirationCopy(cleanText(route.pros));
  const consText = toInspirationCopy(cleanText(route.cons));
  const briefAnchor = getBriefAnchor(rawBrief, state?.brief.goal);
  const convergenceAnchor = getConvergenceAnchor(state);
  const prioritiesSummary = getPrioritiesAnchor(state);
  const avoidSummary = getAvoidAnchor(state);

  const dimension = getDimensionInfo(index, route.title, route.themeName, route.focusDimension);
  const DimensionIcon = dimension.icon;

  const collapsedSummary = (
    <div className="flex items-center justify-between gap-1.5 w-full">
      <span className="truncate italic font-serif text-stone-600">
        “{snapshotText}”
      </span>
      <span className="text-[9.5px] font-mono text-stone-400 shrink-0">
        {isSelected ? "已激活" : `${route.alignmentScore ?? 90}%`}
      </span>
    </div>
  );

  return (
    <div
      className={`transition-all duration-300 w-[380px] sm:w-[390px] ${
        isDiscarded
          ? "opacity-50 grayscale border-dashed"
          : isWeakened
            ? "opacity-75 hover:opacity-100"
            : isSelected
              ? "ring-2 ring-indigo-600/70 shadow-md"
              : "hover:shadow-md"
      }`}
    >
      <NodeShell
        nodeId={id}
        stage="03"
        kicker={kicker}
        title={heroTitle}
        collapsedSummary={collapsedSummary}
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
          {/* Theme Title & Archetype Header */}
          <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-line/50">
            <InlineEditableText
              value={heroTitle}
              onSave={(newTitle) =>
                updateRoute(route.id, { themeName: newTitle })
              }
              as="h4"
              className="text-xs font-bold text-ink"
              label="主题大名"
              showEditIcon
            />
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium border text-[10px] shrink-0 ${dimension.badgeClass}`}
            >
              <DimensionIcon className="h-3 w-3" />
              <span>{dimension.tag}</span>
            </span>
          </div>

          {/* Hero: Visual Snapshot */}
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
            <div className="text-xs sm:text-[12.5px] text-ink font-medium leading-relaxed font-serif bg-white/95 p-2.5 rounded-lg border border-line/60 shadow-2xs">
              <span className="font-serif text-stone-400 mr-0.5">“</span>
              <InlineEditableText
                value={snapshotText}
                onSave={(newSnapshot) =>
                  updateRoute(route.id, { visualSnapshot: newSnapshot })
                }
                multiline
                minRows={4}
                as="span"
                className="text-ink font-serif"
                inputClassName="font-serif text-xs sm:text-[13px] leading-relaxed"
                label="灵感画面快照"
                showEditIcon
              />
              <span className="font-serif text-stone-400 ml-0.5">”</span>
            </div>
          </div>

          {/* Concise Style & Method Summary */}
          <div className="rounded-xl border border-line/70 bg-white/90 px-3 py-2 text-[11.5px] space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-stone-100 font-medium text-[10px] text-stone-600">
                基调
              </span>
              <InlineEditableText
                value={route.startingPoint}
                onSave={(newPoint) =>
                  updateRoute(route.id, { startingPoint: newPoint })
                }
                as="span"
                className="text-ink font-semibold truncate"
                label="设计基调"
              />
            </div>
            {visualHook && (
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-stone-100 font-medium text-[10px] text-stone-600">
                  手法
                </span>
                <InlineEditableText
                  value={visualHook}
                  onSave={(newHook) =>
                    updateRoute(route.id, { focusDimension: newHook })
                  }
                  as="span"
                  className="text-stone-700 truncate"
                  label="视觉手法"
                />
              </div>
            )}
          </div>

          {/* Recommended Reason */}
          {isRecommended && recReason && (
            <div className="border-l-2 border-accent pl-2.5 py-1 text-[11px] text-stone-600 leading-relaxed bg-amber-50/40 rounded-r-md">
              <span className="font-semibold text-ink">推荐考量：</span>
              {recReason}
            </div>
          )}

          {/* Progressive Disclosure: Deep Rationale & Traceability */}
          <details className="group rounded-xl border border-line/60 bg-cream/30 p-2 text-[11px]">
            <summary className="flex items-center justify-between cursor-pointer font-medium text-stone-500 hover:text-ink select-none px-1">
              <span>查看推导依据与线索细节</span>
              <span className="text-[10px] text-stone-400 group-open:text-ink transition-transform duration-150">
                点击展开 ▼
              </span>
            </summary>

            <div className="mt-2.5 space-y-2.5 pt-2 border-t border-line/50 text-[10.5px]">
              {/* Brief trace */}
              <div className="rounded-lg bg-indigo-50/50 p-2 border border-indigo-100 text-indigo-950 space-y-1">
                <p><span className="font-semibold text-indigo-900">Brief：</span>{briefAnchor}</p>
                {prioritiesSummary.length > 0 && (
                  <p><span className="font-semibold text-indigo-900">锁定坚持：</span>{prioritiesSummary.join("；")}</p>
                )}
                {avoidSummary.length > 0 && (
                  <p className="text-amber-900"><span className="font-semibold text-amber-900">避开雷区：</span>{avoidSummary.join("；")}</p>
                )}
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-lg bg-white/90 p-2 border border-line/60 space-y-0.5">
                  <span className="font-semibold text-emerald-800 flex items-center gap-1 text-[10px]">
                    <Lightbulb className="h-2.5 w-2.5 text-emerald-600" />
                    可收集线索
                  </span>
                  <p className="leading-snug text-stone-700">{prosText}</p>
                </div>
                <div className="rounded-lg bg-white/90 p-2 border border-line/60 space-y-0.5">
                  <span className="font-semibold text-amber-800 flex items-center gap-1 text-[10px]">
                    <ShieldAlert className="h-2.5 w-2.5 text-amber-600" />
                    保持纯度
                  </span>
                  <p className="leading-snug text-stone-700">{consText}</p>
                </div>
              </div>

              {/* Exploration Angles */}
              {route.steps.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-semibold text-stone-500 block mb-1">
                    追问视点切入：
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {route.steps.map((st, i) => (
                      <span
                        key={st.id}
                        className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[10px] text-stone-600 border border-line/60"
                      >
                        <span className="font-mono text-[9px] text-stone-400">0{i + 1}</span>
                        <span>{cleanStepLabel(st.title)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* Actions: Select or Swap Themes */}
          <div className="pt-1 border-t border-line/60 space-y-1.5">
            {isDiscarded ? (
              <div className="flex items-center justify-between rounded-xl bg-stone-100/90 p-2.5 border border-line/70">
                <span className="text-[11px] text-stone-500 line-through">
                  已舍弃此方向（下轮不再推荐）
                </span>
                <button
                  type="button"
                  onClick={() => removeItemDecision(`theme_${route.id}`)}
                  className="rounded-md bg-white border border-line px-2 py-0.5 text-[11px] text-accent font-medium hover:border-accent transition-colors cursor-pointer"
                >
                  恢复
                </button>
              </div>
            ) : isSelected ? (
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
                      ? "btn-ghost border border-line hover:border-ink hover:bg-white"
                      : "btn-primary shadow-sm hover:shadow"
                  }`}
                  disabled={Boolean(activeRequest)}
                  onClick={() => {
                    removeItemDecision(`theme_${route.id}`);
                    siftActions.selectRoute(route.id);
                  }}
                >
                  <span>{hasSelection ? "切换为此设计主题" : "选择此设计主题"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center justify-between px-0.5">
                  <button
                    type="button"
                    className="text-[10.5px] text-stone-400 hover:text-red-700 flex items-center gap-1 py-0.5 transition-colors cursor-pointer"
                    onClick={() => {
                      setItemDecision({
                        id: `theme_${route.id}`,
                        type: "theme",
                        content: route.themeName || route.title,
                        label: "设计主题",
                        status: "discarded",
                        sourceNode: "03 主题",
                      });
                    }}
                    title="舍弃此方向，下轮换一批或检索将避免同类风格"
                  >
                    <span>✕ 舍弃此方向</span>
                  </button>
                  <button
                    type="button"
                    className="text-[10.5px] text-stone-400 hover:text-ink flex items-center gap-1 py-0.5 transition-colors cursor-pointer"
                    disabled={Boolean(activeRequest)}
                    onClick={() => void siftActions.regenerateRoutes()}
                    title="重新推导一组互不相同的全新设计主题"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    <span>换一批主题</span>
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
