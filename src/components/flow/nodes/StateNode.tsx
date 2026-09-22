"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "../NodeShell";
import { useSiftStore } from "@/lib/convergence-store";
import { siftActions } from "@/lib/convergence-client";
import { copyToClipboard } from "@/lib/clipboard";
import { hasDirection } from "@/types/convergence";
import {
  Check,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  Palette,
  Plus,
  Trash2,
} from "lucide-react";
import { toInspirationCopy } from "@/lib/exploration-copy";
import { InlineEditableText } from "../InlineEditableText";
import { VisualInspirationCard } from "../VisualInspirationCard";
import { VisualInspirationModal } from "../VisualInspirationModal";
import { AddInspirationDialog } from "../AddInspirationDialog";
import { type VisualInspiration } from "@/lib/agent/convergence-schema";

export function StateNode({ id, selected }: NodeProps) {
  const {
    state,
    next,
    correctionDraft,
    activeRequest,
    storageWarning,
    routes,
    briefImages,
    itemDecisions,
    setItemDecision,
    removeItemDecision,
    setCorrectionDraft,
    updateStateIntent,
    updateStatePriority,
    removeStatePriority,
    updateStateAvoid,
    removeStateAvoid,
    addStatePriority,
    addStateAvoid,
    updateStateHypothesis,
    updateVisualKeyword,
    removeVisualKeyword,
  } = useSiftStore();

  const visualInspirations = useSiftStore((s) => s.visualInspirations || []);
  const [editing, setEditing] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<VisualInspiration | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // Tab switcher across the 3 decision cards: "all" | "confirmed" | "uncertain" | "discarded"
  const [cardTab, setCardTab] = useState<"all" | "confirmed" | "uncertain" | "discarded">("all");

  // Inline add state inputs
  const [addingPriority, setAddingPriority] = useState(false);
  const [newPriorityText, setNewPriorityText] = useState("");
  const [addingUncertain, setAddingUncertain] = useState(false);
  const [newUncertainText, setNewUncertainText] = useState("");
  const [addingAvoid, setAddingAvoid] = useState(false);
  const [newAvoidText, setNewAvoidText] = useState("");

  const handleAddPrioritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPriorityText.trim()) {
      addStatePriority(newPriorityText.trim());
      setNewPriorityText("");
      setAddingPriority(false);
    }
  };

  const handleAddUncertainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUncertainText.trim()) {
      setItemDecision({
        id: `uncertain_${Date.now()}`,
        type: "text",
        content: newUncertainText.trim(),
        label: "待定想法",
        status: "uncertain",
        sourceNode: "02 方向",
      });
      setNewUncertainText("");
      setAddingUncertain(false);
    }
  };

  const handleAddAvoidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAvoidText.trim()) {
      addStateAvoid(newAvoidText.trim());
      setNewAvoidText("");
      setAddingAvoid(false);
    }
  };

  const handleCopyKeyword = async (keyword: string) => {
    await copyToClipboard(keyword);
  };

  if (!state) return null;

  const checkpoint = next?.type === "checkpoint";
  const confirmed = state.status === "confirmed";

  // Visual inspirations & palette
  const confirmedVisuals = visualInspirations.filter((v) => v.status !== "discarded");
  const allColors = Array.from(
    new Set(confirmedVisuals.flatMap((v) => v.palette || [])),
  ).slice(0, 10);

  // Uncertain items from store
  const customUncertainItems = Object.values(itemDecisions).filter(
    (i) => i.status === "uncertain" && i.sourceNode === "02 方向",
  );

  const confirmedCount =
    state.direction.priorities.length + (state.visualKeywords?.length || 0);
  const uncertainCount =
    (state.currentHypothesis ? 1 : 0) + customUncertainItems.length;
  const discardedCount = state.direction.avoid.length;

  const collapsedSummary = (
    <div className="flex items-center justify-between gap-1.5 w-full">
      <span className="truncate italic font-serif text-stone-700">
        “{state.direction.intent?.text || "核心主张与决策已锁定"}”
      </span>
      <span className="text-[9.5px] font-mono text-emerald-700 font-semibold shrink-0">
        {confirmedCount} 项已确定
      </span>
    </div>
  );

  return (
    <div className="w-[420px] sm:w-[460px]">
      <NodeShell
        nodeId={id || "direction"}
        stage="02"
        kicker={
          confirmed
            ? "决策看板 · 已确认"
            : checkpoint
              ? "决策看板 · 检查点"
              : "02 决策看板 · 确定 / 待定 / 舍弃"
        }
        title="核心决策与方向"
        collapsedSummary={collapsedSummary}
        selected={selected}
      >
        <div className="space-y-3.5 text-xs leading-relaxed">
          {/* Top Section: Core Intent */}
          {state.direction.intent?.text ? (
            <div className="rounded-xl bg-white border border-line/80 p-3 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  核心视觉主张
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {state.brief.goal ?? "设计任务"}
                </span>
              </div>
              <InlineEditableText
                value={state.direction.intent.text}
                onSave={(newIntent) => updateStateIntent(newIntent)}
                multiline
                minRows={3}
                as="p"
                className="text-xs sm:text-sm font-medium text-ink leading-relaxed font-serif block w-full"
                inputClassName="font-serif text-sm leading-relaxed"
                label="核心视觉主张"
                showEditIcon
              />
            </div>
          ) : (
            <p className="text-muted">方向推导中…</p>
          )}

          {/* Visual References & Extracted Palette */}
          {visualInspirations.length > 0 && (
            <div className="rounded-xl bg-white border border-line/80 p-3 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold text-stone-600 flex items-center gap-1">
                  <Palette className="h-3.5 w-3.5 text-indigo-600" />
                  参考图与提取色板（{visualInspirations.length} 单元）
                </span>
                <button
                  type="button"
                  onClick={() => setAddDialogOpen(true)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>添加灵感</span>
                </button>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {visualInspirations.map((vis) => (
                  <VisualInspirationCard
                    key={vis.id}
                    inspiration={vis}
                    compact
                    onOpenInspector={(item) => setInspectorItem(item)}
                  />
                ))}
              </div>

              {/* Palette */}
              {allColors.length > 0 && (
                <div className="pt-1.5 border-t border-line/40">
                  <div className="flex items-center justify-between text-[9.5px] text-stone-400 mb-1">
                    <span>提取调色板（点击复制色值）</span>
                    <span>{allColors.length} 色</span>
                  </div>
                  <div className="flex h-4 w-full rounded-md overflow-hidden border border-line/60">
                    {allColors.map((hex, ci) => (
                      <button
                        key={ci}
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(hex);
                          setCopiedColor(hex);
                          setTimeout(() => setCopiedColor(null), 1500);
                        }}
                        className="flex-1 h-full relative transition-all hover:flex-[1.5] cursor-pointer"
                        style={{ backgroundColor: hex }}
                        title={`点击复制: ${hex}`}
                      >
                        {copiedColor === hex && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-[7.5px] font-mono font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Segmented Tab Switcher for 3 Decision Cards */}
          <div className="flex rounded-xl bg-stone-100/90 p-1 text-[11px] font-medium text-stone-600 border border-line/50">
            <button
              type="button"
              onClick={() => setCardTab("all")}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                cardTab === "all"
                  ? "bg-white text-ink shadow-2xs font-semibold"
                  : "hover:text-ink"
              }`}
            >
              全部三张卡片
            </button>
            <button
              type="button"
              onClick={() => setCardTab("confirmed")}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                cardTab === "confirmed"
                  ? "bg-white text-emerald-800 shadow-2xs font-semibold"
                  : "hover:text-ink"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>确定 ({confirmedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCardTab("uncertain")}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                cardTab === "uncertain"
                  ? "bg-white text-amber-800 shadow-2xs font-semibold"
                  : "hover:text-ink"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>待定 ({uncertainCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCardTab("discarded")}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                cardTab === "discarded"
                  ? "bg-white text-stone-800 shadow-2xs font-semibold"
                  : "hover:text-ink"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              <span>舍弃 ({discardedCount})</span>
            </button>
          </div>

          {/* CARD 1: 确定项卡片 (Confirmed Card) */}
          {(cardTab === "all" || cardTab === "confirmed") && (
            <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/20 p-3.5 shadow-2xs space-y-3">
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-xs text-ink">确定项卡片</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                      {confirmedCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100/70 border border-emerald-200/60 px-2 py-0.5 rounded-full font-medium">
                    下轮生成强约束
                  </span>
                </div>
                <p className="text-[10.5px] text-stone-500 mt-0.5 leading-normal">
                  已敲定的材质、工艺与关键词，后续主题生成必须坚决贯彻。
                </p>
              </div>

              {/* Priority Items List */}
              <div className="space-y-1.5">
                {state.direction.priorities.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white border border-emerald-100/90 hover:border-emerald-300 p-2.5 shadow-2xs flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <InlineEditableText
                        value={p.text}
                        onSave={(newText) => updateStatePriority(i, newText)}
                        as="p"
                        className="text-[11px] text-stone-800 leading-relaxed font-medium"
                        label="确定坚持项"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          const text = p.text;
                          removeStatePriority(i);
                          setItemDecision({
                            id: `uncertain_${Date.now()}`,
                            type: "text",
                            content: text,
                            label: "待定想法",
                            status: "uncertain",
                            sourceNode: "02 方向",
                          });
                        }}
                        className="rounded-md px-1.5 py-0.5 text-stone-400 hover:text-amber-800 hover:bg-amber-50 cursor-pointer transition-colors"
                        title="转为待定"
                      >
                        待定
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const text = p.text;
                          removeStatePriority(i);
                          addStateAvoid(text);
                        }}
                        className="rounded-md px-1.5 py-0.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="移至舍弃红线"
                      >
                        舍弃
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmed Visual Keywords */}
              {(state.visualKeywords ?? []).length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="text-[10px] text-stone-400 block mb-1">
                    确认视觉关键词（双击修改，点击 # 复制）：
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(state.visualKeywords ?? []).map((rawKw, ki) => {
                      const kw = toInspirationCopy(rawKw).trim();
                      if (!kw) return null;
                      return (
                        <span
                          key={ki}
                          className="inline-flex items-center gap-1 rounded-md bg-white border border-line/80 px-2 py-0.5 text-[11px] font-medium text-stone-800 hover:border-emerald-400 transition-colors shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => handleCopyKeyword(kw)}
                            className="text-stone-400 font-mono hover:text-ink cursor-pointer"
                            title="点击复制"
                          >
                            #
                          </button>
                          <InlineEditableText
                            value={kw}
                            onSave={(newKw) => updateVisualKeyword(ki, newKw)}
                            as="span"
                            label="视觉关键词"
                          />
                          <button
                            type="button"
                            onClick={() => removeVisualKeyword(ki)}
                            className="text-stone-300 hover:text-stone-500 p-0.5 cursor-pointer"
                            title="移除关键词"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Priority Input Form */}
              {addingPriority ? (
                <form onSubmit={handleAddPrioritySubmit} className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    value={newPriorityText}
                    onChange={(e) => setNewPriorityText(e.target.value)}
                    placeholder="输入确定要坚持的材质、工艺或视觉手法…"
                    autoFocus
                    className="flex-1 rounded-lg border border-emerald-400 bg-white px-2.5 py-1 text-xs outline-none ring-2 ring-emerald-500/20"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setAddingPriority(false);
                    }}
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs font-medium hover:bg-emerald-700 cursor-pointer"
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingPriority(false)}
                    className="rounded-lg bg-stone-100 text-stone-600 px-2 py-1 text-xs hover:bg-stone-200 cursor-pointer"
                  >
                    取消
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingPriority(true)}
                  className="w-full py-1.5 rounded-xl border border-dashed border-emerald-300/80 hover:border-emerald-500 text-emerald-700 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer bg-white/70"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>添加确定项约束</span>
                </button>
              )}
            </div>
          )}

          {/* CARD 2: 待定项卡片 (Uncertain Card) */}
          {(cardTab === "all" || cardTab === "uncertain") && (
            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/20 p-3.5 shadow-2xs space-y-3">
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="font-bold text-xs text-ink">待定项卡片</span>
                    <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                      {uncertainCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-800 bg-amber-100/70 border border-amber-200/60 px-2 py-0.5 rounded-full font-medium">
                    保留继续探索
                  </span>
                </div>
                <p className="text-[10.5px] text-stone-500 mt-0.5 leading-normal">
                  正在权衡的想法与设计假设，继续留在探索池中供后续启发。
                </p>
              </div>

              {/* Design Hypothesis if present */}
              {state.currentHypothesis && (
                <div className="rounded-xl bg-white border border-amber-100/90 p-2.5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium">
                    <span>设计假设（待验证）</span>
                    <button
                      type="button"
                      onClick={() => {
                        addStatePriority(state.currentHypothesis!);
                        updateStateHypothesis("");
                      }}
                      className="text-amber-800 hover:text-emerald-700 font-medium cursor-pointer"
                    >
                      设为确定 →
                    </button>
                  </div>
                  <InlineEditableText
                    value={state.currentHypothesis}
                    onSave={(newHyp) => updateStateHypothesis(newHyp)}
                    multiline
                    minRows={2}
                    as="p"
                    className="text-[11px] text-stone-800 leading-relaxed block w-full"
                    label="设计假设"
                    showEditIcon
                  />
                </div>
              )}

              {/* Custom Uncertain Items List */}
              <div className="space-y-1.5">
                {customUncertainItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white border border-amber-100/90 hover:border-amber-300 p-2.5 shadow-2xs flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <InlineEditableText
                        value={item.content}
                        onSave={(newTxt) => {
                          setItemDecision({
                            id: item.id,
                            type: item.type,
                            content: newTxt,
                            label: item.label,
                            status: item.status,
                            sourceNode: item.sourceNode,
                          });
                        }}
                        as="p"
                        className="text-[11px] text-stone-800 leading-relaxed font-medium"
                        label="待定想法"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          addStatePriority(item.content);
                          removeItemDecision(item.id);
                        }}
                        className="rounded-md px-1.5 py-0.5 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium transition-colors"
                        title="设为确定项"
                      >
                        设为确定
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addStateAvoid(item.content);
                          removeItemDecision(item.id);
                        }}
                        className="rounded-md px-1.5 py-0.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="舍弃此想法"
                      >
                        舍弃
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Uncertain Input Form */}
              {addingUncertain ? (
                <form onSubmit={handleAddUncertainSubmit} className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    value={newUncertainText}
                    onChange={(e) => setNewUncertainText(e.target.value)}
                    placeholder="输入暂不确定、想要保留探索的想法…"
                    autoFocus
                    className="flex-1 rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-xs outline-none ring-2 ring-amber-500/20"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setAddingUncertain(false);
                    }}
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 text-white px-2.5 py-1 text-xs font-medium hover:bg-amber-700 cursor-pointer"
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingUncertain(false)}
                    className="rounded-lg bg-stone-100 text-stone-600 px-2 py-1 text-xs hover:bg-stone-200 cursor-pointer"
                  >
                    取消
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingUncertain(true)}
                  className="w-full py-1.5 rounded-xl border border-dashed border-amber-300/80 hover:border-amber-500 text-amber-800 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer bg-white/70"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>添加待定探索想法</span>
                </button>
              )}
            </div>
          )}

          {/* CARD 3: 舍弃项卡片 (Discarded Card) */}
          {(cardTab === "all" || cardTab === "discarded") && (
            <div className="rounded-2xl border border-stone-200/90 bg-stone-50/40 p-3.5 shadow-2xs space-y-3">
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-stone-500 shrink-0" />
                    <span className="font-bold text-xs text-stone-700">舍弃项卡片</span>
                    <span className="rounded-full bg-stone-200 text-stone-700 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                      {discardedCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-600 bg-stone-200/70 border border-stone-300/60 px-2 py-0.5 rounded-full font-medium">
                    坚决避开 · 不干扰后续
                  </span>
                </div>
                <p className="text-[10.5px] text-stone-500 mt-0.5 leading-normal">
                  视觉红线与已淘汰特征，下轮生成坚决避开、不再受其干扰。
                </p>
              </div>

              {/* Avoid Items List */}
              <div className="space-y-1.5">
                {state.direction.avoid.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white/90 border border-stone-200/80 hover:border-stone-400 p-2.5 shadow-2xs flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <InlineEditableText
                        value={a.text}
                        onSave={(newText) => updateStateAvoid(i, newText)}
                        as="p"
                        className="text-[11px] text-stone-500 line-through leading-relaxed"
                        label="视觉红线"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          const text = a.text;
                          removeStateAvoid(i);
                          addStatePriority(text);
                        }}
                        className="rounded-md px-1.5 py-0.5 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium transition-colors"
                        title="恢复确定"
                      >
                        恢复确定
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStateAvoid(i)}
                        className="rounded-md p-1 text-stone-300 hover:text-rose-600 cursor-pointer transition-colors"
                        title="彻底删除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Avoid Input Form */}
              {addingAvoid ? (
                <form onSubmit={handleAddAvoidSubmit} className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    value={newAvoidText}
                    onChange={(e) => setNewAvoidText(e.target.value)}
                    placeholder="输入要坚决避开的风格、套路或禁忌…"
                    autoFocus
                    className="flex-1 rounded-lg border border-stone-400 bg-white px-2.5 py-1 text-xs outline-none ring-2 ring-stone-400/20"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setAddingAvoid(false);
                    }}
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-stone-700 text-white px-2.5 py-1 text-xs font-medium hover:bg-stone-800 cursor-pointer"
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingAvoid(false)}
                    className="rounded-lg bg-stone-100 text-stone-600 px-2 py-1 text-xs hover:bg-stone-200 cursor-pointer"
                  >
                    取消
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingAvoid(true)}
                  className="w-full py-1.5 rounded-xl border border-dashed border-stone-300 hover:border-stone-500 text-stone-600 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer bg-white/70"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>添加视觉红线禁忌</span>
                </button>
              )}
            </div>
          )}

          {/* Bottom Primary Actions */}
          {checkpoint && !confirmed && (
            <div className="border-t border-line/60 pt-3 space-y-2">
              <div className="grid gap-2 grid-cols-2">
                <button
                  type="button"
                  className="btn-primary text-xs py-2 flex items-center justify-center gap-1"
                  disabled={
                    Boolean(activeRequest) ||
                    editing ||
                    !hasDirection(state) ||
                    Boolean(storageWarning)
                  }
                  onClick={siftActions.confirm}
                >
                  <span>确认决策并推进</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs py-2"
                  disabled={Boolean(activeRequest)}
                  onClick={() => setEditing(true)}
                >
                  调整意见
                </button>
              </div>
            </div>
          )}

          {confirmed && (
            <div className="border-t border-line/60 pt-2.5">
              {routes.length === 0 ? (
                <button
                  type="button"
                  className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  disabled={Boolean(activeRequest)}
                  onClick={() => void siftActions.generateRoutes()}
                  title="基于已收敛的确定约束，推导 3 套设计主题与方案"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {activeRequest
                      ? "正在推导设计主题…"
                      : `基于确定项（${confirmedCount}项）推导 3 套设计主题`}
                  </span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 rounded-lg px-2.5 py-1.5 border border-emerald-200">
                    <span className="flex items-center gap-1 font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      设计主题已就绪，于右侧选择画面切入点
                    </span>
                    <ArrowRight className="h-3 w-3 text-emerald-600" />
                  </div>
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-stone-600 hover:text-ink bg-stone-50 hover:bg-stone-100/80 border border-line/70 rounded-lg py-1.5 transition-colors cursor-pointer"
                    disabled={Boolean(activeRequest)}
                    onClick={() => void siftActions.regenerateRoutes()}
                    title="重新推导一组互不相同的全新设计主题"
                  >
                    <RefreshCw className={`h-3 w-3 text-stone-500 ${activeRequest ? "animate-spin" : ""}`} />
                    <span>{activeRequest ? "正在推导全新主题…" : "换一批设计主题"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Inline Feedback Editing */}
          {editing && (
            <form
              className="border-t border-line/60 pt-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await siftActions.correct();
                if (!useSiftStore.getState().correctionDraft) setEditing(false);
              }}
            >
              <textarea
                autoFocus
                rows={2}
                maxLength={2000}
                value={correctionDraft}
                onChange={(e) => setCorrectionDraft(e.target.value)}
                placeholder="修改或补充方向意见…"
                className="w-full resize-y rounded-lg border border-line bg-cream/70 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
              />
              <div className="mt-1.5 flex gap-2">
                <button
                  type="submit"
                  disabled={!correctionDraft.trim()}
                  className="btn-primary flex-1 text-xs !py-1"
                >
                  更新方向
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs !py-1"
                  onClick={() => setEditing(false)}
                >
                  收起
                </button>
              </div>
            </form>
          )}
        </div>
      </NodeShell>

      {/* Visual Inspector Modal */}
      <VisualInspirationModal
        inspiration={inspectorItem}
        onClose={() => setInspectorItem(null)}
      />

      {/* Add Inspiration Dialog */}
      <AddInspirationDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        defaultScope="global"
      />
    </div>
  );
}
