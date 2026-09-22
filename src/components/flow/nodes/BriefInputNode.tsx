"use client";
import { useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { compressImageFile } from "@/lib/image-utils";
import { ImagePlus, Plus, Zap, Sparkles } from "lucide-react";
import { evaluateBriefIntentSync } from "@/lib/agent/system-one";
import { InlineEditableText } from "../InlineEditableText";
import { VisualInspirationCard } from "../VisualInspirationCard";
import { VisualInspirationModal } from "../VisualInspirationModal";
import { AddInspirationDialog } from "../AddInspirationDialog";
import { type VisualInspiration } from "@/lib/agent/convergence-schema";

export function BriefInputNode({ id, selected }: NodeProps) {
  const {
    rawBrief,
    briefImages,
    state,
    activeRequest,
    itemDecisions,
    setItemDecision,
    setRawBrief,
    updateRawBrief,
    addBriefImage,
    removeBriefImage,
  } = useSiftStore();

  const visualInspirations = useSiftStore((s) => s.visualInspirations || []);
  const [inspectorItem, setInspectorItem] = useState<VisualInspiration | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const globalInspirations = visualInspirations.filter(
    (v) => v.scope === "global" || !v.scope,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const briefDiagnostics =
    rawBrief.trim().length >= 4 ? evaluateBriefIntentSync(rawBrief) : null;
  const confirmedDiagnostics =
    state && rawBrief ? evaluateBriefIntentSync(rawBrief) : null;

  const collapsedSummary = state ? (
    <div className="flex items-center justify-between gap-1.5 w-full">
      <span className="truncate text-stone-600 font-sans">
        {rawBrief.slice(0, 32)}…
      </span>
      <span className="text-[9.5px] font-mono text-stone-400 shrink-0">
        {globalInspirations.length > 0 ? `${globalInspirations.length} 视觉单元 · 已锁定` : "已锁定"}
      </span>
    </div>
  ) : undefined;

  const processFiles = async (files: FileList | File[]) => {
    if (globalInspirations.length >= 6) return;
    const remainingSlots = 6 - globalInspirations.length;
    const targetFiles = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remainingSlots);

    if (!targetFiles.length) return;

    setCompressing(true);
    try {
      for (const file of targetFiles) {
        const compressed = await compressImageFile(file);
        const { extractImagePalette } = await import("@/lib/image-utils");
        const palette = await extractImagePalette(compressed, 5);
        useSiftStore.getState().addVisualInspiration({
          url: compressed,
          title: file.name.replace(/\.[^/.]+$/, ""),
          sourceType: "upload",
          status: "confirmed",
          scope: "global",
          palette,
        });
      }
    } catch {
      // ignore
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
        nodeId={id || "brief"}
        stage="00"
        kicker={state ? "简报诊断 · 已锁定" : "00 简报输入 · 视觉策略与方向收敛"}
        title={state ? "设计简报" : "输入设计目标与背景"}
        collapsedSummary={collapsedSummary}
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
            <InlineEditableText
              value={rawBrief}
              onSave={(newBrief) => updateRawBrief(newBrief)}
              multiline
              minRows={6}
              as="p"
              className="whitespace-pre-wrap text-sm leading-relaxed text-ink font-serif w-full block"
              inputClassName="font-serif text-sm leading-relaxed"
              label="简报需求"
              showEditIcon
            />
            {globalInspirations.length > 0 && (
              <div className="pt-2.5 border-t border-line/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-stone-500 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-600" />
                    参考视觉基石（{globalInspirations.length} 单元 · 色板与特征）：
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddDialogOpen(true)}
                    className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>添加灵感</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {globalInspirations.map((item) => (
                    <VisualInspirationCard
                      key={item.id}
                      inspiration={item}
                      onOpenInspector={(vis) => setInspectorItem(vis)}
                    />
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

            {/* Quiet Diagnostic Chip (Replacing bulky progress bar) */}
            {rawBrief.trim().length >= 4 && briefDiagnostics && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-stone-50/80 px-2.5 py-1.5 border border-line/60 text-[11px]">
                <div className="flex items-center gap-1.5 text-stone-700 font-medium">
                  <span>{briefDiagnostics.domainLabel}</span>
                  <span className="text-stone-400">·</span>
                  <span className="text-stone-500 font-normal">
                    {briefDiagnostics.clarityScore >= 70 ? "诉求清晰" : "可继续补充细节"}
                  </span>
                </div>
                {briefDiagnostics.suggestion && (
                  <span className="text-[10px] text-stone-500 truncate max-w-[200px] sm:max-w-[230px]">
                    {briefDiagnostics.suggestion.replace(/^(?:💡|✨|⚡️)\s*/u, "")}
                  </span>
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
                <div className="flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-xs font-semibold text-ink">
                    参考视觉单元
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    ({globalInspirations.length}/6)
                  </span>
                </div>
                <span className="text-[10px] text-stone-400">
                  支持拖拽或 ⌘V 粘贴
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

              <div className="grid grid-cols-3 gap-2">
                {globalInspirations.map((item) => (
                  <VisualInspirationCard
                    key={item.id}
                    inspiration={item}
                    onOpenInspector={(vis) => setInspectorItem(vis)}
                  />
                ))}
                {globalInspirations.length < 6 && (
                  <button
                    type="button"
                    disabled={Boolean(activeRequest) || compressing}
                    onClick={() => setAddDialogOpen(true)}
                    className="min-h-[105px] rounded-xl border-2 border-dashed border-stone-300 hover:border-indigo-400 hover:bg-white bg-white/50 flex flex-col items-center justify-center text-stone-500 hover:text-indigo-600 transition-all cursor-pointer p-2"
                    title="上传参考图或添加外链灵感"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[10.5px] mt-1 font-medium">
                      {compressing ? "解析中…" : "添加参考图"}
                    </span>
                    <span className="text-[9px] text-stone-400">
                      本地/外链/色板
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
                className="btn-ghost w-full text-xs flex items-center justify-center gap-1.5 cursor-pointer py-2.5 border border-line hover:border-ink/40"
                disabled={Boolean(activeRequest) || !rawBrief.trim()}
                onClick={() => void siftActions.fastStart()}
                title="跳过问答，直接生成设计方向与三套设计主题"
              >
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span>一键直出方向</span>
              </button>
            </div>
          </form>
        )}
      </NodeShell>

      {/* Visual Inspector Modal */}
      <VisualInspirationModal
        inspiration={inspectorItem}
        onClose={() => setInspectorItem(null)}
      />

      {/* Add Inspiration Dialog */}
      <AddInspirationDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        defaultScope="global"
      />
    </>
  );
}
