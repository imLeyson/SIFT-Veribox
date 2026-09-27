"use client";

import { useState, useMemo } from "react";
import { useSiftStore } from "@/lib/convergence-store";
import { generateDossierMarkdown } from "@/lib/export-dossier";
import { copyToClipboard } from "@/lib/clipboard";
import {
  X,
  Copy,
  Check,
  Download,
  FileText,
  Sparkles,
  CheckCircle2,
  StickyNote,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Star,
  Zap,
  Archive,
  Layers,
} from "lucide-react";

export function DossierModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const store = useSiftStore();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

  const markdown = useMemo(() => generateDossierMarkdown(store), [store]);

  const selectedRoute = store.routes.find((r) => r.id === store.selectedRouteId);
  const totalCrit =
    selectedRoute?.steps.reduce(
      (sum, st) => sum + (st.acceptanceCriteria?.length ?? 0),
      0,
    ) ?? 0;
  const completedCritCount = Object.values(store.completedCriteria).reduce(
    (sum, list) => sum + list.length,
    0,
  );
  const totalNotesCount = Object.values(store.stepNotes).reduce(
    (sum, list) => sum + list.length,
    0,
  );
  const totalKeywordsCount = store.platformPlans.reduce(
    (sum, p) =>
      sum +
      p.primarySources.reduce((sSum, src) => sSum + src.keywords.length, 0),
    0,
  );

  const now = useMemo(() => {
    return new Date().toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);

  // Categorize tagged items for Section 03
  const taggedItems = useMemo(() => {
    const cardTags = store.cardTags ?? {};
    const customCards = store.customCards ?? [];
    const routes = store.routes ?? [];

    const result: Record<"primary" | "review" | "serendipity" | "stashed", Array<{
      id: string;
      title: string;
      typeLabel: string;
      detail?: string;
    }>> = {
      primary: [],
      review: [],
      serendipity: [],
      stashed: [],
    };

    for (const [id, tag] of Object.entries(cardTags)) {
      if (!tag || !(tag in result)) continue;
      const custom = customCards.find((c) => c.id === id);
      if (custom) {
        let typeLabel = "自定义卡片";
        let detail = custom.content?.slice(0, 100);
        if (custom.type === "imageGen") {
          typeLabel = "概念出图";
          detail = custom.data?.prompt;
        } else if (custom.type === "platformPlan") {
          typeLabel = "灵感检索";
          detail = custom.title || "去噪检索语法";
        } else if (custom.type === "note") {
          typeLabel = "设计便签";
          detail = custom.content;
        }
        result[tag as keyof typeof result].push({
          id,
          title: custom.title || "未命名卡片",
          typeLabel,
          detail,
        });
      } else if (id.startsWith("route-")) {
        const r = routes.find((rt) => rt.id === id || `route-${rt.id}` === id);
        result[tag as keyof typeof result].push({
          id,
          title: r ? (r.themeName || r.title) : id,
          typeLabel: "风格主题",
          detail: r?.visualSnapshot || r?.pros,
        });
      } else {
        result[tag as keyof typeof result].push({
          id,
          title: id,
          typeLabel: "画布节点",
        });
      }
    }
    return result;
  }, [store.cardTags, store.customCards, store.routes]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownload = () => {
    const filename = `SIFT-探索提案-${store.state?.brief.goal?.slice(0, 10) || "探索简报"}.md`;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const state = store.state;
  const goalTitle = state?.brief.goal || "视觉策略探索提案";
  const hasTaggedCards =
    taggedItems.primary.length > 0 ||
    taggedItems.review.length > 0 ||
    taggedItems.serendipity.length > 0 ||
    taggedItems.stashed.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-modal-title"
        className="relative flex h-[88vh] max-h-[850px] w-full max-w-4xl flex-col rounded-2xl border border-line/80 bg-cream/95 shadow-2xl backdrop-blur-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/60 bg-white/70 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="dossier-modal-title"
                className="text-base font-bold tracking-tight text-ink"
              >
                视觉策略与方向收敛提案简报
              </h2>
              <p className="text-xs text-muted">
                可直接复制至 Notion / 飞书文档，作为前期视觉方向对齐与精准检索的提案依据
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-lg p-1.5 text-muted hover:bg-stone-200/50 hover:text-ink transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-line/40 bg-mist/40 px-6 py-3 text-xs">
          <div className="rounded-lg bg-white/60 p-2 border border-line/40">
            <span className="text-[10px] text-muted block flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" /> 选定设计主题
            </span>
            <span className="font-semibold text-ink truncate block mt-0.5">
              {selectedRoute?.themeName || selectedRoute?.title || "未选定主题"}
            </span>
          </div>

          <div className="rounded-lg bg-white/60 p-2 border border-line/40">
            <span className="text-[10px] text-muted block flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 视点验证关注
            </span>
            <span className="font-semibold text-ink block mt-0.5">
              {completedCritCount} / {totalCrit} 项已确认
            </span>
          </div>

          <div className="rounded-lg bg-white/60 p-2 border border-line/40">
            <span className="text-[10px] text-muted block flex items-center gap-1">
              <StickyNote className="h-3 w-3 text-amber-600" /> 沉淀探索手记
            </span>
            <span className="font-semibold text-ink block mt-0.5">
              {totalNotesCount} 条记录与灵感
            </span>
          </div>

          <div className="rounded-lg bg-white/60 p-2 border border-line/40">
            <span className="text-[10px] text-muted block flex items-center gap-1">
              <Search className="h-3 w-3 text-blue-600" /> 搜索关键词资产
            </span>
            <span className="font-semibold text-ink block mt-0.5">
              {totalKeywordsCount} 组跨平台精选词
            </span>
          </div>
        </div>

        {/* View Switcher & Action Bar */}
        <div className="flex items-center justify-between border-b border-line/40 bg-white/40 px-6 py-2">
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              className={`rounded-lg px-3 py-1 font-medium transition-colors cursor-pointer ${
                viewMode === "preview"
                  ? "bg-ink text-white"
                  : "text-muted hover:text-ink"
              }`}
              onClick={() => setViewMode("preview")}
            >
              排版展示
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1 font-medium transition-colors cursor-pointer ${
                viewMode === "code"
                  ? "bg-ink text-white"
                  : "text-muted hover:text-ink"
              }`}
              onClick={() => setViewMode("code")}
            >
              Markdown 纯源码
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                copied ? "!bg-emerald-700 !text-white" : ""
              }`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>已复制到剪贴板！</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>一键复制 Markdown</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              <span>下载 .md</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-ink leading-relaxed font-sans">
          {viewMode === "preview" ? (
            <div className="max-w-3xl mx-auto space-y-6 pb-6">
              {/* Document Header */}
              <div className="bg-white/80 rounded-2xl p-6 border border-line/60 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <span className="font-mono text-[11px] font-semibold text-stone-500 tracking-wider">
                    SIFT · 视觉策略与方向收敛提案
                  </span>
                  <span className="text-[11px] text-stone-400 font-mono">
                    {now}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                    {goalTitle}
                  </h1>
                  {state?.direction.intent?.text && (
                    <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed border-l-2 border-stone-400 pl-3 italic">
                      “{state.direction.intent.text}”
                    </p>
                  )}
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-200/60">
                    <span className="text-[10px] text-stone-400 block">目标受众</span>
                    <span className="font-medium text-stone-800 mt-0.5 block truncate">
                      {state?.brief.audience || "通用设计受众"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-200/60">
                    <span className="text-[10px] text-stone-400 block">交付形态</span>
                    <span className="font-medium text-stone-800 mt-0.5 block truncate">
                      {state?.brief.deliverable || "视觉策略与概念推导"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-200/60">
                    <span className="text-[10px] text-stone-400 block">选定主题</span>
                    <span className="font-medium text-stone-800 mt-0.5 block truncate">
                      {selectedRoute?.themeName || selectedRoute?.title || "探索对比中"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 01: Direction & Boundaries */}
              <div className="bg-white/80 rounded-2xl p-6 border border-line/60 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                  <span className="font-mono text-xs font-bold text-stone-400">01</span>
                  <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                    策略收敛与设计边界 (Strategic Convergence)
                  </h3>
                </div>

                {state?.currentHypothesis && (
                  <div className="rounded-xl bg-amber-50/50 p-3.5 border border-amber-200/60 text-xs text-amber-900">
                    <span className="font-semibold block text-[11px] uppercase tracking-wider text-amber-700 mb-1">
                      当前核心设计假设
                    </span>
                    {state.currentHypothesis}
                  </div>
                )}

                {/* Priorities & Avoidances Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Priorities */}
                  <div className="rounded-xl bg-emerald-50/40 p-3.5 border border-emerald-200/60 space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-900 text-xs">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>优先坚持项 (Priorities)</span>
                    </div>
                    {state?.direction.priorities && state.direction.priorities.length > 0 ? (
                      <ul className="space-y-1.5 text-emerald-950">
                        {state.direction.priorities.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold shrink-0">✓</span>
                            <span>{p.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-stone-400 italic">尚无明确优先准则</p>
                    )}
                  </div>

                  {/* Avoidances */}
                  <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200/70 space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-stone-900 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 text-stone-500" />
                      <span>坚决避免项 (Avoidances)</span>
                    </div>
                    {state?.direction.avoid && state.direction.avoid.length > 0 ? (
                      <ul className="space-y-1.5 text-stone-700">
                        {state.direction.avoid.map((a, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-stone-400 font-bold shrink-0">✕</span>
                            <span>{a.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-stone-400 italic">暂无硬性排除项</p>
                    )}
                  </div>
                </div>

                {/* Criteria & Constraints */}
                {state?.direction.criteria && state.direction.criteria.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                      评价与判断准则
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {state.direction.criteria.map((c, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-700"
                        >
                          {c.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 02: Chosen Design Theme */}
              {selectedRoute && (
                <div className="bg-white/80 rounded-2xl p-6 border border-line/60 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                    <span className="font-mono text-xs font-bold text-stone-400">02</span>
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      选定设计主题与视觉质感 (Chosen Theme)
                    </h3>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-stone-900">
                      {selectedRoute.themeName || selectedRoute.title}
                    </h4>
                    {selectedRoute.visualSnapshot && (
                      <div className="mt-2 rounded-xl bg-stone-50 p-3.5 border border-stone-200/60 text-xs text-stone-800 leading-relaxed italic">
                        <span className="font-semibold not-italic text-stone-500 block text-[10px] uppercase mb-1">
                          画面质感与视觉呈象
                        </span>
                        {selectedRoute.visualSnapshot}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 rounded-xl bg-stone-50/80 border border-stone-200/60">
                      <span className="text-[10px] text-stone-400 block">切入起点</span>
                      <span className="font-medium text-stone-800 mt-0.5 block">
                        {selectedRoute.startingPoint}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-50/80 border border-stone-200/60">
                      <span className="text-[10px] text-stone-400 block">核心突破问题</span>
                      <span className="font-medium text-stone-800 mt-0.5 block">
                        {selectedRoute.coreProblem}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/60">
                      <span className="text-[10px] text-emerald-700 block">视觉亮点 (Pros)</span>
                      <span className="font-medium text-emerald-950 mt-0.5 block">
                        {selectedRoute.pros}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
                      <span className="text-[10px] text-stone-500 block">防跑偏提示 (Cons)</span>
                      <span className="font-medium text-stone-800 mt-0.5 block">
                        {selectedRoute.cons}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 03: Collaborative Review & Decision Funnel */}
              <div className="bg-white/80 rounded-2xl p-6 border border-line/60 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-400">03</span>
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      团队协同决策与方案沉淀 (Collaborative Decision Funnel)
                    </h3>
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">
                    {hasTaggedCards ? "已沉淀标记方案" : "待标记"}
                  </span>
                </div>

                {!hasTaggedCards ? (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 text-xs text-stone-500 text-center space-y-1">
                    <p className="font-medium text-stone-700">画布卡片当前处于全量探索态</p>
                    <p className="text-[11px] text-stone-400">
                      在画布卡片右上角点击标记（⭐️ 喜欢收藏 / ❓ 待团队评估 / 💡 意外灵感），将自动在此归拢沉淀为汇报决策依据。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Primary Candidates */}
                    {taggedItems.primary.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                          <span>⭐️ 喜欢收藏的方向 (Favorite Directions)</span>
                          <span className="text-[10px] text-amber-700/80 font-mono">
                            ({taggedItems.primary.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {taggedItems.primary.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-amber-950 truncate">
                                  {item.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100/80 text-amber-800 shrink-0">
                                  {item.typeLabel}
                                </span>
                              </div>
                              {item.detail && (
                                <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                                  {item.detail}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Items */}
                    {taggedItems.review.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-900">
                          <span>❓ 待团队/导师重点表决 (Items for Review)</span>
                          <span className="text-[10px] text-sky-700/80 font-mono">
                            ({taggedItems.review.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {taggedItems.review.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/70 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-sky-950 truncate">
                                  {item.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-100/80 text-sky-800 shrink-0">
                                  {item.typeLabel}
                                </span>
                              </div>
                              {item.detail && (
                                <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                                  {item.detail}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Serendipity Items */}
                    {taggedItems.serendipity.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900">
                          <span>💡 突破性意外灵感 (Sparks & Serendipity)</span>
                          <span className="text-[10px] text-purple-700/80 font-mono">
                            ({taggedItems.serendipity.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {taggedItems.serendipity.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/70 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-purple-950 truncate">
                                  {item.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100/80 text-purple-800 shrink-0">
                                  {item.typeLabel}
                                </span>
                              </div>
                              {item.detail && (
                                <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                                  {item.detail}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stashed Items */}
                    {taggedItems.stashed.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                          <span>💤 备选归档 (Stashed Alternatives)</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            ({taggedItems.stashed.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {taggedItems.stashed.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs space-y-1 opacity-75"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-stone-700 truncate">
                                  {item.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200/60 text-stone-600 shrink-0">
                                  {item.typeLabel}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 04: Research Keywords Asset */}
              {store.platformPlans && store.platformPlans.length > 0 && (
                <div className="bg-white/80 rounded-2xl p-6 border border-line/60 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                    <span className="font-mono text-xs font-bold text-stone-400">04</span>
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                      跨平台精选检索词库 (Platform Research Assets)
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {store.platformPlans.map((plan, pIdx) => (
                      <div key={pIdx} className="space-y-2">
                        {plan.primarySources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/60 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                                <Search className="h-3 w-3 text-stone-500" />
                                {src.platform}
                                <span className="text-[10px] font-normal text-stone-500">
                                  · {src.roleTag}
                                </span>
                              </span>
                              {src.searchUrl && (
                                <a
                                  href={src.searchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
                                >
                                  <span>直达搜索</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-600">{src.reason}</p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {src.keywords.map((k, kIdx) => (
                                <span
                                  key={kIdx}
                                  className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-800 text-[11px] font-mono shadow-2xs"
                                  title={k.meaning}
                                >
                                  {k.keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full">
              <textarea
                readOnly
                value={markdown}
                className="h-full w-full rounded-xl border border-line bg-stone-900 p-4 font-mono text-xs text-stone-200 leading-relaxed outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-line/40 bg-white/60 px-6 py-2.5 text-right text-[11px] text-muted">
          提示：复制后在 Notion / 飞书文档使用 `Cmd+V` 粘贴，各级标题、清单、代码块将自动解析为原生排版。
        </div>
      </div>
    </div>
  );
}
