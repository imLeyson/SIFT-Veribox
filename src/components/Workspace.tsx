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
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const rawBrief = useSiftStore((s) => s.rawBrief);
  const routes = useSiftStore((s) => s.routes);
  const visualInspirations = useSiftStore((s) => s.visualInspirations || []);

  const handleResetClick = () => {
    const hasContent = Boolean(
      rawBrief.trim() || state || routes.length > 0 || visualInspirations.length > 0,
    );
    if (!hasContent) {
      siftActions.reset();
    } else {
      setResetConfirmOpen(true);
    }
  };

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
            {(runtimeMode ?? mode) === "mock" && (
              <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.5 text-[10px] font-mono">
                Mock 示例
              </span>
            )}
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
          <button className="btn-ghost text-xs" onClick={handleResetClick}>
            新建
          </button>
        </div>
      </header>
      {storageWarning && (
        <div
          role="status"
          className="border-b border-amber-200/80 bg-amber-50/70 px-4 py-1.5 text-xs text-amber-900"
        >
          {storageWarning}
        </div>
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

      {/* Safe Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setResetConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-ink">
                开启全新设计项目？
              </h3>
              <p className="text-xs leading-relaxed text-stone-500">
                当前项目已沉淀了设计简报、视觉坚持与红线、参考图与探索路线。开启新项目将清空当前画布上的全部内容。
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2 border-t border-line/60">
              {Boolean(state) && (
                <button
                  type="button"
                  onClick={() => {
                    setResetConfirmOpen(false);
                    setDossierOpen(true);
                  }}
                  className="w-full sm:w-auto btn-ghost text-xs text-accent hover:text-accent font-medium flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>先备份导出提案</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="w-full sm:w-auto btn-ghost text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetConfirmOpen(false);
                  siftActions.reset();
                }}
                className="w-full sm:w-auto rounded-xl bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                确认清空并新建
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
