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
import type { FlowData } from "./nodes/AskNode";

function FlowInner() {
  const history = useSiftStore((s) => s.history);
  const next = useSiftStore((s) => s.next);
  const hasState = useSiftStore((s) => Boolean(s.state));
  const positions = useSiftStore((s) => s.positions);
  const sessionId = useSiftStore((s) => s.sessionId);
  const setPosition = useSiftStore((s) => s.setPosition);
  const { fitView } = useReactFlow();
  const initialized = useNodesInitialized();
  const graph = useMemo(() => {
    const nodes: Node<FlowData>[] = [
      {
        id: "brief",
        type: "brief",
        position: positions.brief ?? { x: 40, y: 60 },
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
        position: positions[id] ?? { x: 40 + index * 420, y: 1000 },
        data: { historyId: turn.id },
      });
      edges.push({ id: `${parent}-${id}`, source: parent, target: id });
      parent = id;
    }
    if (next?.type === "ask") {
      nodes.push({
        id: next.question.id,
        type: "ask",
        position: positions[next.question.id] ?? { x: 460, y: 60 },
        data: {},
      });
      edges.push({
        id: `${parent}-current`,
        source: parent,
        target: next.question.id,
      });
      parent = next.question.id;
    }
    if (hasState) {
      nodes.push({
        id: "direction",
        type: "state",
        position: positions.direction ?? { x: 880, y: 60 },
        data: {},
      });
      edges.push({
        id: `${parent}-direction`,
        source: parent,
        target: "direction",
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
  }, [history, next, hasState, positions]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  useEffect(() => {
    setNodes(graph.nodes);
  }, [graph.nodes, setNodes]);

  const currentId =
    next?.type === "ask" ? next.question.id : hasState ? "direction" : "brief";
  useEffect(() => {
    if (!initialized) return;
    const ids =
      window.innerWidth < 840 || !hasState
        ? [currentId]
        : [currentId, "direction"];
    void fitView({
      nodes: ids.map((id) => ({ id })),
      padding: 0.18,
      duration: 350,
      maxZoom: 1,
    });
  }, [initialized, currentId, hasState, sessionId, fitView]);

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
      <Panel position="top-left" className="flex flex-wrap gap-2">
        <button
          className="btn-ghost !bg-cream text-xs"
          onClick={() =>
            void fitView({
              nodes: [{ id: currentId }],
              padding: 0.2,
              maxZoom: 1,
              duration: 300,
            })
          }
        >
          {next?.type === "ask" ? "当前问题" : "当前状态"}
        </button>
        {hasState && (
          <button
            className="btn-ghost !bg-cream text-xs"
            onClick={() =>
              void fitView({
                nodes: [{ id: "direction" }],
                padding: 0.2,
                maxZoom: 1,
                duration: 300,
              })
            }
          >
            方向状态
          </button>
        )}
        <button
          className="btn-ghost !bg-cream text-xs"
          onClick={() =>
            void fitView({ padding: 0.15, maxZoom: 1, duration: 300 })
          }
        >
          全部记录
        </button>
      </Panel>
    </ReactFlow>
  );
}
export function InfiniteCanvas() {
  return (
    <ReactFlowProvider>
      <div className="h-full w-full">
        <FlowInner />
      </div>
    </ReactFlowProvider>
  );
}
