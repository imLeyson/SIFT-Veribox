"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnConnectEnd,
  type OnConnectStart,
} from "@xyflow/react";
import {
  useSiftStore,
  resolveNodeContext,
  type CustomCard,
} from "@/lib/convergence-store";
import { collabManager, useFollowingPeer } from "@/lib/collaboration/collab-manager";
import { MultiplayerCursors } from "@/components/collaboration/MultiplayerCursors";
import { nodeTypes } from "./nodeTypes";
import { CanvasToolBar, type ToolType } from "./CanvasToolBar";
import type { Route, PlatformPlan } from "@/types/routes";
import { synthesizeCardFromInputs } from "@/lib/card-synthesis";
import { processImageForCanvas } from "@/lib/image-utils";
import {
  Plus,
  FileText,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Search,
  StickyNote,
  Image as ImageIcon,
  LayoutGrid,
  X,
  Wand2,
} from "lucide-react";

const QUICK_SPAWN_OPTIONS: {
  type: ToolType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { type: "brief", label: "0 简报解析", icon: FileText, color: "text-stone-700 bg-stone-100" },
  { type: "ask", label: "1 视觉抉择", icon: HelpCircle, color: "text-sky-700 bg-sky-100" },
  { type: "state", label: "2 策略基准", icon: ShieldCheck, color: "text-emerald-700 bg-emerald-100" },
  { type: "route", label: "3 风格主题", icon: Sparkles, color: "text-indigo-700 bg-indigo-100" },
  { type: "platformPlan", label: "灵感检索", icon: Search, color: "text-amber-700 bg-amber-100" },
  { type: "imageGen", label: "画面生成", icon: Wand2, color: "text-violet-700 bg-violet-100" },
  { type: "note", label: "设计便签", icon: StickyNote, color: "text-amber-600 bg-amber-50" },
  { type: "image", label: "参考图片", icon: ImageIcon, color: "text-blue-600 bg-blue-50" },
];

function deriveNewCardWithContext({
  type,
  targetPos,
  sourceNodeId,
  routes,
  selectedRouteId,
  customCards,
  state,
  rawBrief,
  activeStepId,
  platformPlans,
}: {
  type: ToolType;
  targetPos: { x: number; y: number };
  sourceNodeId?: string;
  routes: Route[];
  selectedRouteId: string | null;
  customCards: CustomCard[];
  state: any;
  rawBrief: string;
  activeStepId: string | null;
  platformPlans: PlatformPlan[];
}): {
  card: Omit<CustomCard, "id"> & { id?: string };
} {
  // If no source node is connected: create an empty card (blank state) ready to be connected!
  if (!sourceNodeId) {
    if (type === "route") {
      return {
        card: {
          id: `card-route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: "route",
          position: targetPos,
          title: "空白主题待推导",
          data: {
            isEmpty: true,
            index: routes.length,
          },
        },
      };
    }

    if (type === "step") {
      return {
        card: {
          id: `card-step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: "step",
          position: targetPos,
          title: "空白视点待推导",
          data: {
            isEmpty: true,
          },
        },
      };
    }

    if (type === "platformPlan") {
      return {
        card: {
          id: `card-plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: "platformPlan",
          position: targetPos,
          title: "空白方案待推导",
          data: {
            isEmpty: true,
          },
        },
      };
    }

    if (type === "imageGen") {
      return {
        card: {
          id: `card-imagegen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: "imageGen",
          position: targetPos,
          title: "空白画面生成待推导",
          data: {
            isEmpty: true,
            prompt: "",
            negativePrompt: "",
            aspectRatio: "3:4",
            stylePreset: "realistic",
            imageUrl: null,
          },
        },
      };
    }

    if (type === "note") {
      return {
        card: {
          id: `card-note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: "note",
          position: targetPos,
          title: "设计便签 / 灵感备注",
          content: "",
          color: "amber",
          data: {
            isEmpty: false,
          },
        },
      };
    }

    if (type === "image") {
      return {
        card: {
          id: `card-image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: "image",
          position: targetPos,
          title: "参考图片",
          data: {
            src: "",
            width: 360,
            height: 260,
            lockAspectRatio: true,
          },
        },
      };
    }

    if (type === "brief") {
      return {
        card: {
          id: `card-brief-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          type: "brief",
          position: targetPos,
          title: "0 简报解析",
          data: {
            rawBrief: "",
            briefImages: [],
            status: "idle",
            state: null,
            next: null,
            error: null,
            isEmpty: false,
          },
        },
      };
    }

    if (type === "ask") {
      return {
        card: {
          id: `card-ask-${Date.now().toString(36)}`,
          type: "ask",
          position: targetPos,
          title: "关键视觉抉择",
          data: {},
        },
      };
    }

    return {
      card: {
        id: `card-state-${Date.now().toString(36)}`,
        type: "state",
        position: targetPos,
        title: "核心策略基准",
        data: {},
      },
    };
  }

  // If sourceNodeId is provided (e.g. dragging a wire handle onto canvas to spawn next node):
  let upstreamNode: any = null;
  if (sourceNodeId) {
    upstreamNode = resolveNodeContext(sourceNodeId, {
      routes,
      customCards,
      state,
      rawBrief,
      platformPlans,
    });
  }

  const upstreamNodes = upstreamNode ? [upstreamNode] : [];
  const synthesized = synthesizeCardFromInputs(type, upstreamNodes, { state, rawBrief, routes });

  return {
    card: {
      id: `card-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      position: targetPos,
      title: synthesized.title ?? (type === "route" ? "风格主题" : "工作台"),
      content: synthesized.content,
      color: synthesized.color ?? "amber",
      data: {
        ...synthesized.data,
        index: routes.length,
        isEmpty: !sourceNodeId && (type === "route" || type === "step" || type === "platformPlan" || type === "imageGen"),
      },
    },
  };
}

function FlowInner() {
  const history = useSiftStore((s) => s.history);
  const next = useSiftStore((s) => s.next);
  const hasState = useSiftStore((s) => Boolean(s.state));
  const positions = useSiftStore((s) => s.positions);
  const sessionId = useSiftStore((s) => s.sessionId);
  const setPosition = useSiftStore((s) => s.setPosition);
  const routes = useSiftStore((s) => s.routes);
  const recommendedRouteId = useSiftStore((s) => s.recommendedRouteId);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const platformPlans = useSiftStore((s) => s.platformPlans);
  const customCards = useSiftStore((s) => s.customCards);
  const customEdges = useSiftStore((s) => s.customEdges);
  const deletedNodeIds = useSiftStore((s) => s.deletedNodeIds);
  const addCustomCard = useSiftStore((s) => s.addCustomCard);
  const addCustomEdge = useSiftStore((s) => s.addCustomEdge);
  const state = useSiftStore((s) => s.state);
  const rawBrief = useSiftStore((s) => s.rawBrief);
  const activeStepId = useSiftStore((s) => s.activeStepId);
  const deleteNodeById = useSiftStore((s) => s.deleteNodeById);
  const deleteCustomEdge = useSiftStore((s) => s.deleteCustomEdge);
  const updateCustomCard = useSiftStore((s) => s.updateCustomCard);
  const synthesizeCard = useSiftStore((s) => s.synthesizeCard);
  const collapsedNodeIds = useSiftStore((s) => s.collapsedNodeIds);
  const collapseAllNodes = useSiftStore((s) => s.collapseAllNodes);

  const { fitView, screenToFlowPosition, getViewport, setCenter, getNode } = useReactFlow();
  const followingPeer = useFollowingPeer();
  const draggingNodeIdRef = useRef<string | null>(null);

  const [panOnDrag, setPanOnDrag] = useState(true);
  const connectingNodeIdRef = useRef<string | null>(null);

  // Drag-to-spawn popover state
  const [spawnMenuPos, setSpawnMenuPos] = useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
    sourceNodeId: string;
  } | null>(null);

  // Canvas right-click context menu state
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
  } | null>(null);

  // Image Drag-and-Drop & Clipboard Paste state & refs
  const [isDraggingImageOver, setIsDraggingImageOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const pendingImagePosRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportImageError = useCallback((fileName?: string) => {
    setImageError(`${fileName ? `“${fileName}”` : "图片"}读取失败，请检查格式或文件大小后重试。`);
    window.setTimeout(() => setImageError(null), 4500);
  }, []);

  const START_X = 60;
  const START_Y = 80;
  const COL_PITCH = 470;

  const graph = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Helper to check if node is deleted
    const isDeleted = (id: string) => deletedNodeIds.includes(id);

    // 00: Brief Node (Col 0)
    if (!isDeleted("brief")) {
      nodes.push({
        id: "brief",
        type: "brief",
        position: positions.brief ?? { x: START_X, y: START_Y },
        data: {},
      });
    }

    let parent = isDeleted("brief") ? null : "brief";

    // 01: History Turns (Col 1, top to bottom)
    for (const [index, turn] of history.entries()) {
      const id = `turn-${turn.id}`;
      if (!isDeleted(id)) {
        nodes.push({
          id,
          type: "ask",
          position: positions[id] ?? {
            x: START_X + COL_PITCH,
            y: START_Y + index * 520,
          },
          data: { historyId: turn.id },
        });
        if (parent && !isDeleted(parent)) {
          edges.push({
            id: `${parent}-${id}`,
            source: parent,
            target: id,
          });
        }
        parent = id;
      }
    }

    // 01: Active Question Round (Col 1, below history turns)
    if (next?.type === "ask") {
      const currentId = `round-${next.questions.map((question) => question.id).join("-")}`;
      if (!isDeleted(currentId)) {
        nodes.push({
          id: currentId,
          type: "ask",
          position: positions[currentId] ?? {
            x: START_X + COL_PITCH,
            y: START_Y + history.length * 520,
          },
          data: {},
        });
        if (parent && !isDeleted(parent)) {
          edges.push({
            id: `${parent}-current`,
            source: parent,
            target: currentId,
            animated: true,
            style: { stroke: "#0284c7", strokeWidth: 2 },
          });
        }
        parent = currentId;
      }
    }

    // 02: Strategy Baseline Node (Col 2)
    const stateX = START_X + 2 * COL_PITCH;
    if (hasState && !isDeleted("direction")) {
      nodes.push({
        id: "direction",
        type: "state",
        position: positions.direction ?? { x: stateX, y: START_Y },
        data: {},
      });
      if (parent && !isDeleted(parent)) {
        edges.push({
          id: `${parent}-direction`,
          source: parent,
          target: "direction",
          animated: hasState && routes.length === 0,
          style: { stroke: "#059669", strokeWidth: 2 },
        });
      }
    }

    // 03: Style Themes (Col 3, stacked vertically top to bottom!)
    // Only render primary pipeline routes here; custom route cards are rendered in customCards section
    const customRouteIds = new Set(
      customCards
        .filter((c) => c.type === "route")
        .map((c) => (c.data?.route?.id as string) || c.id),
    );

    const routesStartX = START_X + 3 * COL_PITCH;
    const primaryRoutes = routes.filter((r) => !customRouteIds.has(r.id));
    if (primaryRoutes.length > 0) {
      primaryRoutes.forEach((route, idx) => {
        const routeNodeId = `route-${route.id}`;
        if (!isDeleted(routeNodeId)) {
          const isRouteActive = route.id === selectedRouteId;
          nodes.push({
            id: routeNodeId,
            type: "route",
            position: positions[routeNodeId] ?? {
              x: routesStartX,
              y: START_Y + idx * 560,
            },
            data: { route, index: idx },
          });
          if (hasState && !isDeleted("direction")) {
            edges.push({
              id: `direction-${routeNodeId}`,
              source: "direction",
              target: routeNodeId,
              animated: isRouteActive,
              style: {
                stroke: isRouteActive ? "#4f46e5" : "#c4b5a2",
                strokeWidth: isRouteActive ? 2.2 : 1.5,
              },
            });
          }
        }
      });
    }

    // 04: Platform Plans (directly connected to the selected 3 风格主题)
    const planStartX = START_X + 4 * COL_PITCH;
    platformPlans.forEach((plan, planIdx) => {
      const planNodeId = `plan-${plan.stepId}`;
      if (!isDeleted(planNodeId)) {
        nodes.push({
          id: planNodeId,
          type: "platformPlan",
          position: positions[planNodeId] ?? {
            x: planStartX,
            y: START_Y + planIdx * 620,
          },
          data: { plan },
        });

        // Connect directly to the matching route node
        const rId = plan.routeId;
        const matchingRoute =
          (rId && routes.find((r) => r.id === rId)) ??
          routes.find((r) => r.steps?.some((st) => st.id === plan.stepId)) ??
          routes[0];

        if (matchingRoute) {
          const sourceRouteNodeId =
            nodes.find((n) => n.id === `route-${matchingRoute.id}`)?.id ??
            nodes.find((n) => (n.data as any)?.route?.id === matchingRoute.id)?.id ??
            `route-${matchingRoute.id}`;

          if (!isDeleted(sourceRouteNodeId) && nodes.some((n) => n.id === sourceRouteNodeId)) {
            edges.push({
              id: `${sourceRouteNodeId}-${planNodeId}`,
              source: sourceRouteNodeId,
              target: planNodeId,
              animated: true,
              style: { stroke: "#d97706", strokeWidth: 2 },
            });
          }
        }
      }
    });

    // Custom Cards & Sticky Notes (Col 5, stacked vertically)
    const notesStartX = START_X + 5 * COL_PITCH;
    customCards.forEach((card, cIdx) => {
      if (!isDeleted(card.id)) {
        nodes.push({
          id: card.id,
          type: card.type,
          position: positions[card.id] ?? card.position ?? {
            x: notesStartX,
            y: START_Y + cIdx * 320,
          },
          data: {
            ...card.data,
            title: card.title,
            content: card.content,
            color: card.color,
          },
        });
      }
    });

    // Custom Freeform Interactive Edges
    for (const customEdge of customEdges) {
      if (!isDeleted(customEdge.source) && !isDeleted(customEdge.target)) {
        edges.push({
          id: customEdge.id,
          source: customEdge.source,
          target: customEdge.target,
          animated: customEdge.animated ?? true,
          style: customEdge.style ?? { stroke: "#6366f1", strokeWidth: 2 },
        });
      }
    }

    // Critical React Flow Safety: Ensure EVERY edge's source and target exist in nodes
    const nodeIds = new Set(nodes.map((n) => n.id));
    const validEdges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    return {
      nodes: nodes.map((n) => ({
        ...n,
        dragHandle: n.type === "image" ? undefined : ".card-drag",
        draggable: true,
        deletable: true,
        connectable: true,
      })),
      edges: validEdges,
    };
  }, [
    history,
    next,
    hasState,
    positions,
    routes,
    selectedRouteId,
    platformPlans,
    customCards,
    customEdges,
    deletedNodeIds,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  useEffect(() => {
    setNodes((prevNodes) => {
      return graph.nodes.map((newNode) => {
        // If local user is currently dragging this node, preserve its smooth in-flight position
        if (draggingNodeIdRef.current === newNode.id) {
          const existing = prevNodes.find((n) => n.id === newNode.id);
          if (existing) {
            return { ...newNode, position: existing.position };
          }
        }
        return newNode;
      });
    });
  }, [graph.nodes, setNodes]);

  // Real-time Follow Mode Camera Synchronizer
  useEffect(() => {
    if (!followingPeer) return;
    if (followingPeer.cursor) {
      void setCenter(followingPeer.cursor.x, followingPeer.cursor.y, {
        duration: 300,
        zoom: 0.85,
      });
    } else if (followingPeer.activeNodeId) {
      const node = getNode(followingPeer.activeNodeId);
      if (node) {
        void setCenter(node.position.x + 180, node.position.y + 120, {
          duration: 300,
          zoom: 0.85,
        });
      }
    }
  }, [
    followingPeer,
    followingPeer?.cursor?.x,
    followingPeer?.cursor?.y,
    followingPeer?.activeNodeId,
    setCenter,
    getNode,
  ]);

  // Keep the active stage readable after route generation and route selection.
  // React Flow renders the new nodes one frame after the store changes, so this
  // effect waits for the target node to exist before moving the viewport.
  const lastFocusedStageRef = useRef<string | null>(null);
  useEffect(() => {
    const routeId = recommendedRouteId ?? routes[0]?.id;
    if (!routeId) return;

    const targetId = `route-${routeId}`;
    const focusKey = `${sessionId}:route:${routeId}`;
    if (lastFocusedStageRef.current === focusKey) return;
    if (!nodes.some((node) => node.id === targetId)) return;

    lastFocusedStageRef.current = focusKey;
    void fitView({
      nodes: [{ id: targetId }],
      duration: 350,
      padding: 0.45,
      minZoom: 0.75,
      maxZoom: 1.15,
    });
  }, [fitView, nodes, recommendedRouteId, routes, sessionId]);

  // Synchronously guard edges against the currently rendered node set to avoid React Flow transition frame crashes
  const activeNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const safeEdges = useMemo(() => {
    return graph.edges.filter(
      (e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target),
    );
  }, [graph.edges, activeNodeIds]);

  // Connect Handler (Handle to Handle)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      // 1. Toggle disconnect: if an edge already connects these two nodes, cancel the link!
      const existingEdges = customEdges.filter(
        (e) =>
          (e.source === connection.source && e.target === connection.target) ||
          (e.source === connection.target && e.target === connection.source),
      );

      if (existingEdges.length > 0) {
        existingEdges.forEach((e) => deleteCustomEdge(e.id));
        return;
      }

      // 2. Otherwise add the connection wire
      const edgeId = `edge-${connection.source}-${connection.target}-${Date.now().toString(36)}`;
      addCustomEdge({
        id: edgeId,
        source: connection.source,
        target: connection.target,
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
      });

      // Most targets wait for an explicit generation action. Inspiration
      // search is the one direct-action exception: connecting a theme should
      // open the cross-platform search plan without the old intermediate step.
      if (getNode(connection.target)?.type === "platformPlan") {
        setTimeout(() => {
          synthesizeCard(connection.target);
        }, 40);
      }
    },
    [addCustomEdge, deleteCustomEdge, customEdges, getNode, synthesizeCard],
  );

  // Drag-to-spawn Handlers (FigJam style)
  const onConnectStart: OnConnectStart = useCallback((_e, { nodeId }) => {
    connectingNodeIdRef.current = nodeId;
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid && connectingNodeIdRef.current) {
        const clientX =
          "clientX" in event
            ? event.clientX
            : (event.touches?.[0]?.clientX ?? window.innerWidth / 2);
        const clientY =
          "clientY" in event
            ? event.clientY
            : (event.touches?.[0]?.clientY ?? window.innerHeight / 2);
        const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
        setSpawnMenuPos({
          x: clientX,
          y: clientY,
          flowX: flowPos.x,
          flowY: flowPos.y,
          sourceNodeId: connectingNodeIdRef.current,
        });
      }
      connectingNodeIdRef.current = null;
    },
    [screenToFlowPosition],
  );

  // Add Card action
  const handleAddCard = useCallback(
    (type: ToolType, pos?: { x: number; y: number }, sourceNodeId?: string) => {
      let targetPos = pos;
      if (!targetPos) {
        const flowCenter = screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        targetPos = {
          x: flowCenter.x - 180 + Math.random() * 40 - 20,
          y: flowCenter.y - 120 + Math.random() * 40 - 20,
        };
      }

      // If choosing image via toolbar / context menu without drag wire: prompt native file picker!
      if (type === "image" && !sourceNodeId) {
        pendingImagePosRef.current = targetPos;
        fileInputRef.current?.click();
        return;
      }

      const { card } = deriveNewCardWithContext({
        type,
        targetPos,
        sourceNodeId,
        routes,
        selectedRouteId,
        customCards,
        state,
        rawBrief,
        activeStepId,
        platformPlans,
      });

      const id = addCustomCard(card);
      setPosition(id, targetPos);

      // If created by dragging out from an existing node, automatically wire them!
      if (sourceNodeId) {
        addCustomEdge({
          id: `edge-${sourceNodeId}-${id}-${Date.now().toString(36)}`,
          source: sourceNodeId,
          target: id,
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2 },
        });
      }
    },
    [
      addCustomCard,
      screenToFlowPosition,
      setPosition,
      addCustomEdge,
      routes,
      selectedRouteId,
      customCards,
      state,
      rawBrief,
      activeStepId,
      platformPlans,
    ],
  );

  // Manual File Picker Upload Handler
  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;

      let targetPos = pendingImagePosRef.current;
      if (!targetPos) {
        const flowCenter = screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        targetPos = {
          x: flowCenter.x - 180,
          y: flowCenter.y - 130,
        };
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const processed = await processImageForCanvas(file);
          const cardPos = {
            x: Math.round(targetPos.x + i * 30),
            y: Math.round(targetPos.y + i * 30),
          };
          const cardId = `card-image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          addCustomCard({
            id: cardId,
            type: "image",
            position: cardPos,
            title: processed.fileName || "参考图片",
            data: {
              src: processed.dataUrl,
              width: processed.width,
              height: processed.height,
              naturalWidth: processed.naturalWidth,
              naturalHeight: processed.naturalHeight,
              fileName: processed.fileName,
              lockAspectRatio: true,
            },
          });
          setPosition(cardId, cardPos);
        } catch (err) {
          console.error("Failed to process image file:", err);
          reportImageError(file.name);
        }
      }

      e.target.value = "";
      pendingImagePosRef.current = null;
    },
    [addCustomCard, reportImageError, screenToFlowPosition, setPosition],
  );

  // Global Clipboard Paste Handler (Cmd+V / Ctrl+V directly on canvas)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;
      e.preventDefault();

      const mousePos = lastMousePosRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
      const flowPos = screenToFlowPosition(mousePos);

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
          const processed = await processImageForCanvas(file);
          const cardPos = {
            x: Math.round(flowPos.x - processed.width / 2 + i * 30),
            y: Math.round(flowPos.y - processed.height / 2 + i * 30),
          };
          const cardId = `card-image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          addCustomCard({
            id: cardId,
            type: "image",
            position: cardPos,
            title: processed.fileName || "参考图片",
            data: {
              src: processed.dataUrl,
              width: processed.width,
              height: processed.height,
              naturalWidth: processed.naturalWidth,
              naturalHeight: processed.naturalHeight,
              fileName: processed.fileName,
              lockAspectRatio: true,
            },
          });
          setPosition(cardId, cardPos);
        } catch (err) {
          console.error("Failed to process pasted image:", err);
          reportImageError(file.name);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addCustomCard, reportImageError, screenToFlowPosition, setPosition]);

  // Keyboard shortcut: Press 'g' / 'G' to collapse/expand selected nodes or branch (Chain Grouping)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "g" || e.key === "G") &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        const selectedNodes = nodes.filter((n) => n.selected);
        if (selectedNodes.length === 0) return;

        e.preventDefault();
        const selectedIds = selectedNodes.map((n) => n.id);
        const currentCollapsed = useSiftStore.getState().collapsedNodeIds;

        // If any selected node is a route node, include its downstream branch nodes as well
        const allTargetIds = new Set<string>(selectedIds);
        selectedNodes.forEach((node) => {
          if (node.type === "route") {
            const queue = [node.id];
            while (queue.length > 0) {
              const curr = queue.shift()!;
              for (const edge of customEdges) {
                if (edge.source === curr && !allTargetIds.has(edge.target)) {
                  allTargetIds.add(edge.target);
                  queue.push(edge.target);
                }
              }
            }
          }
        });

        const targetList = Array.from(allTargetIds);
        const allAreCollapsed = targetList.every((id) =>
          currentCollapsed.includes(id),
        );

        if (allAreCollapsed) {
          const next = currentCollapsed.filter((id) => !allTargetIds.has(id));
          collapseAllNodes(next);
        } else {
          const next = Array.from(new Set([...currentCollapsed, ...targetList]));
          collapseAllNodes(next);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, customEdges, collapseAllNodes]);

  // Drag-and-Drop Image Files onto Canvas Handler
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDraggingImageOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as globalThis.Node)) return;
    setIsDraggingImageOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      setIsDraggingImageOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;

      e.preventDefault();
      const dropFlowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const processed = await processImageForCanvas(file);
          const cardPos = {
            x: Math.round(dropFlowPos.x - processed.width / 2 + i * 30),
            y: Math.round(dropFlowPos.y - processed.height / 2 + i * 30),
          };
          const cardId = `card-image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          addCustomCard({
            id: cardId,
            type: "image",
            position: cardPos,
            title: processed.fileName || "参考图片",
            data: {
              src: processed.dataUrl,
              width: processed.width,
              height: processed.height,
              naturalWidth: processed.naturalWidth,
              naturalHeight: processed.naturalHeight,
              fileName: processed.fileName,
              lockAspectRatio: true,
            },
          });
          setPosition(cardId, cardPos);
        } catch (err) {
          console.error("Failed to process dropped image:", err);
          reportImageError(file.name);
        }
      }
    },
    [addCustomCard, reportImageError, screenToFlowPosition, setPosition],
  );

  // Tidy Up Auto Layout: Strict Column-by-Column, Top-to-Bottom, Non-overlapping Layout
  const handleTidyUp = useCallback(() => {
    const STAGE_ORDER: Record<string, number> = {
      brief: 0,
      ask: 1,
      state: 2,
      route: 3,
      platformPlan: 4,
      step: 4,
      imageGen: 5,
      note: 6,
      stickyNote: 6,
      image: 7,
    };

    const START_X = 60;
    const START_Y = 80;
    const COLUMN_WIDTH = 410;
    const HORIZONTAL_GAP = 60;
    const VERTICAL_GAP = 36;

    const ESTIMATED_HEIGHTS: Record<string, number> = {
      brief: 560,
      ask: 480,
      state: 540,
      route: 520,
      step: 560,
      platformPlan: 600,
      imageGen: 580,
      stickyNote: 280,
      note: 280,
    };

    const collapsedNodeIds = useSiftStore.getState().collapsedNodeIds;
    const getNodeHeight = (node: Node): number => {
      if (node.measured?.height && node.measured.height > 60) {
        return Math.round(node.measured.height);
      }
      if (
        node.type !== "stickyNote" &&
        node.type !== "note" &&
        collapsedNodeIds.includes(node.id)
      ) {
        return 110;
      }
      const type = node.type ?? "note";
      return ESTIMATED_HEIGHTS[type] ?? 500;
    };

    // 1. Group active nodes by functional stage (0..7)
    const stageGroups = new Map<number, Node[]>();
    nodes.forEach((node) => {
      const stage = STAGE_ORDER[node.type ?? ""] ?? 7;
      if (!stageGroups.has(stage)) {
        stageGroups.set(stage, []);
      }
      stageGroups.get(stage)!.push(node);
    });

    // 2. Sort active stages from left to right (0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7)
    const activeStages = Array.from(stageGroups.keys()).sort((a, b) => a - b);

    // 3. For each stage column, sort nodes logically from top to bottom
    const newPositions: Record<string, { x: number; y: number }> = {};

    activeStages.forEach((stage, colIdx) => {
      const colX = START_X + colIdx * (COLUMN_WIDTH + HORIZONTAL_GAP);
      const stageNodes = stageGroups.get(stage)!;

      // Sort cards within this functional stage column
      const sortedColNodes = [...stageNodes].sort((a, b) => {
        if (stage === 1) {
          // Ask: history turns first chronologically, active round at the bottom
          const aHistoryIdx = history.findIndex((h) => `turn-${h.id}` === a.id);
          const bHistoryIdx = history.findIndex((h) => `turn-${h.id}` === b.id);
          if (aHistoryIdx !== -1 && bHistoryIdx !== -1) return aHistoryIdx - bHistoryIdx;
          if (aHistoryIdx !== -1) return -1;
          if (bHistoryIdx !== -1) return 1;
        }
        if (stage === 3) {
          // Route: 01, 02, 03 in order
          const aIdx =
            (a.data as any)?.index ?? routes.findIndex((r) => `route-${r.id}` === a.id);
          const bIdx =
            (b.data as any)?.index ?? routes.findIndex((r) => `route-${r.id}` === b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        }
        if (stage === 4) {
          // Step workbench nodes: sorted in theme/route order
          const aRouteId = (a.data as any)?.routeId ?? a.id.replace(/^step-/, "");
          const bRouteId = (b.data as any)?.routeId ?? b.id.replace(/^step-/, "");
          const aIdx = routes.findIndex((r) => r.id === aRouteId);
          const bIdx = routes.findIndex((r) => r.id === bRouteId);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        }
        if (stage === 5) {
          // Platform plans in step order
          const aIdx = platformPlans.findIndex((p) => `plan-${p.stepId}` === a.id);
          const bIdx = platformPlans.findIndex((p) => `plan-${p.stepId}` === b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        }
        // Fallback: previous Y coordinate or ID
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        return a.id.localeCompare(b.id);
      });

      // Place cards in this column from top to bottom without any stacking
      let currentY = START_Y;
      sortedColNodes.forEach((node) => {
        newPositions[node.id] = {
          x: colX,
          y: currentY,
        };
        const h = getNodeHeight(node);
        currentY += h + VERTICAL_GAP;
      });
    });

    // 4. Update store and local ReactFlow node state immediately
    Object.entries(newPositions).forEach(([id, pos]) => {
      setPosition(id, pos);
    });

    setNodes((prevNodes) =>
      prevNodes.map((n) =>
        newPositions[n.id] ? { ...n, position: newPositions[n.id] } : n,
      ),
    );

    // 5. Smoothly fit view to accommodate the clean board layout
    setTimeout(() => {
      void fitView({ duration: 450, padding: 0.18 });
    }, 50);
  }, [nodes, history, routes, platformPlans, setPosition, setNodes, fitView]);

  const lastCursorBroadcastRef = useRef<number>(0);
  const handleCanvasPointerMove = useCallback(
    (flowPos: { x: number; y: number }) => {
      const now = Date.now();
      if (now - lastCursorBroadcastRef.current > 35) {
        lastCursorBroadcastRef.current = now;
        collabManager.broadcastPresence(flowPos, null);
      }
    },
    [],
  );

  return (
    <div
      className="relative h-full w-full outline-hidden"
      onMouseMove={(e) => {
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        handleCanvasPointerMove(flowPos);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for manual reference image upload via toolbar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drag & Drop Visual Indicator Overlay */}
      {isDraggingImageOver && (
        <div className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-[#0d99ff] bg-[#0d99ff]/5 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-xl border border-blue-200 text-xs font-semibold text-blue-700">
            <ImageIcon className="h-4 w-4 text-blue-500 animate-bounce" />
            <span>松开即可将参考图片添加至此画布位置</span>
          </div>
        </div>
      )}

      {imageError && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-900 shadow-lg"
        >
          {imageError}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={safeEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_e, node) => {
          collabManager.setActiveNode(node.id);
        }}
        onNodeDragStart={(_e, node) => {
          draggingNodeIdRef.current = node.id;
          collabManager.setActiveNode(node.id);
        }}
        onNodeDrag={(_e, node) => {
          collabManager.broadcastPresence(node.position, node.id);
          collabManager.broadcastNodeMove(node.id, node.position);
        }}
        onNodeDragStop={(_e, node) => {
          draggingNodeIdRef.current = null;
          setPosition(node.id, node.position);
          collabManager.broadcastNodeMove(node.id, node.position, true);
        }}
        onMoveStart={(_e, eventType) => {
          if (eventType && followingPeer) {
            collabManager.setFollowingPeerId(null);
          }
        }}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodesDelete={(deleted) => {
          deleted.forEach((n) => deleteNodeById(n.id));
        }}
        onEdgesDelete={(deleted) => {
          deleted.forEach((e) => deleteCustomEdge(e.id));
        }}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          setContextMenuPos({
            x: e.clientX,
            y: e.clientY,
            flowX: flowPos.x,
            flowY: flowPos.y,
          });
        }}
        onPaneClick={() => {
          setContextMenuPos(null);
          setSpawnMenuPos(null);
          collabManager.setActiveNode(null);
        }}
        nodesConnectable={true}
        edgesReconnectable={true}
        deleteKeyCode={["Backspace", "Delete"]}
        minZoom={0.15}
        maxZoom={1.75}
        panOnScroll
        panOnDrag={panOnDrag}
        selectionOnDrag={!panOnDrag}
        selectNodesOnDrag={!panOnDrag}
        elementsSelectable={true}
        defaultViewport={{ x: 60, y: 60, zoom: 0.88 }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#b7aa98", strokeWidth: 1.8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#b7aa98" },
          deletable: true,
          selectable: true,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="#d2c8ba"
        />
        <Controls showInteractive={false} position="bottom-left" />
        <MultiplayerCursors />
      </ReactFlow>

      {/* Floating Follow Mode Status Banner */}
      {followingPeer && (
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full bg-stone-900/95 text-white px-4 py-2 shadow-2xl backdrop-blur-md text-xs font-medium border border-white/20 animate-in fade-in slide-in-from-top-3 duration-200 select-none">
          <span
            className="h-2 w-2 rounded-full animate-ping shrink-0"
            style={{ backgroundColor: followingPeer.color }}
          />
          <span>正在跟随 {followingPeer.name} ({followingPeer.role}) 的设计视角</span>
          <button
            type="button"
            onClick={() => collabManager.setFollowingPeerId(null)}
            className="ml-1 text-white/80 hover:text-white px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] transition-colors cursor-pointer"
          >
            退出跟随
          </button>
        </div>
      )}


      {/* Floating Figma-like Tool Bar */}
      <CanvasToolBar
        panOnDrag={panOnDrag}
        onTogglePanMode={() => setPanOnDrag((prev) => !prev)}
        onTidyUp={handleTidyUp}
        onAddCard={(type) => handleAddCard(type)}
      />

      {/* FigJam Drag-to-Spawn Popover Menu */}
      {spawnMenuPos && (
        <div
          style={{
            position: "fixed",
            left: Math.min(spawnMenuPos.x + 10, window.innerWidth - 240),
            top: Math.min(spawnMenuPos.y + 10, window.innerHeight - 320),
            zIndex: 50,
          }}
          className="w-56 rounded-2xl bg-stone-900/95 p-2 shadow-2xl backdrop-blur-md border border-white/20 animate-in fade-in zoom-in-95 duration-150 text-stone-100"
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 mb-1">
            <span className="text-[11px] font-semibold text-stone-300">
              在此呼出下一步卡片
            </span>
            <button
              type="button"
              onClick={() => setSpawnMenuPos(null)}
              className="text-stone-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-0.5">
            {(() => {
              const srcId = spawnMenuPos.sourceNodeId;
              const isFromTheme =
                srcId &&
                (srcId.startsWith("route-") ||
                  routes.some((r) => r.id === srcId || `route-${r.id}` === srcId) ||
                  customCards.some((c) => c.id === srcId && c.type === "route"));

              const sortedOptions = isFromTheme
                ? [
                    ...QUICK_SPAWN_OPTIONS.filter((o) => o.type === "imageGen"),
                    ...QUICK_SPAWN_OPTIONS.filter((o) => o.type === "platformPlan"),
                    ...QUICK_SPAWN_OPTIONS.filter((o) => o.type === "note"),
                    ...QUICK_SPAWN_OPTIONS.filter((o) => o.type === "route"),
                    ...QUICK_SPAWN_OPTIONS.filter(
                      (o) => !["imageGen", "platformPlan", "note", "route"].includes(o.type),
                    ),
                  ]
                : QUICK_SPAWN_OPTIONS;

              return sortedOptions.map((opt) => {
                const Icon = opt.icon;
                const isRecommended = isFromTheme && (opt.type === "imageGen" || opt.type === "platformPlan");
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      handleAddCard(
                        opt.type,
                        { x: spawnMenuPos.flowX, y: spawnMenuPos.flowY },
                        spawnMenuPos.sourceNodeId,
                      );
                      setSpawnMenuPos(null);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors cursor-pointer text-stone-200 hover:text-white ${
                      isRecommended
                        ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30"
                        : "hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${opt.color}`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="font-medium text-[11px] truncate">{opt.label}</span>
                    </div>
                    {isRecommended && (
                      <span className="shrink-0 text-[9px] font-mono text-amber-300 bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                        推荐
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Canvas Right-Click Context Menu */}
      {contextMenuPos && (
        <div
          style={{
            position: "fixed",
            left: Math.min(contextMenuPos.x, window.innerWidth - 240),
            top: Math.min(contextMenuPos.y, window.innerHeight - 340),
            zIndex: 50,
          }}
          className="w-56 rounded-2xl bg-stone-900/95 p-2 shadow-2xl backdrop-blur-md border border-white/20 animate-in fade-in zoom-in-95 duration-150 text-stone-100"
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 mb-1">
            <span className="text-[11px] font-semibold text-stone-300">
              画布快捷操作
            </span>
            <button
              type="button"
              onClick={() => setContextMenuPos(null)}
              className="text-stone-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-0.5">
            <div className="px-2 py-0.5 text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
              添加卡片
            </div>
            {QUICK_SPAWN_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    handleAddCard(opt.type, {
                      x: contextMenuPos.flowX,
                      y: contextMenuPos.flowY,
                    });
                    setContextMenuPos(null);
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/10 transition-colors cursor-pointer text-stone-200 hover:text-white"
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${opt.color}`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="font-medium text-[11px]">{opt.label}</span>
                </button>
              );
            })}
            <div className="my-1 border-t border-white/10" />
            <button
              type="button"
              onClick={() => {
                handleTidyUp();
                setContextMenuPos(null);
              }}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/10 transition-colors cursor-pointer text-stone-200 hover:text-white"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-[11px]">整理画布卡片对齐</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function InfiniteCanvas({
  onOpenDossier: _onOpenDossier,
}: {
  onOpenDossier?: () => void;
} = {}) {
  return (
    <div className="h-full w-full">
      <FlowInner />
    </div>
  );
}
