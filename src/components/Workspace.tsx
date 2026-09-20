"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { InfiniteCanvas } from "./flow/InfiniteCanvas";
import { ThinkingProgress } from "./canvas/ThinkingProgress";

function subscribeHydration(onChange: () => void) {
  return useSiftStore.persist.onFinishHydration(onChange);
}
export function Workspace() {
  const { state, error, storageWarning, activeRequest, mode } = useSiftStore();
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => useSiftStore.persist.hasHydrated(),
    () => false,
  );
  const [runtimeMode, setRuntimeMode] = useState<"live" | "mock" | null>(null);
  useEffect(() => {
    void useSiftStore.persist.rehydrate();
    const ac = new AbortController();
    void fetch("/api/status", { signal: ac.signal })
      .then((r) => r.json())
      .then((info) => setRuntimeMode(info.mode))
      .catch(() => {});
    return () => ac.abort();
  }, []);
  if (!ready)
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted">
        正在恢复当前会话…
      </div>
    );
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line/70 bg-white/60 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-ink">SIFT</h1>
          <p className="mt-0.5 text-xs text-muted">
            设计方向收敛 · 少问一点，判断清楚一点
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state?.status === "questioning" && (
            <button
              className="btn-ghost text-xs"
              onClick={siftActions.converge}
              title="停止追问，按当前状态进入人工检查点"
            >
              一键收敛
            </button>
          )}
          <button className="btn-ghost text-xs" onClick={siftActions.reset}>
            新建收敛
          </button>
        </div>
      </header>
      {(runtimeMode ?? mode) === "mock" && (
        <p className="border-b border-line/60 bg-mist/60 px-4 py-2 text-xs text-muted">
          Mock 示例模式 · 用预设示例演示闭环；真实项目的判断需要配置模型。
        </p>
      )}
      {storageWarning && (
        <p
          role="status"
          className="border-b border-line px-4 py-2 text-xs text-muted"
        >
          {storageWarning}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {error}。输入已保留，可再次提交。
        </div>
      )}
      {activeRequest && (
        <div className="flex items-center justify-between border-b border-line/70 bg-white/60 px-4 py-2">
          <ThinkingProgress key={activeRequest.id} initial={!state} />
          <button
            className="btn-ghost !py-1 text-xs"
            onClick={siftActions.cancel}
          >
            取消
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <InfiniteCanvas />
      </div>
    </main>
  );
}
