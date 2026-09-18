import type { NodeTypes } from "@xyflow/react";
import { BriefInputNode } from "./nodes/BriefInputNode";
import { BriefNode } from "./nodes/BriefNode";
import { StateNode } from "./nodes/StateNode";
import { RouteNode } from "./nodes/RouteNode";
import { PlatformNode } from "./nodes/PlatformNode";
import { InsightNode } from "./nodes/InsightNode";

export const nodeTypes = {
  briefInput: BriefInputNode,
  brief: BriefNode,
  state: StateNode,
  route: RouteNode,
  platform: PlatformNode,
  insight: InsightNode,
} satisfies NodeTypes;
