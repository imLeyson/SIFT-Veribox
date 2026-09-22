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
            <div className="mb-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span className="text-stone-500">
                  聚焦前期视觉策略与检索方向收敛 · <span className="text-stone-400">非生图交付工具</span>
                </span>
                {importedBrief && (
                  <span className="text-accent font-medium">已载入草案</span>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-stone-50/90 px-2.5 py-1.5 border border-line/70 text-[11px] text-stone-500">
                <span className="truncate pr-2">
                  推荐结构：我想做一个【品类】，希望【调性】，避免【禁忌】…
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRawBrief(
                      "我想做一个【设计品类】，希望整体呈现【核心视觉调性与受众感受】，避免【明确的视觉禁忌与常见套路】，重点探索【材质工艺、排版结构或细节】。"
                    );
                  }}
                  className="text-accent hover:underline cursor-pointer flex items-center gap-0.5 font-medium flex-shrink-0"
                  title="一键载入结构化设计需求句式模板"
                >
                  <span>套用模板</span>
                </button>
              </div>
            </div>

            <textarea
              id="brief"
              value={rawBrief}
              onChange={(e) => setRawBrief(e.target.value)}
              disabled={Boolean(activeRequest)}
              maxLength={10000}
              rows={5}
              placeholder="例：我想做一个冷泡茶包装设计，希望整体克制日常，避免大插画与传统红金罐，重点探索特种纸微触感与极简排版…"
              className="w-full resize-y rounded-xl border border-line bg-cream/70 px-3 py-2 text-xs sm:text-sm leading-relaxed outline-none focus:border-accent"
            />

            {/* Live Brief Diagnostics Radar */}
            {rawBrief.trim().length >= 4 && briefDiagnostics && (
              <div className="mt-2.5 rounded-xl border border-line/80 bg-white/70 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-medium text-ink">
                    <span>{briefDiagnostics.domainLabel}</span>
                    <span className="text-stone-400 font-mono text-[10px]">
                      · 匹配度 {Math.round(briefDiagnostics.confidence * 100)}%
                    </span>
                  </div>
                  <span className="font-mono text-[9.5px] text-stone-400 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                    <span>实时解析 · {briefDiagnostics.latencyMs}ms</span>
                  </span>
                </div>

                {/* Visual Clarity Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-stone-500">诉求清晰度</span>
                    <span className="font-mono font-medium text-ink">
                      {briefDiagnostics.clarityScore} / 100
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full bg-ink/75 transition-all duration-300"
                      style={{ width: `${briefDiagnostics.clarityScore}%` }}
                    />
                  </div>
                </div>

                {/* Contextual Clean Suggestion */}
                {briefDiagnostics.suggestion && (
                  <div className="flex items-start gap-1.5 pt-1 border-t border-line/40 text-[10.5px] text-stone-500 leading-relaxed">
                    <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>
                      {briefDiagnostics.suggestion.replace(/^(?:💡|✨|⚡️)\s*/u, "")}
                    </span>
                  </div>
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
                  意向参考图 (可选，用于提炼材质与排版偏好，非垫图渲染)
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
                className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 cursor-pointer py-2.5 shadow-sm"
                disabled={Boolean(activeRequest) || !rawBrief.trim()}
                title="推荐：通过 1–2 个具象视觉问题，启发并精准锁定设计方向与搜索策略"
              >
                <span>{activeRequest ? "正在推演策略…" : "开始方向收敛"}</span>
                {!activeRequest && (
                  <span className="rounded bg-amber-400/25 px-1 py-0.5 text-[9px] font-semibold text-amber-200">
                    推荐
                  </span>
                )}
                {!activeRequest && rawBrief.trim() && (
                  <kbd className="hidden sm:inline-block rounded bg-white/20 px-1 py-0.2 text-[10px] font-sans opacity-80">
                    ⌘↵
                  </kbd>
                )}
              </button>
              <button
                type="button"
                className="btn-ghost w-full text-xs cursor-pointer py-2.5 border border-line/80 text-stone-600 hover:text-ink hover:bg-stone-50 transition-colors"
                disabled={Boolean(activeRequest) || !rawBrief.trim()}
                onClick={() => void siftActions.fastStart()}
                title="跳过问答：基于当前输入直接收敛方向，生成 3 套探索路线与搜索策略"
              >
                跳过提问 · 直接规划路线
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-stone-400">
              <span>✦ 关键提问锁定视觉策略</span>
              <span>推导 3 套设计主题与检索方向 ↗</span>
            </div>
            <div className="mt-3.5 border-t border-line/60 pt-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-medium text-stone-500">
                  预设示例（点击载入完整 Brief 结构）：
                </p>
                <span className="text-[10px] text-stone-400">
                  可在此基础上自由修改
                </span>
              </div>
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

              {/* Instant Canvas Exploration Demo Entry */}
              <div className="mt-3 pt-2.5 border-t border-emerald-200/60 bg-emerald-50/60 -mx-1 px-3 py-2 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-700 text-white">
                    新功能
                  </span>
                  <span className="text-[11px] font-medium text-emerald-950">
                    画布探索与方案组
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => siftActions.loadDemoCanvas()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
                  title="直接体验老师要求的单人画布探索：确定项卡片、分支拓扑、方案组与双模式"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡️ 一键载入画布探索演示</span>
                </button>
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
