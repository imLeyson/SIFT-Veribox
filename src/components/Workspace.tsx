"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useVeriboxStore } from "@/lib/store";
import { ThinkingProgress } from "@/components/canvas/ThinkingProgress";
import { InfiniteCanvas } from "@/components/flow/InfiniteCanvas";
import { ChatDock } from "@/components/flow/ChatDock";

function subscribeHydration(onStoreChange: () => void) {
  const unsub = useVeriboxStore.persist.onFinishHydration(onStoreChange);
  if (useVeriboxStore.persist.hasHydrated()) onStoreChange();
  return unsub;
}

export function Workspace() {
  const { step, error, reset, loading, nodes, goBack } = useVeriboxStore();
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => useVeriboxStore.persist.hasHydrated(),
    () => false
  );
  const [agentLabel, setAgentLabel] = useState("Exploration Agent");

  useEffect(() => {
    void fetch("/api/status")
      .then((r) => r.json())
      .then((info: { mode?: string; model?: string | null }) => {
        if (info.mode === "live" && info.model) {
          setAgentLabel("Grok 4.6");
        } else if (info.mode === "live") {
          setAgentLabel("Live Agent");
        } else {
          setAgentLabel("Mock Agent");
        }
      })
      .catch(() => undefined);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-sm text-muted">
        加载画布…
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-full flex-1 flex-col overflow-hidden">
      <header className="z-10 border-b border-line/70 bg-white/50 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide text-ink">
              Veribox
            </p>
            <p className="text-xs text-muted">
              {loading
                ? `${agentLabel} · 正在思考`
                : `${agentLabel} · 无限画布 · ${nodes.length} 张卡片`}
            </p>
          </div>
          <p className="hidden text-xs text-muted sm:block">
            拖画布平移 · 拖标题移动卡片 · 拉线连接 · 对话会读整张画布
          </p>
          <div className="flex items-center gap-2">
            {step !== "brief_input" && (
              <button type="button" className="btn-ghost text-xs" onClick={goBack}>
                返回上一步
              </button>
            )}
            <button type="button" className="btn-ghost text-xs" onClick={reset}>
              新建探索
            </button>
          </div>
        </div>
      </header>

      {loading && <ThinkingProgress step={step} />}

      {error && (
        <div
          role="alert"
          className="z-10 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <InfiniteCanvas />
        </div>
        <ChatDock />
      </div>
    </div>
  );
}
