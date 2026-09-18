"use client";

import type { ExplorationRoute } from "@/types";

export function RouteTimeline({
  route,
  activeStep,
}: {
  route: ExplorationRoute;
  activeStep: string | null;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        本套搜索顺序
      </p>
      <h3 className="mt-1 font-serif text-xl text-ink">{route.title}</h3>
      <ol className="mt-4 flex flex-wrap items-center gap-2">
        {route.steps.map((step, i) => {
          const active = step === activeStep;
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={[
                  "rounded-full px-3 py-1 text-sm",
                  active
                    ? "bg-ink text-cream"
                    : "bg-mist text-muted",
                ].join(" ")}
              >
                {active ? `NOW · ${step}` : step}
              </span>
              {i < route.steps.length - 1 && (
                <span className="text-muted/40" aria-hidden>
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted">
        先搜这一步。复制关键词，打开网站。搜完再点下一步。
      </p>
    </div>
  );
}
