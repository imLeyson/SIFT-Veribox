"use client";

import { useState, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { StickyNote, Trash2, GripHorizontal, Sparkles } from "lucide-react";
import { useSiftStore, getUpstreamSummary } from "@/lib/convergence-store";

const COLOR_VARIANTS = {
  amber: {
    bg: "bg-amber-50/95",
    border: "border-amber-200/80",
    header: "bg-amber-100/60",
    accent: "bg-amber-400",
    text: "text-amber-950",
    muted: "text-amber-800/70",
  },
  rose: {
    bg: "bg-rose-50/95",
    border: "border-rose-200/80",
    header: "bg-rose-100/60",
    accent: "bg-rose-400",
    text: "text-rose-950",
    muted: "text-rose-800/70",
  },
  sky: {
    bg: "bg-sky-50/95",
    border: "border-sky-200/80",
    header: "bg-sky-100/60",
    accent: "bg-sky-400",
    text: "text-sky-950",
    muted: "text-sky-800/70",
  },
  emerald: {
    bg: "bg-emerald-50/95",
    border: "border-emerald-200/80",
    header: "bg-emerald-100/60",
    accent: "bg-emerald-400",
    text: "text-emerald-950",
    muted: "text-emerald-800/70",
  },
  stone: {
    bg: "bg-stone-50/95",
    border: "border-stone-200/80",
    header: "bg-stone-100/60",
    accent: "bg-stone-400",
    text: "text-stone-900",
    muted: "text-stone-600/70",
  },
};

type NoteColor = keyof typeof COLOR_VARIANTS;

export function StickyNoteNode({ id, data }: NodeProps) {
  const updateCustomCard = useSiftStore((s) => s.updateCustomCard);
  const deleteNodeById = useSiftStore((s) => s.deleteNodeById);
  const routes = useSiftStore((s) => s.routes);
  const customCards = useSiftStore((s) => s.customCards);
  const customEdges = useSiftStore((s) => s.customEdges);
  const synthesizeCard = useSiftStore((s) => s.synthesizeCard);

  const upstream = useMemo(
    () => getUpstreamSummary(id, { customEdges, routes, customCards }),
    [id, customEdges, routes, customCards],
  );

  const initialContent = (data?.content as string) || "";
  const initialTitle = (data?.title as string) || "设计便签 / 灵感备注";
  const initialColor = ((data?.color as NoteColor) || "amber") in COLOR_VARIANTS
    ? (data?.color as NoteColor)
    : "amber";

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [color, setColor] = useState<NoteColor>(initialColor);
  const theme = COLOR_VARIANTS[color] ?? COLOR_VARIANTS.amber;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    updateCustomCard(id, { title: val });
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    updateCustomCard(id, { content: val });
  };

  const handleColorChange = (newColor: NoteColor) => {
    setColor(newColor);
    updateCustomCard(id, { color: newColor });
  };

  const lineCount = (content.match(/\n/g) || []).length + 1;
  const estimatedRows = Math.max(5, Math.min(35, lineCount + Math.ceil(content.length / 28)));

  return (
    <article
      className={`card relative w-[330px] max-w-[440px] overflow-hidden rounded-2xl border shadow-sm backdrop-blur-xs transition-all duration-200 hover:shadow-md ${theme.bg} ${theme.border}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        className="!w-3 !h-3 !rounded-full !bg-stone-400 hover:!bg-accent !border-2 !border-white transition-all cursor-crosshair !-left-[6px] opacity-75 hover:opacity-100 hover:scale-125"
        title="拖动或吸附连线（输入）"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        className="!w-3 !h-3 !rounded-full !bg-stone-400 hover:!bg-accent !border-2 !border-white transition-all cursor-crosshair !-right-[6px] opacity-75 hover:opacity-100 hover:scale-125"
        title="拖动引线连接下游卡片或呼出下一步"
      />

      <div className={`h-1.5 w-full ${theme.accent}`} />

      {/* Header with drag handle and controls */}
      <div
        className={`card-drag flex items-center justify-between border-b border-black/5 px-3.5 py-2 cursor-grab active:cursor-grabbing select-none ${theme.header}`}
        title="拖拽移动便签"
      >
        <div className="flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5 text-stone-600/80" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-600/90">
            便签
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {upstream.count > 0 && (
            <button
              type="button"
              onClick={() => {
                synthesizeCard(id);
                const updated = useSiftStore.getState().customCards.find((c) => c.id === id);
                if (updated) {
                  if (updated.title) setTitle(updated.title);
                  if (updated.content) setContent(updated.content);
                  if (updated.color) setColor(updated.color as NoteColor);
                }
              }}
              className="flex items-center gap-1 text-[10px] font-medium text-stone-700 bg-white/80 hover:bg-white px-2 py-0.5 rounded-full border border-black/10 transition-all cursor-pointer shadow-2xs"
              title={`根据已连接的 ${upstream.labels.join("、")} 提取备忘`}
            >
              <Sparkles className="h-2.5 w-2.5 text-amber-600" />
              <span>提取备忘 ({upstream.count})</span>
            </button>
          )}

          {/* Quick Color Swatches */}
          <div className="flex items-center gap-1 bg-black/5 px-1.5 py-0.5 rounded-full">
            {(Object.keys(COLOR_VARIANTS) as NoteColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleColorChange(c)}
                className={`h-2.5 w-2.5 rounded-full transition-transform hover:scale-125 ${
                  COLOR_VARIANTS[c].accent
                } ${color === c ? "ring-1 ring-black/40 scale-110" : ""}`}
                title={`切换为 ${c} 颜色`}
              />
            ))}
          </div>

          <GripHorizontal className="h-3.5 w-3.5 text-stone-400/80" />

          <button
            type="button"
            onClick={() => deleteNodeById(id)}
            className="rounded p-0.5 text-stone-400 hover:bg-black/10 hover:text-red-600 transition-colors cursor-pointer"
            title="删除便签"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body: Full Editable Content (Sticky Notes are never collapsed) */}
      <div className="p-3.5 space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="便签标题…"
          className={`w-full bg-transparent text-xs font-semibold focus:outline-hidden border-b border-transparent hover:border-black/10 focus:border-black/20 pb-0.5 ${theme.text}`}
        />

        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="随手记录你的灵感、设计手记、评审反馈或排版约束…"
          rows={estimatedRows}
          className={`w-full bg-transparent text-xs leading-relaxed focus:outline-hidden placeholder:text-stone-400/70 whitespace-pre-wrap break-words resize-y ${theme.text}`}
        />
      </div>
    </article>
  );
}
