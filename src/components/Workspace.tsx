"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { InfiniteCanvas } from "./flow/InfiniteCanvas";
import { CanvasErrorBoundary } from "./flow/CanvasErrorBoundary";
import { ThinkingProgress } from "./canvas/ThinkingProgress";
import { DossierModal } from "./dossier/DossierModal";
import { GlobalChatView } from "./chat/GlobalChatView";
import { ResultPanel } from "./results/ResultPanel";
import { ProjectSwitcher } from "./project/ProjectSwitcher";
import { CollaborationBar } from "./collaboration/CollaborationBar";
import { createProject } from "@/lib/project-manager";
import { CheckSquare, FileDown, MessageSquare, Plus } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";

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
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const outcomeCount = useSiftStore((s) => s.outcomeItems.length);
  const handleSelectionChange = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds((current) => {
      if (current.length === nodeIds.length && current.every((id, index) => id === nodeIds[index])) {
        return current;
      }
      return nodeIds;
    });
  }, []);

  useEffect(() => {
    void useSiftStore.persist.rehydrate();
    const ac = new AbortController();
    void fetch("/api/status", { signal: ac.signal })
      .then((r) => r.json())
      .then((info) => setRuntimeMode(info.mode))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [advisorOpen, resultsOpen]);

  if (!ready)
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted">
        正在恢复当前会话…
      </div>
    );
  return (
    <ReactFlowProvider>
      <main className="flex h-dvh flex-col overflow-hidden">
        <header className="z-10 flex h-12 items-center justify-between border-b border-stone-200/80 bg-white/80 px-4 backdrop-blur-md select-none sm:px-5">
          <div className="flex items-center gap-2.5">
            {/* Brand Logo - clean, confident, restrained */}
            <span className="font-serif font-black tracking-wider text-base text-stone-900 select-none">
              SIFT
            </span>

            <span className="text-stone-300 font-light select-none">/</span>

            {/* Module 5: Multi-Project Canvas Switcher */}
            <ProjectSwitcher />

            {/* Strategy Advisor Drawer Toggle */}
            <button
              type="button"
              onClick={() => {
                setAdvisorOpen(!advisorOpen);
                setResultsOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                advisorOpen
                  ? "bg-stone-100 text-stone-900 border-stone-300 shadow-2xs font-semibold"
                  : "bg-white/80 hover:bg-stone-100/80 border-stone-200/90 text-stone-600 hover:text-stone-900"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-stone-500" />
              <span>策略顾问</span>
              {Boolean(state) && (
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setResultsOpen(!resultsOpen);
                setAdvisorOpen(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer select-none ${
                resultsOpen
                  ? "border-stone-300 bg-stone-100 text-stone-900 shadow-2xs"
                  : "border-stone-200/90 bg-white/80 text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
              title="查看已收纳的探索成果和方案"
            >
              <CheckSquare className="h-3.5 w-3.5 text-stone-500" />
              <span>成果</span>
              {outcomeCount > 0 && (
                <span className="min-w-4 rounded-full bg-stone-900 px-1 text-center text-[9px] font-semibold text-white">
                  {outcomeCount}
                </span>
              )}
            </button>
          </div>

          {/* Right side utility actions */}
          <div className="flex items-center gap-1.5">
            {/* Multi-user real-time collaboration */}
            <CollaborationBar />
          {state?.status === "questioning" && (
            <button
              type="button"
              className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              onClick={siftActions.converge}
              title="停止追问，按当前状态进入人工检查点"
            >
              快速收敛
            </button>
          )}

          {Boolean(state) && (
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-lg border border-stone-200/90 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              onClick={() => setDossierOpen(true)}
              title="导出视觉策略与收敛提案（用于前期方案对齐，非落地交付）"
            >
              <FileDown className="h-3.5 w-3.5 text-stone-500" />
              <span>导出提案</span>
            </button>
          )}

          <button
            type="button"
            className="px-2.5 py-1.5 rounded-lg border border-stone-200/90 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-xs font-medium flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
            onClick={() => createProject()}
            title="新建画布工程"
          >
            <Plus className="h-3.5 w-3.5 text-stone-500" />
            <span>新建</span>
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
      
      <div className="relative min-h-0 flex-1 flex">
        <div className="relative min-h-0 flex-1">
          <CanvasErrorBoundary>
            <InfiniteCanvas
              onOpenDossier={() => setDossierOpen(true)}
              onSelectionChange={handleSelectionChange}
            />
          </CanvasErrorBoundary>
        </div>

        {advisorOpen && (
          <div className="w-[400px] border-l border-line/70 bg-white/95 backdrop-blur-sm shadow-xl flex flex-col z-10 shrink-0">
            <GlobalChatView onClose={() => setAdvisorOpen(false)} />
          </div>
        )}
        {resultsOpen && (
          <ResultPanel
            isOpen={resultsOpen}
            onClose={() => setResultsOpen(false)}
            selectedNodeIds={selectedNodeIds}
          />
        )}
      </div>

      <DossierModal
        isOpen={dossierOpen}
        onClose={() => setDossierOpen(false)}
      />
    </main>
    </ReactFlowProvider>
  );
}
