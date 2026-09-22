"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Link2, Sparkles, ImagePlus, Loader2 } from "lucide-react";
import { useSiftStore } from "@/lib/convergence-store";
import { compressImageFile, extractImagePalette } from "@/lib/image-utils";

export interface AddInspirationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: "global" | "route" | "step";
  targetId?: string;
  onAdded?: (id: string) => void;
}

export function AddInspirationDialog({
  isOpen,
  onClose,
  defaultScope = "global",
  targetId,
  onAdded,
}: AddInspirationDialogProps) {
  const addVisualInspiration = useSiftStore((s) => s.addVisualInspiration);

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [externalUrl, setExternalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请上传有效的图片文件 (PNG, JPG, WebP)");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file, 1200, 0.85);
      const palette = await extractImagePalette(compressed, 5);
      const newId = addVisualInspiration({
        url: compressed,
        title: title || file.name.replace(/\.[^/.]+$/, ""),
        sourceType: "upload",
        status: "confirmed",
        scope: defaultScope,
        targetId,
        palette,
        notes,
      });
      onAdded?.(newId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片解析失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = externalUrl.trim();
    if (!trimmed) return;
    setIsProcessing(true);
    setError(null);
    try {
      const palette = await extractImagePalette(trimmed, 5);
      const newId = addVisualInspiration({
        url: trimmed,
        title: title || "外部灵感图",
        sourceType: "external_url",
        sourceUrl: trimmed,
        status: "confirmed",
        scope: defaultScope,
        targetId,
        palette,
        notes,
      });
      onAdded?.(newId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法读取外链图片");
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-line space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-line/60">
          <div className="flex items-center gap-1.5 font-bold text-ink text-sm">
            <ImagePlus className="h-4 w-4 text-indigo-600" />
            <span>添加视觉内容单元</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-ink cursor-pointer p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-stone-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "upload"
                ? "bg-white text-ink shadow-2xs font-semibold"
                : "text-stone-500 hover:text-ink"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>本地上传 / 拖拽</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("url");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "url"
                ? "bg-white text-ink shadow-2xs font-semibold"
                : "text-stone-500 hover:text-ink"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>外部灵感图链接</span>
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {/* Tab 1: Upload Dropzone */}
        {activeTab === "upload" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                void handleProcessFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line/80 hover:border-indigo-400 bg-stone-50/70 p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  void handleProcessFile(e.target.files[0]);
                }
              }}
            />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs text-stone-600 font-medium">
                  正在压缩与智能提取色板…
                </span>
              </div>
            ) : (
              <>
                <div className="rounded-full bg-white p-2.5 shadow-2xs border border-line/60 group-hover:scale-105 transition-transform mb-2">
                  <Upload className="h-5 w-5 text-indigo-600" />
                </div>
                <span className="text-xs font-semibold text-ink">
                  点击选择或直接将图片拖拽至此
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5">
                  支持 JPG、PNG、WebP，自动提取 5 色核心调色板
                </span>
              </>
            )}
          </div>
        )}

        {/* Tab 2: External URL */}
        {activeTab === "url" && (
          <form onSubmit={handleUrlSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">
                网络图片直链 URL (Behance / Pinterest / Cosmos / Web)
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... 或 Behance 图片地址"
                required
                className="w-full rounded-lg border border-line bg-stone-50 p-2 text-xs text-ink outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing || !externalUrl.trim()}
              className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>正在获取并分析图片…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>导入并提取色板</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Optional Title & Notes */}
        <div className="space-y-2 pt-1 border-t border-line/50">
          <div>
            <label className="text-[11px] text-stone-500 block mb-0.5">
              灵感标题 (可选)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：极简特种纸微触感"
              className="w-full rounded-lg border border-line bg-stone-50/70 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-stone-500 block mb-0.5">
              观察备注 (可选)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="看中这张图的哪些材质、光影或排版细节…"
              className="w-full rounded-lg border border-line bg-stone-50/70 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
