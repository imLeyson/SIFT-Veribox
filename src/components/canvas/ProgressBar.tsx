"use client";

import type { FlowStep } from "@/types";

const STEPS: { id: FlowStep; label: string }[] = [
  { id: "brief_input", label: "01 任务" },
  { id: "brief_confirm", label: "02 确认" },
  { id: "routes", label: "03 方案" },
  { id: "platform_plan", label: "04 去搜" },
];

const ORDER: FlowStep[] = STEPS.map((s) => s.id);

export function ProgressBar({ step }: { step: FlowStep }) {
  const current = ORDER.indexOf(step);
  return (
    <nav aria-label="进度" className="flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-medium tracking-wide",
                active
                  ? "bg-ink text-cream"
                  : done
                    ? "bg-mist text-ink"
                    : "bg-white/60 text-muted",
              ].join(" ")}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-muted/40" aria-hidden>
                →
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
