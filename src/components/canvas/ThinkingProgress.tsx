"use client";

import { useEffect, useState } from "react";
import type { FlowStep } from "@/types";

const PHASES: Record<string, string[]> = {
  brief_input: ["读取任务", "提取已知与未知", "写成可确认的卡片"],
  brief_confirm: ["判断先搜什么", "编排 3 套顺序", "配上推荐理由"],
  routes: ["判断先搜什么", "编排 3 套顺序", "配上推荐理由"],
  platform_plan: ["匹配网站", "写中英搜索词", "排好复制顺序"],
  canvas_chat: ["阅读整张画布", "判断缺口与焦点", "长出可执行的新卡片"],
};

function titleFor(step: FlowStep) {
  if (step === "brief_input") return "正在理解任务";
  if (step === "brief_confirm" || step === "routes") return "正在生成搜索方案";
  if (step === "platform_plan") return "正在准备关键词";
  if (step === "canvas_chat") return "正在阅读画布并思考";
  return "正在思考";
}

function phaseIndex(elapsedMs: number) {
  if (elapsedMs < 3500) return 0;
  if (elapsedMs < 14000) return 1;
  return 2;
}

function easedPercent(elapsedMs: number) {
  const p = 1 - Math.exp(-elapsedMs / 16000);
  return Math.min(92, 8 + p * 84);
}

export function ThinkingProgress({ step }: { step: FlowStep }) {
  const [pct, setPct] = useState(8);
  const [phase, setPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const phases = PHASES[step] ?? PHASES.brief_input;

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const ms = now - start;
      setElapsed(ms);
      setPct(easedPercent(ms));
      setPhase(phaseIndex(ms));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const seconds = Math.max(1, Math.round(elapsed / 1000));

  return (
    <div
      className="border-b border-line/70 bg-white/70 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-[3px] w-full bg-mist"
        role="progressbar"
        aria-label="Agent 思考进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div
          className="think-bar-fill h-full bg-ink"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-medium text-ink">{titleFor(step)}</p>
          <p className="mt-0.5 text-xs text-muted">已思考 {seconds} 秒</p>
        </div>

        <ol className="flex flex-wrap items-center gap-2">
          {phases.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={[
                  "rounded-full px-2.5 py-1 text-xs",
                  i === phase
                    ? "bg-ink text-cream"
                    : i < phase
                      ? "bg-mist text-ink"
                      : "bg-white/70 text-muted",
                ].join(" ")}
              >
                {String(i + 1).padStart(2, "0")} {label}
              </span>
              {i < phases.length - 1 && (
                <span className="text-muted/40" aria-hidden>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
