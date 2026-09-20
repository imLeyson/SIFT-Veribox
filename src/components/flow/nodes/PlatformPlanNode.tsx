"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import type {
  PlatformPlan,
  PlatformSource,
  PlatformKeywordDimension,
} from "@/types/routes";
import { buildPlatformSearchUrl } from "@/lib/agent/platform-registry";
import {
  getPlatformInspirationClues,
  inferKeywordDimension,
} from "@/lib/agent/system-one";
import {
  ExternalLink,
  Copy,
  Check,
  EyeOff,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
  Zap,
  Compass,
} from "lucide-react";

export type PlatformPlanNodeData = {
  plan: PlatformPlan;
};

const LENS_CONFIG = {
  all: {
    id: "all",
    label: "全部视角",
    badge: "全部",
    icon: null,
    desc: "全景三棱镜互补推荐",
    color: "bg-stone-50 text-stone-700 border-stone-200/80",
  },
  benchmark: {
    id: "benchmark",
    label: "行业标杆",
    badge: "🎯 行业标杆",
    icon: "🎯",
    desc: "基准范式与信息架构",
    color: "bg-blue-50/90 text-blue-700 border-blue-200/80",
  },
  avant_garde: {
    id: "avant_garde",
    label: "先锋美学",
    badge: "⚡️ 先锋美学",
    icon: "⚡️",
    desc: "质感上限与视觉突破",
    color: "bg-purple-50/90 text-purple-700 border-purple-200/80",
  },
  proofing: {
    id: "proofing",
    label: "本土落地",
    badge: "🧪 本土落地",
    icon: "🧪",
    desc: "微工艺实测与真实打样",
    color: "bg-amber-50/90 text-amber-700 border-amber-200/80",
  },
} as const;

type LensKey = keyof typeof LENS_CONFIG;

const DIMENSION_CONFIG: Record<
  PlatformKeywordDimension,
  { label: string; icon: string; badge: string; desc: string }
> = {
  form: {
    label: "形 · 结构",
    icon: "📐",
    badge: "bg-blue-50 text-blue-700 border-blue-200/60",
    desc: "版式骨架、双栏网格、包装盒型与组件层级",
  },
  craft: {
    label: "质 · 工艺",
    icon: "🪨",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    desc: "无墨压凹、特种纸纹理、动效曲线与阴影阶度",
  },
  mood: {
    label: "意 · 意象",
    icon: "🌌",
    badge: "bg-purple-50 text-purple-700 border-purple-200/60",
    desc: "调性传达、色彩情绪、极简克制与视觉隐喻",
  },
  reality: {
    label: "真 · 实测",
    icon: "🏷️",
    badge: "bg-amber-50 text-amber-700 border-amber-200/60",
    desc: "真实货架晒单、印刷咬印细节与上手实操",
  },
};

function getSearchUrl(source: PlatformSource, kwOrRaw?: string): string {
  if (!kwOrRaw) {
    const first = source.keywords[0];
    const target = first?.calibratedQuery || first?.keyword || "";
    return target ? buildPlatformSearchUrl(source.platform, target) : source.searchUrl;
  }
  const matched = source.keywords.find(
    (k) => k.keyword === kwOrRaw || k.calibratedQuery === kwOrRaw,
  );
  const target = matched?.calibratedQuery || kwOrRaw;
  return buildPlatformSearchUrl(source.platform, target);
}

function getCleanSearchUrl(source: PlatformSource): string | null {
  const adv = source.keywords.find((k) => k.advancedQuery)?.advancedQuery;
  if (!adv) return null;
  return buildPlatformSearchUrl(source.platform, adv);
}

export function PlatformPlanNode({
  data,
  selected,
}: NodeProps<Node<PlatformPlanNodeData>>) {
  const { plan } = data;
  const routes = useSiftStore((s) => s.routes);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const sourceInteractions = useSiftStore((s) => s.sourceInteractions);

  const [activeLens, setActiveLens] = useState<LensKey>("all");
  const [replacingSourceId, setReplacingSourceId] = useState<string | null>(null);
  const [copiedKw, setCopiedKw] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const route = routes.find((r) => r.id === plan.routeId || r.id === selectedRouteId);
  const step = route?.steps.find((st) => st.id === plan.stepId);
  const stepTitle = step ? step.title : "探索搜索方案";

  const handleCopy = async (sourceId: string, kw: string) => {
    await siftActions.copyKeyword(plan.stepId, sourceId, kw);
    setCopiedKw(kw);
    setTimeout(() => setCopiedKw(null), 1800);
  };

  const handleOpenSearch = (source: PlatformSource, kw?: string) => {
    const query = kw ?? source.keywords[0]?.calibratedQuery ?? source.keywords[0]?.keyword ?? "";
    const url = getSearchUrl(source, query);
    siftActions.openSearch(url, plan.stepId, source.id, query);
  };

  const handleBatchOpen = () => {
    plan.primarySources.slice(0, 3).forEach((src) => {
      handleOpenSearch(src);
    });
  };

  const getSourceLens = (src: PlatformSource): "benchmark" | "avant_garde" | "proofing" => {
    if (src.lensRole) return src.lensRole;
    return getPlatformInspirationClues(src.platform).lensRole;
  };

  const firstSource = plan.primarySources[0];

  // Dynamic counts for each lens
  const lensCounts = {
    all: plan.primarySources.length,
    benchmark: plan.primarySources.filter((s) => getSourceLens(s) === "benchmark").length,
    avant_garde: plan.primarySources.filter((s) => getSourceLens(s) === "avant_garde").length,
    proofing: plan.primarySources.filter((s) => getSourceLens(s) === "proofing").length,
  };

  // Filtered primary sources based on active lens
  const filteredPrimarySources =
    activeLens === "all"
      ? plan.primarySources
      : plan.primarySources.filter((s) => getSourceLens(s) === activeLens);

  // If filtered lens has no primary sources, check alternative sources
  const matchingAlternativesForLens =
    activeLens === "all"
      ? []
      : filteredPrimarySources.length === 0
      ? plan.alternativeSources.filter((s) => getSourceLens(s) === activeLens)
      : [];

  return (
    <div className="w-[430px]">
      <NodeShell
        kicker={`07 · ${stepTitle}`}
        title="推荐搜索方案"
        className="w-[430px]"
        badge={
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono font-medium text-amber-700"
            title={
              plan.systemOne?.engine === "jev-cloud"
                ? "由 TypeSafe Jev Cloud 毫秒级决策引擎裁决"
                : "由 SIFT System 1 (Jev Native) 极速引擎毫秒级裁决"
            }
          >
            <Zap className="h-2.5 w-2.5 text-amber-600" />
            <span>
              {plan.systemOne?.engine === "jev-cloud" ? "Jev Cloud" : "System 1"} ·{" "}
              {plan.systemOne?.latencyMs ?? 18}ms
            </span>
          </span>
        }
        selected={selected}
      >
        <div className="space-y-3 text-xs">
          {/* 1. Quick Launch Top Pick */}
          {firstSource && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50/80 border border-amber-200/90 p-2.5 shadow-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-accent flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-accent" />
                    首选直达
                  </span>
                  {(() => {
                    const lens = getSourceLens(firstSource);
                    const meta = LENS_CONFIG[lens];
                    return (
                      <span
                        className={`text-[8.5px] px-1.5 py-0.1 rounded border font-medium ${meta.color}`}
                        title={meta.desc}
                      >
                        {meta.badge}
                      </span>
                    );
                  })()}
                  <span className="text-[9px] font-mono text-amber-700 bg-amber-100/70 border border-amber-200/60 rounded px-1">
                    ⚡️ Jev 检索式
                  </span>
                </div>
                <p className="truncate text-xs font-bold text-ink mt-0.5">
                  {firstSource.platform} · {firstSource.keywords[0]?.calibratedQuery || firstSource.keywords[0]?.keyword}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  title="批量打开前 3 推荐平台搜索"
                  className="btn-ghost !py-1 !px-2 text-[10px] text-stone-600 hover:text-ink hover:bg-white rounded-lg transition-colors"
                  onClick={handleBatchOpen}
                >
                  批量打开
                </button>
                <a
                  href={getSearchUrl(firstSource, firstSource.keywords[0]?.keyword)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary !py-1 !px-2.5 text-xs flex items-center gap-1 shadow-xs no-underline text-white hover:text-white"
                  onClick={() =>
                    siftActions.recordSourceAction(
                      plan.stepId,
                      firstSource.id,
                      "opened",
                      firstSource.keywords[0]?.calibratedQuery || firstSource.keywords[0]?.keyword,
                    )
                  }
                >
                  <span>检索</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* 2. Interactive 3-Lens Filter Segmented Bar */}
          <div className="flex items-center justify-between gap-1 p-1 bg-mist/60 rounded-xl border border-line/60">
            <span className="text-[10px] font-medium text-stone-500 pl-1 flex items-center gap-1 shrink-0">
              <Compass className="h-3 w-3 text-stone-400" />
              <span>灵感透镜</span>
            </span>
            <div className="flex items-center gap-0.5">
              {(["all", "benchmark", "avant_garde", "proofing"] as const).map((lensKey) => {
                const meta = LENS_CONFIG[lensKey];
                const count = lensCounts[lensKey];
                const isActive = activeLens === lensKey;
                return (
                  <button
                    key={lensKey}
                    type="button"
                    onClick={() => setActiveLens(lensKey)}
                    className={`rounded-lg px-2 py-0.5 text-[10.5px] transition-all flex items-center gap-1 ${
                      isActive
                        ? "bg-white text-ink font-bold shadow-xs border border-line"
                        : "text-stone-500 hover:text-ink hover:bg-white/50"
                    }`}
                    title={meta.desc}
                  >
                    {meta.icon && <span className="text-[10px]">{meta.icon}</span>}
                    <span>{lensKey === "all" ? "全部" : meta.label}</span>
                    <span
                      className={`text-[9px] font-mono ${
                        isActive ? "text-accent font-bold" : "opacity-60"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Primary Sources List */}
          <div className="space-y-2.5">
            {filteredPrimarySources.map((source, idx) => {
              const key = `${plan.stepId}_${source.id}`;
              const interaction = sourceInteractions[key] ?? {};
              const isSkipped = interaction.skipped;
              const lensRole = getSourceLens(source);
              const lensMeta = LENS_CONFIG[lensRole];
              const clues =
                source.inspirationClues || getPlatformInspirationClues(source.platform);
              const cleanUrl = getCleanSearchUrl(source);

              return (
                <div
                  key={source.id}
                  className={`rounded-xl border p-3 transition-all ${
                    isSkipped
                      ? "border-line/40 bg-mist/30 opacity-40"
                      : "border-line/80 bg-white/95 shadow-xs"
                  }`}
                >
                  {/* Source Header */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-mist text-[10px] font-bold text-ink">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-ink text-xs">
                        {source.platform}
                      </span>
                      {/* Lens Role Badge */}
                      <span
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[8.5px] font-medium border ${lensMeta.color}`}
                        title={`灵感透镜定位：${lensMeta.badge} · ${lensMeta.desc}`}
                      >
                        {lensMeta.badge}
                      </span>
                      <span className="rounded bg-mist/90 px-1.5 py-0.2 text-[8.5px] text-stone-600 font-medium">
                        {source.roleTag}
                      </span>
                      {(() => {
                        const matchPct =
                          plan.systemOne?.matchPercentages?.[source.id] ??
                          (idx === 0 ? 98 : idx === 1 ? 94 : 90);
                        const hitRate = source.keywords[0]?.hitRateConfidence ?? matchPct;
                        return (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[8.5px] font-mono font-medium text-amber-700"
                            title={`⚡️ Jev 检索命中率：${hitRate}% | 意图相关度：${matchPct}%`}
                          >
                            <Zap className="h-2 w-2 text-amber-600" />
                            <span>Jev {hitRate}%</span>
                          </span>
                        );
                      })()}
                      {interaction.opened && (
                        <span className="rounded bg-emerald-50 text-emerald-700 px-1 py-0.2 text-[8px] font-medium">
                          已打开
                        </span>
                      )}
                    </div>

                    {/* Actions: Skip / Replace / Open */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        title={isSkipped ? "恢复" : "跳过"}
                        className="rounded p-1 text-muted hover:bg-mist hover:text-ink transition-colors"
                        onClick={() =>
                          siftActions.skipSource(plan.stepId, source.id)
                        }
                      >
                        <EyeOff className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="替换平台"
                        className="rounded p-1 text-muted hover:bg-mist hover:text-ink transition-colors"
                        onClick={() =>
                          setReplacingSourceId(
                            replacingSourceId === source.id ? null : source.id,
                          )
                        }
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                      <a
                        href={getSearchUrl(source)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`在 ${source.platform} 打开检索`}
                        className="rounded p-1 text-accent hover:bg-accent/10 transition-colors inline-flex items-center"
                        onClick={() =>
                          siftActions.recordSourceAction(
                            plan.stepId,
                            source.id,
                            "opened",
                            source.keywords[0]?.calibratedQuery || source.keywords[0]?.keyword,
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
                              {alt.platform} · {alt.roleTag}
                            </span>
                            <span className="text-[10px] text-muted truncate max-w-[120px]">
                              {alt.reason}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 1-Line Reason */}
                  <p className="mt-1.5 text-[11px] text-muted leading-tight">
                    {source.reason}
                  </p>

                  {/* Director-Level Inspection Clues Box (👀 进站看 / 🚫 警惕避) */}
                  {!isSkipped && (
                    <div className="mt-2 rounded-lg bg-stone-50/90 border border-stone-200/80 p-2 text-[11px] space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <span className="shrink-0 text-emerald-700 font-bold text-[9.5px] bg-emerald-100/70 border border-emerald-300/60 rounded px-1 py-0.2">
                          👀 进站看
                        </span>
                        <span className="text-ink leading-relaxed font-medium">
                          {clues.lookFor}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="shrink-0 text-rose-700 font-bold text-[9.5px] bg-rose-100/70 border border-rose-300/60 rounded px-1 py-0.2">
                          🚫 警惕避
                        </span>
                        <span className="text-stone-500 leading-relaxed">
                          {clues.avoid}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Keywords with 4D Dimensions as Clean Interactive Pills */}
                  {!isSkipped && (
                    <div className="mt-2 pt-2 border-t border-line/40 space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {source.keywords.map((k, ki) => {
                          const dimKey =
                            k.dimension || inferKeywordDimension(k.keyword, k.meaning);
                          const dimMeta = DIMENSION_CONFIG[dimKey];
                          const isCopied =
                            copiedKw === k.keyword || copiedKw === k.calibratedQuery;
                          const effectiveCopyKw = k.calibratedQuery || k.keyword;

                          return (
                            <div
                              key={ki}
                              className="group inline-flex items-center gap-1 rounded-lg border border-line/70 bg-mist/40 px-2 py-0.5 text-[11px] transition-all hover:bg-white hover:border-ink/60 shadow-2xs"
                              title={`${dimMeta.label}：${k.meaning || dimMeta.desc}`}
                            >
                              <span
                                className="text-[9px] select-none opacity-80"
                                title={dimMeta.label}
                              >
                                {dimMeta.icon}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(source.id, effectiveCopyKw)}
                                className="font-medium text-ink hover:text-accent flex items-center gap-1"
                                title={`点击复制检索词：${effectiveCopyKw}`}
                              >
                                <span>{k.keyword}</span>
                                {isCopied ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 opacity-30 group-hover:opacity-100" />
                                )}
                              </button>
                              {k.calibratedQuery && k.calibratedQuery !== k.keyword && (
                                <span
                                  className="text-[9px] font-mono text-amber-800 bg-amber-100/70 rounded px-1 py-0.1 border border-amber-200/50"
                                  title={`⚡️ Jev 垂直索引校准为：[${k.calibratedQuery}]`}
                                >
                                  {k.calibratedQuery}
                                </span>
                              )}
                              <a
                                href={getSearchUrl(source, k.keyword)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  siftActions.recordSourceAction(
                                    plan.stepId,
                                    source.id,
                                    "opened",
                                    k.calibratedQuery || k.keyword,
                                  )
                                }
                                className="text-muted hover:text-accent p-0.5 inline-flex items-center cursor-pointer"
                                title={`直接在 ${source.platform} 检索 “${k.calibratedQuery || k.keyword}”`}
                              >
                                <Search className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>

                      {/* Jev Judgement Log */}
                      {source.keywords[0]?.jevJudgement && (
                        <div
                          className="flex items-center gap-1 text-[9.5px] text-stone-500 bg-amber-500/5 border border-amber-500/15 rounded-md px-1.5 py-0.5 font-mono"
                          title={source.keywords[0].jevJudgement}
                        >
                          <Zap className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                          <span className="truncate">{source.keywords[0].jevJudgement}</span>
                        </div>
                      )}

                      {/* Advanced Syntax & Clean Search Shortcut */}
                      {source.keywords[0]?.advancedQuery && (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                source.id,
                                source.keywords[0].advancedQuery!,
                              )
                            }
                            className="text-[10px] text-stone-500 hover:text-ink font-mono flex items-center gap-1 truncate"
                            title="复制去样机高级语法"
                          >
                            <Terminal className="h-2.5 w-2.5 text-stone-400 shrink-0" />
                            <span className="truncate">去样机: {source.keywords[0].advancedQuery}</span>
                            {copiedKw === source.keywords[0].advancedQuery ? (
                              <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="h-2.5 w-2.5 opacity-40 shrink-0" />
                            )}
                          </button>

                          {cleanUrl && (
                            <a
                              href={cleanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex items-center gap-1 rounded bg-stone-100 hover:bg-stone-200/80 px-1.5 py-0.5 text-[9.5px] font-medium text-stone-700 transition-colors"
                              title="直接在新窗口打开去样机纯净检索"
                              onClick={() =>
                                siftActions.recordSourceAction(
                                  plan.stepId,
                                  source.id,
                                  "opened",
                                  source.keywords[0].advancedQuery,
                                )
                              }
                            >
                              <Sparkles className="h-2.5 w-2.5 text-accent" />
                              <span>纯净搜</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* If current lens has 0 primary sources, show matching alternative sources */}
            {filteredPrimarySources.length === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-mist/20 p-3 text-center text-xs text-muted">
                <p>当前首选推荐中暂无该视角平台</p>
                {matchingAlternativesForLens.length > 0 && (
                  <div className="mt-2 text-left space-y-1.5">
                    <p className="text-[11px] font-medium text-ink">
                      为您在备选平台中定位到以下符合【{LENS_CONFIG[activeLens].label}】的来源：
                    </p>
                    {matchingAlternativesForLens.map((alt) => (
                      <div
                        key={alt.id}
                        className="flex items-center justify-between rounded-lg bg-white p-2 border border-line/70"
                      >
                        <div>
                          <span className="font-semibold text-ink">{alt.platform}</span>
                          <span className="text-[10px] text-muted ml-1.5">{alt.roleTag}</span>
                        </div>
                        <a
                          href={getSearchUrl(alt)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent text-[11px] hover:underline flex items-center gap-0.5"
                        >
                          <span>前往检索</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Alternative Sources Section */}
          {plan.alternativeSources.length > 0 && (
            <div className="pt-1 text-[11px]">
              <button
                type="button"
                className="w-full flex items-center justify-between text-muted hover:text-ink py-1 font-medium"
                onClick={() => setShowAlternatives(!showAlternatives)}
              >
                <span>备选平台 ({plan.alternativeSources.length})</span>
                <span>{showAlternatives ? "▲" : "▼"}</span>
              </button>

              {showAlternatives && (
                <div className="mt-1 space-y-1">
                  {plan.alternativeSources.map((alt, altIdx) => {
                    const altMatch =
                      plan.systemOne?.matchPercentages?.[alt.id] ??
                      Math.max(76, 85 - altIdx * 3);
                    const altLens = getSourceLens(alt);
                    const altLensMeta = LENS_CONFIG[altLens];

                    return (
                      <div
                        key={alt.id}
                        className="rounded-lg border border-line/50 bg-cream/40 px-2.5 py-1.5 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-ink truncate">
                            {alt.platform} · {alt.roleTag}
                          </span>
                          <span
                            className={`text-[8px] px-1 py-0.1 rounded border ${altLensMeta.color}`}
                          >
                            {altLensMeta.badge}
                          </span>
                          <span className="text-[8.5px] font-mono text-stone-500 bg-stone-100/90 px-1 py-0.2 rounded border border-stone-200/60 shrink-0">
                            {altMatch}% 匹配
                          </span>
                        </div>
                        <a
                          href={getSearchUrl(alt)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-accent hover:underline cursor-pointer flex items-center gap-0.5 ml-1 shrink-0"
                          onClick={() =>
                            siftActions.recordSourceAction(
                              plan.stepId,
                              alt.id,
                              "opened",
                              alt.keywords[0]?.keyword,
                            )
                          }
                        >
                          <span>直达</span>
                          <ExternalLink className="h-2.5 w-2.5" />
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
