"use client";

import { useReactFlow } from "@xyflow/react";
import { useSiftStore } from "@/lib/convergence-store";
import {
  FileEdit,
  Compass,
  GitFork,
  CheckSquare,
  Search,
  Maximize2,
  FileDown,
} from "lucide-react";

export function CanvasNavDock({
  onOpenDossier,
}: {
  onOpenDossier: () => void;
}) {
  const { fitView } = useReactFlow();
  const next = useSiftStore((s) => s.next);
  const hasState = useSiftStore((s) => Boolean(s.state));
  const routes = useSiftStore((s) => s.routes);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const activeStepId = useSiftStore((s) => s.activeStepId);
  const platformPlans = useSiftStore((s) => s.platformPlans);

  const isConfirmed = useSiftStore((s) => s.state?.status === "confirmed");

  return (
    <nav aria-label="流程节点导航" className="flex items-center gap-1 rounded-2xl border border-line/80 bg-cream/90 px-2 py-1.5 shadow-lg backdrop-blur-md">
      {/* 00 Brief */}
      <button
        type="button"
        title="跳转到 00 Brief"
        onClick={() =>
          void fitView({
            nodes: [{ id: "brief" }],
            padding: 0.3,
            maxZoom: 0.95,
            duration: 350,
          })
        }
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium text-ink transition-all hover:bg-white/80"
      >
        <FileEdit className="h-3.5 w-3.5 text-stone-500" />
        <span>00 Brief</span>
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 01 Direction / Convergence */}
      <button
        type="button"
        title="跳转到 01 方向收敛"
        disabled={!hasState}
        onClick={() =>
          void fitView({
            nodes: [
              {
                id:
                  next?.type === "ask"
                    ? `round-${next.questions.map((q) => q.id).join("-")}`
                    : "direction",
              },
            ],
            padding: 0.3,
            maxZoom: 0.95,
            duration: 350,
          })
        }
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
          hasState
            ? "text-ink hover:bg-white/80"
            : "text-stone-300 cursor-not-allowed"
        }`}
      >
        <Compass
          className={`h-3.5 w-3.5 ${hasState ? "text-accent" : "text-stone-300"}`}
        />
        <span>01 收敛</span>
        {isConfirmed && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        )}
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 03 Routes */}
      <button
        type="button"
        title="跳转到 03 探索路线"
        disabled={routes.length === 0}
        onClick={() =>
          void fitView({
            nodes: routes.map((r) => ({ id: `route-${r.id}` })),
            padding: 0.25,
            maxZoom: 0.95,
            duration: 350,
          })
        }
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
          routes.length > 0
            ? "text-ink hover:bg-white/80"
            : "text-stone-300 cursor-not-allowed"
        }`}
      >
        <GitFork
          className={`h-3.5 w-3.5 ${
            routes.length > 0 ? "text-amber-600" : "text-stone-300"
          }`}
        />
        <span>03 路线</span>
        {routes.length > 0 && (
          <span className="rounded-full bg-stone-200/80 px-1 text-[10px] font-semibold text-stone-700">
            {routes.length}
          </span>
        )}
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 05 Steps */}
      <button
        type="button"
        title="跳转到 05 步骤推进"
        disabled={!selectedRouteId}
        onClick={() =>
          void fitView({
            nodes: [{ id: "steps" }],
            padding: 0.3,
            maxZoom: 0.95,
            duration: 350,
          })
        }
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
          selectedRouteId
            ? "text-ink hover:bg-white/80"
            : "text-stone-300 cursor-not-allowed"
        }`}
      >
        <CheckSquare
          className={`h-3.5 w-3.5 ${
            selectedRouteId ? "text-emerald-600" : "text-stone-300"
          }`}
        />
        <span>05 步骤</span>
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 07 Search Plans */}
      <button
        type="button"
        title={
          platformPlans.length > 0
            ? "跳转到 07 搜索方案"
            : selectedRouteId
              ? "查看步骤并生成搜索方案"
              : "暂无搜索方案"
        }
        disabled={platformPlans.length === 0 && !selectedRouteId}
        onClick={() => {
          if (platformPlans.length > 0) {
            const target =
              platformPlans.find((p) => p.stepId === activeStepId) ??
              platformPlans.at(-1);
            if (target) {
              void fitView({
                nodes: [{ id: `plan-${target.stepId}` }],
                padding: 0.28,
                maxZoom: 0.95,
                duration: 350,
              });
            }
          } else if (selectedRouteId) {
            void fitView({
              nodes: [{ id: "steps" }],
              padding: 0.28,
              maxZoom: 0.95,
              duration: 350,
            });
          }
        }}
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
          platformPlans.length > 0 || selectedRouteId
            ? "text-ink hover:bg-white/80"
            : "text-stone-300 cursor-not-allowed"
        }`}
      >
        <Search
          className={`h-3.5 w-3.5 ${
            platformPlans.length > 0 ? "text-blue-600" : selectedRouteId ? "text-stone-500" : "text-stone-300"
          }`}
        />
        <span>07 搜索</span>
        {platformPlans.length > 0 && (
          <span className="rounded-full bg-blue-100 px-1 text-[10px] font-semibold text-blue-800">
            {platformPlans.length}
          </span>
        )}
      </button>

      <div className="mx-1 h-4 w-px bg-line/80" />

      {/* Fit All Overview */}
      <button
        type="button"
        title="全局鸟瞰"
        onClick={() =>
          void fitView({ padding: 0.2, maxZoom: 0.95, duration: 350 })
        }
        className="flex items-center gap-1 rounded-xl p-1.5 text-xs text-muted transition-colors hover:bg-white/80 hover:text-ink"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Export Dossier Shortcut */}
      <button
        type="button"
        title="导出设计探索全案简报"
        onClick={onOpenDossier}
        className="flex items-center gap-1 rounded-xl bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent transition-all hover:bg-accent hover:text-white"
      >
        <FileDown className="h-3.5 w-3.5" />
        <span>导出提案</span>
      </button>
    </nav>
  );
}
