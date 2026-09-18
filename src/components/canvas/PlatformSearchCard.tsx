"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { PlatformSource } from "@/types";

export function PlatformSearchCard({
  source,
  onSkip,
  onReplace,
}: {
  source: PlatformSource;
  onSkip?: () => void;
  onReplace?: () => void;
}) {
  return (
    <article className="card flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {String(source.rank).padStart(2, "0")}
          </p>
          <h3 className="mt-1 text-xl font-medium text-ink">{source.name}</h3>
          <span className="mt-2 inline-block rounded-full bg-mist px-2.5 py-0.5 text-xs text-ink">
            {source.label}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{source.reason}</p>

      <ul className="mt-5 space-y-2">
        {source.queries.map((q) => (
          <li key={q.query}>
            <KeywordChip query={q.query} translation={q.translation} />
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        {source.searchUrl && source.searchUrl !== "#" && (
          <a
            href={source.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <ExternalLink className="h-4 w-4" />
            打开搜索
          </a>
        )}
        {onSkip && (
          <button type="button" className="btn-ghost" onClick={onSkip}>
            跳过
          </button>
        )}
        {onReplace && (
          <button type="button" className="btn-ghost" onClick={onReplace}>
            换一个
          </button>
        )}
      </div>
    </article>
  );
}

function KeywordChip({
  query,
  translation,
}: {
  query: string;
  translation: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-cream/80 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-mono text-sm text-ink">{query}</p>
        <p className="text-xs text-muted">{translation}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-white hover:text-ink"
        aria-label={`复制 ${query}`}
        onClick={() => void copy()}
      >
        {copied ? (
          <Check className="h-4 w-4 text-accent-ink" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
