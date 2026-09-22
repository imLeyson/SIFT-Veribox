"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useSiftStore } from "@/lib/convergence-store";
import { nodeTypes } from "./nodeTypes";
import { CanvasNavDock } from "./CanvasNavDock";

function FlowInner({ onOpenDossier }: { onOpenDossier?: () => void }) {
  const history = useSiftStore((s) => s.history);
  const next = useSiftStore((s) => s.next);
  const hasState = useSiftStore((s) => Boolean(s.state));
  const positions = useSiftStore((s) => s.positions);
  const sessionId = useSiftStore((s) => s.sessionId);
  const setPosition = useSiftStore((s) => s.setPosition);
  const routes = useSiftStore((s) => s.routes);
  const selectedRouteId = useSiftStore((s) => s.selectedRouteId);
  const activeStepId = useSiftStore((s) => s.activeStepId);
  const platformPlans = useSiftStore((s) => s.platformPlans);
  const addVisualInspiration = useSiftStore((s) => s.addVisualInspiration);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const lastFocusKeyRef = useRef<string>("");

  const { fitView } = useReactFlow();
  const initialized = useNodesInitialized();

  const BASE_Y = 100;

  // Global clipboard screenshot / image paste listener on canvas
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
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

      const file = imageFiles[0];
      try {
        const { compressImageFile, extractImagePalette } = await import(
          "@/lib/image-utils"
        );
        const compressed = await compressImageFile(file);
        const palette = await extractImagePalette(compressed, 5);

        let scope: "global" | "route" | "step" = "global";
        let targetId: string | undefined = undefined;
        let scopeLabel = "00 简报";

        if (activeStepId && selectedRouteId) {
          scope = "step";
          targetId = activeStepId;
          scopeLabel = "04 视点";
        } else if (selectedRouteId) {
          scope = "route";
          targetId = selectedRouteId;
          scopeLabel = "03 主题";
        }

        addVisualInspiration({
          url: compressed,
          title: file.name ? file.name.replace(/\.[^/.]+$/, "") : "剪贴板截图灵感",
          sourceType: "clipboard",
          scope,
          targetId,
          palette,
          status: "confirmed",
        });

        setToastMessage(`✓ 已从剪贴板收录 1 张参考图至 [${scopeLabel}] 并自动提取色系`);
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
        console.error("Failed to paste image:", err);
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [activeStepId, selectedRouteId, addVisualInspiration]);

  const graph = useMemo(() => {
    const nodes: Node[] = [
      {
        id: "brief",
        type: "brief",
        position: positions.brief ?? { x: 40, y: BASE_Y },
        data: {},
      },
    ];
    const edges: Edge[] = [];
    let parent = "brief";

    // Only display history turns that actually contain user answers or text corrections.
    // Pure checkpoint transitions (e.g. "一键收敛", "开始设计") are action events, not design choice cards.
    const meaningfulTurns = history.filter(
      (turn) =>
        (turn.event.type === "answer" && (turn.questions?.length ?? 0) > 0) ||
        turn.event.type === "correct",
    );

    for (const [index, turn] of meaningfulTurns.entries()) {
      const id = `turn-${turn.id}`;
      nodes.push({
        id,
        type: "ask",
        position: positions[id] ?? { x: 40 + index * 440, y: 560 },
        data: { historyId: turn.id },
      });
      edges.push({ id: `${parent}-${id}`, source: parent, target: id });
      parent = id;
    }

    if (next?.type === "ask") {
      const currentId = `round-${next.questions.map((question) => question.id).join("-")}`;
      nodes.push({
        id: currentId,
        type: "ask",
        position: positions[currentId] ?? { x: 480, y: BASE_Y },
        data: {},
      });
      edges.push({
        id: `${parent}-current`,
        source: parent,
        target: currentId,
      });
      parent = currentId;
    }

    const stateX = next?.type === "ask" ? 920 : 480;
    if (hasState) {
      nodes.push({
        id: "direction",
        type: "state",
        position: positions.direction ?? { x: stateX, y: BASE_Y },
        data: {},
      });
      edges.push({
        id: `${parent}-direction`,
        source: parent,
        target: "direction",
      });
    }

    // 03: Exploration Routes
    const routesStartX = (positions.direction?.x ?? stateX) + 490;
    if (routes.length > 0) {
      routes.forEach((route, idx) => {
        const routeNodeId = `route-${route.id}`;
        nodes.push({
          id: routeNodeId,
          type: "route",
          position: positions[routeNodeId] ?? {
            x: routesStartX + idx * 430,
            y: BASE_Y,
          },
          data: { route, index: idx },
        });
        edges.push({
          id: `direction-${routeNodeId}`,
          source: "direction",
          target: routeNodeId,
        });
      });
    }

    // 04: Step Timeline for selected route
    const stepsStartX = routesStartX + 3 * 430 + 30;
    if (selectedRouteId) {
      const stepNodeId = "steps";
      nodes.push({
        id: stepNodeId,
        type: "step",
        position: positions.steps ?? {
          x: stepsStartX,
          y: BASE_Y,
        },
        data: {},
      });
      edges.push({
        id: `route-${selectedRouteId}-steps`,
        source: `route-${selectedRouteId}`,
        target: stepNodeId,
      });

      // 05: Platform plans (Horizontal layout prevents vertical card stacking occlusion)
      const planStartX = stepsStartX + 440;
      platformPlans.forEach((plan, planIdx) => {
        const planNodeId = `plan-${plan.stepId}`;
        nodes.push({
          id: planNodeId,
          type: "platformPlan",
          position: positions[planNodeId] ?? {
            x: planStartX + planIdx * 460,
            y: BASE_Y,
          },
          data: { plan },
        });
        edges.push({
          id: `steps-${planNodeId}`,
          source: stepNodeId,
          target: planNodeId,
        });
      });
    }

    return {
      nodes: nodes.map((n) => ({
        ...n,
        dragHandle: ".card-drag",
        deletable: false,
        connectable: false,
      })),
      edges,
    };
  }, [history, next, hasState, positions, routes, selectedRouteId, platformPlans]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  useEffect(() => {
    setNodes(graph.nodes);
  }, [graph.nodes, setNodes]);

  useEffect(() => {
    if (!initialized) return;

    let targetNodes: { id: string }[] = [];
    let focusKey = "";

    if (platformPlans.length > 0) {
      const lastPlan = platformPlans.at(-1)!;
      targetNodes = [{ id: `plan-${lastPlan.stepId}` }];
      focusKey = `plan-${lastPlan.stepId}`;
    } else if (selectedRouteId) {
      targetNodes = [{ id: "steps" }];
      focusKey = `steps-${selectedRouteId}`;
    } else if (routes.length > 0) {
      // Fit ALL 3 creative territory routes side-by-side!
      targetNodes = routes.map((r) => ({ id: `route-${r.id}` }));
      focusKey = `routes-${routes.map((r) => r.id).join("-")}`;
    } else if (next?.type === "ask") {
      const qKey = next.questions.map((q) => q.id).join("-");
      targetNodes = [{ id: `round-${qKey}` }];
      focusKey = `ask-${qKey}`;
    } else {
      targetNodes = [{ id: hasState ? "direction" : "brief" }];
      focusKey = hasState ? "direction" : "brief";
    }

    // Only auto-fit when the focused stage key actually changes or on session load
    if (lastFocusKeyRef.current !== focusKey) {
      lastFocusKeyRef.current = focusKey;
      const timer = setTimeout(() => {
        void fitView({
          nodes: targetNodes,
          padding: routes.length > 0 && !selectedRouteId ? 0.18 : 0.28,
          duration: 400,
          maxZoom: 0.95,
        });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [
    initialized,
    platformPlans,
    selectedRouteId,
    routes,
    next,
    hasState,
    sessionId,
    fitView,
  ]);

  return (
    <div className="relative h-full w-full">
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-stone-900/90 text-white px-4 py-1.5 text-xs font-medium shadow-xl backdrop-blur-xs animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2 border border-white/10">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_e, node) => setPosition(node.id, node.position)}
        nodesConnectable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={1.5}
        panOnScroll
        panOnDrag
        selectNodesOnDrag={false}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#b7aa98", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#b7aa98" },
          deletable: false,
          selectable: false,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="#d2c8ba"
        />
        <Controls showInteractive={false} position="bottom-left" />
        <Panel position="bottom-center" className="!mb-6 z-20">
          <CanvasNavDock onOpenDossier={onOpenDossier ?? (() => {})} />
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function InfiniteCanvas({
  onOpenDossier,
}: {
  onOpenDossier?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <div className="h-full w-full">
        <FlowInner onOpenDossier={onOpenDossier} />
      </div>
    </ReactFlowProvider>
  );
}
