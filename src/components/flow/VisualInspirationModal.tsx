"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  HelpCircle,
  Trash2,
  Copy,
  Plus,
  Tag,
  Palette,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { type VisualInspiration, type DecisionStatus } from "@/lib/agent/convergence-schema";
import { useSiftStore } from "@/lib/convergence-store";

export interface VisualInspirationModalProps {
  inspiration: VisualInspiration | null;
  onClose: () => void;
}

export function VisualInspirationModal({
  inspiration,
  onClose,
}: VisualInspirationModalProps) {
  const updateVisualInspiration = useSiftStore((s) => s.updateVisualInspiration);
  const setVisualInspirationStatus = useSiftStore((s) => s.setVisualInspirationStatus);
  const assignVisualInspiration = useSiftStore((s) => s.assignVisualInspiration);
  const removeVisualInspiration = useSiftStore((s) => s.removeVisualInspiration);
  const routes = useSiftStore((s) => s.routes);
  const setItemDecision = useSiftStore((s) => s.setItemDecision);

  const [mounted, setMounted] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [justAddedKw, setJustAddedKw] = useState<string | null>(null);
  const [addingColor, setAddingColor] = useState(false);
  const [customHex, setCustomHex] = useState("#2B3A42");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!inspiration || !mounted) return null;

  const handleAddColorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hex = customHex.trim().toUpperCase();
    if (!hex.startsWith("#")) hex = `#${hex}`;
    if (!/^#[0-9A-F]{6}$/i.test(hex)) return;
    const current = inspiration.palette || [];
    if (!current.includes(hex)) {
      updateVisualInspiration(inspiration.id, {
        palette: [...current, hex],
      });
    }
    setAddingColor(false);
  };

  const handleRemoveColor = (hexToRemove: string) => {
    updateVisualInspiration(inspiration.id, {
      palette: (inspiration.palette || []).filter((h) => h !== hexToRemove),
    });
  };

  const handleCopy = (hex: string) => {
    void navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  const handleAddColorAsConstraint = (hex: string) => {
    setItemDecision({
      id: `color_${hex.replace("#", "")}`,
      type: "text",
      content: `主色调 ${hex}`,
      label: `图片提取配色`,
      status: "confirmed",
      sourceNode: "02 方向",
    });
    setJustAddedKw(hex);
    setTimeout(() => setJustAddedKw(null), 1500);
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    const current = inspiration.keywords || [];
    if (!current.includes(trimmed)) {
      updateVisualInspiration(inspiration.id, {
        keywords: [...current, trimmed],
      });
    }
    setNewKeyword("");
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    updateVisualInspiration(inspiration.id, {
      keywords: (inspiration.keywords || []).filter((k) => k !== kwToRemove),
    });
  };

  const handleAddKeywordToDirection = (kw: string) => {
    setItemDecision({
      id: `kw_extracted_${kw}`,
      type: "text",
      content: kw,
      label: "图片提取视觉特征",
      status: "confirmed",
      sourceNode: "02 方向",
    });
    setJustAddedKw(kw);
    setTimeout(() => setJustAddedKw(null), 1500);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/40 text-white p-1.5 hover:bg-black/60 transition-colors cursor-pointer"
          title="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left: High-Res Image View */}
        <div className="md:w-3/5 bg-stone-950 flex items-center justify-center p-4 relative min-h-[300px]">
          <img
            src={inspiration.url}
            alt={inspiration.title || "灵感图"}
            className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-md"
          />
          {inspiration.sourceUrl && (
            <a
              href={inspiration.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-[11px] text-white/80 hover:text-white bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-xs transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span>来源原始页面</span>
            </a>
          )}
        </div>

        {/* Right: Deconstruction & Organization Workbench */}
        <div className="md:w-2/5 flex flex-col justify-between p-5 space-y-4 overflow-y-auto bg-stone-50/50">
          <div className="space-y-4">
            {/* Header: Title & Source */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono mb-1">
                <span>VISUAL DECONSTRUCTION</span>
                <span className="uppercase">
                  {inspiration.sourceType === "upload"
                    ? "本地上传"
                    : inspiration.sourceType === "clipboard"
                      ? "截屏粘贴"
                      : "外部网络灵感"}
                </span>
              </div>
              <input
                type="text"
                value={inspiration.title || ""}
                onChange={(e) =>
                  updateVisualInspiration(inspiration.id, { title: e.target.value })
                }
                placeholder="为这张灵感图命名…"
                className="text-base font-bold text-ink bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-500 pb-0.5"
              />
            </div>

            {/* Tri-state Status Judgement Bar */}
            <div className="rounded-xl border border-line/80 bg-white p-3 space-y-2">
              <span className="text-[10.5px] font-semibold text-stone-500 block">
                灵感研判状态 (决定后续 AI 探索依据)
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setVisualInspirationStatus(inspiration.id, "confirmed")}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    inspiration.status === "confirmed"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>✓ 确定</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisualInspirationStatus(inspiration.id, "uncertain")}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    inspiration.status === "uncertain"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>? 待定</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisualInspirationStatus(inspiration.id, "discarded")}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    inspiration.status === "discarded"
                      ? "bg-stone-700 text-white shadow-xs line-through"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800"
                  }`}
                >
                  <X className="h-3.5 w-3.5" />
                  <span>✕ 舍弃</span>
                </button>
              </div>
              <p className="text-[10px] text-stone-400 leading-tight">
                {inspiration.status === "confirmed"
                  ? "✓ 确定项：已作为最高优先级视觉基石，注入下游主题与搜索生成。"
                  : inspiration.status === "uncertain"
                    ? "? 待定项：保留为备选观察灵感，不强制约束但供发散参考。"
                    : "✕ 舍弃项：作为美学红线，严格杜绝下游 AI 生成类似方向。"}
              </p>
            </div>

            {/* Extracted & Custom Color Palette */}
            <div className="rounded-xl border border-line/80 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-stone-600 flex items-center gap-1">
                    <Palette className="h-3.5 w-3.5 text-indigo-600" />
                    解构调色板 (Color Palette)
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddingColor((prev) => !prev)}
                    className="text-[9.5px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 cursor-pointer"
                    title="添加自定义色值"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>添加</span>
                  </button>
                </div>
                <span className="text-stone-400 font-mono text-[10px]">
                  {(inspiration.palette || []).length} 色
                </span>
              </div>

              {addingColor && (
                <form onSubmit={handleAddColorSubmit} className="flex items-center gap-1.5 py-1">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                    className="h-7 w-7 rounded cursor-pointer border border-line p-0.5"
                    title="点击拾取颜色"
                  />
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                    placeholder="#RRGGBB"
                    maxLength={7}
                    className="w-24 rounded border border-indigo-400 bg-white px-1.5 py-0.5 font-mono text-[11px] outline-none uppercase"
                  />
                  <button
                    type="submit"
                    className="rounded bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-medium hover:bg-indigo-700 cursor-pointer"
                  >
                    确定
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingColor(false)}
                    className="rounded bg-stone-100 text-stone-500 px-1.5 py-0.5 text-[10px] hover:bg-stone-200 cursor-pointer"
                  >
                    取消
                  </button>
                </form>
              )}

              {(inspiration.palette || []).length > 0 ? (
                <div className="grid grid-cols-5 gap-1.5">
                  {inspiration.palette!.map((hex, idx) => (
                    <div key={idx} className="group/item flex flex-col items-center gap-1 relative">
                      <div
                        className="h-10 w-full rounded-md border border-black/10 shadow-2xs relative overflow-hidden transition-transform group-hover/item:scale-105 cursor-pointer"
                        style={{ backgroundColor: hex }}
                        onClick={() => handleCopy(hex)}
                        title={`点击复制: ${hex}`}
                      >
                        {copiedHex === hex && (
                          <div className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold flex items-center justify-center">
                            已复制
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveColor(hex);
                          }}
                          className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-black/50 text-white text-[8px] opacity-0 group-hover/item:opacity-100 flex items-center justify-center hover:bg-black/80 transition-opacity"
                          title="删除此色"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="text-[9.5px] font-mono text-stone-500 select-all">
                        {hex}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddColorAsConstraint(hex)}
                        className="text-[8.5px] text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        title="将此颜色沉淀为视觉方向标准"
                      >
                        +沉淀
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-stone-400 py-1">
                  暂未采样到有效色谱，可点击上方「+ 添加」自定义色值。
                </p>
              )}
            </div>

            {/* Visual Keywords & Tags */}
            <div className="rounded-xl border border-line/80 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-stone-600 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-indigo-600" />
                  提取的视觉属性标签
                </span>
                <span className="text-stone-400 text-[10px]">点击加入方向</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(inspiration.keywords || []).map((kw, ki) => (
                  <span
                    key={ki}
                    className="inline-flex items-center gap-1 rounded-md bg-stone-100 hover:bg-stone-200/80 px-2 py-1 text-xs text-ink transition-colors group/kw"
                  >
                    <span
                      onClick={() => handleAddKeywordToDirection(kw)}
                      className="cursor-pointer hover:text-indigo-700"
                      title="点击将此标签沉淀为方向关键词"
                    >
                      {kw}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-stone-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                      title="删除标签"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {/* Add keyword form */}
              <form onSubmit={handleAddKeyword} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="添加材质/构图/光影特征标签…"
                  className="flex-1 rounded-lg border border-line bg-stone-50 px-2.5 py-1 text-xs text-ink outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-stone-200 hover:bg-stone-300 text-ink px-2.5 py-1 text-xs font-medium cursor-pointer"
                >
                  添加
                </button>
              </form>
            </div>

            {/* Scope / Clustering Assignment */}
            <div className="rounded-xl border border-line/80 bg-white p-3 space-y-2">
              <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                归属与组合 (挂载到特定主题或视点)
              </span>
              <select
                value={
                  inspiration.scope === "route" && inspiration.targetId
                    ? `route_${inspiration.targetId}`
                    : "global"
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith("route_")) {
                    const rId = val.replace("route_", "");
                    assignVisualInspiration(inspiration.id, "route", rId);
                  } else {
                    assignVisualInspiration(inspiration.id, "global", undefined);
                  }
                }}
                className="w-full rounded-lg border border-line bg-stone-50 px-2.5 py-1.5 text-xs text-ink outline-none cursor-pointer"
              >
                <option value="global">00 全局共享视觉参考（所有阶段可见）</option>
                {routes.map((r, idx) => (
                  <option key={r.id} value={`route_${r.id}`}>
                    03 主题专属：{r.themeName || `主题 0${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-line/80 bg-white p-3 space-y-1.5">
              <span className="text-[10.5px] font-semibold text-stone-500 block">
                设计师观察随笔 (双击或直接修改)
              </span>
              <textarea
                value={inspiration.notes || ""}
                onChange={(e) =>
                  updateVisualInspiration(inspiration.id, { notes: e.target.value })
                }
                rows={2}
                placeholder="记录您看中这张图的哪个细节（例如：喜欢侧光下的纤维微漫反射，但不要大红色块）…"
                className="w-full rounded-lg border border-line/70 bg-stone-50/50 p-2 text-xs text-ink leading-relaxed outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-line/60">
            <button
              type="button"
              onClick={() => {
                removeVisualInspiration(inspiration.id);
                onClose();
              }}
              className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>删除这张灵感</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary text-xs px-4 py-1.5 cursor-pointer shadow-xs"
            >
              完成并保存
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
