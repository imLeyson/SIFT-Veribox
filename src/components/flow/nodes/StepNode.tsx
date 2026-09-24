"use client";

import { useState, useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore, getUpstreamSummary } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { cleanStepLabel, type Route, type RouteStep } from "@/types/routes";
import { toInspirationCopy } from "@/lib/exploration-copy";
import { Sparkles, ArrowRight, Compass, RefreshCw, Copy, Check } from "lucide-react";

const DEFAULT_FALLBACK_ROUTE: Route = {
  id: "custom-route",
  title: "【自定义风格探索】",
  themeName: "自定义风格探索",
  focusDimension: "核心材质与视觉调性",
  startingPoint: "基于自由探索假设切入",
  coreProblem: "建立独具画面辨识度的视觉语言",
  purpose: "构建连贯的视觉策略与设计母题",
  pros: "探索自由度高、可灵活微调",
  cons: "需自行验证与评估落地可行性",
  recommendedReason: null,
  alignmentScore: 90,
  steps: [
    {
      id: "s1",
      title: "核心母题与造型骨架试验",
      question: "如何确立第一眼视觉辨识度？",
      purpose: "提炼核心视觉母题",
      acceptanceCriteria: ["具备清晰的视觉记忆点", "与整体品牌调性呼应"],
    },
    {
      id: "s2",
      title: "物料工艺与表面触感试验",
      question: "选用何种材质与表面处理？",
      purpose: "深化细节与高级质感",
      acceptanceCriteria: ["明确主材质与辅助材质搭配", "表面微纹理具可实现性"],
    },
    {
      id: "s3",
      title: "场景交互与整体系统试验",
      question: "在真实场景中如何落地共生？",
      purpose: "验证全案完整度",
      acceptanceCriteria: ["延展至全系列包装或器物", "受众体验触点连贯一致"],
    },
  ],
};

export function StepNode({ id, data, selected }: NodeProps) {
  const routes = useSiftStore((s) => s.routes);
  const customCards = useSiftStore((s) => s.customCards);
  const customEdges = useSiftStore((s) => s.customEdges);
  const synthesizeCard = useSiftStore((s) => s.synthesizeCard);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const activeStepId = useSiftStore((s) => s.activeStepId);
  const platformPlans = useSiftStore((s) => s.platformPlans);
  const activeRequest = useSiftStore((s) => s.activeRequest);

  const [showThemeTrace, setShowThemeTrace] = useState(false);
  const [localStepId, setLocalStepId] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState(false);

  const isEmpty = Boolean((data as any)?.isEmpty);

  const upstream = useMemo(
    () => getUpstreamSummary(id, { customEdges, routes, customCards }),
    [id, customEdges, routes, customCards],
  );

  if (isEmpty) {
    const hasUpstream = upstream.count > 0;
    return (
      <div className="w-[390px] transition-all duration-300 hover:shadow-md">
        <NodeShell
          nodeId={id}
          stage="04"
          kicker="04 视点推进 · 空白视点待推导"
          title={hasUpstream ? `已连接 ${upstream.count} 个上游，等待生成` : "等待连线导入设计主题"}
          badge={
            <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
              空白卡片
            </span>
          }
          selected={selected}
          collapsedContent={
            <div className="text-xs text-stone-500 py-1 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
              <span>{hasUpstream ? `已连 ${upstream.count} 个上游，点击展开生成` : "未关联设计主题，从「03 风格主题」引线连接"}</span>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            {hasUpstream ? (
              <div className="rounded-xl border border-purple-200/90 bg-purple-50/60 p-4 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 shadow-xs">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">
                    已关联 {upstream.count} 个设计上下文
                  </h4>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                    {(upstream.labels ?? []).map((lbl, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-100 shadow-2xs"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => synthesizeCard(id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-purple-200 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                  <span>点击根据已连主题生成视点试验</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-indigo-200/90 bg-indigo-50/40 p-4 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100/80 text-indigo-600 shadow-xs">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">
                    尚未关联设计主题
                  </h4>
                  <p className="mt-0.5 text-[11px] text-stone-500 leading-relaxed">
                    从任意「03 风格主题」卡片拖动引线至此卡片，然后点击下方按钮生成
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-100 text-stone-400 text-xs font-medium cursor-not-allowed border border-stone-200/60"
                >
                  等待连线导入设计主题
                </button>
              </div>
            )}

            <div className="rounded-xl bg-stone-50/80 border border-line/60 p-3 space-y-1.5 text-[11px] text-stone-600">
              <div className="font-semibold text-stone-700 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-indigo-500" />
                <span>支持的引线连接与生成模式：</span>
              </div>
              <p className="leading-relaxed pl-1 text-stone-600">
                自动将该主题的三阶段视点（01 核心母题骨架试验、02 物料工艺微触感试验、03 场景交互系统试验）导入推进工作台，展开多视点平行试验。
              </p>
            </div>
          </div>
        </NodeShell>
      </div>
    );
  }

  const routeFromData = (data as any)?.route as Route | undefined;
  const route =
    routeFromData ??
    routes.find((r) => r.id === selectedRouteId) ??
    customCards.find((c) => c.data?.route?.id === selectedRouteId || c.id === selectedRouteId)?.data?.route ??
    routes[0] ??
    DEFAULT_FALLBACK_ROUTE;

  const steps = route.steps && route.steps.length > 0 ? route.steps : DEFAULT_FALLBACK_ROUTE.steps;
  const targetStepId =
    localStepId ??
    (data as any)?.stepId ??
    (route.steps?.some((st: RouteStep) => st.id === activeStepId)
      ? activeStepId
      : route.steps?.[0]?.id);
  const activeIdx = Math.max(0, steps.findIndex((s: RouteStep) => s.id === targetStepId));
  const currentStep = steps[activeIdx] ?? steps[0];
  const hasPlanForCurrent = platformPlans.some(
    (p) => p.stepId === currentStep.id,
  );
  const hasNextStep = activeIdx < steps.length - 1;

  const handleCopyStep = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = [
      `【视点 0${activeIdx + 1}】${cleanStepLabel(currentStep.title)}`,
      `聚焦问题：${currentStep.question}`,
      currentStep.purpose ? `观察重点：${currentStep.purpose}` : null,
      currentStep.acceptanceCriteria?.length
        ? `检验准则：\n${currentStep.acceptanceCriteria.map((c: string) => `  • ${c}`).join("\n")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(true);
      setTimeout(() => setCopiedStep(false), 1800);
    } catch {
      // fallback gracefully
    }
  };

  return (
    <div className="w-[390px]">
      <NodeShell
        nodeId={id}
        stage="04"
        kicker={`04 视点推进 · ${route.themeName || route.title}`}
        title={`视点试验推进 (0${activeIdx + 1}/${steps.length})`}
        onRegenerate={upstream.count > 0 ? () => synthesizeCard(id) : undefined}
        selected={selected}
        collapsedContent={
          <div className="space-y-2 text-xs">
            {/* Clickable 3 experiment tabs even when collapsed */}
            <div className="flex items-center gap-1.5 w-full">
              {steps.map((st: RouteStep, i: number) => {
                const isCurrent = st.id === currentStep.id;
                const isCompleted = i < activeIdx;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalStepId(st.id);
                      siftActions.activateStep(st.id);
                    }}
                    className={`flex-1 min-w-0 flex items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      isCurrent
                        ? "bg-ink text-white font-semibold shadow-xs"
                        : isCompleted
                          ? "bg-stone-100 text-stone-700 hover:text-ink hover:bg-stone-200"
                          : "bg-stone-50 text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                    }`}
                    title={`切换到视点 0${i + 1}：${st.title}`}
                  >
                    <span className="text-[10px] font-mono shrink-0">
                      {isCompleted ? "✓" : `0${i + 1}`}
                    </span>
                    <span className="whitespace-nowrap shrink-0">{cleanStepLabel(st.title)}</span>
                  </button>
                );
              })}
            </div>

            {/* Current Active Experiment Key View */}
            <div className="bg-stone-50/80 p-2.5 rounded-lg border border-line/60 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-stone-500 font-semibold">
                <span>视点 0{activeIdx + 1} · {cleanStepLabel(currentStep.title)} 探索焦点</span>
                <span className="font-mono text-[9px] text-stone-400">FOCUS</span>
              </div>
              <p className="text-xs sm:text-[12.5px] font-semibold text-ink leading-snug">
                {toInspirationCopy(currentStep.question)}
              </p>
              {currentStep.purpose && (
                <p className="text-[11px] text-stone-500 leading-snug pt-0.5 border-t border-line/40">
                  <span className="font-medium text-stone-600">观察：</span>
                  {toInspirationCopy(currentStep.purpose)}
                </p>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          {/* Upstream context indicator and re-generate button */}
          {upstream.count > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-purple-50/80 border border-purple-200/80 text-[11px] text-purple-900">
              <div className="flex items-center gap-1.5 font-medium truncate min-w-0 pr-2">
                <Sparkles className="h-3 w-3 text-purple-600 shrink-0" />
                <span className="truncate">已连 {upstream.count} 个上游：{(upstream.labels ?? []).join(" + ")}</span>
              </div>
              <button
                type="button"
                onClick={() => synthesizeCard(id)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                title="根据当前连线上游重新生成视点试验"
              >
                <RefreshCw className="h-3 w-3" />
                <span>重新生成</span>
              </button>
            </div>
          )}
          {/* Foldable Theme Trace Header */}
          <div className="flex items-center justify-between text-[11px] pb-0.5">
            <span className="font-semibold text-stone-700">
              视点切入试验 ({activeIdx + 1}/{steps.length})
            </span>
            <button
              type="button"
              onClick={() => setShowThemeTrace(!showThemeTrace)}
              className="text-[10.5px] text-stone-400 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              title="展开查看所属主题与灵感画面"
            >
              <Compass className="h-3 w-3" />
              <span>{showThemeTrace ? "收起主题画面" : "主题灵感画面"}</span>
            </button>
          </div>

          {/* Foldable Theme & Visual Snapshot Trace */}
          {showThemeTrace && (
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-2.5 space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[10px] font-semibold text-indigo-950">
                <span>所属主题：{route.themeName || route.title}</span>
              </div>
              {route.visualSnapshot && (
                <p className="text-[11px] text-stone-700 leading-relaxed italic bg-white/90 p-2.5 rounded-lg border border-indigo-100 font-serif">
                  “{toInspirationCopy(route.visualSnapshot)}”
                </p>
              )}
            </div>
          )}

          {/* Step Timeline Indicator - All tabs fit evenly, 100% visible, no cut-off */}
          <div className="flex items-center gap-1.5 w-full">
            {steps.map((st: RouteStep, i: number) => {
              const isCurrent = st.id === currentStep.id;
              const isCompleted = i < activeIdx;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setLocalStepId(st.id);
                    siftActions.activateStep(st.id);
                  }}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors ${
                    isCurrent
                      ? "bg-ink text-white font-semibold shadow-xs"
                      : isCompleted
                        ? "bg-stone-100 text-stone-700 hover:text-ink hover:bg-stone-200"
                        : "bg-stone-50 text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <span className="text-[10px] font-mono shrink-0">
                    {isCompleted ? "✓" : `0${i + 1}`}
                  </span>
                  <span className="whitespace-nowrap shrink-0">{cleanStepLabel(st.title)}</span>
                </button>
              );
            })}
          </div>

          {/* Current Step Focus Box - Pure Visual Inspiration */}
          <div className="rounded-xl border border-line/80 bg-white/95 p-3.5 shadow-xs space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                <span>视点 0{activeIdx + 1} · {cleanStepLabel(currentStep.title)}</span>
                <button
                  type="button"
                  onClick={handleCopyStep}
                  className="text-[10px] text-stone-400 hover:text-ink transition-colors flex items-center gap-1 cursor-pointer font-medium normal-case"
                  title="复制当前视点探索参数"
                >
                  {copiedStep ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-stone-400" />
                      <span>复制视点</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs sm:text-[13px] font-semibold text-ink leading-snug">
                {toInspirationCopy(currentStep.question)}
              </p>
            </div>

            {currentStep.purpose && (
              <div className="pt-2 border-t border-line/40 text-[11px] text-stone-600 leading-relaxed">
                <span className="font-medium text-stone-700">这一步要观察：</span>
                {toInspirationCopy(currentStep.purpose)}
              </div>
            )}

            {currentStep.acceptanceCriteria && currentStep.acceptanceCriteria.length > 0 && (
              <div className="pt-2 border-t border-line/40 space-y-1.5 text-[11px]">
                <span className="font-medium text-stone-700 block text-[10.5px]">观察与检验焦点：</span>
                <div className="space-y-1">
                  {currentStep.acceptanceCriteria.map((criterion: string, cIdx: number) => (
                    <div key={cIdx} className="flex items-start gap-1.5 text-stone-600 leading-relaxed">
                      <span className="text-accent text-[10px] mt-0.5">•</span>
                      <span>{toInspirationCopy(criterion)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col gap-1.5">
            {!hasPlanForCurrent ? (
              <button
                type="button"
                className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2.5 shadow-xs"
                disabled={Boolean(activeRequest)}
                onClick={() =>
                  void siftActions.generatePlatformPlan(currentStep.id, route.id)
                }
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span className="font-medium">读取视点，规划灵感检索 (05) →</span>
              </button>
            ) : (
              hasNextStep && (
                <button
                  type="button"
                  className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-2.5 shadow-xs"
                  disabled={Boolean(activeRequest)}
                  onClick={() => {
                    const next = steps[activeIdx + 1];
                    if (next) {
                      setLocalStepId(next.id);
                      siftActions.activateStep(next.id);
                    }
                  }}
                >
                  <span>下一个切入视点：{cleanStepLabel(steps[activeIdx + 1]?.title)}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        </div>
      </NodeShell>
    </div>
  );
}
