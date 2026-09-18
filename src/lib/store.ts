"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import type {
  Brief,
  ChatMessage,
  ExplorationRoute,
  FlowStep,
  PlatformPlan,
  StartingState,
  VBEdge,
  VBNode,
  VeriboxState,
} from "@/types";
import {
  BRIEF_ID,
  BRIEF_INPUT_ID,
  childPosition,
  link,
  seedNodes,
} from "@/lib/canvas-graph";

function newSessionId() {
  return `vb_${Date.now().toString(36)}`;
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

type Actions = {
  setRawBrief: (value: string) => void;
  setBrief: (brief: Brief) => void;
  updateBriefField: <K extends keyof Brief>(key: K, value: Brief[K]) => void;
  setUserInitialIdea: (ideas: string[]) => void;
  setStartingState: (state: StartingState, ideas?: string[]) => void;
  setRoutes: (
    routes: ExplorationRoute[],
    recommendedRouteId: string | null
  ) => void;
  selectRoute: (route: ExplorationRoute) => void;
  setPlatformPlan: (plan: PlatformPlan, routeId?: string, stepName?: string) => void;
  setActiveStep: (step: string) => void;
  setStep: (step: FlowStep) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  goBack: () => void;
  reset: () => void;
  recordChange: (change: string) => void;
  onNodesChange: (changes: NodeChange<VBNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<VBEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (id: string | null) => void;
  addInsightCards: (
    cards: { title: string; body: string; parentId: string | null }[]
  ) => void;
  addMessage: (message: Omit<ChatMessage, "id">) => void;
  setChatOpen: (open: boolean) => void;
};

const initial: VeriboxState = {
  sessionId: newSessionId(),
  step: "brief_input",
  rawBrief: "",
  brief: null,
  startingState: null,
  userInitialIdea: [],
  routes: [],
  recommendedRouteId: null,
  selectedRoute: null,
  activeStep: null,
  platformPlan: null,
  userChanges: [],
  loading: false,
  error: null,
  nodes: seedNodes(),
  edges: [],
  selectedNodeId: BRIEF_INPUT_ID,
  messages: [],
  chatOpen: true,
};

function upsertNode(nodes: VBNode[], node: VBNode): VBNode[] {
  const i = nodes.findIndex((n) => n.id === node.id);
  if (i === -1) return [...nodes, node];
  const next = nodes.slice();
  next[i] = { ...next[i], ...node, data: { ...next[i].data, ...node.data } };
  return next;
}

function upsertEdge(edges: VBEdge[], edge: VBEdge): VBEdge[] {
  if (edges.some((e) => e.id === edge.id)) return edges;
  return [...edges, edge];
}

export const useVeriboxStore = create<VeriboxState & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      setRawBrief: (rawBrief) => set({ rawBrief, error: null }),
      setBrief: (brief) => {
        const parent = get().nodes.find((n) => n.id === BRIEF_INPUT_ID);
        const node: VBNode = {
          id: BRIEF_ID,
          type: "brief",
          position: childPosition(parent, 0, 1),
          data: { kind: "brief", title: "任务理解", brief },
          dragHandle: ".card-drag",
        };
        set({
          brief,
          step: "brief_confirm",
          error: null,
          nodes: upsertNode(get().nodes, node),
          edges: upsertEdge(get().edges, link(BRIEF_INPUT_ID, BRIEF_ID, "理解")),
          selectedNodeId: BRIEF_ID,
        });
      },
      updateBriefField: (key, value) => {
        const brief = get().brief;
        if (!brief) return;
        const next = { ...brief, [key]: value };
        set({
          brief: next,
          nodes: get().nodes.map((n) =>
            n.id === BRIEF_ID ? { ...n, data: { ...n.data, brief: next } } : n
          ),
        });
      },
      setUserInitialIdea: (userInitialIdea) => set({ userInitialIdea }),
      setStartingState: (startingState, ideas = []) =>
        set({ startingState, userInitialIdea: ideas, error: null }),
      setRoutes: (routes, recommendedRouteId) => {
        const parent = get().nodes.find((n) => n.id === BRIEF_ID);
        let nodes = get().nodes;
        let edges = get().edges;
        routes.forEach((route, i) => {
          const id = `card-route-${route.id}`;
          const node: VBNode = {
            id,
            type: "route",
            position: childPosition(parent, i, routes.length),
            data: {
              kind: "route",
              title: route.title,
              route,
              recommended: route.id === recommendedRouteId,
            },
            dragHandle: ".card-drag",
          };
          nodes = upsertNode(nodes, node);
          edges = upsertEdge(
            edges,
            link(BRIEF_ID, id, route.id === recommendedRouteId ? "推荐" : "方案")
          );
        });
        set({
          routes,
          recommendedRouteId,
          step: "routes",
          error: null,
          nodes,
          edges,
        });
      },
      selectRoute: (route) =>
        set({
          selectedRoute: route,
          activeStep: route.steps[0] ?? null,
          step: "platform_plan",
          error: null,
          selectedNodeId: `card-route-${route.id}`,
        }),
      setPlatformPlan: (platformPlan, routeId, stepName) => {
        const rid = routeId ?? get().selectedRoute?.id ?? "route";
        const step = stepName ?? get().activeStep ?? "search";
        const parent =
          get().nodes.find((n) => n.id === `card-route-${rid}`) ??
          get().nodes.find((n) => n.id === get().selectedNodeId);
        const id = `card-platform-${rid}-${step}`;
        const siblings = get().nodes.filter((n) => n.data.kind === "platform");
        const node: VBNode = {
          id,
          type: "platform",
          position: childPosition(parent, siblings.length, siblings.length + 1),
          data: {
            kind: "platform",
            title: `搜「${step}」`,
            plan: platformPlan,
            routeId: rid,
          },
          dragHandle: ".card-drag",
        };
        const from = parent?.id ?? `card-route-${rid}`;
        set({
          platformPlan,
          activeStep: step,
          error: null,
          nodes: upsertNode(get().nodes, node),
          edges: upsertEdge(get().edges, link(from, id, step)),
          selectedNodeId: id,
        });
      },
      setActiveStep: (activeStep) => set({ activeStep, error: null }),
      setStep: (step) => set({ step }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      goBack: () => set({ selectedNodeId: null }),
      reset: () =>
        set({
          ...initial,
          sessionId: newSessionId(),
          nodes: seedNodes(),
        }),
      recordChange: (change) =>
        set({ userChanges: [...get().userChanges, change] }),
      onNodesChange: (changes) =>
        set({ nodes: applyNodeChanges(changes, get().nodes) as VBNode[] }),
      onEdgesChange: (changes) =>
        set({ edges: applyEdgeChanges(changes, get().edges) }),
      onConnect: (connection) =>
        set({
          edges: addEdge({ ...connection, type: "smoothstep", label: "连接" }, get().edges),
        }),
      selectNode: (id) => set({ selectedNodeId: id }),
      addInsightCards: (cards) => {
        let nodes = get().nodes;
        let edges = get().edges;
        let lastId = get().selectedNodeId;
        cards.forEach((card, i) => {
          const parent = nodes.find((n) => n.id === card.parentId);
          const id = newId("card-insight");
          const node: VBNode = {
            id,
            type: "insight",
            position: childPosition(parent, i, cards.length),
            data: { kind: "insight", title: card.title, body: card.body },
            dragHandle: ".card-drag",
          };
          nodes = upsertNode(nodes, node);
          if (card.parentId) {
            edges = upsertEdge(edges, link(card.parentId, id, "思考"));
          }
          lastId = id;
        });
        set({ nodes, edges, selectedNodeId: lastId });
      },
      addMessage: (message) =>
        set({
          messages: [...get().messages, { ...message, id: newId("msg") }],
        }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
    }),
    {
      name: "veribox-canvas-think-v1",
      partialize: (state) => ({
        sessionId: state.sessionId,
        step: state.step,
        rawBrief: state.rawBrief,
        brief: state.brief,
        startingState: state.startingState,
        userInitialIdea: state.userInitialIdea,
        routes: state.routes,
        recommendedRouteId: state.recommendedRouteId,
        selectedRoute: state.selectedRoute,
        activeStep: state.activeStep,
        platformPlan: state.platformPlan,
        userChanges: state.userChanges,
        nodes: state.nodes,
        edges: state.edges,
        selectedNodeId: state.selectedNodeId,
        messages: state.messages,
        chatOpen: state.chatOpen,
      }),
    }
  )
);
