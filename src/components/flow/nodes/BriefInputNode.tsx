"use client";
import { useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { EXAMPLES } from "@/lib/agent/examples";
import { compressImageFile } from "@/lib/image-utils";
import { ImagePlus, Plus, X, Eye, Zap, Sparkles } from "lucide-react";
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
        stage="00"
        kicker={state ? "简报诊断 · 已锁定" : "00 简报输入 · 视觉策略与方向收敛"}
        title={state ? "设计简报" : "输入设计目标与背景"}
        badge={
          state && confirmedDiagnostics ? (
            <span className="text-[10px] font-mono text-stone-400">
              {confirmedDiagnostics.domainLabel}
            </span>
          ) : !state && briefDiagnostics ? (
            <span className="text-[10px] font-mono text-stone-400">
              实时解析 · {briefDiagnostics.latencyMs}ms
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
                  附带参考图（{briefImages.length} 张，提取视觉偏好，点击大图预览）：
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
            <div className="mb-2 flex items-center justify-between text-[11px] text-stone-500">
              <span>描述设计需求与调性偏好，提炼核心策略并解锁画布探索</span>
              {importedBrief && (
                <span className="text-accent font-medium">已载入草案</span>
              )}
            </div>

            <textarea
              id="brief"
              value={rawBrief}
              onChange={(e) => setRawBrief(e.target.value)}
              disabled={Boolean(activeRequest)}
              maxLength={10000}
              rows={4}
              placeholder="例如：我想做一个冷泡茶包装设计，希望整体克制日常、有仪式感，避免浮夸红金罐与廉价塑料感，重点探索特种纸微触感与极简非对称排版…"
              className="w-full resize-y rounded-xl border border-stone-200 bg-white/80 px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed outline-hidden focus:border-stone-800 focus:ring-1 focus:ring-stone-800 shadow-2xs transition-all"
            />

            {/* Reference Images Upload / Paste Zone */}
            <div
              className={`mt-2 rounded-xl border transition-all p-2.5 ${
                dragOver
                  ? "border-accent bg-amber-50/60 scale-[1.01] shadow-xs"
                  : "border-dashed border-stone-200 bg-stone-50/40 hover:bg-white/80"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-stone-600 flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5 text-stone-500" />
                  意向参考图 (可选，用于提炼材质与排版偏好)
                </span>
                <span className="text-[10px] text-stone-400">
                  支持截图粘贴 (⌘V) 或拖拽
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
                    className="relative group h-12 w-12 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 flex-shrink-0"
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
                      className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-all cursor-pointer"
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
                    className="h-12 w-12 rounded-lg border border-dashed border-stone-300 hover:border-stone-800 hover:bg-white bg-white/50 flex flex-col items-center justify-center text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50 cursor-pointer"
                    title="上传或选择参考图"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-[9px] mt-0.5 font-medium">
                      {compressing ? "压缩中…" : "添加图"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="mt-3">
              <button
                type="submit"
                className="btn-primary w-full text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer py-2.5 shadow-sm rounded-xl"
                disabled={Boolean(activeRequest) || !rawBrief.trim()}
                title="通过具象问题或快速推导，锁定核心视觉策略并解锁画布"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{activeRequest ? "正在推演视觉策略…" : "开始方向收敛 →"}</span>
                {!activeRequest && rawBrief.trim() && (
                  <kbd className="hidden sm:inline-block rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-sans opacity-80">
                    ⌘↵
                  </kbd>
                )}
              </button>
            </div>

            {/* Presets and Demo */}
            <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-stone-400">预设案例：</span>
                {EXAMPLES.map((example) => (
                  <button
                    key={example.id}
                    type="button"
                    disabled={Boolean(activeRequest)}
                    onClick={() => setRawBrief(example.brief)}
                    className="rounded-full border border-stone-200 bg-white/90 px-2.5 py-0.5 text-[11px] text-stone-700 transition-all hover:border-stone-800 hover:text-stone-900 active:scale-98 cursor-pointer shadow-2xs"
                  >
                    {example.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => siftActions.loadDemoCanvas()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                title="一键载入包含双分支、确定项与方案组的演示画布"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>⚡️ 载入画布演示案例</span>
              </button>
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
