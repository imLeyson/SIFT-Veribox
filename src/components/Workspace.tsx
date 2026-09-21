"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { InfiniteCanvas } from "./flow/InfiniteCanvas";
import { ThinkingProgress } from "./canvas/ThinkingProgress";
import { DossierModal } from "./dossier/DossierModal";
import { FileDown } from "lucide-react";

function subscribeHydration(onChange: () => void) {
  return useSiftStore.persist.onFinishHydration(onChange);
}
export function Workspace() {
  const { state, error, storageWarning, activeRequest, mode, explorationStage } =
    useSiftStore();
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => useSiftStore.persist.hasHydrated(),
    () => false,
  );
  const [runtimeMode, setRuntimeMode] = useState<"live" | "mock" | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);

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
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-wide text-ink">SIFT</h1>
            <span className="hidden md:inline-block rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
              视觉策略与方向收敛智能体
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            收敛清晰有画面感的设计主题与检索方向 · 避免前期盲目试错
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Boolean(state) && (
            <button
              className="btn-ghost !bg-accent/10 !text-accent hover:!bg-accent hover:!text-white text-xs flex items-center gap-1 font-medium transition-all"
              onClick={() => setDossierOpen(true)}
              title="导出视觉策略与收敛提案（用于前期方案对齐，非落地交付）"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>导出提案</span>
            </button>
          )}
          {state?.status === "questioning" && (
            <button
              className="btn-ghost text-xs"
              onClick={siftActions.converge}
              title="停止追问，按当前状态进入人工检查点"
            >
              快速收敛
            </button>
          )}
          <button className="btn-ghost text-xs" onClick={siftActions.reset}>
            新建
          </button>
        </div>
      </header>
      {(runtimeMode ?? mode) === "mock" && (
        <p className="border-b border-line/60 bg-mist/60 px-4 py-2 text-xs text-muted">
          Mock 示例模式；配置 API 密钥后可启用实时模型。
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
          <ThinkingProgress
            key={activeRequest.id}
            initial={!state}
            stage={explorationStage}
          />
          <button
            className="btn-ghost !py-1 text-xs"
            onClick={siftActions.cancel}
          >
            取消
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <InfiniteCanvas onOpenDossier={() => setDossierOpen(true)} />
      </div>
      <DossierModal
        isOpen={dossierOpen}
        onClose={() => setDossierOpen(false)}
      />
    </main>
  );
}
