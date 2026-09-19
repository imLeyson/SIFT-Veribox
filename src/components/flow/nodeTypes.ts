import type { NodeTypes } from "@xyflow/react";
import { BriefInputNode } from "./nodes/BriefInputNode";
import { AskNode } from "./nodes/AskNode";
import { StateNode } from "./nodes/StateNode";
export const nodeTypes = {
  brief: BriefInputNode,
  ask: AskNode,
  state: StateNode,
} satisfies NodeTypes;
