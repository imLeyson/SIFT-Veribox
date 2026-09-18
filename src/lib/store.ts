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
  STATE_ID,
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
  skipSource: (nodeId: string, name: string) => void;
  replaceSource: (nodeId: string, name: string) => void;
  toggleMoreSources: (nodeId: string) => void;
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
      setStartingState: (startingState, ideas = []) => {
        const parent = get().nodes.find((n) => n.id === BRIEF_ID);
        const label =
          startingState === "has_idea"
            ? `已有想法：${ideas.join(" / ") || "未写词"}`
            : startingState === "no_idea"
              ? "暂时没有明确想法"
              : "选择入口后才会生成路线";
        const node: VBNode = {
          id: STATE_ID,
          type: "state",
          position: childPosition(parent, 0, 1),
          data: { kind: "state", title: "当前状态", body: label },
          dragHandle: ".card-drag",
        };
        set({
          startingState,
          userInitialIdea: ideas,
          step: "starting_state",
          error: null,
          nodes: upsertNode(get().nodes, node),
          edges: upsertEdge(get().edges, link(BRIEF_ID, STATE_ID, "状态")),
          selectedNodeId: STATE_ID,
        });
      },
      setRoutes: (routes, recommendedRouteId) => {
        const parent = get().nodes.find((n) => n.id === STATE_ID) ?? get().nodes.find((n) => n.id === BRIEF_ID);
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
            link(STATE_ID, id, route.id === recommendedRouteId ? "推荐" : "方案")
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
          nodes: get().nodes.map((n) =>
            n.data.kind === "route"
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    dimmed: n.data.route?.id !== route.id,
                    recommended: n.data.route?.id === get().recommendedRouteId,
                  },
                }
              : n
          ),
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
      goBack: () => {
        const current = get().step;
        if (current === "platform_plan" || current === "canvas_chat") {
          const nodes = get().nodes.filter((n) => n.data.kind !== "platform");
          const ids = new Set(nodes.map((n) => n.id));
          set({
            step: "routes",
            selectedRoute: null,
            activeStep: null,
            platformPlan: null,
            nodes: nodes.map((n) =>
              n.data.kind === "route" ? { ...n, data: { ...n.data, dimmed: false } } : n
            ),
            edges: get().edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
            selectedNodeId: get().routes[0]
              ? `card-route-${get().routes[0].id}`
              : STATE_ID,
          });
          return;
        }
        if (current === "routes") {
          const nodes = get().nodes.filter((n) => n.data.kind !== "route");
          const ids = new Set(nodes.map((n) => n.id));
          set({
            step: "starting_state",
            routes: [],
            recommendedRouteId: null,
            nodes,
            edges: get().edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
            selectedNodeId: STATE_ID,
          });
          return;
        }
        if (current === "starting_state") {
          const nodes = get().nodes.filter((n) => n.id !== STATE_ID);
          const ids = new Set(nodes.map((n) => n.id));
          set({
            step: "brief_confirm",
            startingState: null,
            userInitialIdea: [],
            nodes,
            edges: get().edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
            selectedNodeId: BRIEF_ID,
          });
          return;
        }
        if (current === "brief_confirm") {
          set({ step: "brief_input", selectedNodeId: BRIEF_INPUT_ID });
        }
      },
      reset: () => {
        useVeriboxStore.persist.clearStorage();
        set({
          ...initial,
          sessionId: newSessionId(),
          nodes: seedNodes(),
          edges: [],
          messages: [],
          loading: false,
          error: null,
        });
      },
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
      skipSource: (nodeId, name) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    skippedSources: [
                      ...(n.data.skippedSources ?? []),
                      name,
                    ],
                  },
                }
              : n
          ),
        });
        get().recordChange(`skip:${name}`);
      },
      replaceSource: (nodeId, name) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        const plan = node?.data.plan;
        if (!plan) return;
        const skipped = new Set(node.data.skippedSources ?? []);
        const replaced = { ...(node.data.replacedSources ?? {}) };
        const visible = plan.sources
          .map((s) => replaced[s.name] ?? s)
          .filter((s) => !skipped.has(s.name));
        const alt = plan.alternatives.find(
          (a) =>
            !visible.some((s) => s.name === a.name) &&
            !skipped.has(a.name) &&
            a.name !== name
        );
        if (!alt) return;
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    replacedSources: { ...replaced, [name]: alt },
                  },
                }
              : n
          ),
        });
        get().recordChange(`replace:${name}->${alt.name}`);
      },
      toggleMoreSources: (nodeId) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    showMoreSources: !n.data.showMoreSources,
                  },
                }
              : n
          ),
        });
      },
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
