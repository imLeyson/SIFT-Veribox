"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { NodeShell } from "../NodeShell";
import { QuestionBlock } from "../QuestionBlock";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { PlatformSource, VBData } from "@/types";

export function PlatformNode({
  id,
  data,
  selected,
}: NodeProps<Node<VBData, "platform">>) {
  const plan = data.plan;
  const {
    selectedRoute,
    activeStep,
    loading,
    skipSource,
    replaceSource,
    toggleMoreSources,
    pendingQuestions,
  } = useVeriboxStore();
  const { advanceStep, submitAnswers } = useVeriboxActions();
  const platformQs = pendingQuestions.filter((q) => q.stage === "platform");
  if (!plan && !platformQs.length) return null;

  const skipped = new Set(data.skippedSources ?? []);
  const replaced = data.replacedSources ?? {};
  const sources = plan
    ? plan.sources
        .map((s) => replaced[s.name] ?? s)
        .filter((s) => !skipped.has(s.name))
    : [];

  const hasNext =
    selectedRoute &&
    activeStep &&
    selectedRoute.steps.indexOf(activeStep) < selectedRoute.steps.length - 1 &&
    selectedRoute.id === data.routeId;

  return (
    <NodeShell kicker="去搜" title={data.title} selected={selected}>
      {platformQs.length > 0 && (
        <div className="mb-3">
          <QuestionBlock
            questions={platformQs}
            disabled={loading}
            onSubmit={(answers, proceed) =>
              void submitAnswers(answers, proceed, "platform")
            }
          />
        </div>
      )}
      {plan ? (
        <>
      <p className="text-xs text-muted">{plan.goal}</p>
      <ol className="mt-3 space-y-3">
        {sources.map((source) => (
          <SourceBlock
            key={source.name}
            source={source}
            onSkip={() => skipSource(id, source.name)}
            onReplace={() => replaceSource(id, source.name)}
          />
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ghost !px-3 !py-1 text-xs"
          onClick={() => toggleMoreSources(id)}
        >
          {data.showMoreSources ? "收起更多" : "更多来源"}
        </button>
        {hasNext && (
          <button
            type="button"
            className="btn-primary !px-3 !py-1 text-xs"
            disabled={loading}
            onClick={() => void advanceStep()}
          >
            {loading ? "准备下一步…" : "下一步"}
          </button>
        )}
      </div>
      {data.showMoreSources && (
        <ol className="mt-3 space-y-3">
          {plan.alternatives.map((source) => (
            <SourceBlock key={source.name} source={source} />
          ))}
        </ol>
      )}
        </>
      ) : null}
    </NodeShell>
  );
}

function SourceBlock({
  source,
  onSkip,
  onReplace,
}: {
  source: PlatformSource;
  onSkip?: () => void;
  onReplace?: () => void;
}) {
  return (
    <li className="rounded-xl bg-cream/80 p-3">
      <p className="text-sm font-medium text-ink">
        {String(source.rank).padStart(2, "0")} {source.name}
        <span className="ml-2 text-xs font-normal text-muted">{source.label}</span>
      </p>
      <p className="mt-1 text-xs text-muted">{source.reason}</p>
      <ul className="mt-2 space-y-1">
        {source.queries.slice(0, 4).map((q) => (
          <QueryRow key={q.query} query={q.query} translation={q.translation} />
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {source.searchUrl && source.searchUrl !== "#" && (
          <a
            href={source.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent-ink"
          >
            <ExternalLink className="h-3 w-3" />
            打开搜索
          </a>
        )}
        {onSkip && (
          <button type="button" className="text-xs text-muted" onClick={onSkip}>
            跳过
          </button>
        )}
        {onReplace && (
          <button type="button" className="text-xs text-muted" onClick={onReplace}>
            换一个
          </button>
        )}
      </div>
    </li>
  );
}

function QueryRow({
  query,
  translation,
}: {
  query: string;
  translation: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="min-w-0 text-xs">
        <span className="font-mono text-ink">{query}</span>
        <span className="mt-0.5 block text-muted">{translation}</span>
      </p>
      <button
        type="button"
        aria-label={`复制 ${query}`}
        className="shrink-0 text-muted hover:text-ink"
        onClick={async () => {
          await navigator.clipboard.writeText(query);
          setCopied(true);
          setTimeout(() => setCopied(false), 1000);
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
