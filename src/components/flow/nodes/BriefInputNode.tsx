"use client";
import { useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { EXAMPLES } from "@/lib/agent/examples";
import { compressImageFile } from "@/lib/image-utils";
import { ImagePlus, Plus, X, Eye } from "lucide-react";
import { evaluateBriefIntentSync } from "@/lib/agent/system-one";

export function BriefInputNode({ id, selected }: NodeProps) {
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
        nodeId={id}
        stage="00"
        kicker={state ? "已锁定" : "视觉意图输入"}
        title={state ? "设计简报" : "设计目标与背景"}
        badge={
          state && confirmedDiagnostics ? (
            <span className="text-[10px] font-mono text-stone-400">
              {confirmedDiagnostics.domainLabel}
            </span>
          ) : !state && briefDiagnostics ? (
            <span className="text-[10px] font-mono text-stone-400">
              {briefDiagnostics.domainLabel}
            </span>
          ) : undefined
        }
        selected={selected}
        collapsedContent={
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-semibold text-stone-700 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-600" />
                设计任务核心
              </span>
              {confirmedDiagnostics?.domainLabel && (
                <span className="font-mono text-[9.5px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded">
                  {confirmedDiagnostics.domainLabel}
                </span>
              )}
            </div>
            <p className="text-xs font-serif leading-relaxed text-ink line-clamp-3">
              {rawBrief.trim() || "尚未输入设计意图…"}
            </p>
          </div>
        }
      >
        {state ? (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink font-serif">
              {rawBrief}
            </p>
            {briefImages.length > 0 && (
              <div className="pt-2 border-t border-line/60">
                <span className="text-[10px] font-semibold text-stone-500 block mb-1.5">
                  参考意向图 ({briefImages.length})
                </span>
                <div className="flex gap-2 flex-wrap">
                  {briefImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="group relative h-12 w-12 rounded-lg overflow-hidden border border-line bg-stone-100 hover:ring-2 hover:ring-accent transition-all flex-shrink-0 cursor-pointer text-left"
                      title="点击查看大图"
                    >
                      <img
                        src={img}
                        alt={`参考意向图 ${idx + 1}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="h-3.5 w-3.5 text-white drop-shadow" />
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
            className="space-y-2.5"
          >
            <div className="relative">
              <textarea
                id="brief"
                value={rawBrief}
                onChange={(e) => setRawBrief(e.target.value)}
                disabled={Boolean(activeRequest)}
                maxLength={10000}
                rows={4}
                placeholder="描述设计目标、视觉调性与期望（如：冷泡茶包装设计，追求克制日常感，避免繁复大插画，重点探索特种纸微触感与极简排版）…"
                className="w-full resize-y rounded-xl border border-line/80 bg-cream/50 px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed outline-none focus:border-stone-800 focus:bg-white transition-colors placeholder:text-stone-400/80"
              />
              {importedBrief && (
                <span className="absolute top-2 right-2 text-[10px] text-accent font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                  已载入草案
                </span>
              )}
            </div>

            {/* Live Brief Diagnostics (Restrained & Calm) */}
            {rawBrief.trim().length >= 4 && briefDiagnostics && (
              <div className="rounded-lg border border-line/60 bg-stone-50/70 px-3 py-2 space-y-1.5 text-stone-600">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-ink">
                    {briefDiagnostics.domainLabel}
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">
                    清晰度 {briefDiagnostics.clarityScore}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-stone-700 transition-all duration-300"
                    style={{ width: `${briefDiagnostics.clarityScore}%` }}
                  />
                </div>
                {briefDiagnostics.suggestion && (
                  <p className="text-[10.5px] text-stone-500 leading-snug pt-0.5">
                    {briefDiagnostics.suggestion.replace(/^(?:💡|✨|⚡️)\s*/u, "")}
                  </p>
                )}
              </div>
            )}

            {/* Hidden File Input */}
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

            {/* Reference Images: Compact & Minimal */}
            {briefImages.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <button
                  type="button"
                  disabled={Boolean(activeRequest) || compressing}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border border-dashed text-xs transition-colors cursor-pointer ${
                    dragOver
                      ? "border-accent bg-amber-50/60 text-stone-800"
                      : "border-line/80 hover:border-stone-400 bg-stone-50/40 hover:bg-stone-50 text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <ImagePlus className="h-3.5 w-3.5 text-stone-400" />
                    <span>{compressing ? "正在解析图片…" : "添加意向参考图 (可选)"}</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    支持 ⌘V 粘贴或拖拽 · 最多 3 张
                  </span>
                </button>
              </div>
            ) : (
              <div
                className={`rounded-xl border p-2 transition-all ${
                  dragOver
                    ? "border-accent bg-amber-50/50"
                    : "border-line/70 bg-stone-50/40"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[11px] font-medium text-stone-600 flex items-center gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5 text-stone-400" />
                    <span>参考意向 ({briefImages.length}/3)</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    支持 ⌘V 粘贴或拖拽
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {briefImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group h-12 w-12 rounded-lg overflow-hidden border border-line bg-stone-100 flex-shrink-0"
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
                        className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="删除图片"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                  {briefImages.length < 3 && (
                    <button
                      type="button"
                      disabled={Boolean(activeRequest) || compressing}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-12 w-12 rounded-lg border border-dashed border-stone-300 hover:border-stone-500 bg-white/60 hover:bg-white flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                      title="继续添加图片"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons: Clean & Confident */}
            <div className="grid gap-2 sm:grid-cols-2 pt-0.5">
              <button
                type="submit"
                className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 cursor-pointer py-2.5 shadow-sm"
                disabled={Boolean(activeRequest) || !rawBrief.trim()}
                title="通过关键视觉提问，锁定设计策略基准"
              >
                <span>{activeRequest ? "正在推演策略…" : "开始策略收敛"}</span>
                {!activeRequest && rawBrief.trim() && (
                  <kbd className="hidden sm:inline-block rounded bg-white/20 px-1 py-0.2 text-[9.5px] font-sans opacity-70">
                    ⌘↵
                  </kbd>
                )}
              </button>
              <button
                type="button"
                className="btn-ghost w-full text-xs cursor-pointer py-2.5 border border-line/80 text-stone-600 hover:text-ink hover:bg-stone-50 transition-colors"
                disabled={Boolean(activeRequest) || !rawBrief.trim()}
                onClick={() => void siftActions.fastStart()}
                title="跳过提问，直接推导风格主题与检索方向"
              >
                跳过提问 · 生成主题
              </button>
            </div>

            {/* Subtle Inline Presets (Only when empty, minimal 1-line text links) */}
            {!rawBrief.trim() && (
              <div className="flex items-center gap-1 text-[11px] text-stone-400 pt-0.5 px-0.5">
                <span className="shrink-0 text-stone-400">参考示例:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {EXAMPLES.slice(0, 4).map((example, i) => (
                    <button
                      key={example.id}
                      type="button"
                      onClick={() => setRawBrief(example.brief)}
                      className="hover:text-stone-700 hover:underline cursor-pointer transition-colors"
                    >
                      {example.label}{i < 3 ? " ·" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
