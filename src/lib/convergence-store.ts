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
  CanvasItemSchema,
  BranchSchema,
  SchemeGroupSchema,
} from "./agent/canvas-schema";
import {
  hasDirection,
  type Answer,
  type TurnResult,
} from "@/types/convergence";
import type {
  Route,
  PlatformPlan,
} from "@/types/routes";
import type {
  CanvasItem,
  Branch,
  SchemeGroup,
  ItemStatus,
} from "@/types/canvas";

export const STORAGE_KEY = "sift-convergence-v4";

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
        "canvas_active",
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
    branches: z.record(z.string(), BranchSchema).default({}),
    activeBranchId: z.string().nullable().default(null),
    canvasItems: z.record(z.string(), CanvasItemSchema).default({}),
    schemeGroups: z.record(z.string(), SchemeGroupSchema).default({}),
    explorationMode: z
      .enum(["high_constraint", "low_constraint"])
      .default("high_constraint"),
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
  reset: () => void;
  setCanvasItemStatus: (itemId: string, status: ItemStatus) => void;
  addCanvasItem: (
    item: Omit<CanvasItem, "id" | "createdAt" | "status" | "tags"> & {
      id?: string;
      status?: ItemStatus;
      tags?: string[];
    },
  ) => string;
  removeCanvasItem: (itemId: string) => void;
  updateCanvasItem: (itemId: string, patch: Partial<CanvasItem>) => void;
  createBranchFromItems: (
    name: string,
    sourceItemIds: string[],
    parentBranchId?: string | null,
    sourceNodeId?: string | null,
  ) => string;
  setActiveBranch: (branchId: string | null) => void;
  createSchemeGroup: (
    name: string,
    itemIds: string[],
    color?: string,
  ) => string;
  toggleSchemeGroupCollapse: (groupId: string) => void;
  removeSchemeGroup: (groupId: string) => void;
  setExplorationMode: (mode: "high_constraint" | "low_constraint") => void;
};

function emptySession(): Session {
  return {
    sessionId: crypto.randomUUID(),
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
    platformPlans: [],
    sourceInteractions: {},
    stepNotes: {},
    completedCriteria: {},
    branches: {},
    activeBranchId: null,
    canvasItems: {},
    schemeGroups: {},
    explorationMode: "high_constraint",
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

        // Migrate from sift-convergence-v3
        const v3 = await target.getItem("sift-convergence-v3");
        if (v3 !== null) {
          const parsed = JSON.parse(v3);
          const raw = parsed?.state ?? parsed;
          const isConfirmed = raw?.state?.status === "confirmed";
          const rootBranchId = "branch-root";
          const initialBranches: Record<string, unknown> = raw?.branches ?? {};
          const initialItems: Record<string, unknown> = raw?.canvasItems ?? {};

          if (isConfirmed && Object.keys(initialBranches).length === 0) {
            initialBranches[rootBranchId] = {
              id: rootBranchId,
              name: "主方向探索",
              parentId: null,
              sourceNodeId: "direction",
              inheritedConstraints: [],
              createdAt: Date.now(),
            };
            if (raw?.state?.direction?.intent) {
              const intentId = `item-intent-migrated`;
              const intentContent =
                typeof raw.state.direction.intent === "string"
                  ? raw.state.direction.intent
                  : (raw.state.direction.intent?.text ?? "");
              initialItems[intentId] = {
                id: intentId,
                type: "text",
                branchId: rootBranchId,
                status: "determined",
                title: "核心意图",
                content: intentContent,
                tags: ["intent"],
                createdAt: Date.now(),
              };
            }
          }

          return JSON.stringify({
            state: {
              ...emptySession(),
              ...raw,
              branches: initialBranches,
              activeBranchId: raw?.activeBranchId ?? (isConfirmed ? rootBranchId : null),
              canvasItems: initialItems,
              schemeGroups: raw?.schemeGroups ?? {},
              explorationMode: raw?.explorationMode ?? "high_constraint",
            },
            version: 1,
          });
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

          const rootBranchId = "branch-root";
          const newBranches = { ...get().branches };
          const newItems = { ...get().canvasItems };

          if (!newBranches[rootBranchId]) {
            newBranches[rootBranchId] = {
              id: rootBranchId,
              name: "主方向探索",
              parentId: null,
              sourceNodeId: "direction",
              inheritedConstraints: [],
              createdAt: Date.now(),
            };

            if (state.direction.intent) {
              const intentItemId = `item-intent-${Date.now()}`;
              newItems[intentItemId] = {
                id: intentItemId,
                type: "text",
                branchId: rootBranchId,
                status: "determined",
                title: "核心意图",
                content: state.direction.intent.text,
                tags: ["intent"],
                createdAt: Date.now(),
              };
            }
            if (state.direction.priorities?.length) {
              const priItemId = `item-pri-${Date.now()}`;
              newItems[priItemId] = {
                id: priItemId,
                type: "text",
                branchId: rootBranchId,
                status: "determined",
                title: "坚守原则",
                content: state.direction.priorities.map((p) => p.text).join("；"),
                tags: ["priorities"],
                createdAt: Date.now() + 1,
              };
            }
            if (state.currentHypothesis) {
              const hypItemId = `item-hyp-${Date.now()}`;
              newItems[hypItemId] = {
                id: hypItemId,
                type: "text",
                branchId: rootBranchId,
                status: "undetermined",
                title: "设计假设",
                content: state.currentHypothesis,
                tags: ["hypothesis"],
                createdAt: Date.now() + 2,
              };
            }
            const briefImages = get().briefImages;
            briefImages.forEach((img, idx) => {
              const imgItemId = `item-img-${idx}-${Date.now()}`;
              newItems[imgItemId] = {
                id: imgItemId,
                type: "image",
                branchId: rootBranchId,
                status: "determined",
                title: `参考素材 ${idx + 1}`,
                content: "Brief 导入参考图",
                imageUrl: img,
                tags: ["reference_image"],
                createdAt: Date.now() + 3 + idx,
              };
            });
          }

          set({
            state: {
              ...state,
              status: "confirmed",
              revision: state.revision + 1,
            },
            explorationStage: "state_confirmed",
            branches: newBranches,
            activeBranchId: get().activeBranchId ?? rootBranchId,
            canvasItems: newItems,
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
        setCanvasItemStatus: (itemId: string, status: ItemStatus) => {
          const item = get().canvasItems[itemId];
          if (!item) return;
          set({
            canvasItems: {
              ...get().canvasItems,
              [itemId]: { ...item, status },
            },
          });
        },
        addCanvasItem: (item) => {
          const id = item.id ?? `item-${crypto.randomUUID()}`;
          const branchId = item.branchId ?? get().activeBranchId ?? "branch-root";
          const newItem: CanvasItem = {
            id,
            branchId,
            type: item.type,
            status: item.status ?? "undetermined",
            title: item.title,
            content: item.content ?? "",
            imageUrl: item.imageUrl,
            sourceNodeId: item.sourceNodeId,
            tags: item.tags ?? [],
            createdAt: Date.now(),
          };
          set({
            canvasItems: {
              ...get().canvasItems,
              [id]: newItem,
            },
          });
          return id;
        },
        removeCanvasItem: (itemId: string) => {
          const items = { ...get().canvasItems };
          delete items[itemId];
          const groups = { ...get().schemeGroups };
          for (const gId of Object.keys(groups)) {
            if (groups[gId].itemIds.includes(itemId)) {
              groups[gId] = {
                ...groups[gId],
                itemIds: groups[gId].itemIds.filter((id) => id !== itemId),
              };
            }
          }
          set({ canvasItems: items, schemeGroups: groups });
        },
        updateCanvasItem: (itemId: string, patch: Partial<CanvasItem>) => {
          const item = get().canvasItems[itemId];
          if (!item) return;
          set({
            canvasItems: {
              ...get().canvasItems,
              [itemId]: { ...item, ...patch },
            },
          });
        },
        createBranchFromItems: (
          name: string,
          sourceItemIds: string[],
          parentBranchId?: string | null,
          sourceNodeId?: string | null,
        ) => {
          const newBranchId = `branch-${crypto.randomUUID()}`;
          const items = get().canvasItems;
          const inheritedConstraints = sourceItemIds
            .map((id) => items[id])
            .filter((it): it is CanvasItem => Boolean(it))
            .map((it) => ({
              id: `constraint-${it.id}`,
              sourceItemId: it.id,
              type: it.type,
              title: it.title,
              content: it.content || it.title || "确定项约束",
              imageUrl: it.imageUrl,
            }));

          const newBranch: Branch = {
            id: newBranchId,
            name,
            parentId: parentBranchId ?? get().activeBranchId ?? "branch-root",
            sourceNodeId: sourceNodeId ?? (sourceItemIds[0] ? `node-${sourceItemIds[0]}` : null),
            inheritedConstraints,
            createdAt: Date.now(),
          };

          set({
            branches: {
              ...get().branches,
              [newBranchId]: newBranch,
            },
            activeBranchId: newBranchId,
          });
          return newBranchId;
        },
        setActiveBranch: (branchId: string | null) => {
          set({ activeBranchId: branchId });
        },
        createSchemeGroup: (name: string, itemIds: string[], color?: string) => {
          const id = `scheme-${crypto.randomUUID()}`;
          const newGroup: SchemeGroup = {
            id,
            name,
            branchId: get().activeBranchId ?? undefined,
            itemIds,
            color,
            collapsed: false,
            createdAt: Date.now(),
          };
          set({
            schemeGroups: {
              ...get().schemeGroups,
              [id]: newGroup,
            },
          });
          return id;
        },
        toggleSchemeGroupCollapse: (groupId: string) => {
          const group = get().schemeGroups[groupId];
          if (!group) return;
          set({
            schemeGroups: {
              ...get().schemeGroups,
              [groupId]: { ...group, collapsed: !group.collapsed },
            },
          });
        },
        removeSchemeGroup: (groupId: string) => {
          const groups = { ...get().schemeGroups };
          delete groups[groupId];
          set({ schemeGroups: groups });
        },
        setExplorationMode: (mode: "high_constraint" | "low_constraint") => {
          set({ explorationMode: mode });
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
          branches,
          activeBranchId,
          canvasItems,
          schemeGroups,
          explorationMode,
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
          platformPlans,
          sourceInteractions,
          stepNotes,
          completedCriteria,
          branches,
          activeBranchId,
          canvasItems,
          schemeGroups,
          explorationMode,
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
