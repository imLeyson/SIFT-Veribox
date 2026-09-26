export interface CollaboratorPeer {
  id: string;
  name: string;
  color: string;
  role: "视觉设计" | "设计策略" | "产品定位" | "CMF工程";
  cursor?: { x: number; y: number } | null;
  activeNodeId?: string | null;
  lastActive: number;
  isSelf?: boolean;
}

export type CollaborationOpType =
  | "cursor"
  | "node:move"
  | "card:add"
  | "card:update"
  | "card:delete"
  | "edge:add"
  | "edge:delete"
  | "card:synthesize"
  | "full:sync:request"
  | "full:sync"
  | "canvas:sync";

export interface CanvasSyncSnapshot {
  sessionId?: string;
  rawBrief?: string;
  briefImages?: string[];
  state?: any;
  next?: any;
  history?: any[];
  routes?: any[];
  recommendedRouteId?: string | null;
  selectedRouteId?: string | null;
  activeStepId?: string | null;
  exploredRouteIds?: string[];
  explorationStage?: any;
  platformPlans?: any[];
  customCards?: any[];
  customEdges?: any[];
  positions?: Record<string, { x: number; y: number }>;
  deletedNodeIds?: string[];
  collapsedNodeIds?: string[];
  cardTags?: Record<string, any>;
  stepNotes?: Record<string, string[]>;
  completedCriteria?: Record<string, string[]>;
  updatedAt?: number;
}

export interface BaseCollaborationOp {
  id: string;
  roomId: string;
  userId: string;
  timestamp: number;
}

export type CollaborationOp =
  | (BaseCollaborationOp & {
      type: "cursor";
      cursor: { x: number; y: number };
      activeNodeId?: string | null;
    })
  | (BaseCollaborationOp & {
      type: "node:move";
      nodeId: string;
      position: { x: number; y: number };
    })
  | (BaseCollaborationOp & {
      type: "card:add";
      card: any;
    })
  | (BaseCollaborationOp & {
      type: "card:update";
      cardId: string;
      patch: Record<string, any>;
    })
  | (BaseCollaborationOp & {
      type: "card:delete";
      nodeId: string;
    })
  | (BaseCollaborationOp & {
      type: "edge:add";
      edge: any;
    })
  | (BaseCollaborationOp & {
      type: "edge:delete";
      edgeId: string;
    })
  | (BaseCollaborationOp & {
      type: "card:synthesize";
      cardId: string;
      synthesized: any;
    })
  | (BaseCollaborationOp & {
      type: "full:sync:request";
    })
  | (BaseCollaborationOp & {
      type: "full:sync";
      snapshot: any;
    })
  | (BaseCollaborationOp & {
      type: "canvas:sync";
      snapshot: CanvasSyncSnapshot;
    });

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type CollaborationOpInput = DistributiveOmit<CollaborationOp, "id" | "roomId" | "userId" | "timestamp">;

export const PRESET_AVATAR_COLORS = [
  "#6366f1", // Indigo (Primary)
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
] as const;

export const PRESET_ROLES = [
  "视觉设计",
  "设计策略",
  "产品定位",
  "CMF工程",
] as const;
