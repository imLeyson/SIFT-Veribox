"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";

export function StateSelector() {
  const { loading, goBack } = useVeriboxStore();
  const { chooseStartingState } = useVeriboxActions();
  const [mode, setMode] = useState<"choose" | "has_idea">("choose");
  const [ideaText, setIdeaText] = useState("");

  if (mode === "has_idea") {
    return (
      <section className="mx-auto w-full max-w-xl">
        <div className="card p-8">
          <h2 className="font-serif text-2xl text-ink">用几个词描述你的感觉</h2>
          <p className="mt-2 text-sm text-muted">
            例如：自然 / 编辑感 / 克制
          </p>
          <input
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            placeholder="用空格、逗号或斜线分隔"
            className="mt-6 w-full rounded-xl border border-line bg-cream/60 px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={loading || !ideaText.trim()}
              onClick={() => {
                const ideas = ideaText
                  .split(/[\s,，/、]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                void chooseStartingState("has_idea", ideas);
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Grok 正在编排路线…
                </>
              ) : (
                "生成探索路线"
              )}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMode("choose")}
            >
              返回
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="card p-8 sm:p-10">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">
          你现在已经有一些视觉想法了吗？
        </h2>
        <p className="mt-3 text-sm text-muted">
          两种状态会导向不同的探索入口，不要求所有人从同一点开始。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-2xl border border-line bg-cream/50 p-5 text-left transition hover:border-accent hover:bg-white"
            onClick={() => setMode("has_idea")}
          >
            <p className="text-sm font-medium text-accent">状态 A</p>
            <p className="mt-2 text-lg font-medium text-ink">我已经有一些想法</p>
            <p className="mt-2 text-sm text-muted">
              有感觉，但不知道如何系统展开。
            </p>
          </button>

          <button
            type="button"
            disabled={loading}
            className="rounded-2xl border border-line bg-cream/50 p-5 text-left transition hover:border-accent hover:bg-white disabled:opacity-60"
            onClick={() => void chooseStartingState("no_idea")}
          >
            <p className="text-sm font-medium text-accent">状态 B</p>
            <p className="mt-2 text-lg font-medium text-ink">我还没有明确想法</p>
            <p className="mt-2 text-sm text-muted">
              不硬想关键词，直接根据 Brief 生成入口。
            </p>
            {loading && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                生成路线…
              </p>
            )}
          </button>
        </div>

        <button type="button" className="btn-ghost mt-6" onClick={goBack}>
          返回 Brief
        </button>
      </div>
    </section>
  );
}
