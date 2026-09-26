"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore, getUpstreamSummary } from "@/lib/convergence-store";
import {
  deriveImageGenFromTheme,
  generateMockConceptSvg,
} from "@/lib/card-synthesis";
import {
  Wand2,
  Copy,
  Check,
  RefreshCw,
  Camera,
  Maximize2,
  X,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  Edit3,
  Compass,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export type AspectRatioType = "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
export type StylePresetType = "realistic" | "minimal" | "clay" | "cinematic";

export interface ImageCandidate {
  id: string;
  url: string;
  createdAt: number;
  variantIndex: number;
}

export interface ImageGenNodeData {
  prompt?: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatioType;
  stylePreset?: StylePresetType;
  imageUrl?: string | null;
  candidates?: ImageCandidate[];
  activeCandidateIndex?: number;
  isGenerating?: boolean;
  isEmpty?: boolean;
  themeName?: string;
  customTitle?: string;
  sourceDimension?: string;
  route?: any;
  refImage?: { src: string; name: string };
  refWeight?: number;
}

export function ImageGenNode({ id, data, selected }: NodeProps) {
  const routes = useSiftStore((s) => s.routes);
  const customCards = useSiftStore((s) => s.customCards);
  const customEdges = useSiftStore((s) => s.customEdges);
  const updateCustomCard = useSiftStore((s) => s.updateCustomCard);
  const synthesizeCard = useSiftStore((s) => s.synthesizeCard);

  const cardData = (data || {}) as ImageGenNodeData;
  const isEmpty = Boolean(cardData.isEmpty);

  // Upstream summary
  const upstream = useMemo(
    () => getUpstreamSummary(id, { customEdges, routes, customCards }),
    [id, customEdges, routes, customCards],
  );

  // Connected reference image (垫图 / Img2Img)
  const connectedRefImage = useMemo(() => {
    if (cardData.refImage) return cardData.refImage;
    const upstreamEdge = customEdges.find((e) => e.target === id);
    if (!upstreamEdge) return null;
    const imgNode = customCards.find(
      (c) => c.id === upstreamEdge.source && c.type === "image" && c.data?.src,
    );
    if (!imgNode || !imgNode.data?.src) return null;
    return {
      src: imgNode.data.src as string,
      name: (imgNode.data.fileName || imgNode.title || "参考垫图") as string,
    };
  }, [cardData.refImage, customEdges, customCards, id]);

  // Fallback defaults from upstream route or clean creative default
  const derivedDefaults = useMemo(() => {
    return deriveImageGenFromTheme(cardData.route);
  }, [cardData.route]);

  // Controlled properties
  const prompt =
    cardData.prompt ??
    (cardData.route
      ? derivedDefaults.prompt
      : "极简当代设计，漫反射浅灰影棚背景，45°立体侧光，8k超写实商业产品摄影");
  const aspectRatio: AspectRatioType =
    cardData.aspectRatio ?? derivedDefaults.aspectRatio ?? "3:4";
  const stylePreset: StylePresetType = cardData.stylePreset ?? "realistic";
  const isGenerating = Boolean(cardData.isGenerating);
  const rawTheme = cardData.themeName ?? derivedDefaults.themeName ?? "概念画面";
  const refWeight = cardData.refWeight ?? 50;

  // Title extraction
  const { conceptTitle, englishTag } = useMemo(() => {
    const cleanRaw = rawTheme
      .replace(/^[《【](.*?)[》】]/, "$1")
      .replace(/[《》【】]/g, "")
      .trim();
    const match = cleanRaw.match(/^([^\w\s·]+(?:[·\s]+[^\w\s·]+)*)\s*([a-zA-Z\s\/\-_]+)?$/);
    if (match && match[1]) {
      return {
        conceptTitle: `《${match[1].trim()}》`,
        englishTag: (match[2] || "").trim().toUpperCase(),
      };
    }
    return {
      conceptTitle: `《${cleanRaw}》`,
      englishTag: "",
    };
  }, [rawTheme]);

  const displayTitle = cardData.customTitle || conceptTitle;

  // Candidates & active image
  const candidates =
    cardData.candidates ??
    (cardData.imageUrl
      ? [{ id: "c-init", url: cardData.imageUrl, createdAt: Date.now(), variantIndex: 0 }]
      : []);
  const activeCandidateIndex = cardData.activeCandidateIndex ?? 0;
  const activeCandidate = candidates[activeCandidateIndex] ?? candidates[0] ?? null;
  const currentImageUrl = activeCandidate ? activeCandidate.url : (cardData.imageUrl ?? null);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [genError, setGenError] = useState<string | null>(null);

  // Auto-expand prompt textarea state & ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(true);

  // Auto-adjust textarea height dynamically based on content length
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!isPromptExpanded) {
      el.style.height = "76px";
      return;
    }
    el.style.height = "auto";
    const targetHeight = Math.max(76, Math.min(el.scrollHeight, 380));
    el.style.height = `${targetHeight}px`;
  }, [isPromptExpanded]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt, isPromptExpanded, adjustTextareaHeight]);

  // Update helper
  const updateField = useCallback(
    (patch: Partial<ImageGenNodeData>) => {
      updateCustomCard(id, {
        data: {
          ...cardData,
          ...patch,
        },
      });
    },
    [id, cardData, updateCustomCard],
  );

  // Copy prompt handler
  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Generate / Roll a new candidate via gpt-image-2.5 API
  const handleGenerateCandidate = async () => {
    const effectivePrompt = (prompt || cardData.prompt || "极简概念工业设计摄影").trim();
    if (!effectivePrompt) return;

    setGenError(null);
    updateField({ isGenerating: true, isEmpty: false });

    try {
      const res = await fetch("/api/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: effectivePrompt,
          aspectRatio,
          stylePreset,
          referenceImageUrl: connectedRefImage?.src,
          refWeight,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || `出图失败 (状态码 ${res.status})`);
      }

      const nextVariantIndex = candidates.length;
      const newCandidate: ImageCandidate = {
        id: `cand-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        url: data.url,
        createdAt: data.created ? data.created * 1000 : Date.now(),
        variantIndex: nextVariantIndex,
      };
      const nextCandidates = [newCandidate, ...candidates];
      updateField({
        isGenerating: false,
        isEmpty: false,
        candidates: nextCandidates,
        activeCandidateIndex: 0,
        imageUrl: data.url,
      });
    } catch (err: any) {
      console.error("[ImageGenNode] Error generating image:", err);
      const errMsg = err?.message || "出图请求失败，请稍后重试";
      setGenError(errMsg);
      updateField({ isGenerating: false });
    }
  };

  // Delete current active candidate
  const handleDeleteCurrentCandidate = () => {
    if (candidates.length <= 1) {
      updateField({
        candidates: [],
        activeCandidateIndex: 0,
        imageUrl: null,
      });
      return;
    }
    const nextCandidates = candidates.filter((_, idx) => idx !== activeCandidateIndex);
    const nextIndex = Math.max(0, activeCandidateIndex - 1);
    updateField({
      candidates: nextCandidates,
      activeCandidateIndex: nextIndex,
      imageUrl: nextCandidates[nextIndex]?.url ?? null,
    });
  };

  // Aspect ratio class
  const aspectClass = useMemo(() => {
    switch (aspectRatio) {
      case "1:1":
        return "aspect-square";
      case "3:4":
        return "aspect-[3/4]";
      case "4:3":
        return "aspect-[4/3]";
      case "16:9":
        return "aspect-[16/9]";
      case "9:16":
        return "aspect-[9/16]";
      default:
        return "aspect-[3/4]";
    }
  }, [aspectRatio]);

  // Craft subtitle
  const craftSubtitle =
    cardData.sourceDimension ||
    cardData.route?.focusDimension ||
    (upstream.count > 0
      ? `已连接 ${upstream.count} 个上游主题`
      : "自由创作模式 · 直接输入提示词出图");

  // Editable Card Header Title
  const nodeTitle = (
    <div className="space-y-0.5 py-0.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        {isEditingTitle ? (
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (titleInput.trim()) {
                    updateField({ customTitle: `《${titleInput.trim().replace(/[《》]/g, "")}》` });
                  }
                  setIsEditingTitle(false);
                } else if (e.key === "Escape") {
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              placeholder="输入卡片自定义标题..."
              className="text-sm font-serif font-bold text-ink bg-white border border-stone-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500 w-full"
            />
            <button
              type="button"
              onClick={() => {
                if (titleInput.trim()) {
                  updateField({ customTitle: `《${titleInput.trim().replace(/[《》]/g, "")}》` });
                }
                setIsEditingTitle(false);
              }}
              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
              title="确认标题"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsEditingTitle(false)}
              className="p-1 text-stone-400 hover:bg-stone-100 rounded"
              title="取消"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="group/title flex items-center gap-1.5">
            <span
              className="font-serif font-bold text-ink text-[17px] leading-snug tracking-tight cursor-pointer hover:text-violet-800 transition-colors"
              onClick={() => {
                setTitleInput(displayTitle.replace(/[《》]/g, ""));
                setIsEditingTitle(true);
              }}
              title="点击重命名卡片标题"
            >
              {displayTitle}
            </span>
            <button
              type="button"
              onClick={() => {
                setTitleInput(displayTitle.replace(/[《》]/g, ""));
                setIsEditingTitle(true);
              }}
              className="opacity-0 group-hover/title:opacity-100 p-0.5 text-stone-400 hover:text-stone-700 transition-opacity"
              title="重命名标题"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <p className="text-[11.5px] font-sans text-stone-500 leading-snug line-clamp-2">{craftSubtitle}</p>
    </div>
  );

  // Collapsed View: keep the photo visible with version switcher & click-to-lightbox
  const collapsedView = isGenerating ? (
    <div className="w-full py-5 bg-stone-900 text-white rounded-xl flex flex-col items-center justify-center gap-1.5 text-center p-3">
      <Wand2 className="h-4 w-4 animate-spin text-violet-400" />
      <span className="text-[11.5px] font-medium text-stone-200">正在推导渲染新画面...</span>
      <span className="text-[9.5px] font-mono text-stone-400">注入「{displayTitle}」空间光影</span>
    </div>
  ) : currentImageUrl ? (
    <div className="space-y-2">
      <div
        className="group/c-img relative rounded-xl overflow-hidden border border-stone-200/90 bg-stone-100 shadow-2xs cursor-pointer"
        onClick={() => setLightboxOpen(true)}
        title="点击放大全屏检视"
      >
        <div className={`w-full ${aspectClass} max-h-[220px] flex items-center justify-center overflow-hidden`}>
          <img
            src={currentImageUrl}
            alt={rawTheme}
            className="w-full h-full object-cover select-none transition-transform duration-200 group-hover/c-img:scale-[1.02]"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-stone-900/80 via-stone-900/40 to-transparent flex items-center justify-between opacity-0 group-hover/c-img:opacity-100 transition-opacity">
          <span className="text-[10px] font-mono text-white/90 pl-1">
            {`方案 0${activeCandidateIndex + 1} · ${aspectRatio}`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] transition-colors cursor-pointer flex items-center gap-1 backdrop-blur-xs"
              title="全屏检视大图"
            >
              <Maximize2 className="h-3 w-3" />
              <span>检视</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateCandidate();
              }}
              className="px-2 py-0.5 rounded bg-violet-600/90 hover:bg-violet-600 text-white text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              title="再出新版"
            >
              <Plus className="h-2.5 w-2.5" />
              <span>新版</span>
            </button>
          </div>
        </div>
      </div>

      {candidates.length > 1 && (
        <div className="flex items-center justify-between text-[10px] pt-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[9.5px] font-mono text-stone-400">方案:</span>
            {candidates.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateField({ activeCandidateIndex: idx });
                }}
                className={`px-1.5 py-0.5 rounded font-mono text-[9.5px] transition-all cursor-pointer ${
                  activeCandidateIndex === idx
                    ? "bg-stone-900 text-white font-bold shadow-2xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/70"
                }`}
              >
                {`0${idx + 1}`}
              </button>
            ))}
          </div>
          <span className="text-[9.5px] text-stone-400 font-mono">{`共 ${candidates.length} 版`}</span>
        </div>
      )}
    </div>
  ) : (
    <div className="text-xs text-stone-500 py-1 flex items-center gap-1.5">
      <Camera className="h-3.5 w-3.5 text-stone-400" />
      <span>{upstream.count > 0 ? `已连 ${upstream.count} 个上游，点击展开生成` : "未关联设计主题，从「3 风格主题」引线连接"}</span>
    </div>
  );

  return (
    <>
      <div className="w-[390px] transition-all duration-300 hover:shadow-md">
        <NodeShell
          nodeId={id}
          stage="5"
          kicker="画面生成"
          title={nodeTitle}
          onRegenerate={upstream.count > 0 ? () => synthesizeCard(id) : undefined}
          collapsedContent={collapsedView}
          badge={
            isGenerating ? (
              <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200/80 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                <Wand2 className="h-2.5 w-2.5 animate-spin text-violet-600" />
                <span>渲染中</span>
              </span>
            ) : candidates.length > 0 ? (
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{`已渲染 (${candidates.length}版)`}</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-violet-800 bg-violet-50 border border-violet-200/80 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                <Sparkles className="h-2.5 w-2.5 text-violet-600" />
                <span>推导就绪</span>
              </span>
            )
          }
          selected={selected}
        >
          <div className="space-y-3 text-xs">
            {/* Helper Banner for Upstream connection or Standalone mode */}
            {isEmpty && upstream.count === 0 ? (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-violet-50/70 border border-violet-200/70 text-[11px] text-violet-900 leading-relaxed">
                <Sparkles className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">自由创作模式</span>
                  <span className="text-violet-700/90 text-[10.5px]">
                    从「3 风格主题」连线至此可自动提取意象与工艺；亦可在下方直接输入任意提示词出图。
                  </span>
                </div>
              </div>
            ) : (upstream.count > 0 || connectedRefImage) ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-stone-100/80 border border-stone-200/70 text-[11px] text-stone-700">
                <div className="flex items-center gap-2 truncate min-w-0 pr-1">
                  {connectedRefImage ? (
                    <div className="flex items-center gap-1 text-blue-700 font-medium truncate">
                      <ImageIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">参考垫图：{connectedRefImage.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-stone-600 truncate">
                      <Sparkles className="h-3 w-3 text-violet-600 shrink-0" />
                      <span className="truncate">
                        继承主题：{(upstream.labels ?? []).map((l) => l.replace(/^主题[:：]\s*/, "")).join(" + ")}
                      </span>
                    </div>
                  )}
                </div>
                {upstream.count > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const def = deriveImageGenFromTheme(cardData.route);
                      updateField({
                        prompt: def.prompt,
                        negativePrompt: def.negativePrompt,
                      });
                    }}
                    className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 text-[10.5px] font-medium transition-colors cursor-pointer shadow-2xs"
                    title="从上游主题重新解构提示词"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    <span>更新</span>
                  </button>
                )}
              </div>
            ) : null}

            {/* 1. Visual Viewport / Screen Area */}
            <div className="relative rounded-xl overflow-hidden border border-stone-200/90 bg-stone-100/70 shadow-2xs">
              <div
                className={`w-full ${aspectClass} max-h-[300px] flex items-center justify-center relative transition-all duration-200`}
              >
                {isGenerating ? (
                  /* Generating State */
                  <div className="w-full h-full bg-stone-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                    <div className="h-10 w-10 rounded-full bg-violet-900/80 border border-violet-400/50 flex items-center justify-center shadow-lg">
                      <Wand2 className="h-4 w-4 text-violet-300 animate-spin" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[12px] font-semibold text-stone-200 block">
                        正在调用 gpt-image-2.5 渲染画面...
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono block">
                        画幅 {aspectRatio} · 注入「{displayTitle}」特征
                      </span>
                    </div>
                  </div>
                ) : currentImageUrl ? (
                  /* Rendered Image Display with Clean Hover Overlay */
                  <div className="group/img relative w-full h-full flex items-center justify-center overflow-hidden bg-stone-100">
                    <img
                      src={currentImageUrl}
                      alt={rawTheme}
                      className="w-full h-full object-cover select-none"
                    />

                    {/* Floating Actions on Hover */}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-stone-900/80 via-stone-900/40 to-transparent flex items-center justify-between opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                      <span className="text-[10px] font-mono text-white/90 pl-1">
                        {`方案 0${activeCandidateIndex + 1} · ${aspectRatio}`}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setLightboxOpen(true)}
                          className="px-2 py-0.5 rounded bg-white/25 hover:bg-white/35 text-white text-[10.5px] transition-colors cursor-pointer flex items-center gap-1"
                          title="全屏检视大图"
                        >
                          <Maximize2 className="h-3 w-3" />
                          <span>检视</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteCurrentCandidate}
                          className="p-1 rounded bg-white/20 hover:bg-red-500/40 text-stone-200 hover:text-white transition-colors cursor-pointer"
                          title="删除此版本"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Idle / Ready State */
                  <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center space-y-1.5 bg-stone-50/80 text-stone-500">
                    <div className="h-9 w-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                      <Camera className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[11.5px] font-medium text-stone-700 block">
                        画面画幅已就绪 ({aspectRatio})
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono block">
                        确认下方参数与提示词后，即可一键推导画面
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Candidate Variations Selector Strip */}
              {candidates.length > 1 && (
                <div className="px-2.5 py-1.5 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-mono text-stone-500">多版对比:</span>
                    {candidates.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateField({ activeCandidateIndex: idx })}
                        className={`px-2 py-0.5 rounded font-mono text-[9.5px] transition-all cursor-pointer ${
                          activeCandidateIndex === idx
                            ? "bg-stone-900 text-white font-bold shadow-2xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/70"
                        }`}
                      >
                        {`方案 0${idx + 1}`}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateCandidate}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] text-violet-700 hover:bg-violet-50 transition-colors cursor-pointer font-medium"
                    title="生成新版本对比"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>出新版</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Direct Studio Workspace (提示词工作区 + 画面比例整合 + 底部模型状态) */}
            <div className="rounded-xl border border-stone-200/85 bg-white p-3 space-y-2.5 shadow-2xs">
              {/* Header: Title on left, Quick Actions on right */}
              <div className="flex items-center justify-between text-[11px] gap-2">
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap font-semibold text-stone-800">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span className="text-[11.5px]">画面提示词</span>
                  <span className="font-normal text-[10px] text-stone-400 font-mono">
                    ({prompt.length}字)
                  </span>
                </div>

                {/* Right tools: Reset, Clear, Copy */}
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap text-[10.5px]">
                  {upstream.count > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const def = deriveImageGenFromTheme(cardData.route);
                        updateField({
                          prompt: def.prompt,
                          negativePrompt: def.negativePrompt,
                        });
                      }}
                      className="text-stone-500 hover:text-stone-800 px-1.5 py-0.5 rounded hover:bg-stone-100 transition-colors cursor-pointer flex items-center gap-0.5"
                      title="还原上游主题提示词"
                    >
                      <RotateCcw className="h-2.5 w-2.5 shrink-0" />
                      <span>重置</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateField({ prompt: "" })}
                    className="text-stone-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                    title="清空输入框"
                  >
                    清空
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-0.5 font-mono text-stone-500 hover:text-stone-900 px-1.5 py-0.5 rounded hover:bg-stone-100 transition-colors cursor-pointer"
                    title="复制完整提示词"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span className="text-emerald-700 font-medium">已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 shrink-0" />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-bar: 画面比例快捷切换条 */}
              <div className="flex items-center justify-between text-[11px] pt-1 pb-0.5 px-0.5 border-t border-stone-100">
                <span className="font-medium text-stone-600 flex items-center gap-1 text-[11px] shrink-0 whitespace-nowrap">
                  <Compass className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span>画面比例</span>
                </span>
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200/60 shrink-0">
                  {(["1:1", "3:4", "4:3", "16:9", "9:16"] as AspectRatioType[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => updateField({ aspectRatio: ratio })}
                      className={`px-2 py-0.5 rounded font-mono text-[9.5px] transition-all cursor-pointer whitespace-nowrap ${
                        aspectRatio === ratio
                          ? "bg-white text-stone-900 font-bold shadow-2xs border border-stone-200/50"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Image / Img2Img Weight (if connected) */}
              {connectedRefImage && (
                <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10.5px]">
                  <span className="text-stone-600 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3 text-blue-600" />
                    <span>垫图权重: {refWeight}%</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { val: 25, label: "轻度(构图)" },
                      { val: 50, label: "标准" },
                      { val: 75, label: "重度(风格)" },
                    ].map((w) => (
                      <button
                        key={w.val}
                        type="button"
                        onClick={() => updateField({ refWeight: w.val })}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] cursor-pointer ${
                          refWeight === w.val
                            ? "bg-blue-600 text-white font-medium shadow-2xs"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Notification if any */}
              {genError && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200/80 text-[11px] text-red-700 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span className="truncate">出图异常: {genError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenError(null)}
                    className="text-red-500 hover:text-red-800 text-[10.5px] shrink-0 font-medium ml-2 cursor-pointer"
                  >
                    关闭
                  </button>
                </div>
              )}

              {/* Direct Auto-expanding Textarea */}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => updateField({ prompt: e.target.value })}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleGenerateCandidate();
                  }
                }}
                placeholder="直接在此输入画面提示词，可自由输入任何中英文或自然语言，如：极简哑光骨瓷冷萃咖啡壶，大理石台面，侧光漫反射，8k超写实商业摄影..."
                className="w-full text-[12px] text-stone-800 leading-[1.65] font-sans bg-stone-50/70 border border-stone-200/80 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white transition-[height] duration-200 placeholder:text-stone-400 overflow-y-auto"
                style={{
                  minHeight: "76px",
                  maxHeight: isPromptExpanded ? "380px" : "76px",
                }}
              />

              {/* Action Bar under Textarea: gpt-image-2.5 indicator on left, Primary Action CTA on right */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200/70 font-semibold text-[9.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    gpt-image-2.5
                  </span>
                  <span className="text-stone-300 text-[10px]">·</span>
                  <span className="text-stone-400 text-[10px]">⌘+Enter 出图</span>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCandidate}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 active:scale-95 text-white text-[11px] font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title="快捷键：⌘+Enter 直接出图"
                >
                  <Wand2 className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
                  <span>{isGenerating ? "渲染中..." : candidates.length > 0 ? "重新渲染新版" : "推导概念画面"}</span>
                </button>
              </div>
            </div>
          </div>
        </NodeShell>
      </div>

      {/* Lightbox Modal (全屏大图检视) */}
      {lightboxOpen && currentImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-4 py-3 border-b border-stone-800 text-stone-300">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{displayTitle} · 概念视觉全屏检视</span>
                <span className="font-mono text-[10px] text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">
                  {`方案 0${activeCandidateIndex + 1} · ${aspectRatio}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-1 rounded-md hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img
                src={currentImageUrl}
                alt={rawTheme}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
