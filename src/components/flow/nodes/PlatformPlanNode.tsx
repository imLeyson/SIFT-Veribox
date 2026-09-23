"use client";

import { useState, useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore, getUpstreamSummary } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import type { PlatformPlan, PlatformSource } from "@/types/routes";
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

export type PlatformPlanNodeData = {
  plan: PlatformPlan;
};

function getSearchUrl(source: PlatformSource, kwOrRaw?: string): string {
  if (!kwOrRaw) {
    const first = source.keywords[0];
    const target =
      first?.advancedQuery || first?.calibratedQuery || first?.keyword || "";
    return target ? buildPlatformSearchUrl(source.platform, target) : source.searchUrl;
  }
  const matched = source.keywords.find(
    (k) =>
      k.keyword === kwOrRaw ||
      k.calibratedQuery === kwOrRaw ||
      k.advancedQuery === kwOrRaw,
  );
  const target =
    matched?.advancedQuery || matched?.calibratedQuery || kwOrRaw;
  return buildPlatformSearchUrl(source.platform, target);
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
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const sourceInteractions = useSiftStore((s) => s.sourceInteractions);
  const rawBrief = useSiftStore((s) => s.rawBrief);
  const state = useSiftStore((s) => s.state);

  const [replacingSourceId, setReplacingSourceId] = useState<string | null>(null);
  const [copiedKw, setCopiedKw] = useState<string | null>(null);
  const [copiedAllKw, setCopiedAllKw] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showSearchTrace, setShowSearchTrace] = useState(false);

  const handleCopyAllKeywords = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentPlan = data?.plan ?? DEFAULT_FALLBACK_PLAN;
    const lines = currentPlan.primarySources
      .filter((s) => !sourceInteractions[`${currentPlan.stepId}_${s.id}`]?.skipped)
      .map((s) => {
        const topKw = s.keywords[0]?.calibratedQuery || s.keywords[0]?.keyword || "";
        return `[${s.platform}] ${topKw}`;
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(lines);
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
          stage="05"
          kicker="05 灵感检索 · 空白方案待推导"
          title={hasUpstream ? `已连接 ${upstream.count} 个上游，等待生成` : "等待连线导入视点试验"}
          badge={
            <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
              空白卡片
            </span>
          }
          selected={selected}
          collapsedContent={
            <div className="text-xs text-stone-500 py-1 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-amber-500" />
              <span>{hasUpstream ? `已连 ${upstream.count} 个上游，点击展开生成` : "未关联视点，从「04 视点推进」引线连接"}</span>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            {hasUpstream ? (
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-4 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-xs">
                  <Search className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">
                    已关联 {upstream.count} 个设计上下文
                  </h4>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                    {upstream.labels.map((lbl, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200/80 shadow-2xs"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => synthesizeCard(id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-amber-200 transition-all cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 text-amber-200" />
                  <span>点击根据已连上下文生成检索方案</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-200/90 bg-amber-50/40 p-4 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100/80 text-amber-700 shadow-xs">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">
                    尚未关联视点试验
                  </h4>
                  <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed">
                    从任意「04 视点推进」或「03 风格主题」拖动引线至此卡片，然后点击下方按钮生成
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-100 text-stone-400 text-xs font-medium cursor-not-allowed border border-stone-200/60"
                >
                  等待连线导入视点或主题
                </button>
              </div>
            )}

            <div className="rounded-xl bg-stone-50/80 border border-line/60 p-3 space-y-1.5 text-[11px] text-stone-600">
              <div className="font-semibold text-stone-700 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-amber-600" />
                <span>支持的引线连接与生成模式：</span>
              </div>
              <p className="leading-relaxed pl-1 text-stone-600">
                针对当前视点试验的问题与验收准则，自动剔除水词噪点，生成中英双语检索词库与全球渠道规划（Dezeen / Behance / Pinterest / Cosmobullet）。
              </p>
            </div>
          </div>
        </NodeShell>
      </div>
    );
  }

  const plan = data?.plan ?? DEFAULT_FALLBACK_PLAN;

  const route = routes.find((r) => r.id === plan.routeId || r.id === selectedRouteId);
  const step = route?.steps.find((st) => st.id === plan.stepId);
  const stepTitle = step ? step.title : "探索搜索方案";
  const briefAnchor = getBriefAnchor(rawBrief, state?.brief.goal);
  const convergenceAnchor = getConvergenceAnchor(state);

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
        stage="05"
        kicker={`05 灵感检索 · ${stepTitle}`}
        title="跨平台灵感检索"
        onRegenerate={upstream.count > 0 ? () => synthesizeCard(id) : undefined}
        badge={
          <span className="text-[10px] font-mono text-stone-400">
            {plan.primarySources.length} 处检索渠道
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
                {plan.primarySources.length} 个渠道
              </span>
            </div>
            <div className="space-y-1">
              {plan.primarySources.slice(0, 3).map((source) => {
                const topKw = source.keywords[0]?.calibratedQuery || source.keywords[0]?.keyword || "";
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
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900">
              <div className="flex items-center gap-1.5 font-medium truncate min-w-0 pr-2">
                <Search className="h-3 w-3 text-amber-700 shrink-0" />
                <span className="truncate">已连 {upstream.count} 个上游：{upstream.labels.join(" + ")}</span>
              </div>
              <button
                type="button"
                onClick={() => synthesizeCard(id)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                title="根据当前连线上游重新生成检索方案"
              >
                <RefreshCw className="h-3 w-3" />
                <span>重新生成</span>
              </button>
            </div>
          )}
          {/* Focused Visual Inspiration Objective with Foldable Trace */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-amber-950">
              <span className="flex items-center gap-1">
                <Search className="h-3 w-3 text-amber-700" />
                检索目标 · {route?.themeName || route?.title || "风格主题"}
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
              围绕「{toInspirationCopy(step?.question || stepTitle)}」收集高质量视觉证据，只做灵感对照。
            </p>
            {showSearchTrace && (
              <div className="grid gap-1 text-[10px] leading-relaxed text-amber-950/75 pt-1.5 border-t border-amber-200/60 animate-in fade-in duration-150">
                <p><span className="font-semibold text-amber-950">Brief：</span>{briefAnchor}</p>
                <p><span className="font-semibold text-amber-950">收敛线索：</span>{convergenceAnchor}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-muted text-[11px] pb-0.5">
            <span>精选 3 处灵感渠道</span>
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
                  <span>复制全部检索词</span>
                </>
              )}
            </button>
          </div>

          {/* Primary Sources List */}
          <div className="space-y-2.5">
            {plan.primarySources.map((source, idx) => {
              const key = `${plan.stepId}_${source.id}`;
              const interaction = sourceInteractions[key] ?? {};
              const isSkipped = interaction.skipped;
              const clues =
                source.inspirationClues || getPlatformInspirationClues(source.platform);
              const sourceReason = toInspirationCopy(source.reason);
              const roleTag = toInspirationCopy(source.roleTag);

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
                        href={getSearchUrl(source)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`在 ${source.platform} 检索`}
                        className="rounded p-1 text-stone-500 hover:text-accent transition-colors inline-flex items-center"
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

                  {/* Compact Keyword Tags */}
                  {!isSkipped && (
                    <div className="mt-2 pt-2 border-t border-line/40 flex flex-wrap items-center gap-1.5">
                      {source.keywords.map((k, ki) => {
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

                        return (
                          <div
                            key={ki}
                            className="group inline-flex items-center gap-1 rounded-md border border-line/80 bg-stone-50/60 hover:bg-white hover:border-ink/50 px-2 py-0.5 text-[11px] text-ink transition-all"
                            title={toInspirationCopy(k.meaning || displayKw)}
                          >
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
                              <span>{displayKw}</span>
                              {isCopied ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium font-sans">
                                  <Check className="h-2.5 w-2.5" />
                                  <span>已复制</span>
                                </span>
                              ) : (
                                <Copy className="h-2.5 w-2.5 opacity-30 group-hover:opacity-80" />
                              )}
                            </button>
                            <a
                              href={getSearchUrl(source, displayKw)}
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
