"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { ExplorationRoute } from "@/types";

export function RouteCard({
  route,
  recommended,
  dimmed,
  onSelect,
  selecting,
}: {
  route: ExplorationRoute;
  recommended: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  selecting?: boolean;
}) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <article
      className={[
        "card relative flex h-full flex-col p-6 transition",
        dimmed ? "opacity-40" : "hover:-translate-y-0.5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {route.id.replace("route_", "Route ")}
        </p>
        <div className="flex items-center gap-2">
          {recommended && (
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent-ink">
              推荐
            </span>
          )}
          <button
            type="button"
            aria-label="为什么推荐"
            aria-expanded={showWhy}
            className="rounded-full p-1 text-muted hover:bg-mist hover:text-ink"
            onClick={() => setShowWhy((v) => !v)}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      <h3 className="mt-3 font-serif text-xl text-ink">{route.title}</h3>

      <p className="mt-4 text-sm leading-relaxed text-ink/80">
        {route.steps.join(" → ")}
      </p>

      <p className="mt-4 text-sm text-muted">{route.purpose}</p>

      <div className="mt-5 space-y-1.5 text-sm">
        <p>
          <span className="text-accent-ink">＋</span> {route.advantage}
        </p>
        <p>
          <span className="text-muted">△</span> {route.watchOut}
        </p>
      </div>

      {showWhy && (
        <p className="mt-4 rounded-xl bg-mist/80 p-3 text-sm leading-relaxed text-ink/80">
          {route.recommendationReason}
        </p>
      )}

      <div className="mt-auto pt-6">
        <button
          type="button"
          className="btn-primary w-full"
          disabled={selecting || dimmed}
          onClick={onSelect}
        >
          {selecting ? "正在准备关键词…" : "用这套去搜"}
        </button>
      </div>
    </article>
  );
}
