"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSiftStore } from "@/lib/convergence-store";
import type { GlobalChatProjectContext, GlobalChatMessage } from "@/lib/agent/global-chat";
import {
  Sparkles,
  Send,
  RotateCcw,
  Copy,
  Check,
  X,
} from "lucide-react";
import {
  getActiveProjectId,
  getProjectChatHistory,
  saveProjectChatHistory,
  clearProjectChatHistory,
} from "@/lib/project-manager";

interface GlobalChatViewProps {
  onClose?: () => void;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

/**
 * Compact action chips — each one addresses a real user need from the 9.24 recording:
 * 1. "I can't tell if my themes are good" → Evaluate & compare
 * 2. "I need to deliver something after 5 hours of work" → Extract report
 * 3. "I want to see what the fusion looks like" → Generate prompt
 */
const QUICK_ACTIONS = [
  {
    label: "评估对比方案",
    prompt: "请横向对比评估画布中的风格主题路线，指出各自的致命硬伤与不可替代优势，给出适合继续验证的方向。",
  },
  {
    label: "提炼汇报阐述",
    prompt: "请帮我提炼一段约 200 字的设计策略阐述，讲清从简报到重点方向的推导逻辑，用于客户汇报。",
  },
  {
    label: "优化出图提示词",
    prompt: "请针对当前重点主题，结合策略基准中的 CMF 约束，构思一套高保真商业摄影级别的生图提示词。",
  },
];

export function GlobalChatView({ onClose }: GlobalChatViewProps) {
  const { state, rawBrief, routes, selectedRouteId, customCards, stepNotes } = useSiftStore();

  const [currentProjectId, setCurrentProjectId] = useState<string>(() => getActiveProjectId());
  const [messages, setMessages] = useState<MessageItem[]>(() => {
    return getProjectChatHistory<MessageItem>(getActiveProjectId());
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Synchronize messages when project changes
  useEffect(() => {
    const handleProjectChanged = (e: any) => {
      const targetId = e.detail?.projectId || getActiveProjectId();
      setCurrentProjectId(targetId);
      setMessages(getProjectChatHistory<MessageItem>(targetId));
    };

    window.addEventListener("sift-project-changed", handleProjectChanged as EventListener);
    window.addEventListener("sift-project-list-updated", handleProjectChanged as EventListener);
    return () => {
      window.removeEventListener("sift-project-changed", handleProjectChanged as EventListener);
      window.removeEventListener("sift-project-list-updated", handleProjectChanged as EventListener);
    };
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    if (currentProjectId) {
      saveProjectChatHistory(currentProjectId, messages);
    }
  }, [messages, currentProjectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const projectContext: GlobalChatProjectContext = useMemo(() => {
    const imageGenCards = customCards.filter((c) => c.type === "imageGen");
    const imageGenPrompts = imageGenCards
      .map((c) => c.data?.prompt)
      .filter((p): p is string => Boolean(p && typeof p === "string"));

    const noteCards = customCards.filter((c) => c.type === "note" && c.content);
    const notes = [
      ...noteCards.map((c) => c.content as string),
      ...Object.values(stepNotes).flat(),
    ];

    return {
      rawBrief: rawBrief || undefined,
      goal: state?.brief?.goal ?? undefined,
      audience: state?.brief?.audience ?? undefined,
      deliverable: state?.brief?.deliverable ?? undefined,
      strategyIntent: state?.direction?.intent?.text ?? undefined,
      currentHypothesis: state?.currentHypothesis ?? undefined,
      constraints: state?.constraints?.map((c) => c.text) ?? undefined,
      priorities: state?.direction?.priorities?.map((p) => p.text) ?? undefined,
      avoid: state?.direction?.avoid?.map((a) => a.text) ?? undefined,
      criteria: state?.direction?.criteria?.map((c) => c.text) ?? undefined,
      routes: routes.map((r) => ({
        title: r.title,
        themeName: r.themeName,
        visualSnapshot: r.visualSnapshot,
        pros: r.pros,
        cons: r.cons,
        coreProblem: r.coreProblem,
        isSelected: r.id === selectedRouteId,
      })),
      imageGenPrompts,
      notes,
    };
  }, [state, rawBrief, routes, selectedRouteId, customCards, stepNotes]);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || loading) return;

    const userMessage: MessageItem = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const apiMessages: GlobalChatMessage[] = nextHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/global-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: projectContext,
          messages: apiMessages,
        }),
      });

      if (!res.ok) {
        throw new Error(`请求失败 (${res.status})`);
      }

      const data = await res.json();
      const assistantMessage: MessageItem = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: data.reply || "未能生成有效回复，请重试。",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("[GlobalChat error]:", err);
      const errorMessage: MessageItem = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "网络波动或响应超时，请再试一次。",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([]);
    clearProjectChatHistory(currentProjectId);
    setInput("");
  };

  const hasMessages = messages.length > 0;
  const hasProject = Boolean(state);

  return (
    <div className="flex flex-col h-full bg-white border-l border-stone-200/80 text-stone-900 select-text">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200/60 bg-stone-50/60 text-xs shrink-0">
        <span className="font-semibold text-stone-800">策略顾问</span>
        <div className="flex items-center gap-1">
          {hasMessages && (
            <button
              onClick={handleResetChat}
              className="p-1 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-100/70 transition-colors"
              title="清空对话"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-100/70 transition-colors"
              title="关闭顾问面板"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Message stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {!hasMessages ? (
          /* Empty state: minimal, no filler */
          <div className="pt-4 pb-2 space-y-4">
            <div className="text-center space-y-1.5">
              <p className="text-xs text-stone-500 leading-relaxed">
                {hasProject
                  ? "已同步画布全部资产。直接提问，或使用下方快捷操作。"
                  : "画布中尚未生成设计资产。请先在画布中完成策略收敛与主题生成。"}
              </p>
            </div>

            {hasProject && (
              <div className="space-y-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-stone-50 border border-stone-200/80 hover:border-stone-400 hover:bg-stone-100/60 text-xs text-stone-700 font-medium transition-all"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Active conversation */
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[90%] rounded-xl rounded-tr-xs bg-stone-900 text-stone-50 px-3 py-2 text-xs leading-relaxed">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="w-full rounded-xl rounded-tl-xs bg-stone-50 border border-stone-200/80 px-3 py-2.5 text-stone-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span className="font-medium flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        顾问分析
                      </span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-stone-400 hover:text-stone-700 transition-colors p-0.5 rounded"
                        title="复制内容"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-2.5 w-2.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </button>
                    </div>
                    <div className="text-xs leading-relaxed space-y-1">
                      {renderFormattedMessage(msg.content, (code) => handleCopy(msg.id, code))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="rounded-xl bg-stone-50 border border-stone-200/60 px-3 py-2 text-[11px] text-stone-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse" />
                <span>分析中…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick action chips (in active conversation) */}
      {hasMessages && hasProject && (
        <div className="px-2.5 py-1.5 border-t border-stone-100 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSend(action.prompt)}
              disabled={loading}
              className="shrink-0 px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/80 hover:border-stone-400 text-[10px] text-stone-600 hover:text-stone-900 transition-all disabled:opacity-40"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-2 border-t border-stone-200 flex items-end gap-1.5 shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="向顾问提问…"
          rows={1}
          className="flex-1 max-h-20 resize-none bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-stone-400 focus:bg-white placeholder:text-stone-400 leading-normal"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 active:scale-95 text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          title="发送 (Enter)"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Compact markdown renderer for side panel
 */
function renderFormattedMessage(content: string, onCopyCode?: (code: string) => void) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        const codeText = codeBuffer.join("\n");
        elements.push(
          <div key={`code-${i}`} className="my-1.5 rounded-lg border border-stone-200 overflow-hidden bg-stone-950 text-stone-100">
            <div className="flex items-center justify-between px-2.5 py-1 bg-stone-900 border-b border-stone-800 text-[9px] font-mono text-stone-400">
              <span>PROMPT</span>
              {onCopyCode && (
                <button
                  onClick={() => onCopyCode(codeText)}
                  className="hover:text-stone-200 transition-colors flex items-center gap-0.5"
                >
                  <Copy className="h-2.5 w-2.5" />
                  <span>复制</span>
                </button>
              )}
            </div>
            <pre className="p-2.5 text-[10.5px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {codeText}
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xs font-semibold text-stone-950 mt-2 first:mt-0 pb-0.5 border-b border-stone-100">
          {line.replace("### ", "")}
        </h3>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-stone-950 mt-2 first:mt-0">
          {line.replace("## ", "")}
        </h2>
      );
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("• ")) {
      const text = line.replace(/^[-•]\s*/, "");
      elements.push(
        <li key={i} className="ml-3 list-disc text-stone-700 text-xs pl-0.5 my-0.5">
          {renderInlineFormatting(text)}
        </li>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={i} className="ml-3 list-decimal text-stone-700 text-xs pl-0.5 my-0.5">
          {renderInlineFormatting(line.replace(/^\d+\.\s*/, ""))}
        </li>
      );
      continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
      continue;
    }

    elements.push(
      <p key={i} className="text-xs text-stone-700 leading-relaxed my-0.5">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  return elements;
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-stone-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
