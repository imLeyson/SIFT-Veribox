"use client";

import { useEffect, useMemo } from "react";
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
  const platformPlans = useSiftStore((s) => s.platformPlans);
  const canvasItems = useSiftStore((s) => s.canvasItems);
  const branches = useSiftStore((s) => s.branches);
  const activeBranchId = useSiftStore((s) => s.activeBranchId);
  const schemeGroups = useSiftStore((s) => s.schemeGroups);

  const { fitView } = useReactFlow();
  const initialized = useNodesInitialized();

  const BASE_Y = 100;

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

    for (const [index, turn] of history.entries()) {
      const id = `turn-${turn.id}`;
      nodes.push({
        id,
        type: "ask",
        position: positions[id] ?? { x: 40 + index * 440, y: 1000 },
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

    // 03-04: Exploration Routes
    const routesStartX = (positions.direction?.x ?? stateX) + 430;
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

    // 05: Step Timeline for selected route
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

      // 06-08: Platform plans (Horizontal layout prevents vertical card stacking occlusion)
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

    // 04-B: Canvas Items & Branch Exploration Nodes
    const branchList = Object.values(branches);
    const canvasStartX = (positions.direction?.x ?? stateX) + 430;
    const canvasStartY = routes.length > 0 ? BASE_Y + 560 : BASE_Y;

    branchList.forEach((branch, bIdx) => {
      const items = Object.values(canvasItems).filter(
        (it) => it.branchId === branch.id,
      );
      const branchBaseX = canvasStartX + bIdx * 380;

      items.forEach((item, iIdx) => {
        const nodeId = `node-${item.id}`;
        const nodeType = item.type === "image" ? "imageCard" : "textCard";
        const fallbackY = canvasStartY + iIdx * 270;

        nodes.push({
          id: nodeId,
          type: nodeType,
          position: positions[nodeId] ?? {
            x: branchBaseX,
            y: fallbackY,
          },
          data: { itemId: item.id },
        });

        // Edge connections:
        if (iIdx === 0) {
          if (branch.parentId === null) {
            edges.push({
              id: `direction-${nodeId}`,
              source: "direction",
              target: nodeId,
              label: branch.name,
              style: { stroke: "#10B981", strokeWidth: 1.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#10B981" },
            });
          } else if (branch.sourceNodeId) {
            edges.push({
              id: `${branch.sourceNodeId}-${nodeId}`,
              source: branch.sourceNodeId,
              target: nodeId,
              label: branch.name,
              style: { stroke: "#0ea5e9", strokeWidth: 1.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
            });
          }
        } else {
          const prevNodeId = `node-${items[iIdx - 1].id}`;
          edges.push({
            id: `${prevNodeId}-${nodeId}`,
            source: prevNodeId,
            target: nodeId,
            style: { stroke: "#94a3b8", strokeWidth: 1.2, strokeDasharray: "4 4" },
          });
        }
      });
    });

    // 04-C: Scheme Groups
    const groupList = Object.values(schemeGroups);
    groupList.forEach((group, gIdx) => {
      const groupNodeId = `scheme-${group.id}`;
      const groupX = canvasStartX + (branchList.length + gIdx) * 400;
      nodes.push({
        id: groupNodeId,
        type: "schemeGroup",
        position: positions[groupNodeId] ?? {
          x: groupX,
          y: canvasStartY,
        },
        data: { groupId: group.id },
      });
      if (group.itemIds.length > 0) {
        edges.push({
          id: `node-${group.itemIds[0]}-${groupNodeId}`,
          source: `node-${group.itemIds[0]}`,
          target: groupNodeId,
          style: { stroke: "#059669", strokeWidth: 1.5, strokeDasharray: "2 2" },
        });
      }
    });

    return {
      nodes: nodes.map((n) => ({
        ...n,
        dragHandle: ".card-drag",
        deletable: false,
        connectable: false,
      })),
      edges,
    };
  }, [
    history,
    next,
    hasState,
    positions,
    routes,
    selectedRouteId,
    platformPlans,
    branches,
    canvasItems,
    schemeGroups,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  useEffect(() => {
    setNodes(graph.nodes);
  }, [graph.nodes, setNodes]);

  const currentFocusId = useMemo(() => {
    const branchItems = Object.values(canvasItems);
    if (activeBranchId && branchItems.some((it) => it.branchId === activeBranchId)) {
      const activeItems = branchItems.filter((it) => it.branchId === activeBranchId);
      return `node-${activeItems.at(-1)!.id}`;
    }
    if (platformPlans.length > 0) return `plan-${platformPlans.at(-1)!.stepId}`;
    if (selectedRouteId) return "steps";
    if (routes.length > 0) return `route-${routes[0].id}`;
    if (next?.type === "ask") {
      return `round-${next.questions.map((question) => question.id).join("-")}`;
    }
    return hasState ? "direction" : "brief";
  }, [canvasItems, activeBranchId, platformPlans, selectedRouteId, routes, next, hasState]);

  useEffect(() => {
    if (!initialized) return;
    const timer = setTimeout(() => {
      void fitView({
        nodes: [{ id: currentFocusId }],
        padding: 0.28,
        duration: 350,
        maxZoom: 0.95,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [initialized, currentFocusId, sessionId, fitView, nodes.length]);

  return (
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
