"use client";

import React, { useState, useEffect } from "react";
import { Check, HelpCircle, X, Maximize2, Sparkles, Copy, Tag, ExternalLink } from "lucide-react";
import { type VisualInspiration, type DecisionStatus } from "@/lib/agent/convergence-schema";
import { useSiftStore } from "@/lib/convergence-store";
import { extractImagePalette } from "@/lib/image-utils";
import { InlineEditableText } from "./InlineEditableText";

export interface VisualInspirationCardProps {
  inspiration: VisualInspiration;
  onOpenInspector?: (inspiration: VisualInspiration) => void;
  compact?: boolean;
  className?: string;
}

export function VisualInspirationCard({
  inspiration,
  onOpenInspector,
  compact = false,
  className = "",
}: VisualInspirationCardProps) {
  const setVisualInspirationStatus = useSiftStore((s) => s.setVisualInspirationStatus);
  const updateVisualInspiration = useSiftStore((s) => s.updateVisualInspiration);
  const removeVisualInspiration = useSiftStore((s) => s.removeVisualInspiration);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // Automatically extract palette if not present
  useEffect(() => {
    if ((!inspiration.palette || inspiration.palette.length === 0) && inspiration.url) {
      void extractImagePalette(inspiration.url, 5).then((palette) => {
        if (palette.length > 0) {
          updateVisualInspiration(inspiration.id, { palette });
        }
      });
    }
  }, [inspiration.id, inspiration.url, inspiration.palette, updateVisualInspiration]);

  const currentStatus = inspiration.status;
  const nextStatus: DecisionStatus =
    currentStatus === "confirmed"
      ? "uncertain"
      : currentStatus === "uncertain"
        ? "discarded"
        : "confirmed";

  const handleCopyColor = (e: React.MouseEvent, hex: string) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const statusStyles = {
    confirmed: {
      border: "border-emerald-500/80 ring-1 ring-emerald-500/30 bg-emerald-50/10",
      badge: "bg-emerald-600 text-white hover:bg-emerald-700",
      text: "✓ 确定",
      label: "核心依据",
    },
    uncertain: {
      border: "border-amber-400/90 ring-1 ring-amber-400/30 border-dashed bg-amber-50/10",
      badge: "bg-amber-600 text-white hover:bg-amber-700",
      text: "? 待定",
      label: "备选观望",
    },
    discarded: {
      border: "border-stone-300 opacity-50 grayscale bg-stone-100/50",
      badge: "bg-stone-600 text-white line-through hover:bg-stone-700",
      text: "✕ 舍弃",
      label: "排除红线",
    },
  }[currentStatus];

  if (compact) {
    return (
      <div
        className={`group relative rounded-lg border overflow-hidden transition-all text-left ${statusStyles.border} ${className}`}
        onClick={() => onOpenInspector?.(inspiration)}
        title={`${inspiration.title || "灵感图"}（点击查看解构分析）`}
      >
        <div className="relative h-16 w-16 bg-stone-100">
          <img
            src={inspiration.url}
            alt={inspiration.title || "灵感参考"}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 cursor-pointer"
          />
          {/* Status badge */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVisualInspirationStatus(inspiration.id, nextStatus);
            }}
            className={`absolute top-0.5 right-0.5 z-10 flex h-4 items-center gap-0.5 rounded px-1 text-[9px] font-mono font-bold shadow-2xs transition-transform hover:scale-105 cursor-pointer ${statusStyles.badge}`}
            title={`状态：${statusStyles.text} (${statusStyles.label})，点击切换`}
          >
            {statusStyles.text}
          </button>
        </div>
        {/* Palette Bar */}
        {inspiration.palette && inspiration.palette.length > 0 && (
          <div className="flex h-1.5 w-full">
            {inspiration.palette.map((color, ci) => (
              <div
                key={ci}
                className="flex-1 transition-transform hover:scale-y-150"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-xl border bg-white shadow-2xs transition-all overflow-hidden text-left ${statusStyles.border} ${className}`}
    >
      {/* Image Preview with Hover Controls */}
      <div
        className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden cursor-pointer"
        onClick={() => onOpenInspector?.(inspiration)}
      >
        <img
          src={inspiration.url}
          alt={inspiration.title || "视觉灵感"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-103"
        />

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
          <span className="text-[10px] text-white/90 font-medium flex items-center gap-1">
            <Maximize2 className="h-3 w-3" />
            解构灵感
          </span>
          {inspiration.sourceUrl && (
            <a
              href={inspiration.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-white/80 hover:text-white p-1 rounded bg-black/40 backdrop-blur-xs"
              title="查看原始灵感来源"
            >
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Top Status Switch Badge */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setVisualInspirationStatus(inspiration.id, nextStatus);
          }}
          className={`absolute top-1.5 right-1.5 z-10 flex h-5 items-center gap-1 rounded-md px-1.5 text-[10px] font-mono font-bold shadow-xs transition-transform hover:scale-105 cursor-pointer backdrop-blur-xs ${statusStyles.badge}`}
          title={`当前：${statusStyles.text} · ${statusStyles.label}，点击切换为下一状态`}
        >
          {statusStyles.text}
        </button>

        {/* Source indicator */}
        <span className="absolute top-1.5 left-1.5 rounded bg-black/50 backdrop-blur-xs px-1.5 py-0.5 text-[9px] text-white/90 font-mono">
          {inspiration.sourceType === "upload"
            ? "本地"
            : inspiration.sourceType === "clipboard"
              ? "截图"
              : "外链"}
        </span>
      </div>

      {/* Extracted Palette Swatches Bar */}
      {inspiration.palette && inspiration.palette.length > 0 && (
        <div className="relative flex h-3.5 w-full border-y border-line/40 overflow-hidden bg-stone-50">
          {inspiration.palette.map((hex, ci) => (
            <button
              key={ci}
              type="button"
              onClick={(e) => handleCopyColor(e, hex)}
              className="group/color flex-1 h-full transition-all relative hover:flex-[1.5] cursor-pointer"
              style={{ backgroundColor: hex }}
              title={`点击复制色值: ${hex}`}
            >
              {copiedColor === hex && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-[8px] font-mono font-bold">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Details Area */}
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-start justify-between gap-1.5">
          <InlineEditableText
            value={inspiration.title || "点击命名灵感图"}
            onSave={(newTitle) =>
              updateVisualInspiration(inspiration.id, { title: newTitle })
            }
            as="h4"
            className="text-xs font-semibold text-ink leading-snug line-clamp-1 block flex-1"
            label="灵感标题"
          />
        </div>

        {/* Visual Keywords */}
        {inspiration.keywords && inspiration.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {inspiration.keywords.slice(0, 3).map((kw, ki) => (
              <span
                key={ki}
                className="inline-flex items-center gap-0.5 rounded bg-mist px-1.5 py-0.5 text-[9.5px] text-stone-700 font-sans"
              >
                <Tag className="h-2 w-2 text-stone-400" />
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Notes Preview if available */}
        {inspiration.notes && (
          <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed italic bg-stone-50 p-1 rounded border border-stone-200/50">
            “{inspiration.notes}”
          </p>
        )}
      </div>
    </div>
  );
}
