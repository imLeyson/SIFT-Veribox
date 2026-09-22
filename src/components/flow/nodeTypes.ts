import type { NodeTypes } from "@xyflow/react";
import { BriefInputNode } from "./nodes/BriefInputNode";
import { AskNode } from "./nodes/AskNode";
import { StateNode } from "./nodes/StateNode";
import { RouteNode } from "./nodes/RouteNode";
import { StepNode } from "./nodes/StepNode";
import { PlatformPlanNode } from "./nodes/PlatformPlanNode";
import { TextCardNode } from "./nodes/TextCardNode";
import { ImageCardNode } from "./nodes/ImageCardNode";
import { SchemeGroupNode } from "./nodes/SchemeGroupNode";

export const nodeTypes = {
  brief: BriefInputNode,
  ask: AskNode,
  state: StateNode,
  route: RouteNode,
  step: StepNode,
  platformPlan: PlatformPlanNode,
  textCard: TextCardNode,
  imageCard: ImageCardNode,
  schemeGroup: SchemeGroupNode,
} satisfies NodeTypes;
