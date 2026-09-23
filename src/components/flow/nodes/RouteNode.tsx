"use client";

import { useState, useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore, getUpstreamSummary } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { cleanStepLabel, type Route } from "@/types/routes";
import { toInspirationCopy } from "@/lib/exploration-copy";
import {
  Sparkles,
  Check,
  ShieldAlert,
  RefreshCw,
  Compass,
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

const DEFAULT_FALLBACK_ROUTE: Route = {
  id: "custom-route",
  title: "【自定义风格探索】",
  themeName: "自定义风格探索",
  focusDimension: "核心材质与视觉调性",
  startingPoint: "基于自由探索假设切入",
  coreProblem: "建立独具画面辨识度的视觉语言",
  purpose: "构建连贯的视觉策略与设计母题",
  pros: "探索自由度高、可灵活微调",
  cons: "需自行验证与评估落地可行性",
  recommendedReason: null,
  alignmentScore: 90,
  steps: [
    {
      id: "s1",
      title: "核心母题与造型骨架试验",
      question: "如何确立第一眼视觉辨识度？",
      purpose: "提炼核心视觉母题",
      acceptanceCriteria: ["具备清晰的视觉记忆点", "与整体品牌调性呼应"],
    },
    {
      id: "s2",
      title: "物料工艺与表面触感试验",
      question: "选用何种材质与表面处理？",
      purpose: "深化细节与高级质感",
      acceptanceCriteria: ["明确主材质与辅助材质搭配", "表面微纹理具可实现性"],
    },
    {
      id: "s3",
      title: "场景交互与整体系统试验",
      question: "在真实场景中如何落地共生？",
      purpose: "验证全案完整度",
      acceptanceCriteria: ["延展至全系列包装或器物", "受众体验触点连贯一致"],
    },
  ],
};

export function RouteNode({ id, data, selected }: NodeProps<Node<RouteNodeData>>) {
  const isEmpty = Boolean((data as any)?.isEmpty);
  const isBlended = Boolean((data as any)?.isBlended);
  const isEvolved = Boolean((data as any)?.isEvolved);
  const isDerived = Boolean((data as any)?.isDerived);

  const route = data?.route ?? {
    ...DEFAULT_FALLBACK_ROUTE,
    id: id || "custom-route",
    title: (data as any)?.title || DEFAULT_FALLBACK_ROUTE.title,
    themeName: (data as any)?.title?.replace(/【|】/g, "") || DEFAULT_FALLBACK_ROUTE.themeName,
  };
  const index = data?.index ?? 0;

  const [showTrace, setShowTrace] = useState(false);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const exploredRouteIds = useSiftStore((s) => s.exploredRouteIds ?? []);
  const recommendedRouteId = useSiftStore((s) => s.recommendedRouteId);
  const activeRequest = useSiftStore((s) => s.activeRequest);
  const customEdges = useSiftStore((s) => s.customEdges);
  const customCards = useSiftStore((s) => s.customCards);
  const routes = useSiftStore((s) => s.routes);
  const rawBrief = useSiftStore((s) => s.rawBrief);
  const state = useSiftStore((s) => s.state);
  const synthesizeCard = useSiftStore((s) => s.synthesizeCard);

  const upstream = useMemo(
    () => getUpstreamSummary(id, { customEdges, routes, customCards }),
    [id, customEdges, routes, customCards],
  );

  // Blank / Empty State Card
  if (isEmpty) {
    const hasUpstream = upstream.count > 0;
    return (
      <div className="w-[390px] transition-all duration-300 hover:shadow-md">
        <NodeShell
          nodeId={id}
          stage="03"
          kicker="空白主题"
          title={hasUpstream ? "已关联上游，等待生成" : "等待连线导入设计上下文"}
          badge={
            <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
              空白卡片
            </span>
          }
          selected={selected}
          collapsedContent={
            <div className="text-xs text-stone-500 py-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>{hasUpstream ? `已连 ${upstream.count} 个上游，点击展开生成` : "未关联设计上下文"}</span>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            {hasUpstream ? (
              <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/60 p-4 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shadow-xs">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">
                    已关联 {upstream.count} 个设计上下文
                  </h4>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                    {upstream.labels.map((lbl, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100 shadow-2xs"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Explicit Click to Generate Button */}
                <button
                  type="button"
                  onClick={() => synthesizeCard(id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-indigo-200 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                  <span>
                    点击根据上下文生成主题
                    {upstream.themesCount >= 2
                      ? " (跨界双主题融合)"
                      : upstream.themesCount === 1
                        ? " (变奏分支)"
                        : ""}
                  </span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-indigo-200/90 bg-indigo-50/40 p-4 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100/80 text-indigo-600 shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">
                    尚未关联设计上下文
                  </h4>
                  <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed">
                    从左侧卡片拖动引线至此卡片，然后点击下方按钮生成
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-100 text-stone-400 text-xs font-medium cursor-not-allowed border border-stone-200/60"
                >
                  等待连线导入上下文
                </button>
              </div>
            )}

            <div className="rounded-xl bg-stone-50/80 border border-line/60 p-3 space-y-2 text-[11px]">
              <div className="font-semibold text-stone-700 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-indigo-500" />
                <span>支持的引线连接与生成模式：</span>
              </div>
              <div className="space-y-2 text-stone-600 pl-0.5">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/80">
                    连 1 个主题
                  </span>
                  <span className="leading-snug text-stone-600">
                    衍生形态与工艺变奏分支（Theme Variation）
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/80">
                    连 2 个主题
                  </span>
                  <span className="leading-snug text-stone-800 font-medium">
                    跨界双主题融合（Theme Blending，杂交生成全新复合风格）
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                    连策略基准
                  </span>
                  <span className="leading-snug text-stone-600">
                    从「02 策略基准」推导符合假设与准则的全新主题
                  </span>
                </div>
              </div>
            </div>
          </div>
        </NodeShell>
      </div>
    );
  }

  const isExplored =
    exploredRouteIds.includes(route.id) ||
    (id ? exploredRouteIds.includes(id) : false) ||
    selectedRouteId === route.id ||
    (id ? selectedRouteId === id : false);

  // Strict single-recommendation rule
  const isRecommended = recommendedRouteId
    ? route.id === recommendedRouteId
    : Boolean(route.recommendedReason);

  const kicker = isBlended
    ? "跨界融合"
    : isEvolved
      ? "衍生变奏"
      : isDerived
        ? "策略推导"
        : isRecommended
          ? "推荐方向"
          : `主题方向 0${index + 1}`;

  // Clean, instantly recognizable theme title
  const heroTitle = useMemo(() => {
    if (route.themeName && route.themeName.trim()) {
      return route.themeName.replace(/[【】]/g, "").replace(/\s*·\s*/g, " · ").trim();
    }
    const raw = route.title || "设计主题";
    const match = raw.match(/【(.*?)】(.*)/);
    if (match) {
      const part1 = match[1].trim();
      const part2 = match[2].trim();
      return part2 ? `${part1}与${part2}` : part1;
    }
    return raw.replace(/[【】]/g, "").trim();
  }, [route.themeName, route.title]);

  const snapshotText = toInspirationCopy(cleanText(route.visualSnapshot || route.purpose));
  const recReason = toInspirationCopy(cleanText(route.recommendedReason));
  const coreProblemText = toInspirationCopy(cleanText(route.coreProblem));
  const consText = toInspirationCopy(cleanText(route.cons));

  // Consolidated craft description (prioritize focusDimension, fallback to startingPoint)
  const visualCraftText = useMemo(() => {
    const rawCraft = route.focusDimension || route.startingPoint || route.pros;
    return toInspirationCopy(cleanText(rawCraft));
  }, [route.focusDimension, route.startingPoint, route.pros]);

  return (
    <div
      className={`transition-all duration-300 w-[390px] ${
        isBlended
          ? "ring-2 ring-purple-600/70 shadow-lg"
          : isExplored
            ? "ring-2 ring-indigo-600/70 shadow-md"
            : "hover:shadow-md"
      }`}
    >
      <NodeShell
        nodeId={id}
        stage="03"
        kicker={kicker}
        title={heroTitle}
        onRegenerate={upstream.count > 0 ? () => synthesizeCard(id) : undefined}
        badge={
          isBlended ? (
            <span className="text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
              <Sparkles className="h-3 w-3 text-purple-600" />
              跨界融合
            </span>
          ) : isEvolved ? (
            <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded">
              衍生变奏
            </span>
          ) : isDerived ? (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">
              策略推导
            </span>
          ) : isExplored ? (
            <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded">
              ✓ 视点展开中
            </span>
          ) : isRecommended ? (
            <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-amber-600" />
              首选推荐
            </span>
          ) : undefined
        }
        selected={selected || isExplored || isBlended}
        collapsedContent={
          <div className="space-y-1.5 text-xs py-0.5">
            <p className="text-[12px] font-medium text-stone-800 line-clamp-1">
              {heroTitle}
            </p>
            <p className="text-[11.5px] font-serif text-stone-500 leading-relaxed line-clamp-2">
              “{snapshotText}”
            </p>
          </div>
        }
      >
        <div className="space-y-2.5 text-xs">
          {/* Upstream context indicator and re-generate button */}
          {upstream.count > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-200/80 text-[11px] text-indigo-900">
              <div className="flex items-center gap-1.5 font-medium truncate min-w-0 pr-2">
                <Sparkles className="h-3 w-3 text-indigo-600 shrink-0" />
                <span className="truncate">已连 {upstream.count} 个上游：{upstream.labels.join(" + ")}</span>
              </div>
              <button
                type="button"
                onClick={() => synthesizeCard(id)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                title="根据当前连线重新生成主题"
              >
                <RefreshCw className="h-3 w-3" />
                <span>重新生成</span>
              </button>
            </div>
          )}

          {/* 1. 画面意向 (Visual Concept / Snapshot) */}
          <div className="rounded-xl border border-stone-200/90 bg-stone-50/70 p-3 space-y-1.5">
            <div className="text-[11px] font-semibold text-stone-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>画面意向</span>
            </div>
            <p className="text-xs sm:text-[12.5px] text-ink font-medium leading-relaxed font-serif bg-white/95 p-2.5 rounded-lg border border-line/60 shadow-2xs">
              “{snapshotText}”
            </p>
          </div>

          {/* 推荐理由 - 仅推荐主题显示 */}
          {isRecommended && recReason && (
            <div className="flex items-start gap-1.5 rounded-lg bg-amber-50/80 border border-amber-200/70 px-2.5 py-1.5 text-[11px] text-amber-900 leading-relaxed">
              <span className="font-semibold shrink-0">💡 推荐考量：</span>
              <span>{recReason}</span>
            </div>
          )}

          {/* 2. 设计思考与权衡 (3-Point Essential Thinking: 手法 / 取舍 / 避坑) */}
          <div className="rounded-xl border border-line/70 bg-white/90 p-3 space-y-2.5 text-[11.5px]">
            {/* 核心视觉手法 */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-stone-700">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                <span>核心视觉手法</span>
              </div>
              <p className="text-stone-700 leading-relaxed pl-3 text-[11.5px]">
                {visualCraftText}
              </p>
            </div>

            {/* 设计取舍与押注 */}
            <div className="space-y-0.5 border-t border-line/40 pt-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-stone-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>设计取舍与权衡</span>
              </div>
              <p className="text-stone-700 leading-relaxed pl-3 text-[11.5px]">
                {coreProblemText}
              </p>
            </div>

            {/* 防跑偏提醒 */}
            <div className="space-y-0.5 border-t border-line/40 pt-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-800">
                <ShieldAlert className="h-3 w-3 text-amber-600 shrink-0" />
                <span>防跑偏提醒</span>
              </div>
              <p className="text-stone-600 leading-relaxed pl-3 text-[11px]">
                {consText}
              </p>
            </div>
          </div>

          {/* 3. 后续切入视点 (Exploration Angles 直通 04 视点推进) */}
          <div className="space-y-1.5 pt-0.5">
            <div className="text-[10px] font-semibold text-stone-400 tracking-wider">
              后续切入视点（04 探索方向）
            </div>
            <div className="flex flex-wrap gap-1.5">
              {route.steps.map((st, i) => (
                <span
                  key={st.id}
                  className="inline-flex items-center gap-1 rounded-md bg-stone-50 border border-line/70 px-2 py-0.5 text-[10.5px] text-stone-700"
                >
                  <span className="font-mono text-[9px] text-stone-400">0{i + 1}</span>
                  <span>{cleanStepLabel(st.title)}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 4. Actions: 展开/深入探索 */}
          <div className="pt-2 border-t border-line/60">
            {isExplored ? (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                  <Check className="h-3.5 w-3.5" />
                  已展开视点推进 (04)
                </span>
                <button
                  type="button"
                  className="btn-ghost !py-1 !px-2.5 text-xs text-stone-500 hover:text-red-600 transition-colors cursor-pointer"
                  onClick={() => siftActions.unexploreRoute(route.id)}
                  title="收起此主题对应的 04 视点推进卡片"
                >
                  收起视点
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-primary w-full text-xs font-medium py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-xs hover:shadow cursor-pointer"
                disabled={Boolean(activeRequest)}
                onClick={() => siftActions.selectRoute(route.id)}
              >
                <span>深入探索此主题，展开视点推进 (04) →</span>
              </button>
            )}
          </div>
        </div>
      </NodeShell>
    </div>
  );
}
