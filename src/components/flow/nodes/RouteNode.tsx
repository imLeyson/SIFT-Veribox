"use client";

import React, { useState, useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore, getUpstreamSummary } from "@/lib/convergence-store";
import type { Route } from "@/types/routes";
import { toInspirationCopy } from "@/lib/exploration-copy";
import {
  Sparkles,
  ShieldAlert,
  RefreshCw,
  Compass,
  Eye,
  Layers,
  Check,
  Search,
  Wand2,
  ChevronRight,
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
  sensoryMetaphor: "大面积纯白原浆棉纸留白，正面仅单色侧光深压凹，在 45° 侧光下靠压凹阴影显出极简雕塑感",
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
  const activeRequest = useSiftStore((s) => s.activeRequest);
  const customEdges = useSiftStore((s) => s.customEdges);
  const customCards = useSiftStore((s) => s.customCards);
  const routes = useSiftStore((s) => s.routes);
  const synthesizeCard = useSiftStore((s) => s.synthesizeCard);
  const collapsedNodeIds = useSiftStore((s) => s.collapsedNodeIds);
  const collapseAllNodes = useSiftStore((s) => s.collapseAllNodes);
  const selectRoute = useSiftStore((s) => s.selectRoute);
  const addCustomCard = useSiftStore((s) => s.addCustomCard);
  const addCustomEdge = useSiftStore((s) => s.addCustomEdge);

  const isSelected = selectedRouteId === route.id || `route-${selectedRouteId}` === id;

  const handleSelectTheme = () => {
    selectRoute(route.id);
  };

  /** Spawn a downstream card of a given type, connected from this route card */
  const spawnDownstream = (type: "step" | "platformPlan" | "imageGen") => {
    const suffix = Math.random().toString(36).slice(2, 6);
    const ts = Date.now().toString(36);
    const newId = `card-${type}-${ts}-${suffix}`;

    // Find this card's position to place the new one to the right
    const thisCard = customCards.find((c) => c.id === id);
    const basePos = thisCard?.position ?? { x: 0, y: 0 };
    const offsetY = downstreamNodeIds.length * 300;

    addCustomCard({
      id: newId,
      type,
      position: { x: basePos.x + 480, y: basePos.y + offsetY },
      title: type === "step" ? "视点推进" : type === "platformPlan" ? "灵感检索" : "画面生成",
      data: { isEmpty: true },
    });
    addCustomEdge({
      id: `edge-${id}-${newId}`,
      source: id,
      target: newId,
    });
    // Auto-synthesize the new card immediately
    setTimeout(() => synthesizeCard(newId), 50);
  };


  const upstream = useMemo(
    () => getUpstreamSummary(id, { customEdges, routes, customCards }),
    [id, customEdges, routes, customCards],
  );

  const downstreamNodeIds = useMemo(() => {
    const ids = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const edge of customEdges) {
        if (edge.source === curr && !ids.has(edge.target)) {
          ids.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
    if (selectedRouteId === route.id || `route-${selectedRouteId}` === id) {
      route.steps?.forEach((st) => ids.add(`step-${st.id}`));
    }
    return Array.from(ids);
  }, [id, customEdges, route, selectedRouteId]);

  const areAllDownstreamCollapsed =
    downstreamNodeIds.length > 0 &&
    downstreamNodeIds.every((dId) => collapsedNodeIds.includes(dId));

  const handleToggleBranch = () => {
    if (areAllDownstreamCollapsed) {
      const remaining = collapsedNodeIds.filter((cid) => !downstreamNodeIds.includes(cid));
      collapseAllNodes(remaining);
    } else {
      const combined = Array.from(new Set([...collapsedNodeIds, ...downstreamNodeIds]));
      collapseAllNodes(combined);
    }
  };

  // Clean, instantly recognizable theme title (must be called unconditionally!)
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

  // Display the Chinese concept only; English studio tags add noise to the theme scan.
  const { conceptTitle } = useMemo(() => {
    const raw = (route.themeName || "").trim();
    if (!raw) {
      const fallback = heroTitle;
      return { conceptTitle: fallback.startsWith("《") ? fallback : `《${fallback}》`, englishTag: "" };
    }
    // Match 《...》 followed by optional English Tag
    const bookMatch = raw.match(/^(《[^》]+》)(.*)$/);
    if (bookMatch) {
      const enRaw = bookMatch[2].replace(/^[·\-\s]+/, "").trim();
      // Guard against composite strings like "PALM VALLEY与《卵石序列》 PEBBLE SEQUENCE复合变奏"
      const cleanEn = enRaw.replace(/与.*$/, "").replace(/复合变奏.*$/, "").trim();
      return {
        conceptTitle: bookMatch[1].trim(),
        englishTag: /^[a-zA-Z\s\/\-_]+$/.test(cleanEn) ? cleanEn : "",
      };
    }
    // Match non-English chars followed by optional English Tag
    const generalMatch = raw.match(/^([^\w\s·]+(?:[·\s]+[^\w\s·]+)*)\s*([a-zA-Z\s\/\-_]+)?$/);
    if (generalMatch && generalMatch[1]) {
      const zh = generalMatch[1].trim();
      return {
        conceptTitle: zh.startsWith("《") ? zh : `《${zh}》`,
        englishTag: (generalMatch[2] || "").trim(),
      };
    }
    return {
      conceptTitle: raw.startsWith("《") ? raw : `《${raw}》`,
      englishTag: "",
    };
  }, [route.themeName, heroTitle]);

  // Two-Tier Craft Formula Subtitle (CMF材质 × 结构工艺)
  const craftParts = useMemo(() => {
    const rawTitle = (route.title || "").trim();
    if (!rawTitle || rawTitle === route.themeName) return [];
    // Strip leading 【...】 entirely and remove "跨界融合" prefix
    const clean = rawTitle
      .replace(/^[【\[].*?[】\]]\s*/, "")
      .replace(/【|】/g, "")
      .replace(/^跨界融合\s*[×与·]?\s*/, "")
      .trim();

    if (clean.includes("×")) {
      return clean
        .split("×")
        .map((s) => s.trim())
        .filter((s) => s && !/^《.*》$/.test(s) && s !== "跨界融合");
    }
    if (clean.includes("与") && !clean.includes("×")) {
      const [left, right] = clean.split("与");
      if (left && right && left.length < 25 && right.length < 25) {
        return [left.trim(), right.trim()];
      }
    }
    return [clean];
  }, [route.title, route.themeName]);

  // Rich Editorial Typography Header for NodeShell
  const nodeTitle = useMemo(() => {
    return (
      <div className="space-y-1 py-0.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-serif font-bold text-ink text-[17px] leading-snug tracking-tight">
            {conceptTitle}
          </span>
        </div>
        {craftParts.length > 0 && (
          <div className="text-[12px] font-sans font-medium text-stone-600 leading-snug flex items-center flex-wrap gap-1">
            {craftParts.map((part, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <span className="text-indigo-600 font-bold px-0.5 select-none text-[13px]">
                    ×
                  </span>
                )}
                <span>{part}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  }, [conceptTitle, craftParts]);

  // Consolidated craft description (must be called unconditionally!)
  const visualCraftText = useMemo(() => {
    const rawCraft = route.focusDimension || route.startingPoint || route.pros;
    return toInspirationCopy(cleanText(rawCraft));
  }, [route.focusDimension, route.startingPoint, route.pros]);

  // Blank / Empty State Card
  if (isEmpty) {
    const hasUpstream = upstream.count > 0;
    return (
      <div className="w-[390px] transition-all duration-300 hover:shadow-md">
        <NodeShell
          nodeId={id}
          stage="3"
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
                    从「2 策略基准」推导符合假设与准则的全新主题
                  </span>
                </div>
              </div>
            </div>
          </div>
        </NodeShell>
      </div>
    );
  }

  const kicker = isBlended
    ? "跨界融合"
    : isEvolved
      ? "衍生变奏"
      : isDerived
        ? "策略推导"
        : `探索主题 0${index + 1}`;

  const snapshotText = toInspirationCopy(cleanText(route.visualSnapshot || route.purpose));
  const coreProblemText = toInspirationCopy(cleanText(route.coreProblem));
  const consText = toInspirationCopy(cleanText(route.cons));

  return (
    <div
      className={`transition-all duration-300 w-[390px] ${
        isBlended
          ? "ring-2 ring-purple-600/70 shadow-lg"
          : "hover:shadow-md"
      }`}
    >
      <NodeShell
        nodeId={id}
        stage="3"
        kicker={kicker}
        title={nodeTitle}
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
          ) : (
            <span className="text-[10px] font-medium text-stone-600 bg-stone-100/90 border border-stone-200/80 px-1.5 py-0.5 rounded">
              {`主题 0${index + 1}`}
            </span>
          )
        }
        selected={selected || isBlended}
      >
        <div className="space-y-2.5 text-xs">
          {/* Upstream context indicator and re-generate button */}
          {upstream.count > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-200/80 text-[11px] text-indigo-900">
              <div className="flex items-center gap-1.5 font-medium truncate min-w-0 pr-2">
                <Sparkles className="h-3 w-3 text-indigo-600 shrink-0" />
                <span className="truncate">已连 {upstream.count} 个上游：{(upstream.labels ?? []).join(" + ")}</span>
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

          {isBlended && (
            <div className="rounded-xl border border-stone-200/80 bg-white/80 p-3 text-[11px]">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-stone-800">融合记录</span>
                <span className="font-mono text-[10px] text-stone-400">{upstream.count} 个输入</span>
              </div>
              <dl className="space-y-2.5">
                <div>
                  <dt className="text-[10px] font-semibold text-stone-500">输入主题</dt>
                  <dd className="mt-1 leading-relaxed text-stone-700">{upstream.labels.join(" + ")}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold text-stone-500">融合理由</dt>
                  <dd className="mt-1 leading-relaxed text-stone-700">
                    {cleanText(route.recommendedReason || route.purpose)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold text-stone-500">冲突与取舍</dt>
                  <dd className="mt-1 leading-relaxed text-stone-700">{coreProblemText || consText}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold text-stone-500">下一步视点</dt>
                  <dd className="mt-1 leading-relaxed text-stone-700">
                    {cleanText(route.steps?.[0]?.question || route.steps?.[0]?.title || "继续验证融合后的视觉母题")}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* 1. 视觉意象 (单层呼吸表面，纯净质感呈现) */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-stone-600">
                <Eye className="h-3.5 w-3.5 text-stone-400" />
                <span>视觉意象</span>
              </span>
            </div>
            <p className="text-[12.5px] text-stone-800 leading-[1.68] font-sans pl-0.5">
              {snapshotText || cleanText(route.sensoryMetaphor)}
            </p>
          </div>

          {/* 2. 设计决策与避坑提醒 (默认折叠抽屉，去除非关键冗余) */}
          <details className="group rounded-xl border border-stone-200/70 bg-white/70 overflow-hidden text-[11px] transition-all">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-stone-50 transition-colors select-none text-stone-600 font-medium list-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-stone-400 group-hover:text-stone-600 transition-colors" />
                <span>设计决策与避坑提醒</span>
              </span>
              <span className="text-[10px] text-stone-400 transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="p-3 pt-2 border-t border-stone-100 space-y-2.5 bg-stone-50/30 text-[11px]">
              {/* 设计取舍与押注 */}
              {coreProblemText && (
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-indigo-700 block">设计取舍</span>
                  <p className="text-stone-700 leading-relaxed pl-2 border-l-2 border-indigo-200">
                    {coreProblemText}
                  </p>
                </div>
              )}

              {/* 防跑偏提醒 */}
              {consText && (
                <div className="space-y-0.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-amber-800 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-amber-600" />
                    <span>避坑提醒</span>
                  </span>
                  <p className="text-stone-600 leading-relaxed pl-2 border-l-2 border-amber-200">
                    {consText}
                  </p>
                </div>
              )}

            </div>
          </details>

          {/* ── Action Toolbar: make this theme card fully usable ── */}
          <div className="rounded-xl border border-stone-200/80 bg-gradient-to-b from-white/90 to-stone-50/80 p-2.5 space-y-2">
            {/* Select theme as active */}
            <button
              type="button"
              onClick={handleSelectTheme}
              disabled={isSelected}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-100 text-indigo-700 border border-indigo-200/80 cursor-default"
                  : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white shadow-sm shadow-indigo-200"
              }`}
              title={isSelected ? "已选定为当前探索主题" : "选定此主题作为当前探索方向"}
            >
              {isSelected ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>已选定为当前主题</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>选定此主题开始探索</span>
                </>
              )}
            </button>

            {/* Quick-derive downstream cards */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => spawnDownstream("step")}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10.5px] font-medium transition-colors cursor-pointer border border-stone-200/60"
                title="展开视点推进"
              >
                <ChevronRight className="h-3 w-3 text-emerald-600" />
                <span>视点推进</span>
              </button>
              <button
                type="button"
                onClick={() => spawnDownstream("platformPlan")}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10.5px] font-medium transition-colors cursor-pointer border border-stone-200/60"
                title="生成灵感检索方案"
              >
                <Search className="h-3 w-3 text-amber-600" />
                <span>灵感检索</span>
              </button>
              <button
                type="button"
                onClick={() => spawnDownstream("imageGen")}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10.5px] font-medium transition-colors cursor-pointer border border-stone-200/60"
                title="生成概念画面"
              >
                <Wand2 className="h-3 w-3 text-violet-600" />
                <span>画面生成</span>
              </button>
            </div>
          </div>

          {/* Branch Fold / Chain Grouping */}
          {downstreamNodeIds.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-200/70 text-[11px]">
              <span className="text-stone-400">
                已衍生 {downstreamNodeIds.length} 张下游探索卡
              </span>
              <button
                type="button"
                onClick={handleToggleBranch}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-[10px] transition-colors cursor-pointer shadow-2xs"
                title={areAllDownstreamCollapsed ? "展开下游所有卡片" : "一键折叠本路线所有衍生卡片，精简画布视野"}
              >
                <Layers className="h-3 w-3 text-stone-500" />
                <span>{areAllDownstreamCollapsed ? "展开分支链路" : "收起分支链路"}</span>
              </button>
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  );
}
