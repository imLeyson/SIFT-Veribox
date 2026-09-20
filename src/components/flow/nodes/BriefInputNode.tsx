"use client";
import { useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { EXAMPLES } from "@/lib/agent/examples";
import { compressImageFile } from "@/lib/image-utils";
import { ImagePlus, Plus, X, Eye, Zap } from "lucide-react";
import { evaluateBriefIntentSync } from "@/lib/agent/system-one";

export function BriefInputNode({ selected }: NodeProps) {
  const {
    rawBrief,
    briefImages,
    state,
    activeRequest,
    importedBrief,
    setRawBrief,
    addBriefImage,
    removeBriefImage,
  } = useSiftStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const briefDiagnostics =
    rawBrief.trim().length >= 4 ? evaluateBriefIntentSync(rawBrief) : null;
  const confirmedDiagnostics =
    state && rawBrief ? evaluateBriefIntentSync(rawBrief) : null;

  const processFiles = async (files: FileList | File[]) => {
    if (briefImages.length >= 3) return;
    const remainingSlots = 3 - briefImages.length;
    const targetFiles = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remainingSlots);

    if (!targetFiles.length) return;
    setCompressing(true);
    try {
      for (const file of targetFiles) {
        const compressed = await compressImageFile(file);
        addBriefImage(compressed);
      }
    } catch {
      // Ignore individual file parse errors gracefully
    } finally {
      setCompressing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      void processFiles(imageFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      void processFiles(e.dataTransfer.files);
    }
  };

  return (
    <>
      <NodeShell
        kicker="00 · 设计简报"
        title={state ? "设计简报" : "输入设计目标与背景"}
        badge={
          state && confirmedDiagnostics ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono font-medium text-amber-700"
              title={`System 1 已定位领域：${confirmedDiagnostics.domainLabel}`}
            >
              <Zap className="h-2.5 w-2.5 text-amber-600" />
              <span>
                {confirmedDiagnostics.domainIcon} {confirmedDiagnostics.domainLabel}
              </span>
            </span>
          ) : !state && briefDiagnostics ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono font-medium text-amber-700"
              title="由 SIFT System 1 毫秒级解析简报"
            >
              <Zap className="h-2.5 w-2.5 text-amber-600" />
              <span>System 1 · {briefDiagnostics.latencyMs}ms</span>
            </span>
          ) : undefined
        }
        selected={selected}
      >
        {state ? (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink font-serif">
              {rawBrief}
            </p>
            {briefImages.length > 0 && (
              <div className="pt-2 border-t border-line/60">
                <span className="text-[10px] font-semibold text-stone-500 block mb-1.5">
                  附带参考图（{briefImages.length} 张，点击大图预览）：
                </span>
                <div className="flex gap-2 flex-wrap">
                  {briefImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="group relative h-14 w-14 rounded-lg overflow-hidden border border-line bg-stone-100 hover:ring-2 hover:ring-accent transition-all flex-shrink-0 cursor-pointer text-left"
                      title="点击查看高清大图"
                    >
                      <img
                        src={img}
                        alt={`参考意向图 ${idx + 1}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="h-4 w-4 text-white drop-shadow" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void siftActions.start();
            }}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (
                (e.metaKey || e.ctrlKey) &&
                e.key === "Enter" &&
                rawBrief.trim() &&
                !activeRequest
              ) {
                e.preventDefault();
                void siftActions.start();
              }
            }}
          >
            <p className="mb-3 text-xs leading-relaxed text-muted">
              描述设计背景、视觉意图与明确约束。
            </p>
            {importedBrief && (
              <p className="mb-2 text-xs text-accent">
                已载入草案
              </p>
            )}
            <textarea
              id="brief"
              value={rawBrief}
              onChange={(e) => setRawBrief(e.target.value)}
              disabled={Boolean(activeRequest)}
              maxLength={10000}
              rows={5}
              placeholder="例：冷泡茶包装，克制日常感，避免大插画与红金罐，探索特种纸与极简排版…"
              className="w-full resize-y rounded-xl border border-line bg-cream/70 px-3 py-2 text-xs sm:text-sm leading-relaxed outline-none focus:border-accent"
            />

            {/* Live System 1 Brief Diagnostics Radar */}
            {rawBrief.trim().length >= 4 && briefDiagnostics && (
              <div className="mt-2.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-stone-50/50 to-cream/80 p-2.5 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white border border-amber-200/80 text-xs shadow-2xs">
                      {briefDiagnostics.domainIcon}
                    </span>
                    <span>{briefDiagnostics.domainLabel}</span>
                    <span className="rounded bg-amber-100/80 text-amber-800 px-1.5 py-0.2 text-[9px] font-mono font-medium">
                      置信度 {Math.round(briefDiagnostics.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[9px] text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                    <Zap className="h-2.5 w-2.5 text-amber-600" />
                    <span>System 1 · {briefDiagnostics.latencyMs}ms</span>
                  </div>
                </div>

                {/* Visual Clarity Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-stone-500 font-medium">视觉指向清晰度</span>
                    <span
                      className={`font-mono font-bold ${
                        briefDiagnostics.clarityScore >= 80
                          ? "text-emerald-700"
                          : briefDiagnostics.clarityScore >= 50
                            ? "text-amber-700"
                            : "text-rose-600"
                      }`}
                    >
                      {briefDiagnostics.clarityScore} / 100
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        briefDiagnostics.clarityScore >= 80
                          ? "bg-emerald-500"
                          : briefDiagnostics.clarityScore >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${briefDiagnostics.clarityScore}%` }}
                    />
                  </div>
                </div>

                {/* Contextual Smart Suggestion */}
                {briefDiagnostics.suggestion && (
                  <p className="mt-1.5 text-[10.5px] text-stone-600 leading-tight">
                    {briefDiagnostics.suggestion}
                  </p>
                )}
              </div>
            )}

            {/* Reference Images Upload / Paste Zone */}
            <div
              className={`mt-2.5 rounded-xl border transition-all p-2.5 ${
                dragOver
                  ? "border-accent bg-amber-50/60 scale-[1.01] shadow-sm"
                  : "border-line/70 bg-white/40 hover:bg-white/70"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-stone-700 flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5 text-accent" />
                  参考意向图 (可选，最多 3 张)
                </span>
                <span className="text-[10px] text-stone-400">
                  支持直接截图粘贴 (⌘V) 或拖拽
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void processFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />

              <div className="flex items-center gap-2 flex-wrap">
                {briefImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group h-14 w-14 rounded-lg overflow-hidden border border-line bg-stone-100 flex-shrink-0"
                  >
                    <img
                      src={img}
                      alt={`参考图 ${idx + 1}`}
                      className="h-full w-full object-cover cursor-pointer"
                      onClick={() => setPreviewImage(img)}
                      title="点击放大预览"
                    />
                    <button
                      type="button"
                      disabled={Boolean(activeRequest)}
                      onClick={() => removeBriefImage(idx)}
                      className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer"
                      title="删除图片"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}

                {briefImages.length < 3 && (
                  <button
                    type="button"
                    disabled={Boolean(activeRequest) || compressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-14 w-14 rounded-lg border border-dashed border-stone-300 hover:border-accent hover:bg-white bg-white/50 flex flex-col items-center justify-center text-stone-500 hover:text-accent transition-colors disabled:opacity-50 cursor-pointer"
                    title="上传或选择参考图"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[9px] mt-0.5 font-medium">
                      {compressing ? "压缩中…" : "添加图"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                disabled={Boolean(activeRequest) || !rawBrief.trim()}
              >
                <span>{activeRequest ? "正在分析…" : "对齐视觉取舍"}</span>
                {!activeRequest && rawBrief.trim() && (
                  <kbd className="hidden sm:inline-block rounded bg-white/20 px-1 py-0.2 text-[10px] font-sans opacity-80">
                    ⌘↵
                  </kbd>
                )}
              </button>
              <button
                type="button"
                className="btn-ghost w-full text-xs cursor-pointer"
                disabled={Boolean(activeRequest) || !rawBrief.trim()}
                onClick={() => void siftActions.fastStart()}
              >
                直接推导收敛
              </button>
            </div>
            <div className="mt-3.5 border-t border-line/60 pt-2.5">
              <p className="text-[11px] font-medium text-stone-500 mb-1.5">
                参考场景：
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((example) => (
                  <button
                    key={example.id}
                    type="button"
                    disabled={Boolean(activeRequest)}
                    onClick={() => setRawBrief(example.brief)}
                    className="rounded-lg border border-line/70 bg-white/70 px-2 py-0.5 text-[11px] text-ink transition-colors hover:border-ink hover:bg-white active:scale-98 cursor-pointer"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}
      </NodeShell>

      {/* Lightbox / Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-stone-900 border border-white/20 p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="参考图大图预览"
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 transition-all cursor-pointer shadow-md"
              title="关闭预览 (ESC)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
