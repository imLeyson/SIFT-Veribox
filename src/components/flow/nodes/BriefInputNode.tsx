"use client";
import { useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { EXAMPLES } from "@/lib/agent/examples";
import { compressImageFile } from "@/lib/image-utils";
import { ImagePlus, Plus, X } from "lucide-react";

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
    <NodeShell
      kicker="00 · 设计简报"
      title={state ? "设计简报" : "输入设计目标与背景"}
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
                附带参考图（{briefImages.length} 张）：
              </span>
              <div className="flex gap-2 flex-wrap">
                {briefImages.map((img, idx) => (
                  <a
                    key={idx}
                    href={img}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative h-14 w-14 rounded-lg overflow-hidden border border-line bg-stone-100 hover:ring-2 hover:ring-accent transition-all flex-shrink-0"
                    title="点击查看大图"
                  >
                    <img
                      src={img}
                      alt={`参考意向图 ${idx + 1}`}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </a>
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

          {/* Reference Images Upload / Paste Zone */}
          <div
            className={`mt-2.5 rounded-xl border transition-colors p-2.5 ${
              dragOver
                ? "border-accent bg-amber-50/40"
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
                支持直接截图粘贴 (Cmd+V) 或拖拽
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
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    disabled={Boolean(activeRequest)}
                    onClick={() => removeBriefImage(idx)}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 hover:opacity-100 hover:scale-110 transition-all"
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
                  className="h-14 w-14 rounded-lg border border-dashed border-stone-300 hover:border-accent hover:bg-white bg-white/50 flex flex-col items-center justify-center text-stone-500 hover:text-accent transition-colors disabled:opacity-50"
                  title="上传参考图"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[9px] mt-0.5 font-medium">
                    {compressing ? "处理中" : "添加图"}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              className="btn-primary w-full text-xs"
              disabled={Boolean(activeRequest) || !rawBrief.trim()}
            >
              {activeRequest ? "正在分析…" : "对齐视觉取舍"}
            </button>
            <button
              type="button"
              className="btn-ghost w-full text-xs"
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
                  className="rounded-lg border border-line/70 bg-white/70 px-2 py-0.5 text-[11px] text-ink transition-colors hover:border-ink hover:bg-white active:scale-98"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}
    </NodeShell>
  );
}
