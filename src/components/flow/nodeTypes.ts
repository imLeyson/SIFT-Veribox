import type { NodeTypes } from "@xyflow/react";
import { BriefInputNode } from "./nodes/BriefInputNode";
import { AskNode } from "./nodes/AskNode";
import { StateNode } from "./nodes/StateNode";
import { RouteNode } from "./nodes/RouteNode";
import { StepNode } from "./nodes/StepNode";
import { PlatformPlanNode } from "./nodes/PlatformPlanNode";
import { StickyNoteNode } from "./nodes/StickyNoteNode";
import { ImageNode } from "./nodes/ImageNode";

export const nodeTypes = {
  brief: BriefInputNode,
  ask: AskNode,
  state: StateNode,
  route: RouteNode,
  step: StepNode,
  platformPlan: PlatformPlanNode,
  note: StickyNoteNode,
  image: ImageNode,
} satisfies NodeTypes;
