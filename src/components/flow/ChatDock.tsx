"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import { QuestionBlock } from "./QuestionBlock";

const CHIPS = ["词再具体点", "换个搜法", "先看国内货架"];

export function ChatDock() {
  const {
    messages,
    selectedNodeId,
    nodes,
    chatOpen,
    setChatOpen,
    loading,
    pendingQuestions,
    askRoundByStage,
  } = useVeriboxStore();
  const { sendCanvasChat, cancelInflight, submitAnswers } = useVeriboxActions();
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const focus = nodes.find((n) => n.id === selectedNodeId);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  if (!chatOpen) {
    return (
      <button
        type="button"
        className="btn-primary absolute right-4 bottom-4 z-20 shadow-lg"
        onClick={() => setChatOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        与画布对话
      </button>
    );
  }

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-line/80 bg-white/75 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">画布对话</p>
          <p className="mt-1 truncate rounded-full bg-mist px-2.5 py-0.5 text-xs text-ink">
            {focus ? `焦点 · ${focus.data.title}` : "未选卡片 · 会看整张画布"}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost !px-2 !py-1 text-xs"
          onClick={() => setChatOpen(false)}
        >
          收起
        </button>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed text-muted">
            点选卡片后提问。普通问题只回答；只有明确要求深化时才会加卡片。
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-8 rounded-2xl bg-ink px-3 py-2 text-sm leading-relaxed text-cream"
                : "mr-6 rounded-2xl bg-mist px-3 py-2 text-sm leading-relaxed text-ink"
            }
          >
            {m.content}
          </div>
        ))}
        {pendingQuestions.some((q) => q.stage === "chat") && (
          <QuestionBlock
            key={pendingQuestions
              .filter((q) => q.stage === "chat")
              .map((q) => q.id)
              .join("|")}
            questions={pendingQuestions.filter((q) => q.stage === "chat")}
            stall={askRoundByStage.chat >= 2}
            disabled={loading}
            onSubmit={(answers, proceed) =>
              void submitAnswers(answers, proceed, "chat")
            }
          />
        )}
        {loading && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <p className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              正在思考，最多约 45 秒…
            </p>
            <button
              type="button"
              className="underline"
              onClick={() => cancelInflight()}
            >
              取消
            </button>
          </div>
        )}
      </div>

      <form
        className="border-t border-line/70 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const next = text.trim();
          if (!next || loading) return;
          setText("");
          void sendCanvasChat(next);
        }}
      >
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="rounded-full border border-line bg-cream/80 px-2.5 py-1 text-[11px] text-ink hover:border-ink/40"
              onClick={() => setText(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={
            focus
              ? `针对「${focus.data.title}」继续想…`
              : "基于当前画布，继续想…"
          }
          className="w-full resize-none rounded-xl border border-line bg-cream/70 px-3 py-2 text-sm outline-none focus:border-accent"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          className="btn-primary mt-2 w-full"
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在读画布…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              发送
            </>
          )}
        </button>
      </form>
    </aside>
  );
}
