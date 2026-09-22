"use client";

import { useState, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSiftStore } from "@/lib/convergence-store";
import {
  FileEdit,
  Compass,
  GitFork,
  GitBranch,
  Plus,
  ImageIcon,
  CheckSquare,
  Search,
  Maximize2,
  FileDown,
  ChevronDown,
  ChevronUp,
  Layers,
  X,
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
  const canvasItems = useSiftStore((s) => s.canvasItems);
  const branches = useSiftStore((s) => s.branches);
  const activeBranchId = useSiftStore((s) => s.activeBranchId);
  const addCanvasItem = useSiftStore((s) => s.addCanvasItem);
  const schemeGroups = useSiftStore((s) => s.schemeGroups);
  const createSchemeGroup = useSiftStore((s) => s.createSchemeGroup);
  const explorationMode = useSiftStore((s) => s.explorationMode);
  const setExplorationMode = useSiftStore((s) => s.setExplorationMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConfirmed = useSiftStore((s) => s.state?.status === "confirmed");
  const hasStarted = hasState || routes.length > 0;
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const isCollapsed = userCollapsed ?? !hasStarted;

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const handleAddText = () => {
    addCanvasItem({
      type: "text",
      status: "undetermined",
      title: "新灵感想法",
      content: "写下关于材质、色彩、排版或结构的新洞察...",
      branchId: activeBranchId ?? "branch-root",
    });
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      addCanvasItem({
        type: "image",
        status: "determined",
        title: file.name.replace(/\.[^/.]+$/, "").slice(0, 24),
        content: "用户上传视觉参考素材",
        imageUrl: dataUrl,
        branchId: activeBranchId ?? "branch-root",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
    <>
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
        <span>01 收敛</span>
        {isConfirmed && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        )}
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 02 Canvas Branches */}
      <button
        type="button"
        title="跳转到画布分支探索"
        disabled={Object.keys(branches).length === 0 && !isConfirmed}
        onClick={() => {
          const itemKeys = Object.keys(canvasItems);
          if (itemKeys.length > 0) {
            void fitView({
              nodes: itemKeys.map((id) => ({ id: `node-${id}` })),
              padding: 0.25,
              maxZoom: 0.95,
              duration: 350,
            });
          }
        }}
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
          Object.keys(branches).length > 0 || isConfirmed
            ? "text-ink hover:bg-white/80"
            : "text-stone-300 cursor-not-allowed"
        }`}
      >
        <GitBranch
          className={`h-3.5 w-3.5 ${
            Object.keys(branches).length > 0 || isConfirmed
              ? "text-emerald-600"
              : "text-stone-300"
          }`}
        />
        <span>02 画布分支</span>
        {Object.keys(branches).length > 0 && (
          <span className="rounded-full bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-800">
            {Object.keys(branches).length}
          </span>
        )}
      </button>

      {/* Quick Add Buttons & Controls when confirmed or when canvas has items */}
      {(isConfirmed || Object.keys(branches).length > 0) && (
        <div className="flex items-center gap-1 pl-1 border-l border-line/60">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFile}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={handleAddText}
            className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
            title="在当前分支新建文字灵感卡"
          >
            <Plus className="h-3 w-3" />
            <span>灵感卡</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
            title="上传参考图作为画布视觉约束"
          >
            <ImageIcon className="h-3 w-3" />
            <span>参考图</span>
          </button>

          {/* Scheme Group Packaging Button */}
          <button
            type="button"
            onClick={() => {
              const determinedIds = Object.values(canvasItems)
                .filter((it) => it.status === "determined")
                .map((it) => it.id);
              setSelectedItemIds(determinedIds);
              setNewGroupName(
                `方案 ${String.fromCharCode(65 + Object.keys(schemeGroups).length)} · 视觉深化`,
              );
              setIsCreateGroupOpen(true);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200/70"
            title="将已选确定项打包为独立设计方案组"
          >
            <Layers className="h-3 w-3 text-emerald-600" />
            <span>方案组</span>
            {Object.keys(schemeGroups).length > 0 && (
              <span className="rounded-full bg-emerald-200/80 px-1 text-[9px] font-bold text-emerald-900">
                {Object.keys(schemeGroups).length}
              </span>
            )}
          </button>

          {/* Dual Exploration Mode Switcher */}
          <div className="flex items-center gap-0.5 bg-stone-200/70 p-0.5 rounded-lg text-[10px] ml-0.5">
            <button
              type="button"
              onClick={() => setExplorationMode("high_constraint")}
              className={`px-1.5 py-0.5 rounded-md font-medium transition-all ${
                explorationMode === "high_constraint"
                  ? "bg-white text-emerald-800 font-semibold shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              title="高约束收敛模式：严格贯彻所有确定项约束，做工艺与排版的精细微观推导"
            >
              🎯 高约束
            </button>
            <button
              type="button"
              onClick={() => setExplorationMode("low_constraint")}
              className={`px-1.5 py-0.5 rounded-md font-medium transition-all ${
                explorationMode === "low_constraint"
                  ? "bg-white text-amber-800 font-semibold shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
              title="低约束发散模式：在硬约束边界下，探索 2~3 种多向正交视觉假设"
            >
              💡 低约束
            </button>
          </div>
        </div>
      )}

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

      {/* 05 Steps */}
      <button
        type="button"
        title="跳转到 05 视觉视点"
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
        <span>05 视点</span>
      </button>

      <span className="text-[10px] text-stone-300">›</span>

      {/* 07 Search Plans */}
      <button
        type="button"
        title={
          platformPlans.length > 0
            ? "跳转到 07 灵感检索"
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
        title="全局鸟瞰 (适应全屏)"
        onClick={() =>
          void fitView({ padding: 0.2, maxZoom: 0.95, duration: 350 })
        }
        className="flex items-center gap-1 rounded-xl p-1.5 text-xs text-muted transition-colors hover:bg-white/80 hover:text-ink cursor-pointer flex-shrink-0"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

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

      {/* Collapse Toggle */}
      <button
        type="button"
        title="收起导航栏"
        onClick={() => setUserCollapsed(true)}
        className="flex items-center rounded-xl p-1.5 text-xs text-stone-400 hover:text-ink hover:bg-white/80 transition-colors cursor-pointer flex-shrink-0"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </nav>

    {/* Scheme Group Packaging Modal */}
    {isCreateGroupOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <h3 className="font-semibold text-sm text-stone-900">打包确定项为方案组</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(false)}
              className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-700">方案组命名</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="例如：方案 A · 极简冷峻触感"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>选择纳入该方案的卡片 ({selectedItemIds.length} 项已选)</span>
              <button
                type="button"
                onClick={() => {
                  const determinedIds = Object.values(canvasItems)
                    .filter((it) => it.status === "determined")
                    .map((it) => it.id);
                  setSelectedItemIds(determinedIds);
                }}
                className="text-emerald-700 hover:underline text-[11px]"
              >
                仅选确定项
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-stone-100 rounded-xl p-2 bg-stone-50/50">
              {Object.values(canvasItems).length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center">暂无可用卡片，请先在画布添加或推导卡片</p>
              ) : (
                Object.values(canvasItems).map((it) => {
                  const isChecked = selectedItemIds.includes(it.id);
                  return (
                    <label
                      key={it.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-stone-200/70 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemIds([...selectedItemIds, it.id]);
                          } else {
                            setSelectedItemIds(selectedItemIds.filter((id) => id !== it.id));
                          }
                        }}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-stone-900 truncate">
                            {it.title || it.content.slice(0, 20)}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              it.status === "determined"
                                ? "bg-emerald-100 text-emerald-800"
                                : it.status === "discarded"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {it.status === "determined" ? "确定项" : it.status === "discarded" ? "已舍弃" : "待定"}
                          </span>
                        </div>
                        {it.content && (
                          <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{it.content}</p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              disabled={selectedItemIds.length === 0 || !newGroupName.trim()}
              onClick={() => {
                const id = createSchemeGroup(newGroupName.trim(), selectedItemIds);
                setIsCreateGroupOpen(false);
                setTimeout(() => {
                  void fitView({
                    nodes: [{ id: `scheme-${id}` }],
                    padding: 0.3,
                    duration: 350,
                  });
                }, 50);
              }}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认打包方案组
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
