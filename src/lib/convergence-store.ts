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
  DesignStateSchema,
  HistoryEntrySchema,
  NextSchema,
  TurnPayloadSchema,
  TurnResultSchema,
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
import {
  cleanStepLabel,
  type Route,
  type RouteStep,
  type PlatformPlan,
} from "@/types/routes";
import { synthesizeCardFromInputs, type ToolType } from "./card-synthesis";

export const STORAGE_KEY = "sift-convergence-v3";

const SourceInteractionSchema = z.object({
  skipped: z.boolean().optional(),
  replacedBy: z.string().optional(),
  opened: z.boolean().optional(),
  copiedKeywords: z.array(z.string()).optional(),
});

export const CustomCardSchema = z.object({
  id: z.string(),
  type: z.enum(["brief", "ask", "state", "route", "step", "platformPlan", "note", "image"]),
  title: z.string().optional(),
  content: z.string().optional(),
  color: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
  position: z.object({ x: z.number(), y: z.number() }),
});

export type CustomCard = z.infer<typeof CustomCardSchema>;

export const CustomEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  animated: z.boolean().optional().default(true),
  style: z.record(z.string(), z.any()).optional(),
});

export type CustomEdge = z.infer<typeof CustomEdgeSchema>;
export type CustomEdgeInput = z.input<typeof CustomEdgeSchema>;

const SessionSchema = z
  .object({
    sessionId: z.string().min(1),
    rawBrief: z.string().max(10000),
    briefImages: z.array(z.string()).default([]),
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
    exploredRouteIds: z.array(z.string()).default([]),
    platformPlans: z.array(PlatformPlanSchema),
    sourceInteractions: z.record(z.string(), SourceInteractionSchema),
    stepNotes: z.record(z.string(), z.array(z.string())).default({}),
    completedCriteria: z.record(z.string(), z.array(z.string())).default({}),
    customCards: z.array(CustomCardSchema).default([]),
    customEdges: z.array(CustomEdgeSchema).default([]),
    deletedNodeIds: z.array(z.string()).default([]),
    collapsedNodeIds: z.array(z.string()).default([]),
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
  unexploreRoute: (routeId: string) => void;
  toggleExploreRoute: (routeId: string) => void;
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
  addCustomCard: (card: Omit<CustomCard, "id"> & { id?: string }) => string;
  updateCustomCard: (id: string, patch: Partial<CustomCard>) => void;
  deleteNodeById: (id: string) => void;
  restoreNodeById: (id: string) => void;
  restoreRoutes: () => void;
  addCustomEdge: (edge: CustomEdgeInput) => void;
  deleteCustomEdge: (id: string) => void;
  synthesizeCard: (id: string) => boolean;
  duplicateNode: (id: string) => string | null;
  toggleNodeCollapse: (id: string) => void;
  collapseAllNodes: (nodeIds: string[]) => void;
  expandAllNodes: () => void;
  reset: () => void;
};

export function safeId(prefix = ""): string {
  let rand = "";
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      rand = crypto.randomUUID().slice(0, 8);
    } catch {
      rand = Math.random().toString(36).slice(2, 10);
    }
  } else {
    rand = Math.random().toString(36).slice(2, 10);
  }
  return prefix ? `${prefix}${rand}` : rand;
}

export function safeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptySession(): Session {
  return {
    sessionId: safeUuid(),
    rawBrief: "",
    briefImages: [],
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
    exploredRouteIds: [],
    platformPlans: [],
    sourceInteractions: {},
    stepNotes: {},
    completedCriteria: {},
    customCards: [],
    customEdges: [],
    deletedNodeIds: [],
    collapsedNodeIds: [],
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
          JSON.parse(stored); // Recover malformed JSON before Zustand's decoder.
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
          if (current.length >= 3) return;
          set({ briefImages: [...current, image] });
        },
        removeBriefImage: (index) => {
          set({ briefImages: get().briefImages.filter((_, i) => i !== index) });
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
            exploredRouteIds: [],
            explorationStage: "routes",
            deletedNodeIds: get().deletedNodeIds.filter(
              (id) => !id.startsWith("route-"),
            ),
            activeRequest: null,
            error: null,
          });
        },
        selectRoute: (routeId) => {
          let route = get().routes.find(
            (r) => r.id === routeId || `route-${r.id}` === routeId,
          );
          if (!route) {
            const custom = get().customCards.find(
              (c) => c.id === routeId || c.data?.route?.id === routeId,
            );
            if (custom?.data?.route) {
              route = custom.data.route as Route;
            }
          }
          if (!route) return;

          const currentRoutes = get().routes;
          const nextRoutes = currentRoutes.some((r) => r.id === route!.id)
            ? currentRoutes
            : [...currentRoutes, route];

          const currentExplored = get().exploredRouteIds ?? [];
          const nextExplored = currentExplored.includes(route.id)
            ? currentExplored
            : [...currentExplored, route.id];

          set({
            routes: nextRoutes,
            selectedRouteId: route.id,
            exploredRouteIds: nextExplored,
            activeStepId: route.steps[0]?.id ?? null,
            explorationStage: "route_selected",
            // Multi-branch: preserve platformPlans and other theme progress!
            error: null,
          });
        },
        unexploreRoute: (routeId) => {
          const currentExplored = get().exploredRouteIds ?? [];
          const nextExplored = currentExplored.filter(
            (id) => id !== routeId && `route-${id}` !== routeId,
          );
          set({
            exploredRouteIds: nextExplored,
            selectedRouteId:
              get().selectedRouteId === routeId
                ? nextExplored[nextExplored.length - 1] ?? null
                : get().selectedRouteId,
            explorationStage:
              nextExplored.length > 0 ? "route_selected" : "routes",
          });
        },
        toggleExploreRoute: (routeId) => {
          const currentExplored = get().exploredRouteIds ?? [];
          if (currentExplored.includes(routeId)) {
            get().unexploreRoute(routeId);
          } else {
            get().selectRoute(routeId);
          }
        },
        reselectRoute: () => {
          set({
            selectedRouteId: null,
            exploredRouteIds: [],
            activeStepId: null,
            explorationStage: "routes",
            platformPlans: [],
            sourceInteractions: {},
            completedCriteria: {},
            error: null,
          });
        },
        setActiveStep: (stepId) => {
          const selectedRoute =
            get().routes.find((r) => r.steps.some((s) => s.id === stepId)) ??
            get().routes.find((r) => r.id === get().selectedRouteId);

          let filteredPlans = get().platformPlans;
          if (selectedRoute) {
            const stepIndex = selectedRoute.steps.findIndex(
              (s) => s.id === stepId,
            );
            if (stepIndex !== -1) {
              const currentRouteStepIds = new Set(
                selectedRoute.steps.map((s) => s.id),
              );
              const keptStepIds = new Set(
                selectedRoute.steps.slice(0, stepIndex + 1).map((s) => s.id),
              );
              // Clean up subsequent steps of THIS route only, keeping plans of other routes intact
              filteredPlans = get().platformPlans.filter(
                (p) =>
                  !currentRouteStepIds.has(p.stepId) ||
                  keptStepIds.has(p.stepId),
              );
            }
          }

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
        addCustomCard: (card) => {
          const id = card.id ?? safeId("card-");
          const newCard: CustomCard = {
            id,
            type: card.type,
            title: card.title,
            content: card.content,
            color: card.color,
            data: card.data,
            position: card.position,
          };
          const nextCards = [...get().customCards, newCard];
          const currentRoutes = get().routes;
          let nextRoutes = currentRoutes;

          if (newCard.type === "route" && newCard.data?.route) {
            const r = newCard.data.route as Route;
            if (!currentRoutes.some((existing) => existing.id === r.id)) {
              nextRoutes = [...currentRoutes, r];
            }
          }

          set({
            customCards: nextCards,
            routes: nextRoutes,
          });
          return id;
        },
        updateCustomCard: (id, patch) => {
          const currentCards = get().customCards;
          const currentRoutes = get().routes;
          let nextRoutes = currentRoutes;

          const updatedCards = currentCards.map((c) => {
            if (c.id !== id) return c;
            const updated = {
              ...c,
              ...patch,
              data: {
                ...(c.data || {}),
                ...(patch.data || {}),
              },
            };
            if (updated.type === "route" && updated.data?.route) {
              const r = updated.data.route as Route;
              if (!nextRoutes.some((existing) => existing.id === r.id)) {
                nextRoutes = [...nextRoutes, r];
              } else {
                nextRoutes = nextRoutes.map((existing) => (existing.id === r.id ? r : existing));
              }
            }
            return updated;
          });

          set({
            customCards: updatedCards,
            routes: nextRoutes,
          });
        },
        deleteNodeById: (id) => {
          const currentDeleted = get().deletedNodeIds;
          set({
            deletedNodeIds: currentDeleted.includes(id)
              ? currentDeleted
              : [...currentDeleted, id],
            customCards: get().customCards.filter((c) => c.id !== id),
            customEdges: get().customEdges.filter(
              (e) => e.source !== id && e.target !== id
            ),
          });
        },
        restoreNodeById: (id) => {
          set({
            deletedNodeIds: get().deletedNodeIds.filter((delId) => delId !== id),
          });
        },
        restoreRoutes: () => {
          set({
            deletedNodeIds: get().deletedNodeIds.filter(
              (delId) => !delId.startsWith("route-"),
            ),
          });
        },
        addCustomEdge: (edge) => {
          const currentEdges = get().customEdges;
          if (
            currentEdges.some(
              (e) => e.source === edge.source && e.target === edge.target
            )
          ) {
            return;
          }
          set({
            customEdges: [
              ...currentEdges,
              {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                animated: edge.animated ?? true,
                style: edge.style,
              },
            ],
          });
        },
        deleteCustomEdge: (id) => {
          set({
            customEdges: get().customEdges.filter((e) => e.id !== id),
          });
        },
        synthesizeCard: (cardId: string) => {
          const state = get();
          const targetCard = state.customCards.find((c) => c.id === cardId);
          if (!targetCard) return false;

          const upstreamEdges = state.customEdges.filter((e) => e.target === cardId);
          const upstreamIds = Array.from(new Set(upstreamEdges.map((e) => e.source)));

          const upstreamNodes = upstreamIds
            .map((srcId) => resolveNodeContext(srcId, state))
            .filter((n): n is ResolvedNodeContext => Boolean(n));

          const synthesized = synthesizeCardFromInputs(
            targetCard.type as ToolType,
            upstreamNodes,
            {
              state: state.state,
              rawBrief: state.rawBrief,
              routes: state.routes,
            }
          );

          let nextRoutes = state.routes;
          if (synthesized.data?.route) {
            const rawRoute = synthesized.data.route as Route;
            // Harmonize route id with target card id for direct edge/step consistency
            const newRoute: Route = {
              ...rawRoute,
              id: targetCard.type === "route" ? (rawRoute.id || targetCard.id) : rawRoute.id,
            };
            synthesized.data.route = newRoute;

            if (!nextRoutes.some((r) => r.id === newRoute.id)) {
              nextRoutes = [...nextRoutes, newRoute];
            } else {
              nextRoutes = nextRoutes.map((r) => (r.id === newRoute.id ? newRoute : r));
            }
          }

          set({
            routes: nextRoutes,
            customCards: state.customCards.map((c) =>
              c.id === cardId
                ? {
                    ...c,
                    ...synthesized,
                    title: synthesized.title ?? c.title,
                    data: {
                      ...c.data,
                      ...synthesized.data,
                      isEmpty: false,
                    },
                  }
                : c
            ),
          });

          return true;
        },
        duplicateNode: (id) => {
          const state = get();
          const custom = state.customCards.find((c) => c.id === id);
          if (custom) {
            const newId = safeId("card-");
            let duplicatedData = custom.data ? { ...custom.data } : undefined;
            let newRouteToSync: Route | null = null;

            if (custom.type === "route" && custom.data?.route) {
              const oldRoute = custom.data.route as Route;
              const newRouteId = safeId("route-branch-");
              newRouteToSync = {
                ...oldRoute,
                id: newRouteId,
                title: `${oldRoute.title} (副本分支)`,
                themeName: `${oldRoute.themeName || "风格主题"} (副本)`,
                steps: (oldRoute.steps ?? []).map((s, idx) => ({
                  ...s,
                  id: `${newRouteId}-s${idx + 1}`,
                })),
              };
              duplicatedData = { ...duplicatedData, route: newRouteToSync };
            }

            const duplicated: CustomCard = {
              ...custom,
              id: newId,
              title: newRouteToSync?.themeName ?? (custom.title ? `${custom.title} (副本)` : undefined),
              data: duplicatedData,
              position: {
                x: custom.position.x + 40,
                y: custom.position.y + 40,
              },
            };

            set({
              customCards: [...state.customCards, duplicated],
              routes: newRouteToSync ? [...state.routes, newRouteToSync] : state.routes,
            });
            return newId;
          }

          const route = state.routes.find(
            (r) => `route-${r.id}` === id || r.id === id,
          );
          if (route) {
            const newCardId = safeId("card-");
            const newRouteId = safeId("route-branch-");
            const duplicatedRoute: Route = {
              ...route,
              id: newRouteId,
              title: `${route.themeName || route.title} (分支副本)`,
              themeName: `${route.themeName || "风格主题"} (副本)`,
              steps: (route.steps ?? []).map((s, idx) => ({
                ...s,
                id: `${newRouteId}-s${idx + 1}`,
              })),
            };
            const duplicated: CustomCard = {
              id: newCardId,
              type: "route",
              title: duplicatedRoute.themeName,
              data: { route: duplicatedRoute },
              position: {
                x: (state.positions[id]?.x ?? 400) + 40,
                y: (state.positions[id]?.y ?? 100) + 40,
              },
            };
            set({
              customCards: [...state.customCards, duplicated],
              routes: [...state.routes, duplicatedRoute],
            });
            return newCardId;
          }

          const pos = state.positions[id] ?? { x: 400, y: 100 };
          const newId = safeId("card-");
          const duplicated: CustomCard = {
            id: newId,
            type: "note",
            title: "副本便签",
            content: `源自 ${id} 的探索分支`,
            position: { x: pos.x + 40, y: pos.y + 40 },
          };
          set({ customCards: [...state.customCards, duplicated] });
          return newId;
        },
        toggleNodeCollapse: (id: string) =>
          set((state) => ({
            collapsedNodeIds: state.collapsedNodeIds.includes(id)
              ? state.collapsedNodeIds.filter((x) => x !== id)
              : [...state.collapsedNodeIds, id],
          })),
        collapseAllNodes: (nodeIds: string[]) =>
          set(() => ({
            collapsedNodeIds: Array.from(new Set(nodeIds)),
          })),
        expandAllNodes: () =>
          set(() => ({
            collapsedNodeIds: [],
          })),
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
          exploredRouteIds,
          platformPlans,
          sourceInteractions,
          stepNotes,
          completedCriteria,
          customCards,
          customEdges,
          deletedNodeIds,
          collapsedNodeIds,
        }) => ({
          sessionId,
          rawBrief,
          briefImages,
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
          exploredRouteIds,
          platformPlans,
          sourceInteractions,
          stepNotes,
          completedCriteria,
          customCards,
          customEdges,
          deletedNodeIds,
          collapsedNodeIds,
        }),
        merge: (saved, current) => {
          if (!saved) return { ...current, storageWarning: readWarning };
          const parsed = SessionSchema.safeParse(saved);
          if (!parsed.success) {
            return {
              ...current,
              storageWarning: "本地记录格式不兼容，已打开空白会话。",
            };
          }
          const loadedExplored = parsed.data.exploredRouteIds ?? [];
          const finalExplored =
            loadedExplored.length > 0
              ? loadedExplored
              : parsed.data.selectedRouteId
                ? [parsed.data.selectedRouteId]
                : [];
          return {
            ...current,
            ...parsed.data,
            exploredRouteIds: finalExplored,
          };
        },
      },
    ),
  );
  return useStore;
}

export const useSiftStore = createSiftStore();

export interface ResolvedNodeContext {
  id: string;
  type: ToolType;
  label: string;
  data: Record<string, any>;
  route?: Route;
  step?: RouteStep;
  plan?: PlatformPlan;
}

export function resolveNodeContext(
  nodeId: string,
  store: {
    rawBrief?: string;
    state?: any;
    history?: any[];
    routes?: Route[];
    platformPlans?: PlatformPlan[];
    customCards?: CustomCard[];
  },
): ResolvedNodeContext | null {
  // 1. 00 Brief
  if (nodeId === "brief") {
    return {
      id: "brief",
      type: "brief",
      label: "00 简报解析",
      data: {
        goal: store.state?.brief?.goal || store.rawBrief || "设计任务简报",
        rawBrief: store.rawBrief || "",
        state: store.state,
      },
    };
  }

  // 2. 02 Strategy Baseline (02 策略基准 - ID can be "direction" or "state")
  if (nodeId === "direction" || nodeId === "state") {
    const intent = store.state?.direction?.intent?.text;
    return {
      id: "direction",
      type: "state",
      label: intent ? `02 策略基准 (${intent.slice(0, 10)})` : "02 策略基准",
      data: {
        state: store.state,
      },
    };
  }

  // 3. 01 Visual Crossroads / Ask (01 视觉抉择 - ID can be "ask", "turn-*", "round-*")
  if (
    nodeId === "ask" ||
    nodeId.startsWith("turn-") ||
    nodeId.startsWith("round-")
  ) {
    return {
      id: nodeId,
      type: "ask",
      label: "01 视觉抉择",
      data: {
        history: store.history,
      },
    };
  }

  // 4. 03 Style Themes (03 风格主题 - standard routes: "route-{id}" or "{id}")
  const matchedRoute = store.routes?.find(
    (r) => r.id === nodeId || `route-${r.id}` === nodeId,
  );
  if (matchedRoute) {
    return {
      id: nodeId,
      type: "route",
      label: `主题：${matchedRoute.themeName || matchedRoute.title}`,
      data: { route: matchedRoute },
      route: matchedRoute,
    };
  }

  // 5. 04 Steps (04 视点推进 - standard steps: "step-{routeId}")
  if (nodeId.startsWith("step-")) {
    const routeId = nodeId.replace(/^step-/, "");
    const parentRoute = store.routes?.find(
      (r) => r.id === routeId || `route-${r.id}` === routeId,
    );
    const step = parentRoute?.steps?.[0];
    const stepTitle = step?.title ? cleanStepLabel(step.title) : "视点推进";
    return {
      id: nodeId,
      type: "step",
      label: `04 视点推进 · ${stepTitle}`,
      data: {
        route: parentRoute,
        step,
        stepId: step?.id,
      },
      route: parentRoute,
      step,
    };
  }

  // 6. 05 Platform Plans (05 灵感检索 - standard plans: "plan-{stepId}")
  if (nodeId.startsWith("plan-")) {
    const stepId = nodeId.replace(/^plan-/, "");
    const plan = store.platformPlans?.find(
      (p) => p.stepId === stepId || p.id === nodeId,
    );
    return {
      id: nodeId,
      type: "platformPlan",
      label: "05 灵感检索",
      data: { plan },
      plan,
    };
  }

  // 7. Custom Cards
  const custom = store.customCards?.find((c) => c.id === nodeId);
  if (custom) {
    let label = custom.title || "自定义卡片";
    if (custom.type === "route") {
      const customRoute = custom.data?.route;
      label = `主题：${custom.title || customRoute?.themeName || "风格主题"}`;
    } else if (custom.type === "step") {
      const customStep = custom.data?.step || custom.data?.route?.steps?.[0];
      const stepTitle = customStep?.title ? cleanStepLabel(customStep.title) : "";
      label = `04 视点推进${stepTitle ? ` · ${stepTitle}` : ""}`;
    } else if (custom.type === "platformPlan") {
      label = "05 灵感检索";
    } else if (custom.type === "image") {
      label = `参考图：${custom.data?.fileName || custom.title || "意向图"}`;
    } else if (custom.type === "note") {
      label = `便签：${custom.title || "设计手记"}`;
    } else if (custom.type === "state") {
      label = "02 策略基准";
    } else if (custom.type === "brief") {
      label = "00 简报解析";
    } else if (custom.type === "ask") {
      label = "01 视觉抉择";
    }

    return {
      id: custom.id,
      type: custom.type as ToolType,
      label,
      data: custom.data || {},
      route: custom.data?.route,
    };
  }

  return null;
}

export interface UpstreamSummary {
  count: number;
  labels: string[];
  themesCount: number;
  hasStrategy: boolean;
  hasBrief: boolean;
  hasStep: boolean;
}

export function getUpstreamSummary(
  cardId: string,
  store: {
    customEdges: CustomEdgeInput[];
    routes: Route[];
    customCards: CustomCard[];
    platformPlans?: PlatformPlan[];
    state?: any;
    rawBrief?: string;
    history?: any[];
  },
): UpstreamSummary {
  const edges = store.customEdges.filter((e) => e.target === cardId);
  const upstreamIds = Array.from(new Set(edges.map((e) => e.source)));
  const labels: string[] = [];
  let themesCount = 0;
  let hasStrategy = false;
  let hasBrief = false;
  let hasStep = false;

  for (const srcId of upstreamIds) {
    const resolved = resolveNodeContext(srcId, store);
    if (!resolved) {
      labels.push("未识别上游");
      continue;
    }

    labels.push(resolved.label);

    if (resolved.type === "route") {
      themesCount++;
    } else if (resolved.type === "state") {
      hasStrategy = true;
    } else if (resolved.type === "brief") {
      hasBrief = true;
    } else if (resolved.type === "step") {
      hasStep = true;
    }
  }

  return {
    count: upstreamIds.length,
    labels,
    themesCount,
    hasStrategy,
    hasBrief,
    hasStep,
  };
}

