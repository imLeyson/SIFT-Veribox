"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Wand2,
  Check,
  RotateCcw,
  X,
  Sparkles,
} from "lucide-react";
import type { CardType } from "@/lib/agent/card-chat";

export interface CardChatPanelProps {
  nodeId: string;
  cardType: CardType;
  cardTitle: string;
  cardData: Record<string, any>;
  upstreamContext?: {
    goal?: string;
    themeName?: string;
    strategyIntent?: string;
    priorities?: string[];
    avoid?: string[];
    criteria?: string[];
  };
  starterChips?: string[];
  onApplyUpdate: (patch: Record<string, any>) => void;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedAction?: {
    type: string;
    label: string;
    patch: Record<string, any>;
  };
}

function previewPatchText(patch: Record<string, any>): string {
  if (typeof patch.prompt === "string") return patch.prompt;
  if (typeof patch.extraQuery === "string") return `检索词：${patch.extraQuery}`;
  if (typeof patch.cons === "string") return patch.cons;
  if (typeof patch.pros === "string") return patch.pros;
  return JSON.stringify(patch, null, 2);
}

export function CardChatPanel({
  nodeId: _nodeId,
  cardType,
  cardTitle,
  cardData,
  upstreamContext,
  starterChips,
  onApplyUpdate,
  onClose,
}: CardChatPanelProps) {
  const themeName = upstreamContext?.themeName || cardData.themeName || cardTitle || "当前卡片";

  // Focused, professional starter chips tailored to card type
  const defaultChips = useMemo(() => {
    if (starterChips && starterChips.length > 0) return starterChips;
    if (cardType === "imageGen") {
      return [
        "强化高级影棚 45° 立体侧光",
        "注入哑光半透骨瓷阻尼触感",
        "融入极简晨光桌面场景",
      ];
    }
    if (cardType === "platformPlan") {
      return [
        "补充 Behance 工业设计黑话",
        "提取合模分型与真实打样词",
        "排除廉价塑料模型渲染噪词",
      ];
    }
    if (cardType === "route") {
      return [
        "深挖几何形态冲突张力",
        "提炼竞品断层差异化",
        "优化避坑与防跑偏边界",
      ];
    }
    return ["深化当前设计决策合理性", "梳理核心评估准则", "提取专业关键词"];
  }, [starterChips, cardType]);

  // Initial greeting (concise, restrained)
  const initialGreeting = useMemo<ChatMessage>(() => {
    let msg = `已接入针对「${themeName}」的协同对话。`;
    if (cardType === "imageGen") {
      msg = `你可以直接点击下方快速意图，或输入期望微调的光影转折、材质肌理或构图氛围。`;
    } else if (cardType === "platformPlan") {
      msg = `可针对该主题的去噪关键词、合模工艺或海外设计黑话进行定向追问。`;
    } else if (cardType === "route") {
      msg = `可针对该风格主题的设计血统、感官意象或避坑准则进行提炼优化。`;
    }
    return {
      id: "init",
      role: "assistant",
      content: msg,
    };
  }, [themeName, cardType]);

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [appliedActionIds, setAppliedActionIds] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Support ESC key to flip back to card view
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/card-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType,
          cardTitle,
          cardData,
          upstreamContext,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`服务响应异常 (${response.status})`);
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply || "已推演完成相关设计调整建议。",
        suggestedAction: data.suggestedAction || undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `暂时无法连接远程协同：${err?.message || "网络异常"}。已启用本地设计推导。`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleApplyAction = (actionId: string, patch: Record<string, any>) => {
    onApplyUpdate(patch);
    setAppliedActionIds((prev) => new Set(prev).add(actionId));
  };

  const handleResetConversation = () => {
    setMessages([initialGreeting]);
    setAppliedActionIds(new Set());
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-[380px] bg-white rounded-xl overflow-hidden border border-stone-200 text-stone-800 shadow-2xs">
      {/* Restrained Subheader */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-stone-200 text-[11px]">
        <div className="flex items-center gap-1.5 font-medium text-stone-700 min-w-0">
          <span className="font-semibold text-stone-800 shrink-0">
            卡片协同 Co-pilot
          </span>
          <span className="text-stone-400 font-mono text-[10px]">·</span>
          <span className="text-stone-600 truncate">
            {themeName}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleResetConversation}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="清空对话记录"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="返回卡片结构视图 (Esc)"
          >
            <span>返回卡片</span>
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Message history */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-2.5 font-sans text-[11.5px] leading-relaxed no-scrollbar"
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`rounded-xl px-3 py-2 ${
                  isUser
                    ? "bg-stone-900 text-stone-100 max-w-[85%]"
                    : "bg-stone-50 text-stone-800 border border-stone-200/80 max-w-[95%]"
                }`}
              >
                <div className="whitespace-pre-wrap select-text leading-relaxed">
                  {msg.content}
                </div>

                {/* Clean, Restrained Proposed Action Block */}
                {!isUser && msg.suggestedAction && (
                  <div className="mt-2.5 pt-2 border-t border-stone-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                      <span className="font-semibold text-stone-700">建议参数调整</span>
                      <span className="bg-stone-200/60 text-stone-600 px-1 py-0.2 rounded text-[9px]">
                        {msg.suggestedAction.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-700 bg-white p-2 rounded border border-stone-200/80 font-mono leading-snug line-clamp-3 select-text">
                      {previewPatchText(msg.suggestedAction.patch)}
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyAction(msg.id, msg.suggestedAction!.patch)
                        }
                        className={`flex-1 py-1 px-2.5 rounded-lg text-[10.5px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          appliedActionIds.has(msg.id)
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-900 hover:bg-stone-800 text-white active:scale-[0.99]"
                        }`}
                      >
                        {appliedActionIds.has(msg.id) ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>已应用到卡片</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-3 w-3" />
                            <span>{msg.suggestedAction.label || "应用此变更到卡片"}</span>
                          </>
                        )}
                      </button>

                      {appliedActionIds.has(msg.id) && (
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-2 py-1 rounded-lg text-[10.5px] text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
                        >
                          返回
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-1.5 text-stone-400 text-[11px] py-1 pl-1">
            <Sparkles className="h-3 w-3 animate-spin text-stone-500" />
            <span>推演中...</span>
          </div>
        )}
      </div>

      {/* Starter Chips Bar */}
      <div className="px-2.5 py-1.5 bg-stone-50/80 border-t border-stone-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[9.5px] text-stone-400 font-mono shrink-0">快捷建议:</span>
        {defaultChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(chip)}
            disabled={isLoading}
            className="shrink-0 px-2 py-0.5 rounded-md bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 text-[10px] transition-colors cursor-pointer disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-2 bg-white border-t border-stone-200 flex items-center gap-1.5">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="追问细节或微调参数（Enter 发送，Esc 返回）..."
          className="flex-1 max-h-20 resize-none bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] text-stone-800 focus:outline-none focus:border-stone-400 focus:bg-white placeholder:text-stone-400 leading-normal"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isLoading}
          className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 active:scale-95 text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          title="发送 (Enter)"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
