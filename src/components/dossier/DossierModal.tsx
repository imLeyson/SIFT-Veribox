"use client";

import { useState, useMemo } from "react";
import { useSiftStore } from "@/lib/convergence-store";
import { generateDossierMarkdown } from "@/lib/export-dossier";
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

  if (!isOpen) return null;

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

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      // Fallback
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
                设计探索全案与策略提案简报
              </h2>
              <p className="text-xs text-muted">
                可直接复制至 Notion / 飞书文档 / 语雀，或作为向团队与总监汇报的设计策略依据
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-lg p-1.5 text-muted hover:bg-stone-200/50 hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-line/40 bg-mist/40 px-6 py-3 text-xs">
          <div className="rounded-lg bg-white/60 p-2 border border-line/40">
            <span className="text-[10px] text-muted block flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" /> 选定探索路线
            </span>
            <span className="font-semibold text-ink truncate block mt-0.5">
              {selectedRoute?.title || "未选定路线"}
            </span>
          </div>

          <div className="rounded-lg bg-white/60 p-2 border border-line/40">
            <span className="text-[10px] text-muted block flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 阶段准则核验
            </span>
            <span className="font-semibold text-ink block mt-0.5">
              {completedCritCount} / {totalCrit} 项已通过
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
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                viewMode === "preview"
                  ? "bg-ink text-white"
                  : "text-muted hover:text-ink"
              }`}
              onClick={() => setViewMode("preview")}
            >
              排版预览
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
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
              className={`btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1.5 transition-all shadow-xs ${
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
              className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5"
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
            <div className="space-y-4 max-w-3xl mx-auto bg-white/70 rounded-xl p-6 border border-line/60 shadow-xs">
              <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
                {markdown}
              </div>
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
