"use client";

import { useMemo, useState } from "react";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import { RouteTimeline } from "./RouteTimeline";
import { PlatformSearchCard } from "./PlatformSearchCard";
import type { PlatformSource } from "@/types";

export function PlatformPlanView() {
  const {
    selectedRoute,
    activeStep,
    platformPlan,
    loading,
    goBack,
    recordChange,
  } = useVeriboxStore();
  const { advanceStep } = useVeriboxActions();

  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [showMore, setShowMore] = useState(false);
  const [replaced, setReplaced] = useState<Record<string, PlatformSource>>({});

  const sources = useMemo(() => {
    if (!platformPlan) return [];
    return platformPlan.sources
      .map((s) => replaced[s.name] ?? s)
      .filter((s) => !skipped.has(s.name));
  }, [platformPlan, replaced, skipped]);

  if (!selectedRoute) return null;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <RouteTimeline route={selectedRoute} activeStep={activeStep} />

      <div>
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">
          现在搜「{activeStep}」
        </h2>
        <p className="mt-2 text-sm text-muted">
          {platformPlan?.goal ?? "复制关键词，打开网站去搜。搜完再回来点下一步。"}
        </p>
      </div>

      {loading && !platformPlan ? (
        <div
          className="grid gap-4 md:grid-cols-3"
          aria-hidden
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-56 animate-pulse p-6">
              <div className="h-3 w-8 rounded bg-mist" />
              <div className="mt-3 h-5 w-24 rounded bg-mist" />
              <div className="mt-6 h-16 rounded bg-cream" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {sources.map((source) => (
            <PlatformSearchCard
              key={source.name}
              source={source}
              onSkip={() => {
                setSkipped((prev) => new Set(prev).add(source.name));
                recordChange(`skip:${source.name}`);
              }}
              onReplace={() => {
                const alt = platformPlan?.alternatives.find(
                  (a) =>
                    !sources.some((s) => s.name === a.name) &&
                    !skipped.has(a.name)
                );
                if (!alt) return;
                setReplaced((prev) => ({ ...prev, [source.name]: alt }));
                recordChange(`replace:${source.name}->${alt.name}`);
              }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {selectedRoute &&
          activeStep &&
          selectedRoute.steps.indexOf(activeStep) <
            selectedRoute.steps.length - 1 && (
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() => void advanceStep()}
            >
              {loading ? "准备下一步…" : "这一步搜完了，下一步"}
            </button>
          )}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? "收起更多来源" : "+ 更多来源"}
        </button>
        <button type="button" className="btn-ghost" onClick={goBack}>
          换一套顺序
        </button>
      </div>

      {showMore && platformPlan && (
        <div className="grid gap-4 md:grid-cols-3">
          {platformPlan.alternatives.map((source) => (
            <PlatformSearchCard key={source.name} source={source} />
          ))}
        </div>
      )}
    </section>
  );
}
