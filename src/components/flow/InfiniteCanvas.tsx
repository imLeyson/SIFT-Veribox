"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { useVeriboxStore } from "@/lib/store";
import { nodeTypes } from "./nodeTypes";
import type { CardKind } from "@/types";

const KIND_COLOR: Record<CardKind, string> = {
  briefInput: "#1f1c18",
  brief: "#8b7db5",
  state: "#6f675e",
  route: "#5b4d86",
  platform: "#3d4a3a",
  insight: "#8a5a3b",
};

function FlowInner() {
  const nodes = useVeriboxStore((s) => s.nodes);
  const edges = useVeriboxStore((s) => s.edges);
  const onNodesChange = useVeriboxStore((s) => s.onNodesChange);
  const onEdgesChange = useVeriboxStore((s) => s.onEdgesChange);
  const onConnect = useVeriboxStore((s) => s.onConnect);
  const selectNode = useVeriboxStore((s) => s.selectNode);
  const { fitView } = useReactFlow();
  const countRef = useRef(nodes.length);

  useEffect(() => {
    if (nodes.length > countRef.current) {
      const t = window.setTimeout(() => {
        void fitView({
          padding: 0.16,
          duration: 500,
          maxZoom: 0.85,
        });
      }, 80);
      countRef.current = nodes.length;
      return () => window.clearTimeout(t);
    }
    countRef.current = nodes.length;
  }, [nodes, fitView]);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      selectNode(selected[0]?.id ?? null);
    },
    [selectNode]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onSelectionChange={onSelectionChange}
      fitView
      minZoom={0.18}
      maxZoom={1.75}
      panOnScroll
      panOnDrag
      zoomOnDoubleClick
      selectionOnDrag={false}
      selectNodesOnDrag={false}
      elevateNodesOnSelect
      elevateEdgesOnSelect
      connectionRadius={28}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionLineStyle={{ stroke: "#1f1c18", strokeWidth: 1.8 }}
      deleteKeyCode={["Backspace", "Delete"]}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: "smoothstep",
        animated: false,
        style: { stroke: "#b7aa98", strokeWidth: 1.6 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: "#b7aa98",
        },
      }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1.2}
        color="#d2c8ba"
      />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap
        pannable
        zoomable
        position="bottom-left"
        style={{ marginLeft: 52 }}
        maskColor="rgba(247,243,236,0.78)"
        nodeColor={(node) =>
          KIND_COLOR[(node.type as CardKind) || "insight"] ?? "#c4b8a8"
        }
        className="!h-[92px] !w-[140px] !bg-cream/90"
      />
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
