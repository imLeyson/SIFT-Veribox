"use client";

import { Loader2 } from "lucide-react";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";

const SAMPLE =
  "为一个面向 20–30 岁女性的新护肤品牌寻找视觉方向，希望自然、年轻、有品质感，但不要太少女，也不要传统有机品牌感。";

export function BriefInput() {
  const { rawBrief, loading, setRawBrief } = useVeriboxStore();
  const { analyzeBrief } = useVeriboxActions();

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="card p-8 sm:p-10">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
          Veribox
        </p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          先把任务变成能搜的词
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          粘贴项目 Brief。下一步会给出搜索顺序和中英文关键词，复制后去 Pinterest / Behance / 小红书搜。
        </p>

        <label htmlFor="brief" className="sr-only">
          设计 Brief
        </label>
        <textarea
          id="brief"
          value={rawBrief}
          onChange={(e) => setRawBrief(e.target.value)}
          rows={7}
          placeholder="粘贴或输入项目 Brief…"
          className="mt-8 w-full resize-y rounded-2xl border border-line bg-cream/70 px-4 py-3 text-base leading-relaxed text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={analyzeBrief}
            disabled={loading || !rawBrief.trim()}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Grok 正在理解 Brief…
              </>
            ) : (
              "开始分析"
            )}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setRawBrief(SAMPLE)}
          >
            填入示例 Brief
          </button>
        </div>
      </div>
    </section>
  );
}
