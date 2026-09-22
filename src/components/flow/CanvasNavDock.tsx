"use client";

import { useState } from "react";
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
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Target,
} from "lucide-react";
import { DecisionDrawer } from "./DecisionDrawer";

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
  const collapsedNodes = useSiftStore((s) => s.collapsedNodes);
  const collapseCompletedNodes = useSiftStore((s) => s.collapseCompletedNodes);
  const expandAllNodes = useSiftStore((s) => s.expandAllNodes);
  const hasCollapsed = Object.values(collapsedNodes).some(Boolean);

  const itemDecisions = useSiftStore((s) => s.itemDecisions);
  const [decisionDrawerOpen, setDecisionDrawerOpen] = useState(false);
  const decisionValues = Object.values(itemDecisions);
  const confirmedCount = decisionValues.filter((i) => i.status === "confirmed").length;
  const uncertainCount = decisionValues.filter((i) => i.status === "uncertain").length;
  const discardedCount = decisionValues.filter((i) => i.status === "discarded").length;
  const totalDecisions = decisionValues.length;

  const isConfirmed = useSiftStore((s) => s.state?.status === "confirmed");
  const hasStarted = hasState || routes.length > 0;
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const isCollapsed = userCollapsed ?? !hasStarted;

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setUserCollapsed(false)}
        className="flex items-center gap-1.5 rounded-full border border-line/80 bg-cream/90 px-3 py-1.5 text-xs font-medium text-stone-600 shadow-md backdrop-blur-md hover:bg-white hover:text-ink transition-all cursor-pointer select-none"
        title="展开流程节点导航"
      >
        <Compass className="h-3.5 w-3.5 text-accent" />
        <span>流程导航</span>
        <ChevronUp className="h-3 w-3 text-stone-400" />
      </button>
    );
  }

  return (
    <nav aria-label="流程节点导航" className="flex items-center gap-1 rounded-2xl border border-line/80 bg-cream/95 px-2 py-1.5 shadow-lg backdrop-blur-md max-w-[calc(100vw-2rem)] overflow-x-auto transition-all">
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
        <span>{next?.type === "ask" ? "01 抉择" : "02 方向"}</span>
        {isConfirmed && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        )}
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 03 Themes */}
      <button
        type="button"
        title="跳转到 03 设计主题"
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
        <span>03 主题</span>
        {routes.length > 0 && (
          <span className="rounded-full bg-stone-200/80 px-1 text-[10px] font-semibold text-stone-700">
            {routes.length}
          </span>
        )}
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 04 Steps */}
      <button
        type="button"
        title="跳转到 04 视觉视点"
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
        <span>04 视点</span>
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 05 Search Plans */}
      <button
        type="button"
        title={
          platformPlans.length > 0
            ? "跳转到 05 灵感检索"
            : selectedRouteId
              ? "查看视点并获取精准检索方案"
              : "暂无检索方案"
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
        <span>05 搜索</span>
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
        title="全局鸟瞰 (适应全屏)"
        onClick={() =>
          void fitView({ padding: 0.2, maxZoom: 0.95, duration: 350 })
        }
        className="flex items-center gap-1 rounded-xl p-1.5 text-xs text-muted transition-colors hover:bg-white/80 hover:text-ink cursor-pointer flex-shrink-0"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Global Card Fold Toggle */}
      {hasStarted && (
        <button
          type="button"
          title={hasCollapsed ? "展开全部卡片" : "一键收起已完成步骤 (减少视觉负担)"}
          onClick={() => {
            if (hasCollapsed) {
              expandAllNodes();
            } else {
              collapseCompletedNodes();
            }
          }}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-ink hover:bg-white/80 transition-colors cursor-pointer flex-shrink-0"
        >
          {hasCollapsed ? (
            <>
              <ChevronsUpDown className="h-3.5 w-3.5 text-stone-500" />
              <span>展开全部</span>
            </>
          ) : (
            <>
              <ChevronsDownUp className="h-3.5 w-3.5 text-stone-500" />
              <span>收起已完成</span>
            </>
          )}
        </button>
      )}

      {/* Export Dossier Shortcut (only when proposal available) */}
      {(hasState || routes.length > 0) && (
        <button
          type="button"
          title="导出设计探索全案简报"
          onClick={onOpenDossier}
          className="flex items-center gap-1 rounded-xl bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent transition-all hover:bg-accent hover:text-white cursor-pointer flex-shrink-0"
        >
          <FileDown className="h-3.5 w-3.5" />
          <span>导出提案</span>
        </button>
      )}

      {/* Decision Tracker Dock Button */}
      {hasStarted && (
        <button
          type="button"
          title="查看与管理确定项、待定想法与已舍弃内容"
          onClick={() => setDecisionDrawerOpen(true)}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium text-stone-700 hover:text-ink hover:bg-white/80 transition-colors cursor-pointer flex-shrink-0"
        >
          <Target className="h-3.5 w-3.5 text-accent" />
          <span className="hidden sm:inline">决策基石</span>
          {totalDecisions > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold">
              {confirmedCount > 0 && <span className="text-emerald-700">{confirmedCount}✓</span>}
              {uncertainCount > 0 && <span className="text-amber-700">{uncertainCount}?</span>}
              {discardedCount > 0 && <span className="text-stone-400">{discardedCount}✕</span>}
            </span>
          )}
        </button>
      )}

      {/* Collapse Toggle */}
      <button
        type="button"
        title="收起导航栏"
        onClick={() => setUserCollapsed(true)}
        className="flex items-center rounded-xl p-1.5 text-xs text-stone-400 hover:text-ink hover:bg-white/80 transition-colors cursor-pointer flex-shrink-0"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {/* Global Decision Inspector Drawer */}
      <DecisionDrawer
        isOpen={decisionDrawerOpen}
        onClose={() => setDecisionDrawerOpen(false)}
      />
    </nav>
  );
}
