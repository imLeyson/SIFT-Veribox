"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { z } from "zod";
import {
  AnswerSchema,
  DecisionContext,
  DecisionStatus,
  DesignStateSchema,
  HistoryEntrySchema,
  ItemDecision,
  ItemDecisionSchema,
  NextSchema,
  TurnPayloadSchema,
  TurnResultSchema,
  VisualInspiration,
  VisualInspirationSchema,
} from "./agent/convergence-schema";
import {
  RouteSchema,
  PlatformPlanSchema,
} from "./agent/routes-schema";
import {
  hasDirection,
  type Answer,
  type TurnResult,
} from "@/types/convergence";
import type {
  Route,
  RouteStep,
  PlatformPlan,
} from "@/types/routes";

export const STORAGE_KEY = "sift-convergence-v3";

const SourceInteractionSchema = z.object({
  skipped: z.boolean().optional(),
  replacedBy: z.string().optional(),
  opened: z.boolean().optional(),
  copiedKeywords: z.array(z.string()).optional(),
});

const SessionSchema = z
  .object({
    sessionId: z.string().min(1),
    rawBrief: z.string().max(10000),
    briefImages: z.array(z.string()).default([]),
    visualInspirations: z.array(VisualInspirationSchema).default([]),
    state: DesignStateSchema.nullable(),
    next: NextSchema.nullable(),
    history: z.array(HistoryEntrySchema),
    drafts: z.array(AnswerSchema),
    correctionDraft: z.string(),
    importedBrief: z.boolean(),
    positions: z.record(
      z.string(),
      z.object({ x: z.number().finite(), y: z.number().finite() }),
    ),
    mode: z.enum(["live", "mock"]).nullable(),
    model: z.string().nullable(),
    explorationStage: z
      .enum([
        "state_confirmed",
        "routes",
        "route_selected",
        "step_active",
        "platform_ready",
        "searching",
      ])
      .nullable(),
    routes: z.array(RouteSchema),
    recommendedRouteId: z.string().nullable(),
    selectedRouteId: z.string().nullable(),
    activeStepId: z.string().nullable(),
    platformPlans: z.array(PlatformPlanSchema),
    sourceInteractions: z.record(z.string(), SourceInteractionSchema),
    stepNotes: z.record(z.string(), z.array(z.string())).default({}),
    completedCriteria: z.record(z.string(), z.array(z.string())).default({}),
    collapsedNodes: z.record(z.string(), z.boolean()).default({}),
    itemDecisions: z.record(z.string(), ItemDecisionSchema).default({}),
  })
  .superRefine((value, ctx) => {
    if (
      (value.state &&
        !TurnPayloadSchema.safeParse({ state: value.state, next: value.next })
          .success) ||
      (!value.state && value.next)
    ) {
      ctx.addIssue({ code: "custom", message: "会话状态损坏" });
    }
  });

type Session = z.infer<typeof SessionSchema>;
type RequestToken = { id: string; sessionId: string; revision: number };

export type SiftStore = Session & {
  activeRequest: RequestToken | null;
  error: string | null;
  storageWarning: string | null;
  setRawBrief: (text: string) => void;
  setBriefImages: (images: string[]) => void;
  addBriefImage: (image: string) => void;
  removeBriefImage: (index: number) => void;
  addVisualInspiration: (item: {
    id?: string;
    url: string;
    title?: string;
    sourceType?: "upload" | "clipboard" | "external_url";
    sourceUrl?: string;
    status?: DecisionStatus;
    scope?: "global" | "route" | "step";
    targetId?: string;
    palette?: string[];
    keywords?: string[];
    notes?: string;
  }) => string;
  removeVisualInspiration: (id: string) => void;
  updateVisualInspiration: (id: string, partial: Partial<VisualInspiration>) => void;
  setVisualInspirationStatus: (id: string, status: DecisionStatus) => void;
  assignVisualInspiration: (id: string, scope: "global" | "route" | "step", targetId?: string) => void;
  setDrafts: (answers: Answer[]) => void;
  setCorrectionDraft: (text: string) => void;
  setPosition: (id: string, position: { x: number; y: number }) => void;
  setError: (text: string | null) => void;
  beginRequest: () => RequestToken | null;
  cancelRequest: () => void;
  failRequest: (id: string, error: string) => void;
  commitTurn: (response: TurnResult) => boolean;
  convergeNow: () => void;
  enterCheckpoint: () => void;
  confirm: () => void;
  setRoutes: (routes: Route[], recommendedRouteId: string | null) => void;
  selectRoute: (routeId: string) => void;
  reselectRoute: () => void;
  setActiveStep: (stepId: string) => void;
  setPlatformPlan: (plan: PlatformPlan) => void;
  setSearching: () => void;
  skipSource: (stepId: string, sourceId: string) => void;
  replaceSource: (stepId: string, oldSourceId: string, newSourceId: string) => void;
  addStepNote: (stepId: string, text: string) => void;
  removeStepNote: (stepId: string, index: number) => void;
  toggleAcceptanceCriterion: (stepId: string, criterion: string) => void;
  recordSourceAction: (
    stepId: string,
    sourceId: string,
    action: "opened" | "copied",
    keyword?: string,
  ) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  setNodeCollapse: (nodeId: string, collapsed: boolean) => void;
  collapseCompletedNodes: () => void;
  expandAllNodes: () => void;
  setItemDecision: (decision: Omit<ItemDecision, "updatedAt">) => void;
  toggleItemStatus: (id: string, nextStatus: DecisionStatus) => void;
  removeItemDecision: (id: string) => void;
  getDecisionContext: () => DecisionContext;
  updateRawBrief: (text: string) => void;
  updateStateIntent: (text: string) => void;
  updateStatePriority: (index: number, text: string) => void;
  updateStateAvoid: (index: number, text: string) => void;
  updateStateHypothesis: (text: string) => void;
  updateVisualKeyword: (index: number, keyword: string) => void;
  updateRoute: (routeId: string, partial: Partial<Route>) => void;
  updateRouteStep: (routeId: string, stepId: string, partial: Partial<RouteStep>) => void;
  updatePlatformKeyword: (
    stepId: string,
    sourceId: string,
    kwIndex: number,
    newKw: string,
  ) => void;
  reset: () => void;
};

function emptySession(): Session {
  return {
    sessionId: crypto.randomUUID(),
    rawBrief: "",
    briefImages: [],
    visualInspirations: [],
    state: null,
    next: null,
    history: [],
    drafts: [],
    correctionDraft: "",
    importedBrief: false,
    positions: {},
    mode: null,
    model: null,
    explorationStage: null,
    routes: [],
    recommendedRouteId: null,
    selectedRouteId: null,
    activeStepId: null,
    platformPlans: [],
    sourceInteractions: {},
    stepNotes: {},
    completedCriteria: {},
    collapsedNodes: {},
    itemDecisions: {},
  };
}

export function createSiftStore(providedStorage?: StateStorage) {
  let readWarning: string | null = null;
  const storage = createJSONStorage<Session>(() => ({
    getItem: async (name) => {
      try {
        const target = providedStorage ?? localStorage;
        const stored = await target.getItem(name);
        if (stored !== null) {
          try {
            const parsed = JSON.parse(stored);
            const session = parsed?.state ?? parsed;
            if (
              Array.isArray(session?.briefImages) &&
              session.briefImages.length > 0 &&
              (!Array.isArray(session?.visualInspirations) ||
                session.visualInspirations.length === 0)
            ) {
              session.visualInspirations = session.briefImages.map(
                (img: string, idx: number) => ({
                  id: `vis_legacy_${idx}`,
                  url: img,
                  title: `参考图 0${idx + 1}`,
                  sourceType: "upload",
                  status: "confirmed",
                  scope: "global",
                  palette: [],
                  keywords: [],
                  createdAt: Date.now(),
                }),
              );
              return JSON.stringify(parsed);
            }
          } catch {}
          return stored;
        }

        // Migrate from sift-convergence-v2
        const v2 = await target.getItem("sift-convergence-v2");
        if (v2 !== null) {
          const parsed = JSON.parse(v2);
          const raw = parsed?.state ?? parsed;
          const isConfirmed = raw?.state?.status === "confirmed";
          return JSON.stringify({
            state: {
              ...emptySession(),
              sessionId: typeof raw?.sessionId === "string" ? raw.sessionId : crypto.randomUUID(),
              rawBrief: typeof raw?.rawBrief === "string" ? raw.rawBrief : "",
              state: raw?.state ?? null,
              next: raw?.next ?? (isConfirmed ? { type: "checkpoint", reason: "ready" } : null),
              history: Array.isArray(raw?.history) ? raw.history : [],
              positions: raw?.positions ?? {},
              mode: raw?.mode ?? null,
              model: raw?.model ?? null,
              explorationStage: isConfirmed ? "state_confirmed" : null,
              routes: [],
              recommendedRouteId: null,
              selectedRouteId: null,
              activeStepId: null,
              platformPlans: [],
              sourceInteractions: {},
            },
            version: 1,
          });
        }

        // Migrate from legacy sift-agent-v1
        const old = await target.getItem("sift-agent-v1");
        if (!old) return null;
        const legacy = JSON.parse(old);
        const rawBrief =
          typeof legacy?.state?.rawBrief === "string"
            ? legacy.state.rawBrief.slice(0, 10000)
            : "";
        return JSON.stringify({
          state: {
            ...emptySession(),
            rawBrief,
            importedBrief: Boolean(rawBrief),
          },
          version: 1,
        });
      } catch {
        readWarning = "本地记录无法读取，已打开空白会话。";
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        await (providedStorage ?? localStorage).setItem(name, value);
      } catch {
        const warning = "浏览器未能保存记录，请暂时不要刷新页面。";
        if (useStore.getState().storageWarning !== warning)
          useStore.setState({ storageWarning: warning });
      }
    },
    removeItem: async (name) => {
      await (providedStorage ?? localStorage).removeItem(name);
    },
  }));

  const useStore = create<SiftStore>()(
    persist(
      (set, get) => ({
        ...emptySession(),
        activeRequest: null,
        error: null,
        storageWarning: null,
        setRawBrief: (rawBrief) =>
          set({ rawBrief, error: null, importedBrief: false }),
        setBriefImages: (briefImages) => set({ briefImages }),
        addBriefImage: (image) => {
          const current = get().briefImages;
          if (current.length >= 5) return;
          const nextImages = [...current, image];
          // Also register as visual inspiration if not present
          const hasInspiration = (get().visualInspirations || []).some((v) => v.url === image);
          if (!hasInspiration) {
            get().addVisualInspiration({
              url: image,
              sourceType: "upload",
              scope: "global",
              title: `参考图 0${nextImages.length}`,
            });
          } else {
            set({ briefImages: nextImages });
          }
        },
        removeBriefImage: (index) => {
          const targetUrl = get().briefImages[index];
          const nextBrief = get().briefImages.filter((_, i) => i !== index);
          const nextVisual = (get().visualInspirations || []).filter((v) => v.url !== targetUrl);
          set({ briefImages: nextBrief, visualInspirations: nextVisual });
        },
        addVisualInspiration: (item) => {
          const id = item.id || `vis_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const newItem: VisualInspiration = {
            id,
            url: item.url,
            title: item.title ?? "",
            sourceType: item.sourceType ?? "upload",
            sourceUrl: item.sourceUrl,
            status: item.status ?? "confirmed",
            scope: item.scope ?? "global",
            targetId: item.targetId,
            palette: item.palette ?? [],
            keywords: item.keywords ?? [],
            notes: item.notes,
            createdAt: Date.now(),
          };
          set((s) => {
            const nextList = [newItem, ...(s.visualInspirations || [])];
            // Sync to itemDecisions
            const nextDecisions = {
              ...s.itemDecisions,
              [id]: {
                id,
                type: "image" as const,
                content: newItem.url,
                label: newItem.title || "视觉灵感",
                status: newItem.status,
                sourceNode:
                  newItem.scope === "route"
                    ? "03 主题"
                    : newItem.scope === "step"
                      ? "04 视点"
                      : "00 简报",
                updatedAt: Date.now(),
              },
            };
            // Sync to briefImages if global/brief
            let nextBrief = s.briefImages;
            if (newItem.scope === "global" && !s.briefImages.includes(newItem.url)) {
              nextBrief = [...s.briefImages, newItem.url].slice(0, 5);
            }
            return {
              visualInspirations: nextList,
              itemDecisions: nextDecisions,
              briefImages: nextBrief,
            };
          });
          return id;
        },
        removeVisualInspiration: (id) => {
          set((s) => {
            const item = (s.visualInspirations || []).find((v) => v.id === id);
            const nextList = (s.visualInspirations || []).filter((v) => v.id !== id);
            const nextDecisions = { ...s.itemDecisions };
            delete nextDecisions[id];
            const nextBrief = item
              ? s.briefImages.filter((img) => img !== item.url)
              : s.briefImages;
            return {
              visualInspirations: nextList,
              itemDecisions: nextDecisions,
              briefImages: nextBrief,
            };
          });
        },
        updateVisualInspiration: (id, partial) => {
          set((s) => {
            const nextList = (s.visualInspirations || []).map((v) => {
              if (v.id !== id) return v;
              return { ...v, ...partial };
            });
            const updatedItem = nextList.find((v) => v.id === id);
            const nextDecisions = { ...s.itemDecisions };
            if (updatedItem && nextDecisions[id]) {
              nextDecisions[id] = {
                ...nextDecisions[id],
                content: updatedItem.url,
                label: updatedItem.title || nextDecisions[id].label,
                status: updatedItem.status,
                updatedAt: Date.now(),
              };
            }
            return {
              visualInspirations: nextList,
              itemDecisions: nextDecisions,
            };
          });
        },
        setVisualInspirationStatus: (id, status) => {
          set((s) => {
            const nextList = (s.visualInspirations || []).map((v) =>
              v.id === id ? { ...v, status } : v,
            );
            const nextDecisions = { ...s.itemDecisions };
            if (nextDecisions[id]) {
              nextDecisions[id] = {
                ...nextDecisions[id],
                status,
                updatedAt: Date.now(),
              };
            }
            return {
              visualInspirations: nextList,
              itemDecisions: nextDecisions,
            };
          });
        },
        assignVisualInspiration: (id, scope, targetId) => {
          set((s) => {
            const nextList = (s.visualInspirations || []).map((v) =>
              v.id === id ? { ...v, scope, targetId } : v,
            );
            const updatedItem = nextList.find((v) => v.id === id);
            const nextDecisions = { ...s.itemDecisions };
            if (updatedItem && nextDecisions[id]) {
              nextDecisions[id] = {
                ...nextDecisions[id],
                sourceNode:
                  scope === "route"
                    ? "03 主题"
                    : scope === "step"
                      ? "04 视点"
                      : "00 简报",
                updatedAt: Date.now(),
              };
            }
            return {
              visualInspirations: nextList,
              itemDecisions: nextDecisions,
            };
          });
        },
        setDrafts: (drafts) => set({ drafts }),
        setCorrectionDraft: (correctionDraft) => set({ correctionDraft }),
        setPosition: (id, position) =>
          set({ positions: { ...get().positions, [id]: position } }),
        setError: (error) => set({ error }),
        beginRequest: () => {
          if (get().activeRequest) return null;
          const token = {
            id: crypto.randomUUID(),
            sessionId: get().sessionId,
            revision: get().state?.revision ?? 0,
          };
          set({ activeRequest: token, error: null });
          return token;
        },
        cancelRequest: () => set({ activeRequest: null, error: null }),
        failRequest: (id, error) => {
          if (get().activeRequest?.id === id)
            set({ activeRequest: null, error });
        },
        commitTurn: (response) => {
          const s = get();
          const token = s.activeRequest;
          if (
            !token ||
            token.id !== response.requestId ||
            token.sessionId !== response.sessionId ||
            s.sessionId !== response.sessionId ||
            token.revision !== response.baseRevision ||
            (s.state?.revision ?? 0) !== response.baseRevision
          )
            return false;
          const parsed = TurnResultSchema.safeParse(response);
          if (
            !parsed.success ||
            response.state.revision !== response.baseRevision + 1 ||
            response.state.status === "confirmed"
          )
            throw new Error("响应状态无效，请重试");
          set({
            state: response.state,
            next: response.next,
            history: response.history,
            mode: response.mode,
            model: response.model,
            activeRequest: null,
            error: null,
            drafts: [],
            correctionDraft: "",
            importedBrief: false,
          });
          return true;
        },
        convergeNow: () => {
          const state = get().state;
          if (!state || state.status !== "questioning") return;
          const nextRevision = state.revision + 1;
          set({
            state: {
              ...state,
              status: "checkpoint",
              revision: nextRevision,
            },
            next: { type: "checkpoint", reason: "user_requested" },
            history: [
              ...get().history,
              {
                id: crypto.randomUUID(),
                questions: null,
                event: { type: "checkpoint", action: "converge" },
                beforeRevision: state.revision,
                afterRevision: nextRevision,
              },
            ],
            activeRequest: null,
            error: null,
            drafts: [],
          });
        },
        enterCheckpoint: () => get().convergeNow(),
        confirm: () => {
          const state = get().state;
          if (!state || state.status !== "checkpoint" || !hasDirection(state))
            return;
          set({
            state: {
              ...state,
              status: "confirmed",
              revision: state.revision + 1,
            },
            explorationStage: "state_confirmed",
            activeRequest: null,
            error: null,
          });
        },
        setRoutes: (routes, recommendedRouteId) => {
          set({
            routes,
            recommendedRouteId,
            explorationStage: "routes",
            activeRequest: null,
            error: null,
          });
        },
        selectRoute: (routeId) => {
          const route = get().routes.find((r) => r.id === routeId);
          if (!route) return;
          set({
            selectedRouteId: routeId,
            activeStepId: route.steps[0]?.id ?? null,
            explorationStage: "route_selected",
            platformPlans: [],
            sourceInteractions: {},
            completedCriteria: {},
            error: null,
          });
        },
        reselectRoute: () => {
          set({
            selectedRouteId: null,
            activeStepId: null,
            explorationStage: "routes",
            platformPlans: [],
            sourceInteractions: {},
            completedCriteria: {},
            error: null,
          });
        },
        setActiveStep: (stepId) => {
          const selectedRoute = get().routes.find(
            (r) => r.id === get().selectedRouteId,
          );
          if (!selectedRoute) return;
          const stepIndex = selectedRoute.steps.findIndex(
            (s) => s.id === stepId,
          );
          if (stepIndex === -1) return;

          // Rollback cleanup: clean up plans and interactions for steps after this step
          const keptStepIds = new Set(
            selectedRoute.steps.slice(0, stepIndex + 1).map((s) => s.id),
          );
          const filteredPlans = get().platformPlans.filter((p) =>
            keptStepIds.has(p.stepId),
          );
          const hasPlanForStep = filteredPlans.some((p) => p.stepId === stepId);

          set({
            activeStepId: stepId,
            platformPlans: filteredPlans,
            explorationStage: hasPlanForStep ? "platform_ready" : "step_active",
            error: null,
          });
        },
        setPlatformPlan: (plan) => {
          const existing = get().platformPlans.filter(
            (p) => p.stepId !== plan.stepId,
          );
          set({
            platformPlans: [...existing, plan],
            explorationStage: "platform_ready",
            activeRequest: null,
            error: null,
          });
        },
        setSearching: () => set({ explorationStage: "searching" }),
        skipSource: (stepId, sourceId) => {
          const key = `${stepId}_${sourceId}`;
          const current = get().sourceInteractions[key] ?? {};
          set({
            sourceInteractions: {
              ...get().sourceInteractions,
              [key]: { ...current, skipped: true },
            },
          });
        },
        replaceSource: (stepId, oldSourceId, newSourceId) => {
          const plans = get().platformPlans.map((plan) => {
            if (plan.stepId !== stepId) return plan;
            const oldIdx = plan.primarySources.findIndex(
              (s) => s.id === oldSourceId,
            );
            const altIdx = plan.alternativeSources.findIndex(
              (s) => s.id === newSourceId,
            );
            if (oldIdx === -1 || altIdx === -1) return plan;

            const oldSource = plan.primarySources[oldIdx];
            const newSource = plan.alternativeSources[altIdx];

            const newPrimary = [...plan.primarySources];
            newPrimary[oldIdx] = newSource;

            const newAlt = [...plan.alternativeSources];
            newAlt[altIdx] = oldSource;

            return {
              ...plan,
              primarySources: newPrimary,
              alternativeSources: newAlt,
            };
          });

          const key = `${stepId}_${oldSourceId}`;
          const current = get().sourceInteractions[key] ?? {};
          set({
            platformPlans: plans,
            sourceInteractions: {
              ...get().sourceInteractions,
              [key]: { ...current, replacedBy: newSourceId },
            },
          });
        },
        recordSourceAction: (stepId, sourceId, action, keyword) => {
          const key = `${stepId}_${sourceId}`;
          const current = get().sourceInteractions[key] ?? {};
          if (action === "opened") {
            set({
              sourceInteractions: {
                ...get().sourceInteractions,
                [key]: { ...current, opened: true },
              },
            });
          } else if (action === "copied" && keyword) {
            const copied = current.copiedKeywords ?? [];
            set({
              sourceInteractions: {
                ...get().sourceInteractions,
                [key]: {
                  ...current,
                  copiedKeywords: copied.includes(keyword)
                    ? copied
                    : [...copied, keyword],
                },
              },
            });
          }
        },
        addStepNote: (stepId, text) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          const currentNotes = get().stepNotes[stepId] ?? [];
          set({
            stepNotes: {
              ...get().stepNotes,
              [stepId]: [...currentNotes, trimmed],
            },
          });
        },
        removeStepNote: (stepId, index) => {
          const currentNotes = get().stepNotes[stepId] ?? [];
          set({
            stepNotes: {
              ...get().stepNotes,
              [stepId]: currentNotes.filter((_, i) => i !== index),
            },
          });
        },
        toggleAcceptanceCriterion: (stepId, criterion) => {
          const current = get().completedCriteria[stepId] ?? [];
          const exists = current.includes(criterion);
          const updated = exists
            ? current.filter((c) => c !== criterion)
            : [...current, criterion];
          set({
            completedCriteria: {
              ...get().completedCriteria,
              [stepId]: updated,
            },
          });
        },
        toggleNodeCollapse: (nodeId) => {
          const current = get().collapsedNodes[nodeId] ?? false;
          set({
            collapsedNodes: {
              ...get().collapsedNodes,
              [nodeId]: !current,
            },
          });
        },
        setNodeCollapse: (nodeId, collapsed) => {
          set({
            collapsedNodes: {
              ...get().collapsedNodes,
              [nodeId]: collapsed,
            },
          });
        },
        collapseCompletedNodes: () => {
          const s = get();
          const nextCollapsed: Record<string, boolean> = { ...s.collapsedNodes };
          if (s.state) {
            nextCollapsed["brief"] = true;
          }
          if (s.state?.status === "confirmed" && s.routes.length > 0) {
            nextCollapsed["direction"] = true;
          }
          s.history.forEach((turn) => {
            nextCollapsed[`turn-${turn.id}`] = true;
          });
          if (s.selectedRouteId) {
            s.routes.forEach((r) => {
              if (r.id !== s.selectedRouteId) {
                nextCollapsed[`route-${r.id}`] = true;
              }
            });
          }
          set({ collapsedNodes: nextCollapsed });
        },
        expandAllNodes: () => {
          set({ collapsedNodes: {} });
        },
        setItemDecision: (decision) => {
          set((s) => ({
            itemDecisions: {
              ...s.itemDecisions,
              [decision.id]: {
                ...decision,
                updatedAt: Date.now(),
              },
            },
          }));
        },
        toggleItemStatus: (id, nextStatus) => {
          set((s) => {
            const current = s.itemDecisions[id];
            if (!current) return s;
            return {
              itemDecisions: {
                ...s.itemDecisions,
                [id]: {
                  ...current,
                  status: nextStatus,
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },
        removeItemDecision: (id) => {
          set((s) => {
            const next = { ...s.itemDecisions };
            delete next[id];
            return { itemDecisions: next };
          });
        },
        getDecisionContext: () => {
          const decisions = get().itemDecisions;
          const confirmed: ItemDecision[] = [];
          const uncertain: ItemDecision[] = [];
          const discarded: ItemDecision[] = [];
          for (const item of Object.values(decisions)) {
            if (item.status === "confirmed") confirmed.push(item);
            else if (item.status === "uncertain") uncertain.push(item);
            else if (item.status === "discarded") discarded.push(item);
          }
          return { confirmed, uncertain, discarded };
        },
        updateRawBrief: (text: string) => {
          set((s) => ({
            rawBrief: text,
            itemDecisions: {
              ...s.itemDecisions,
              brief_text: {
                id: "brief_text",
                type: "text",
                content: text,
                label: "简报需求 (已自定义)",
                status: "confirmed",
                sourceNode: "00 简报",
                updatedAt: Date.now(),
              },
            },
          }));
        },
        updateStateIntent: (text: string) => {
          set((s) => {
            if (!s.state) return s;
            const updatedDirection = {
              ...s.state.direction,
              intent: { text, basis: "user" as const, sourceIds: ["user_edit"] },
            };
            return {
              state: {
                ...s.state,
                revision: s.state.revision + 1,
                direction: updatedDirection,
              },
              itemDecisions: {
                ...s.itemDecisions,
                state_intent: {
                  id: "state_intent",
                  type: "text",
                  content: text,
                  label: "视觉主张 (已自定义)",
                  status: "confirmed",
                  sourceNode: "02 方向",
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },
        updateStatePriority: (index: number, text: string) => {
          set((s) => {
            if (!s.state) return s;
            const priorities = [...s.state.direction.priorities];
            if (index >= 0 && index < priorities.length) {
              priorities[index] = { text, basis: "user" as const, sourceIds: ["user_edit"] };
            } else if (text.trim()) {
              priorities.push({ text, basis: "user" as const, sourceIds: ["user_edit"] });
            }
            return {
              state: {
                ...s.state,
                revision: s.state.revision + 1,
                direction: { ...s.state.direction, priorities },
              },
              itemDecisions: {
                ...s.itemDecisions,
                [`priority_${index}`]: {
                  id: `priority_${index}`,
                  type: "text",
                  content: text,
                  label: "视觉坚持 (已自定义)",
                  status: "confirmed",
                  sourceNode: "02 方向",
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },
        updateStateAvoid: (index: number, text: string) => {
          set((s) => {
            if (!s.state) return s;
            const avoid = [...s.state.direction.avoid];
            if (index >= 0 && index < avoid.length) {
              avoid[index] = { text, basis: "user" as const, sourceIds: ["user_edit"] };
            } else if (text.trim()) {
              avoid.push({ text, basis: "user" as const, sourceIds: ["user_edit"] });
            }
            return {
              state: {
                ...s.state,
                revision: s.state.revision + 1,
                direction: { ...s.state.direction, avoid },
              },
              itemDecisions: {
                ...s.itemDecisions,
                [`avoid_${index}`]: {
                  id: `avoid_${index}`,
                  type: "text",
                  content: text,
                  label: "视觉红线 (已自定义)",
                  status: "confirmed",
                  sourceNode: "02 方向",
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },
        updateStateHypothesis: (text: string) => {
          set((s) => {
            if (!s.state) return s;
            return {
              state: {
                ...s.state,
                revision: s.state.revision + 1,
                currentHypothesis: text,
              },
            };
          });
        },
        updateVisualKeyword: (index: number, keyword: string) => {
          set((s) => {
            if (!s.state) return s;
            const visualKeywords = [...(s.state.visualKeywords ?? [])];
            if (index >= 0 && index < visualKeywords.length) {
              visualKeywords[index] = keyword;
            } else if (keyword.trim()) {
              visualKeywords.push(keyword);
            }
            return {
              state: {
                ...s.state,
                revision: s.state.revision + 1,
                visualKeywords,
              },
              itemDecisions: {
                ...s.itemDecisions,
                [`kw_${keyword}`]: {
                  id: `kw_${keyword}`,
                  type: "text",
                  content: keyword,
                  label: "视觉关键词 (已自定义)",
                  status: "confirmed",
                  sourceNode: "02 方向",
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },
        updateRoute: (routeId: string, partial: Partial<Route>) => {
          set((s) => {
            const routes = s.routes.map((r) =>
              r.id === routeId ? { ...r, ...partial } : r,
            );
            const target = routes.find((r) => r.id === routeId);
            const extraDecisions: Record<string, ItemDecision> = {};
            if (target && (partial.themeName || partial.visualSnapshot)) {
              extraDecisions[`theme_${routeId}`] = {
                id: `theme_${routeId}`,
                type: "theme",
                content: `${target.themeName || target.title}${target.visualSnapshot ? ` · ${target.visualSnapshot}` : ""}`,
                label: "设计主题 (已自定义)",
                status: "confirmed",
                sourceNode: "03 主题",
                updatedAt: Date.now(),
              };
            }
            return {
              routes,
              itemDecisions: { ...s.itemDecisions, ...extraDecisions },
            };
          });
        },
        updateRouteStep: (
          routeId: string,
          stepId: string,
          partial: Partial<RouteStep>,
        ) => {
          set((s) => {
            const routes = s.routes.map((r) => {
              if (r.id !== routeId) return r;
              const steps = r.steps.map((st) =>
                st.id === stepId ? { ...st, ...partial } : st,
              );
              return { ...r, steps };
            });
            return { routes };
          });
        },
        updatePlatformKeyword: (
          stepId: string,
          sourceId: string,
          kwIndex: number,
          newKw: string,
        ) => {
          set((s) => {
            const platformPlans = s.platformPlans.map((plan) => {
              if (plan.stepId !== stepId) return plan;
              const primarySources = plan.primarySources.map((source) => {
                if (source.id !== sourceId) return source;
                const keywords = [...source.keywords];
                if (kwIndex >= 0 && kwIndex < keywords.length) {
                  keywords[kwIndex] = {
                    ...keywords[kwIndex],
                    keyword: newKw,
                    calibratedQuery: newKw,
                    advancedQuery: newKw,
                  };
                }
                return { ...source, keywords };
              });
              return { ...plan, primarySources };
            });
            return {
              platformPlans,
              itemDecisions: {
                ...s.itemDecisions,
                [`kw_${newKw}`]: {
                  id: `kw_${newKw}`,
                  type: "text",
                  content: newKw,
                  label: "搜索词 (已自定义)",
                  status: "confirmed",
                  sourceNode: "05 搜索",
                  updatedAt: Date.now(),
                },
              },
            };
          });
        },
        reset: () =>
          set({ ...emptySession(), activeRequest: null, error: null }),
      }),
      {
        name: STORAGE_KEY,
        version: 1,
        storage,
        skipHydration: true,
        partialize: ({
          sessionId,
          rawBrief,
          briefImages,
          visualInspirations,
          state,
          next,
          history,
          drafts,
          correctionDraft,
          importedBrief,
          positions,
          mode,
          model,
          explorationStage,
          routes,
          recommendedRouteId,
          selectedRouteId,
          activeStepId,
          platformPlans,
          sourceInteractions,
          stepNotes,
          completedCriteria,
          collapsedNodes,
          itemDecisions,
        }) => ({
          sessionId,
          rawBrief,
          briefImages,
          visualInspirations,
          state,
          next,
          history,
          drafts,
          correctionDraft,
          importedBrief,
          positions,
          mode,
          model,
          explorationStage,
          routes,
          recommendedRouteId,
          selectedRouteId,
          activeStepId,
          platformPlans,
          sourceInteractions,
          stepNotes,
          completedCriteria,
          collapsedNodes,
          itemDecisions,
        }),
        merge: (saved, current) => {
          if (!saved) return { ...current, storageWarning: readWarning };
          const parsed = SessionSchema.safeParse(saved);
          return parsed.success
            ? { ...current, ...parsed.data }
            : {
                ...current,
                storageWarning: "本地记录格式不兼容，已打开空白会话。",
              };
        },
      },
    ),
  );
  return useStore;
}

export const useSiftStore = createSiftStore();
