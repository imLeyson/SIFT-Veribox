import type { Edge, Node } from "@xyflow/react";

export interface ClarifyQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface Brief {
  goal: string;
  targetUser: string;
  known: string[];
  unknown: string[];
  constraints: string[];
  deliverable: string;
  openQuestions: string[];
  clarifyQuestions: ClarifyQuestion[];
}

export type StartingState = "has_idea" | "no_idea" | null;

export interface ExplorationRoute {
  id: string;
  title: string;
  question: string;
  steps: string[];
  purpose: string;
  advantage: string;
  watchOut: string;
  recommendationReason: string;
}

export interface SearchQuery {
  query: string;
  translation: string;
}

export interface PlatformSource {
  rank: number;
  name: string;
  label: string;
  reason: string;
  queries: SearchQuery[];
  searchUrl?: string;
}

export interface PlatformPlan {
  goal: string;
  sources: PlatformSource[];
  alternatives: PlatformSource[];
}

export type FlowStep =
  | "brief_input"
  | "brief_confirm"
  | "starting_state"
  | "routes"
  | "platform_plan"
  | "canvas_chat";

export type CardKind =
  | "briefInput"
  | "brief"
  | "state"
  | "route"
  | "platform"
  | "insight";

export type VBData = {
  kind: CardKind;
  title: string;
  body?: string;
  brief?: Brief;
  route?: ExplorationRoute;
  recommended?: boolean;
  dimmed?: boolean;
  plan?: PlatformPlan;
  routeId?: string;
  skippedSources?: string[];
  replacedSources?: Record<string, PlatformSource>;
  showMoreSources?: boolean;
};

export type VBNode = Node<VBData>;
export type VBEdge = Edge;
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  focusId?: string | null;
};

export interface VeriboxState {
  sessionId: string;
  step: FlowStep;
  rawBrief: string;
  brief: Brief | null;
  startingState: StartingState;
  userInitialIdea: string[];
  routes: ExplorationRoute[];
  recommendedRouteId: string | null;
  selectedRoute: ExplorationRoute | null;
  activeStep: string | null;
  platformPlan: PlatformPlan | null;
  userChanges: string[];
  loading: boolean;
  error: string | null;
  clarifyRound: number;
  nodes: VBNode[];
  edges: VBEdge[];
  selectedNodeId: string | null;
  messages: ChatMessage[];
  chatOpen: boolean;
}
