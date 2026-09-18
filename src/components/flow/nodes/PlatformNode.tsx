"use client";

import { useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { NodeShell } from "../NodeShell";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import type { VBData } from "@/types";

export function PlatformNode({
  data,
  selected,
}: NodeProps<Node<VBData, "platform">>) {
  const plan = data.plan;
  const { selectedRoute, activeStep, loading } = useVeriboxStore();
  const { advanceStep } = useVeriboxActions();
  if (!plan) return null;
  const hasNext =
    selectedRoute &&
    activeStep &&
    selectedRoute.steps.indexOf(activeStep) < selectedRoute.steps.length - 1 &&
    selectedRoute.id === data.routeId;

  return (
    <NodeShell kicker="去搜" title={data.title} selected={selected}>
      <p className="text-xs text-muted">{plan.goal}</p>
      <ol className="mt-3 space-y-3">
        {plan.sources.map((source) => (
          <li key={source.name} className="rounded-xl bg-cream/80 p-3">
            <p className="text-sm font-medium text-ink">
              {String(source.rank).padStart(2, "0")} {source.name}
              <span className="ml-2 text-xs font-normal text-muted">
                {source.label}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">{source.reason}</p>
            <ul className="mt-2 space-y-1">
              {source.queries.slice(0, 3).map((q) => (
                <QueryRow key={q.query} query={q.query} translation={q.translation} />
              ))}
            </ul>
            {source.searchUrl && source.searchUrl !== "#" && (
              <a
                href={source.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-accent-ink"
              >
                <ExternalLink className="h-3 w-3" />
                打开搜索
              </a>
            )}
          </li>
        ))}
      </ol>
      {hasNext && (
        <button
          type="button"
          className="btn-primary mt-3 w-full"
          disabled={loading}
          onClick={() => void advanceStep()}
        >
          {loading ? "准备下一步…" : "搜完了，下一步"}
        </button>
      )}
    </NodeShell>
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
