"use client";

import React, { useState, useRef, useEffect } from "react";
import { Pencil, Check } from "lucide-react";

export interface InlineEditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  as?: "span" | "p" | "h3" | "h4" | "div";
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  placeholder?: string;
  label?: string;
  showEditIcon?: boolean;
  disabled?: boolean;
  minRows?: number;
}

export function InlineEditableText({
  value,
  onSave,
  as: Component = "span",
  className = "",
  inputClassName = "",
  multiline = false,
  placeholder = "点击修改…",
  label = "双击可修改内容",
  showEditIcon = false,
  disabled = false,
  minRows = 3,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  const adjustHeight = () => {
    if (multiline && inputRef.current) {
      const textarea = inputRef.current as HTMLTextAreaElement;
      textarea.style.height = "auto";
      const baseMin = Math.max(minRows * 24 + 32, 96);
      const targetH = Math.max(textarea.scrollHeight + 4, baseMin);
      textarea.style.height = `${targetH}px`;
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (multiline) {
        adjustHeight();
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && multiline) {
      adjustHeight();
    }
  }, [draft, isEditing, multiline]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
      return;
    }

    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
      return;
    }

    if (multiline && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
      return;
    }
  };

  if (isEditing) {
    return (
      <div
        className={
          multiline
            ? "relative block w-full z-30 my-1 animate-in fade-in zoom-in-95 duration-150"
            : "relative inline-flex flex-col z-30 min-w-[220px] sm:min-w-[260px] max-w-full my-0.5 animate-in fade-in zoom-in-95 duration-150"
        }
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {multiline ? (
          <div className="rounded-xl border-2 border-indigo-500/80 bg-white p-3 shadow-xl ring-4 ring-indigo-500/10 transition-all">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={minRows}
              placeholder={placeholder}
              className={`w-full text-xs sm:text-[13px] leading-relaxed text-ink outline-none bg-transparent resize-y font-sans placeholder:text-stone-400 ${inputClassName}`}
            />
            <div className="flex items-center justify-between text-[10px] text-stone-500 mt-2 pt-2 border-t border-line/60 select-none">
              <span className="font-mono text-stone-400">
                ⌘+Enter 保存 · Esc 取消
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded px-2 py-1 text-stone-500 hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer font-medium"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  <span>保存修改</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-indigo-500/80 bg-white p-1.5 shadow-xl ring-4 ring-indigo-500/10 transition-all">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full rounded bg-transparent px-1.5 py-1 text-xs sm:text-[13px] font-medium text-ink outline-none font-sans placeholder:text-stone-400 ${inputClassName}`}
            />
            <div className="flex items-center justify-between text-[9.5px] text-stone-500 mt-1 pt-1 border-t border-line/50 select-none px-1">
              <span className="font-mono text-stone-400">
                Enter 保存 · Esc 取消
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-stone-400 hover:text-ink px-1 py-0.5 rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-indigo-600 font-semibold hover:text-indigo-800 px-1.5 py-0.5 rounded hover:bg-indigo-50 cursor-pointer"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Component
      onDoubleClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(true);
      }}
      title={disabled ? undefined : `${label}（双击就地修改）`}
      className={`group/editable inline-flex items-center gap-1 transition-all ${
        disabled
          ? ""
          : "cursor-text hover:bg-stone-100/70 hover:outline hover:outline-dashed hover:outline-1 hover:outline-stone-300/80 rounded px-0.5"
      } ${justSaved ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-400 rounded px-1" : ""} ${className}`}
    >
      <span>{value || placeholder}</span>
      {justSaved && (
        <Check className="h-3 w-3 text-emerald-600 shrink-0 inline animate-pulse" />
      )}
      {!disabled && showEditIcon && !justSaved && (
        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/editable:opacity-50 text-stone-400 shrink-0 inline transition-opacity" />
      )}
    </Component>
  );
}
