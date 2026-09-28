"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore, getUpstreamSummary } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import type { PlatformPlan, PlatformSource, RouteStep, Route } from "@/types/routes";
import { buildPlatformSearchUrl } from "@/lib/agent/platform-registry";
import { getPlatformInspirationClues } from "@/lib/agent/system-one";
import {
  getBriefAnchor,
  getConvergenceAnchor,
  toInspirationCopy,
} from "@/lib/exploration-copy";
import {
  ExternalLink,
  Copy,
  Check,
  EyeOff,
  RefreshCw,
  Search,
} from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

export type PlatformPlanNodeData = {
  plan: PlatformPlan;
};

function getFacetTargetKeyword(source: PlatformSource, facetIndex: number): string {
  if (facetIndex === 0) {
    const kw = source.keywords.find((k) => k.dimension === "form");
    if (kw) return kw.advancedQuery || kw.calibratedQuery || kw.keyword;
  } else if (facetIndex === 1) {
    const kw = source.keywords.find((k) => k.dimension === "craft");
    if (kw) return kw.advancedQuery || kw.calibratedQuery || kw.keyword;
  } else if (facetIndex === 2) {
    const kw = source.keywords.find((k) => k.dimension === "mood");
    if (kw) return kw.advancedQuery || kw.calibratedQuery || kw.keyword;
  }
  const reality = source.keywords.find((k) => k.dimension === "reality");
  if (reality) return reality.advancedQuery || reality.calibratedQuery || reality.keyword;
  const first = source.keywords[0];
  return first?.advancedQuery || first?.calibratedQuery || first?.keyword || "";
}

function getSearchUrl(source: PlatformSource, kwOrRaw?: string, facetIndex: number = -1): string {
  if (kwOrRaw) {
    const matched = source.keywords.find(
      (k) =>
        k.keyword === kwOrRaw ||
        k.calibratedQuery === kwOrRaw ||
        k.advancedQuery === kwOrRaw,
    );
    const target = matched?.advancedQuery || matched?.calibratedQuery || kwOrRaw;
    return buildPlatformSearchUrl(source.platform, target);
  }
  const target = getFacetTargetKeyword(source, facetIndex);
  return target ? buildPlatformSearchUrl(source.platform, target) : source.searchUrl;
}

function getFacetEditorialClues(source: PlatformSource, facetIndex: number, route?: Route) {
  const themeName = route?.themeName || (route?.title ? route.title.replace(/[【】]/g, "") : "");
  if (facetIndex === 0) {
    return {
      lookFor: themeName
        ? `观察「${themeName}」纯几何与极简轮廓在各视角的收口与倒角比例，聚焦骨架体量与剪影张力。`
        : "观察极简纯几何体量在各视角的收口与倒角比例、轮廓剪影与光影转折。",
      avoid: route?.cons || "琐碎装饰性倒角、浮夸且非必要的异形开槽或塑料玩具感造型。",
    };
  }
  if (facetIndex === 1) {
    return {
      lookFor: route?.focusDimension
        ? `聚焦「${route.focusDimension}」真实打样材质的哑光阻尼度、微肌理漫反射与工艺收口。`
        : "聚焦真实打样材质的哑光阻尼度、表面漫反射与合模分型线工艺细节。",
      avoid: "塑料感高光反光、过度平滑无触觉质感的劣质样机感。",
    };
  }
  if (facetIndex === 2) {
    return {
      lookFor: themeName
        ? `考察「${themeName}」置于真实生活场景与自然漫射光下的视觉亲和力与高级静谧感。`
        : "考察器物置于现实生活居室与漫射天光下的视觉尺度亲和力与高级静谧感。",
      avoid: "脱离真实物理环境的暗黑科幻舞台棚拍光与过度炫耀的渲染烟雾。",
    };
  }
  return source.inspirationClues || getPlatformInspirationClues(source.platform, { themeName });
}

function sanitizeKeyword(raw: string, calibrated?: string): string {
  if (calibrated && calibrated.trim()) {
    return calibrated.trim();
  }
  return raw.trim();
}

const DEFAULT_FALLBACK_PLAN: PlatformPlan = {
  id: "custom-plan",
  stepId: "custom-step",
  routeId: "custom-route",
  primarySources: [
    {
      id: "src-dezeen",
      platform: "dezeen",
      roleTag: "国际先锋报道",
      reason: "国际前沿材料趋势与实体产品设计参考",
      searchUrl: "https://www.dezeen.com/?s=sustainable+material+design",
      keywords: [
        {
          keyword: "recycled composite design",
          meaning: "再生复合材料设计",
          language: "en",
          calibratedQuery: "recycled composite material design",
          advancedQuery: "recycled composite product design -mockup -template",
        },
      ],
    },
    {
      id: "src-behance",
      platform: "behance",
      roleTag: "工业设计与 CMF",
      reason: "详尽的设计过程拆解与落地效果验证",
      searchUrl: "https://www.behance.net/search/projects?search=industrial+design+CMF",
      keywords: [
        {
          keyword: "tactile material CMF",
          meaning: "触感材质 CMF 实验",
          language: "en",
          calibratedQuery: "tactile material CMF packaging",
          advancedQuery: "tactile material CMF product design -vector",
        },
      ],
    },
    {
      id: "src-pinterest",
      platform: "pinterest",
      roleTag: "视觉情绪板",
      reason: "快速建立情绪板与质感对照",
      searchUrl: "https://www.pinterest.com/search/pins/?q=matte+material+texture+design",
      keywords: [
        {
          keyword: "matte tactile texture design",
          meaning: "哑光微触感肌理板",
          language: "en",
          calibratedQuery: "matte tactile texture product",
          advancedQuery: "matte tactile texture minimalist design",
        },
      ],
    },
  ],
  alternativeSources: [],
};

export function PlatformPlanNode({
  id,
  data,
  selected,
}: NodeProps<Node<PlatformPlanNodeData>>) {
  const routes = useSiftStore((s) => s.routes);
  const customCards = useSiftStore((s) => s.customCards);
  const customEdges = useSiftStore((s) => s.customEdges);
  const synthesizeCard = useSiftStore((s) => s.synthesizeCard);
  const setPlatformPlan = useSiftStore((s) => s.setPlatformPlan);
  const updateCustomCard = useSiftStore((s) => s.updateCustomCard);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const sourceInteractions = useSiftStore((s) => s.sourceInteractions);
  const rawBrief = useSiftStore((s) => s.rawBrief);
  const state = useSiftStore((s) => s.state);

  const [replacingSourceId, setReplacingSourceId] = useState<string | null>(null);
  const [copiedKw, setCopiedKw] = useState<string | null>(null);
  const [copiedAllKw, setCopiedAllKw] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showSearchTrace, setShowSearchTrace] = useState(false);
  const [facetIndex, setFacetIndex] = useState<number>(-1);
  const retrievalRequests = useRef(new Set<string>());

  const plan = data?.plan ?? DEFAULT_FALLBACK_PLAN;
  const route: Route | undefined =
    routes.find((r) => r.id === plan.routeId || r.id === selectedRouteId) ??
    (customCards.find((c) => c.data?.route?.id === plan.routeId)?.data?.route as Route | undefined);
  const themeName = route?.themeName || (route?.title ? route.title.replace(/[【】]/g, "") : "风格主题");

  useEffect(() => {
    if (!route || !state || state.status !== "confirmed" || !plan?.primarySources?.length) return;
    const hasRetrieval = plan.primarySources.every((source) => source.retrieval);
    if (hasRetrieval) return;

    const requestKey = `${id}:${plan.id}:${plan.stepId}:${plan.primarySources.map((source) => source.id).join(",")}`;
    if (retrievalRequests.current.has(requestKey)) return;
    retrievalRequests.current.add(requestKey);

    const step = route.steps.find((item) => item.id === plan.stepId) ?? route.steps[0];
    if (!step) return;
    const controller = new AbortController();
    void fetch("/api/inspiration-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: useSiftStore.getState().sessionId,
        requestId: `inspiration-${Date.now().toString(36)}`,
        state,
        selectedRoute: route,
        currentStep: step,
        completedStepIds: [],
        plan,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { plan?: PlatformPlan };
        return payload.plan ?? null;
      })
      .then((enrichedPlan) => {
        if (!enrichedPlan || controller.signal.aborted) return;
        const isCustomCard = useSiftStore.getState().customCards.some((card) => card.id === id);
        if (isCustomCard) {
          updateCustomCard(id, { data: { plan: enrichedPlan, isEmpty: false } });
        } else {
          setPlatformPlan(enrichedPlan);
        }
      })
      .catch(() => {
        // The card keeps its query plan and exposes no false evidence when a
        // reader is unavailable. A later regeneration can retry the search.
      });

    return () => controller.abort();
  }, [id, plan, route, setPlatformPlan, state, updateCustomCard]);

  const handleCopyAllKeywords = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const sources = Array.isArray(plan.primarySources) ? plan.primarySources : [];
    const activeSources = sources.filter(
      (s) => !sourceInteractions[`${plan.stepId}_${s.id}`]?.skipped,
    );

    let textToCopy = "";
    if (facetIndex === -1) {
      textToCopy = activeSources
        .map((s) => {
          const kwLines = (s.keywords || [])
            .map((k) => `  • [${k.dimension === "form" ? "造型" : k.dimension === "craft" ? "CMF" : k.dimension === "mood" ? "光影" : "综合"}] ${k.advancedQuery || k.calibratedQuery || k.keyword}`)
            .join("\n");
          return `【${s.platform.toUpperCase()} · ${toInspirationCopy(s.roleTag)}】\n${kwLines}`;
        })
        .join("\n\n");
    } else {
      const facetName = facetIndex === 0 ? "造型母题" : facetIndex === 1 ? "材质工艺" : "场景光影";
      const lines = activeSources
        .map((s) => {
          const targetKw = getFacetTargetKeyword(s, facetIndex);
          return `• [${s.platform}] ${targetKw}`;
        })
        .join("\n");
      textToCopy = `【${themeName} · ${facetName}切片词】\n${lines}`;
    }

    try {
      if (!(await copyToClipboard(textToCopy))) return;
      setCopiedAllKw(true);
      setTimeout(() => setCopiedAllKw(false), 1800);
    } catch {
      // fallback
    }
  };

  const isEmpty = Boolean((data as any)?.isEmpty) || !data?.plan;

  const upstream = useMemo(
    () => getUpstreamSummary(id, { customEdges, routes, customCards }),
    [id, customEdges, routes, customCards],
  );

  if (isEmpty) {
    const hasUpstream = upstream.count > 0;
    return (
      <div className="w-[390px] transition-all duration-300 hover:shadow-md">
        <NodeShell
          nodeId={id}
          stage="4"
          kicker="灵感检索"
          title={hasUpstream ? `已连接 ${upstream.count} 个上游，等待生成` : "等待连线导入风格主题"}
          badge={
            <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
              空白卡片
            </span>
          }
          selected={selected}
          collapsedContent={
            <div className="text-xs text-stone-500 py-1 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-amber-500" />
              <span>{hasUpstream ? `已连 ${upstream.count} 个上游，点击展开生成` : "未关联风格主题，从「3 风格主题」引线连接"}</span>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            {hasUpstream ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-4 text-center space-y-3"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-xs">
                  <Search className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">
                    已关联 {upstream.count} 个设计上下文
                  </h4>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                    {(upstream.labels ?? []).map((lbl, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200/80 shadow-2xs"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-amber-900/75">
                  已自动开始跨平台灵感检索，稍候查看结构、材质和气质关键词。
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-200/90 bg-amber-50/40 p-4 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100/80 text-amber-700 shadow-xs">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">
                    尚未关联风格主题
                  </h4>
                  <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed">
                    从任意「3 风格主题」拖动引线至此卡片，将自动开始检索
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-100 text-stone-400 text-xs font-medium cursor-not-allowed border border-stone-200/60"
                >
                  等待连线导入风格主题
                </button>
              </div>
            )}

            <div className="rounded-xl bg-stone-50/80 border border-line/60 p-3 space-y-1.5 text-[11px] text-stone-600">
              <div className="font-semibold text-stone-700 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-amber-600" />
                <span>支持的引线连接与生成模式：</span>
              </div>
              <p className="leading-relaxed pl-1 text-stone-600">
                针对选定风格主题的造型母题、材质触感与场景光影，自动剔除水词噪点，生成中英双语检索词库与全球渠道规划（Dezeen / Behance / Pinterest / Cosmobullet）。
              </p>
            </div>
          </div>
        </NodeShell>
      </div>
    );
  }

  const primarySources = Array.isArray(plan?.primarySources) ? plan.primarySources : [];
  const steps: RouteStep[] = (route?.steps ?? []) as RouteStep[];
  const step = steps[facetIndex >= 0 ? facetIndex : 0];
  const stepTitle = step ? step.title : "探索搜索方案";
  const briefAnchor = getBriefAnchor(rawBrief, state?.brief.goal);
  const convergenceAnchor = getConvergenceAnchor(state);

  const objectiveText =
    facetIndex >= 0 && steps[facetIndex]
      ? `切片聚焦「${steps[facetIndex].title}」：${toInspirationCopy(steps[facetIndex].question || steps[facetIndex].purpose || "")}`
      : `围绕「${themeName}」视觉主张与「${route?.focusDimension || "核心特征"}」收集高质量先锋视觉证据，只做灵感对照。`;

  const handleCopy = async (sourceId: string, kw: string) => {
    const success = await siftActions.copyKeyword(plan.stepId, sourceId, kw);
    if (success) {
      setCopiedKw(kw);
      setTimeout(() => setCopiedKw((prev) => (prev === kw ? null : prev)), 1800);
    }
  };

  return (
    <div className="w-[390px]">
      <NodeShell
        nodeId={id}
        stage="4"
        kicker="灵感检索"
        title="跨平台灵感检索"
        onRegenerate={upstream.count > 0 ? () => synthesizeCard(id) : undefined}
        badge={
          <span className="text-[10px] font-mono text-stone-400">
            {primarySources.length} 处检索渠道
          </span>
        }
        selected={selected}
        collapsedContent={
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[10.5px] text-amber-950 font-semibold">
              <span className="flex items-center gap-1">
                <Search className="h-3 w-3 text-amber-700" />
                灵感检索渠道与检索词
              </span>
              <span className="text-[9.5px] font-mono text-stone-400">
                {primarySources.length} 个渠道
              </span>
            </div>
            <div className="space-y-1">
              {primarySources.slice(0, 3).map((source) => {
                const keywords = Array.isArray(source.keywords) ? source.keywords : [];
                const topKw = keywords[0]?.calibratedQuery || keywords[0]?.keyword || "";
                return (
                  <div
                    key={source.id}
                    className="flex items-center justify-between gap-1.5 rounded-lg bg-amber-50/60 px-2 py-1 text-[11px] border border-amber-200/60"
                  >
                    <span className="font-semibold text-ink">{source.platform}</span>
                    <span className="text-stone-600 truncate flex-1 text-right font-mono text-[10.5px]">
                      {topKw}
                    </span>
                    <a
                      href={getSearchUrl(source)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-accent ml-1 shrink-0 p-0.5"
                      title={`在 ${source.platform} 检索`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          {/* Upstream context indicator and re-generate button */}
          {upstream.count > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950">
              <div className="flex items-center gap-1.5 font-medium truncate min-w-0 pr-2">
                <Search className="h-3 w-3 text-amber-700 shrink-0" />
                <span className="truncate">已连 {upstream.count} 个上游：{(upstream.labels ?? []).join(" + ")}</span>
              </div>
              <button
                type="button"
                onClick={() => synthesizeCard(id)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                title="根据当前连线重新生成检索方案"
              >
                <RefreshCw className="h-3 w-3" />
                <span>重新生成</span>
              </button>
            </div>
          )}

          {/* Multi-facet View Switcher: allows switching between All, 1. Form, 2. CMF, 3. Scene */}
          {steps.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-amber-100/70 border border-amber-200/80 text-[10.5px]">
              <button
                type="button"
                onClick={() => setFacetIndex(-1)}
                className={`flex-1 py-1 px-1 rounded-lg font-medium text-center transition-all cursor-pointer ${
                  facetIndex === -1
                    ? "bg-white text-amber-950 shadow-xs font-semibold"
                    : "text-amber-800/80 hover:text-amber-950 hover:bg-white/40"
                }`}
              >
                全部综合
              </button>
              {steps.slice(0, 3).map((st, sIdx) => {
                const shortLabel = st.title
                  .replace(/^Step\s*\d+\s*·\s*/i, "")
                  .replace(/试验|探索/g, "")
                  .slice(0, 4);
                return (
                  <button
                    key={st.id || sIdx}
                    type="button"
                    onClick={() => setFacetIndex(sIdx)}
                    className={`flex-1 py-1 px-1 rounded-lg font-medium text-center transition-all cursor-pointer truncate ${
                      facetIndex === sIdx
                        ? "bg-white text-amber-950 shadow-xs font-semibold"
                        : "text-amber-800/80 hover:text-amber-950 hover:bg-white/40"
                    }`}
                    title={st.title}
                  >
                    {sIdx + 1}. {shortLabel}
                  </button>
                );
              })}
            </div>
          )}

          {/* Focused Visual Inspiration Objective with Foldable Trace */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-amber-950">
              <span className="flex items-center gap-1">
                <Search className="h-3 w-3 text-amber-700" />
                检索目标 · {themeName} {facetIndex >= 0 ? `· 0${facetIndex + 1}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setShowSearchTrace(!showSearchTrace)}
                className="text-[10px] text-amber-800/80 hover:text-amber-950 transition-colors cursor-pointer font-medium"
              >
                {showSearchTrace ? "收起溯源" : "溯源线索"}
              </button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-amber-950 font-medium">
              {objectiveText}
            </p>
            {showSearchTrace && (
              <div className="grid gap-1 text-[10px] leading-relaxed text-amber-950/75 pt-1.5 border-t border-amber-200/60 animate-in fade-in duration-150">
                <p><span className="font-semibold text-amber-950">Brief：</span>{briefAnchor}</p>
                <p><span className="font-semibold text-amber-950">收敛线索：</span>{convergenceAnchor}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-muted text-[11px] pb-0.5">
            <span>
              {facetIndex === 0
                ? "聚焦：1. 造型母题"
                : facetIndex === 1
                  ? "聚焦：2. 材质工艺"
                  : facetIndex === 2
                    ? "聚焦：3. 场景光影"
                    : "精选 3 处灵感渠道"}
            </span>
            <button
              type="button"
              onClick={handleCopyAllKeywords}
              className="text-[10.5px] text-stone-500 hover:text-amber-800 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              title="一键复制全部渠道精选检索词"
            >
              {copiedAllKw ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">已复制检索词</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-stone-400" />
                  <span>
                    {facetIndex === 0
                      ? "复制造型切片词"
                      : facetIndex === 1
                        ? "复制材质切片词"
                        : facetIndex === 2
                          ? "复制场景切片词"
                          : "复制全部检索词"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Primary Sources List */}
          <div className="space-y-2.5">
            {primarySources.map((source, idx) => {
              const key = `${plan.stepId}_${source.id}`;
              const interaction = sourceInteractions[key] ?? {};
              const isSkipped = interaction.skipped;
              const clues = getFacetEditorialClues(source, facetIndex, route);
              const sourceReason = toInspirationCopy(source.reason);
              const roleTag = toInspirationCopy(source.roleTag);
              const activeFacetKw = getFacetTargetKeyword(source, facetIndex);

              return (
                <div
                  key={source.id}
                  className={`rounded-xl border p-3 transition-all ${
                    isSkipped
                      ? "border-line/40 bg-mist/20 opacity-40"
                      : "border-line/80 bg-white/95 shadow-xs"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-semibold text-ink">
                        {idx + 1}.
                      </span>
                      <span className="font-bold text-xs text-ink">
                        {source.platform}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        · {roleTag}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={isSkipped ? "恢复" : "跳过"}
                        className="rounded p-1 text-stone-300 hover:text-ink transition-colors"
                        onClick={() =>
                          siftActions.skipSource(plan.stepId, source.id)
                        }
                      >
                        <EyeOff className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="替换平台"
                        className="rounded p-1 text-stone-300 hover:text-ink transition-colors"
                        onClick={() =>
                          setReplacingSourceId(
                            replacingSourceId === source.id ? null : source.id,
                          )
                        }
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                      <a
                        href={getSearchUrl(source, undefined, facetIndex)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`在 ${source.platform} 检索当前切面`}
                        className="rounded p-1 text-stone-500 hover:text-accent transition-colors inline-flex items-center"
                        onClick={() =>
                          siftActions.recordSourceAction(
                            plan.stepId,
                            source.id,
                            "opened",
                            activeFacetKw,
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Replacement Dropdown */}
                  {replacingSourceId === source.id && (
                    <div className="mt-2 rounded-lg border border-line bg-cream p-2 text-xs">
                      <p className="font-medium text-ink mb-1 text-[11px]">
                        替换为：
                      </p>
                      <div className="space-y-1">
                        {plan.alternativeSources.map((alt) => (
                          <button
                            key={alt.id}
                            type="button"
                            className="w-full rounded px-2 py-1 text-left hover:bg-white flex items-center justify-between text-[11px] transition-colors"
                            onClick={() => {
                              siftActions.replaceSource(
                                plan.stepId,
                                source.id,
                                alt.id,
                              );
                              setReplacingSourceId(null);
                            }}
                          >
                            <span className="font-semibold text-ink">
                              {alt.platform} · {toInspirationCopy(alt.roleTag)}
                            </span>
                            <span className="text-[10px] text-muted">
                              {toInspirationCopy(alt.reason)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 1-Line Clean Reason */}
                  <p className="mt-1 text-[11px] text-muted leading-relaxed">
                    {sourceReason}
                  </p>

                  {/* Editorial Inspection Clues */}
                  {!isSkipped && clues && (
                    <div className="mt-2 border-l border-line/90 pl-2 text-[11px] text-stone-500 space-y-0.5">
                      <p className="leading-snug">
                        <span className="font-medium text-ink">看点：</span>
                        {toInspirationCopy(clues.lookFor)}
                      </p>
                      {clues.avoid && (
                        <p className="leading-snug text-stone-400">
                          <span>避开：</span>
                          {toInspirationCopy(clues.avoid)}
                        </p>
                      )}
                    </div>
                  )}

                  {!isSkipped && source.retrieval && (
                    <div className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/45 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-amber-900/80">
                        <span className="font-medium">
                          {source.retrieval.status === "live"
                            ? `已读取 ${source.retrieval.reviewedCount} 个真实页面`
                            : source.retrieval.status === "partial"
                              ? `已读取 ${source.retrieval.reviewedCount} 个页面，暂无高相关证据`
                              : "暂未读取到可验证页面"}
                        </span>
                        <span className="font-mono text-amber-700/70">
                          {source.retrieval.query.slice(0, 56)}
                        </span>
                      </div>
                      {(source.evidence ?? []).map((evidence) => (
                        <a
                          key={evidence.url}
                          href={evidence.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border border-amber-200/70 bg-white/80 px-2 py-1.5 hover:border-amber-400 hover:bg-white transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-medium leading-snug text-stone-800">
                              {evidence.title}
                            </span>
                            <span className="shrink-0 text-[10px] font-mono text-emerald-700">
                              {evidence.relevanceScore}%
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] leading-snug text-stone-500 line-clamp-2">
                            {evidence.excerpt}
                          </p>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Compact Keyword Tags */}
                  {!isSkipped && (
                    <div className="mt-2 pt-2 border-t border-line/40 flex flex-wrap items-center gap-1.5">
                      {source.keywords.map((k, ki) => {
                        const isTargetFacet =
                          facetIndex === -1
                            ? true
                            : (facetIndex === 0 && (k.dimension === "form" || k.dimension === "reality")) ||
                              (facetIndex === 1 && (k.dimension === "craft" || k.dimension === "reality")) ||
                              (facetIndex === 2 && (k.dimension === "mood" || k.dimension === "reality"));

                        const displayKw = toInspirationCopy(
                          sanitizeKeyword(k.keyword, k.calibratedQuery),
                        );
                        const effectiveCopyKw =
                          k.advancedQuery || k.calibratedQuery || displayKw;
                        const isCopied =
                          copiedKw === displayKw ||
                          copiedKw === effectiveCopyKw ||
                          copiedKw === k.calibratedQuery ||
                          copiedKw === k.keyword;

                        const dimensionTag =
                          k.dimension === "form"
                            ? "造型"
                            : k.dimension === "craft"
                              ? "CMF"
                              : k.dimension === "mood"
                                ? "光影"
                                : "综合";

                        return (
                          <div
                            key={ki}
                            className={`group inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                              isTargetFacet
                                ? "border-amber-300/80 bg-amber-50/80 text-amber-950 font-medium shadow-2xs hover:bg-white hover:border-amber-500"
                                : "border-line/50 bg-stone-50/40 text-stone-400 hover:text-stone-700 hover:bg-white opacity-60"
                            }`}
                            title={toInspirationCopy(k.meaning || displayKw)}
                          >
                            <span className="text-[9px] font-mono text-stone-400 font-normal">
                              {dimensionTag}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(source.id, effectiveCopyKw)}
                              className="font-medium hover:text-accent flex items-center gap-1 cursor-pointer"
                              title={
                                isCopied
                                  ? `已复制纯净搜索词：${effectiveCopyKw}`
                                  : `点击复制纯净搜索词：${effectiveCopyKw}`
                              }
                            >
                              <span className="font-mono text-[10.5px]">{displayKw}</span>
                              {k.meaning && k.meaning !== displayKw && (
                                <span className="text-[10px] text-stone-400 font-normal hidden sm:inline truncate max-w-[125px]">
                                  · {toInspirationCopy(k.meaning)}
                                </span>
                              )}
                              {isCopied ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium font-sans">
                                  <Check className="h-2.5 w-2.5" />
                                  <span>已复制</span>
                                </span>
                              ) : (
                                <Copy className="h-2.5 w-2.5 opacity-30 group-hover:opacity-80 shrink-0" />
                              )}
                            </button>
                            <a
                              href={getSearchUrl(source, displayKw, facetIndex)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                siftActions.recordSourceAction(
                                  plan.stepId,
                                  source.id,
                                  "opened",
                                  effectiveCopyKw,
                                )
                              }
                              className="text-stone-300 hover:text-ink p-0.5 inline-flex items-center cursor-pointer ml-0.5"
                              title={`在 ${source.platform} 检索纯净案例（已过滤样机）`}
                            >
                              <Search className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Alternative Sources Accordion */}
          {plan.alternativeSources.length > 0 && (
            <div className="pt-0.5 text-[11px]">
              <button
                type="button"
                className="w-full flex items-center justify-between text-stone-400 hover:text-ink py-1 font-medium transition-colors"
                onClick={() => setShowAlternatives(!showAlternatives)}
              >
                <span>备选平台 ({plan.alternativeSources.length})</span>
                <span className="text-[9px] font-mono">
                  {showAlternatives ? "收起" : "展开"}
                </span>
              </button>

              {showAlternatives && (
                <div className="mt-1 space-y-1">
                  {plan.alternativeSources.map((alt, altIdx) => {
                    const altMatch =
                      plan.systemOne?.matchPercentages?.[alt.id] ??
                      Math.max(76, 85 - altIdx * 3);

                    return (
                      <div
                        key={alt.id}
                        className="rounded-lg border border-line/60 bg-cream/30 px-2.5 py-1.5 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-ink">
                            {alt.platform} · {toInspirationCopy(alt.roleTag)}
                          </span>
                          <span className="text-[9px] font-mono text-stone-400 shrink-0">
                            {altMatch}%
                          </span>
                        </div>
                        <a
                          href={getSearchUrl(alt)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-stone-600 hover:text-ink hover:underline cursor-pointer ml-1 shrink-0"
                          onClick={() =>
                            siftActions.recordSourceAction(
                              plan.stepId,
                              alt.id,
                              "opened",
                              alt.keywords[0]?.keyword,
                            )
                          }
                        >
                          直达 ↗
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  );
}
