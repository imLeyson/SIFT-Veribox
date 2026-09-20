"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import type { PlatformPlan, PlatformSource } from "@/types/routes";
import { buildPlatformSearchUrl } from "@/lib/agent/platform-registry";
import {
  ExternalLink,
  Copy,
  Check,
  EyeOff,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";

export type PlatformPlanNodeData = {
  plan: PlatformPlan;
};

function getSearchUrl(source: PlatformSource, kw?: string): string {
  const query = kw || source.keywords[0]?.keyword || "";
  if (!query) return source.searchUrl;
  return buildPlatformSearchUrl(source.platform, query);
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
    const query = kw ?? source.keywords[0]?.keyword ?? "";
    const url = getSearchUrl(source, query);
    siftActions.openSearch(url, plan.stepId, source.id, query);
  };

  const handleBatchOpen = () => {
    plan.primarySources.slice(0, 3).forEach((src) => {
      handleOpenSearch(src);
    });
  };

  const firstSource = plan.primarySources[0];

  return (
    <div className="w-[410px]">
      <NodeShell
        kicker={`07 · ${stepTitle}`}
        title="推荐搜索方案"
        selected={selected}
      >
        <div className="space-y-3 text-xs">
          {/* Quick Launch Top Pick */}
          {firstSource && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50/80 border border-amber-200/90 p-2.5 shadow-xs">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-accent flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-accent" />
                  首选直达
                </span>
                <p className="truncate text-xs font-bold text-ink mt-0.5">
                  {firstSource.platform} · {firstSource.keywords[0]?.keyword}
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
                      firstSource.keywords[0]?.keyword,
                    )
                  }
                >
                  <span>搜索</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Primary Sources List */}
          <div className="space-y-2.5">
            {plan.primarySources.map((source, idx) => {
              const key = `${plan.stepId}_${source.id}`;
              const interaction = sourceInteractions[key] ?? {};
              const isSkipped = interaction.skipped;

              return (
                <div
                  key={source.id}
                  className={`rounded-xl border p-3 transition-all ${
                    isSkipped
                      ? "border-line/40 bg-mist/30 opacity-40"
                      : "border-line/80 bg-white/90 shadow-xs"
                  }`}
                >
                  {/* Source Header */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-mist text-[10px] font-bold text-ink">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-ink text-xs">
                        {source.platform}
                      </span>
                      <span className="rounded bg-mist px-1.5 py-0.2 text-[9px] font-medium text-stone-600">
                        {source.roleTag}
                      </span>
                      {interaction.opened && (
                        <span className="rounded bg-emerald-50 text-emerald-700 px-1 py-0.2 text-[8px] font-medium">
                          已打开
                        </span>
                      )}
                    </div>

                    {/* Actions: Skip / Replace / Open */}
                    <div className="flex items-center gap-0.5">
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
                        title={`在 ${source.platform} 打开搜索`}
                        className="rounded p-1 text-accent hover:bg-accent/10 transition-colors inline-flex items-center"
                        onClick={() =>
                          siftActions.recordSourceAction(
                            plan.stepId,
                            source.id,
                            "opened",
                            source.keywords[0]?.keyword,
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
                  <p className="mt-1 text-[11px] text-muted leading-tight">
                    {source.reason}
                  </p>

                  {/* Keywords as Clean Interactive Pills */}
                  {!isSkipped && (
                    <div className="mt-2 pt-2 border-t border-line/40 space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {source.keywords.map((k, ki) => {
                          const isCopied = copiedKw === k.keyword;
                          return (
                            <div
                              key={ki}
                              className="group inline-flex items-center gap-1 rounded-lg border border-line/70 bg-mist/40 px-2 py-0.5 text-[11px] transition-all hover:bg-white hover:border-ink/60"
                            >
                              <button
                                type="button"
                                onClick={() => handleCopy(source.id, k.keyword)}
                                className="font-medium text-ink hover:text-accent flex items-center gap-1"
                                title="点击复制关键词"
                              >
                                <span>{k.keyword}</span>
                                {isCopied ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 opacity-30 group-hover:opacity-100" />
                                )}
                              </button>
                              <a
                                href={getSearchUrl(source, k.keyword)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  siftActions.recordSourceAction(
                                    plan.stepId,
                                    source.id,
                                    "opened",
                                    k.keyword,
                                  )
                                }
                                className="text-muted hover:text-accent p-0.5 inline-flex items-center cursor-pointer"
                                title={`直接在 ${source.platform} 搜索 “${k.keyword}”`}
                              >
                                <Search className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>

                      {/* Advanced Syntax copy shortcut */}
                      {source.keywords[0]?.advancedQuery && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              source.id,
                              source.keywords[0].advancedQuery!,
                            )
                          }
                          className="text-[10px] text-stone-500 hover:text-ink font-mono mt-1 flex items-center gap-1"
                          title="复制去样机高级语法"
                        >
                          <Terminal className="h-2.5 w-2.5 text-stone-400" />
                          <span>去样机: {source.keywords[0].advancedQuery}</span>
                          {copiedKw === source.keywords[0].advancedQuery ? (
                            <Check className="h-2.5 w-2.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 opacity-40" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Alternative Sources Section */}
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
                  {plan.alternativeSources.map((alt) => (
                    <div
                      key={alt.id}
                      className="rounded-lg border border-line/50 bg-cream/40 px-2 py-1 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-medium text-ink">
                        {alt.platform} · {alt.roleTag}
                      </span>
                      <a
                        href={getSearchUrl(alt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-accent hover:underline cursor-pointer"
                        onClick={() =>
                          siftActions.recordSourceAction(
                            plan.stepId,
                            alt.id,
                            "opened",
                            alt.keywords[0]?.keyword,
                          )
                        }
                      >
                        直达搜索
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  );
}
