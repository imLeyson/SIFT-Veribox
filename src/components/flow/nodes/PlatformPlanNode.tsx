"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import type { PlatformPlan, PlatformSource } from "@/types/routes";
import { buildPlatformSearchUrl } from "@/lib/agent/platform-registry";
import { getPlatformInspirationClues } from "@/lib/agent/system-one";
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

function sanitizeKeyword(raw: string, calibrated?: string): string {
  if (calibrated && (calibrated.length < raw.length || raw.split(/\s+/).length > 3)) {
    return calibrated;
  }
  if (raw.split(/\s+/).length > 3 || raw.length > 25) {
    return raw.split(/\s+/).slice(0, 3).join(" ");
  }
  return raw;
}

export function PlatformPlanNode({
  data,
  selected,
}: NodeProps<Node<PlatformPlanNodeData>>) {
  const { plan } = data;
  const routes = useSiftStore((s) => s.routes);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const sourceInteractions = useSiftStore((s) => s.sourceInteractions);

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
    const first = source.keywords[0];
    const query = kw ?? first?.calibratedQuery ?? first?.keyword ?? "";
    const url = getSearchUrl(source, query);
    siftActions.openSearch(url, plan.stepId, source.id, query);
  };

  const handleBatchOpen = () => {
    plan.primarySources.slice(0, 3).forEach((src) => {
      handleOpenSearch(src);
    });
  };

  return (
    <div className="w-[390px]">
      <NodeShell
        stage="07"
        kicker={`灵感方案 · ${stepTitle}`}
        title="推荐搜索方案"
        badge={
          <span className="text-[10px] font-mono text-stone-400">
            System 1 · {plan.systemOne?.latencyMs ?? 18}ms
          </span>
        }
        selected={selected}
      >
        <div className="space-y-3 text-xs">
          {/* Subtle utility bar */}
          <div className="flex items-center justify-between text-muted text-[11px] pb-0.5">
            <span>精选 3 处搜索源</span>
            <button
              type="button"
              onClick={handleBatchOpen}
              className="text-ink hover:text-accent font-medium flex items-center gap-1 transition-colors"
              title="同时在新标签页打开前 3 个平台的精准搜索"
            >
              <span>一键全开</span>
              <ExternalLink className="h-2.5 w-2.5" />
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
              const cleanUrl = getCleanSearchUrl(source);
              const matchPct =
                plan.systemOne?.matchPercentages?.[source.id] ??
                (idx === 0 ? 98 : idx === 1 ? 94 : 90);

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
                      <span className="font-bold text-xs text-ink truncate">
                        {source.platform}
                      </span>
                      <span className="text-[11px] text-muted truncate">
                        {source.roleTag}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="text-[9.5px] font-mono text-stone-400"
                        title={`匹配度：${matchPct}%`}
                      >
                        {matchPct}%
                      </span>
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

                  {/* 1-Line Clean Reason */}
                  <p className="mt-1 text-[11px] text-muted leading-relaxed">
                    {source.reason}
                  </p>

                  {/* Editorial Inspection Clues */}
                  {!isSkipped && clues && (
                    <div className="mt-2 border-l border-line/90 pl-2 text-[11px] text-stone-500 space-y-0.5">
                      <p className="leading-snug">
                        <span className="font-medium text-ink">看点：</span>
                        {clues.lookFor}
                      </p>
                      {clues.avoid && (
                        <p className="leading-snug text-stone-400">
                          <span>避开：</span>
                          {clues.avoid}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Compact Keyword Tags */}
                  {!isSkipped && (
                    <div className="mt-2 pt-2 border-t border-line/40 flex flex-wrap items-center gap-1.5">
                      {source.keywords.map((k, ki) => {
                        const displayKw = sanitizeKeyword(k.keyword, k.calibratedQuery);
                        const effectiveCopyKw = k.calibratedQuery || displayKw;
                        const isCopied =
                          copiedKw === displayKw || copiedKw === effectiveCopyKw;

                        return (
                          <div
                            key={ki}
                            className="group inline-flex items-center gap-1 rounded-md border border-line/80 bg-stone-50/60 hover:bg-white hover:border-ink/50 px-2 py-0.5 text-[11px] text-ink transition-all"
                            title={k.meaning || displayKw}
                          >
                            <button
                              type="button"
                              onClick={() => handleCopy(source.id, effectiveCopyKw)}
                              className="font-medium hover:text-accent flex items-center gap-1"
                              title={`点击复制：${effectiveCopyKw}`}
                            >
                              <span>{displayKw}</span>
                              {isCopied ? (
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 opacity-20 group-hover:opacity-70" />
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
                                  displayKw,
                                )
                              }
                              className="text-stone-300 hover:text-ink p-0.5 inline-flex items-center cursor-pointer"
                              title={`在 ${source.platform} 检索 “${displayKw}”`}
                            >
                              <Search className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        );
                      })}

                      {/* Anti-Mockup clean search link */}
                      {cleanUrl && (
                        <a
                          href={cleanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-stone-400 hover:text-ink font-mono underline ml-0.5"
                          title="在新标签页打开去样机纯净搜索"
                          onClick={() =>
                            siftActions.recordSourceAction(
                              plan.stepId,
                              source.id,
                              "opened",
                              source.keywords[0]?.advancedQuery,
                            )
                          }
                        >
                          去样机 ↗
                        </a>
                      )}
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
                          <span className="font-medium text-ink truncate">
                            {alt.platform} · {alt.roleTag}
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
