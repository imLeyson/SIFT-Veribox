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

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
        className="relative inline-block w-full"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            rows={minRows}
            placeholder={placeholder}
            className={`w-full rounded-lg border border-accent bg-amber-50/70 p-2 text-xs text-ink outline-none ring-1 ring-accent/30 resize-y shadow-inner font-sans ${inputClassName}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            className={`w-full rounded border border-accent bg-amber-50/70 px-1.5 py-0.5 text-xs text-ink outline-none ring-1 ring-accent/30 shadow-inner font-sans ${inputClassName}`}
          />
        )}
        <div className="flex items-center justify-between text-[9.5px] text-stone-400 mt-0.5 px-0.5">
          <span>{multiline ? "⌘+Enter 保存 · Esc 取消" : "Enter 保存 · Esc 取消"}</span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="text-accent hover:underline font-medium cursor-pointer"
          >
            保存
          </button>
        </div>
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
      } ${justSaved ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-400" : ""} ${className}`}
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
