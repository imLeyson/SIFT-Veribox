import type { NodeTypes } from "@xyflow/react";
import { BriefInputNode } from "./nodes/BriefInputNode";
import { BriefNode } from "./nodes/BriefNode";
import { RouteNode } from "./nodes/RouteNode";
import { PlatformNode } from "./nodes/PlatformNode";
import { InsightNode } from "./nodes/InsightNode";

export const nodeTypes = {
  briefInput: BriefInputNode,
  brief: BriefNode,
  route: RouteNode,
  platform: PlatformNode,
  insight: InsightNode,
} satisfies NodeTypes;
