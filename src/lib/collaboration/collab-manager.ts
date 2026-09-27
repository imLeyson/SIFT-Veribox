"use client";

import { useState, useEffect } from "react";
import {
  CollaboratorPeer,
  CollaborationOp,
  CollaborationOpInput,
  CanvasSyncSnapshot,
  PRESET_AVATAR_COLORS,
  PRESET_ROLES,
} from "./types";
import { getActiveProjectId } from "@/lib/project-manager";
import {
  normalizeCardTags,
  normalizeFilterTag,
  useSiftStore,
  setStoreMutationListener,
} from "@/lib/convergence-store";

const USER_STORAGE_KEY = "sift-collab-user-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeId(prefix = "peer"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Get or create local user profile
 */
export function getLocalPeer(): CollaboratorPeer {
  if (!isBrowser()) {
    return {
      id: "peer-ssr",
      name: "设计师",
      color: PRESET_AVATAR_COLORS[0],
      role: PRESET_ROLES[0],
      lastActive: Date.now(),
      isSelf: true,
    };
  }

  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...parsed, isSelf: true };
    }
  } catch {
    // ignore
  }

  // Generate a random friendly default name
  const randomSuffix = Math.floor(10 + Math.random() * 90);
  const colorIndex = Math.floor(Math.random() * PRESET_AVATAR_COLORS.length);
  const roleIndex = Math.floor(Math.random() * PRESET_ROLES.length);

  const newPeer: CollaboratorPeer = {
    id: safeId(),
    name: `设计师 ${randomSuffix}`,
    color: PRESET_AVATAR_COLORS[colorIndex],
    role: PRESET_ROLES[roleIndex],
    lastActive: Date.now(),
    isSelf: true,
  };

  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newPeer));
  } catch {
    // ignore
  }

  return newPeer;
}

export function updateLocalPeer(patch: Partial<CollaboratorPeer>): CollaboratorPeer {
  const current = getLocalPeer();
  const updated: CollaboratorPeer = {
    ...current,
    ...patch,
    id: current.id, // ID is immutable
    isSelf: true,
  };

  if (isBrowser()) {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    // Broadcast updated profile to others
    collabManager.broadcastPresence(updated.cursor || null, updated.activeNodeId || null);
  }

  return updated;
}

/**
 * Get current room ID from URL search param `?room=...` or fallback to active project ID
 */
export function getCurrentRoomId(): string {
  if (!isBrowser()) return "room-default";
  try {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl && roomFromUrl.trim()) {
      return roomFromUrl.trim();
    }
  } catch {
    // ignore
  }
  return getActiveProjectId() || "room-default";
}

type PeerListener = (peers: CollaboratorPeer[]) => void;
type OpListener = (op: CollaborationOp) => void;
export type CollaborationStatus = "connecting" | "connected" | "offline" | "conflict";

class CollaborationManager {
  private localPeer: CollaboratorPeer;
  private currentRoomId: string;
  private broadcastChannel: BroadcastChannel | null = null;
  private peersMap = new Map<string, CollaboratorPeer>();
  private peerListeners = new Set<PeerListener>();
  private opListeners = new Set<OpListener>();
  private pendingOps: CollaborationOp[] = [];
  private pendingSnapshot: CanvasSyncSnapshot | null = null;
  private lastAppliedSnapshotTimestamp = 0;
  private lastMoveThrottleTime = 0;
  private heartbeatTimer: any = null;
  private peerCleanupTimer: any = null;
  private syncDebounceTimer: any = null;
  private flushPendingTimer: any = null;
  private isFlushing = false;
  private followingPeerId: string | null = null;
  private followListeners = new Set<(peer: CollaboratorPeer | null) => void>();
  private status: CollaborationStatus = "connecting";
  private statusListeners = new Set<(status: CollaborationStatus) => void>();
  private lastPolledTimestamp = 0;
  private roomRevision = 0;
  private roomCursor = 0;
  private isProcessingRemoteOp = false;
  private seenRemoteOpIds = new Set<string>();

  constructor() {
    this.localPeer = getLocalPeer();
    this.currentRoomId = getCurrentRoomId();

    if (isBrowser()) {
      this.initBroadcastChannel();
      this.startHeartbeat();
      this.startPeerCleanup();

      // Listen to project changed events to auto-switch room
      window.addEventListener("sift-project-changed", () => {
        const newRoomId = getCurrentRoomId();
        if (newRoomId !== this.currentRoomId) {
          this.switchRoom(newRoomId);
        }
      });

      // Auto-broadcast local store mutations to collaborators
      setStoreMutationListener((type, payload) => {
        if (this.isProcessingRemoteOp) return;
        this.broadcastOp({
          type: type as any,
          ...payload,
        });
      });

      // Automatically sync canvas state on meaningful changes with debounce
      try {
        useSiftStore.subscribe(() => {
          if (this.isProcessingRemoteOp) return;
          if (!this.hasMeaningfulCanvasState()) return;

          if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
          this.syncDebounceTimer = setTimeout(() => {
            if (this.isProcessingRemoteOp) return;
            const snapshot = this.getCanvasSnapshot();
            this.pendingSnapshot = snapshot;

            // Broadcast canvas sync to tabs
            if (this.broadcastChannel) {
              try {
                this.broadcastChannel.postMessage({
                  type: "canvas:sync",
                  snapshot,
                });
              } catch {
                // ignore
              }
            }

            // Also broadcast canvas:sync op for server queue
            this.broadcastOp({
              type: "canvas:sync",
              snapshot,
            });
          }, 250);
        });
      } catch {
        // ignore in environments without store subscription support
      }
    }
  }

  public getRoomId(): string {
    return this.currentRoomId;
  }

  public getPeers(): CollaboratorPeer[] {
    const list = Array.from(this.peersMap.values()).filter(
      (p) => Date.now() - p.lastActive < 10000 && p.id !== this.localPeer.id,
    );
    return [{ ...this.localPeer, isSelf: true }, ...list];
  }

  public subscribePeers(listener: PeerListener): () => void {
    this.peerListeners.add(listener);
    listener(this.getPeers());
    return () => {
      this.peerListeners.delete(listener);
    };
  }

  public subscribeOps(listener: OpListener): () => void {
    this.opListeners.add(listener);
    return () => {
      this.opListeners.delete(listener);
    };
  }

  public getStatus(): CollaborationStatus {
    return this.status;
  }

  public subscribeStatus(listener: (status: CollaborationStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: CollaborationStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  public getCanvasSnapshot(): CanvasSyncSnapshot {
    if (!isBrowser()) return {};
    const s = useSiftStore.getState();
    return {
      sessionId: s.sessionId,
      rawBrief: s.rawBrief,
      briefImages: s.briefImages,
      state: s.state,
      next: s.next,
      history: s.history,
      routes: s.routes,
      recommendedRouteId: s.recommendedRouteId,
      selectedRouteId: s.selectedRouteId,
      activeStepId: s.activeStepId,
      exploredRouteIds: s.exploredRouteIds,
      explorationStage: s.explorationStage,
      platformPlans: s.platformPlans,
      customCards: s.customCards,
      customEdges: s.customEdges,
      positions: s.positions,
      deletedNodeIds: s.deletedNodeIds,
      collapsedNodeIds: s.collapsedNodeIds,
      cardTags: s.cardTags,
      activeFilterTag: s.activeFilterTag,
      stepNotes: s.stepNotes,
      completedCriteria: s.completedCriteria,
      outcomeItems: s.outcomeItems,
      outcomeGroups: s.outcomeGroups,
      revision: this.roomRevision,
      updatedAt: Date.now(),
    };
  }

  public hasMeaningfulCanvasState(snap?: CanvasSyncSnapshot): boolean {
    const s = snap || (isBrowser() ? useSiftStore.getState() : null);
    if (!s) return false;
    return Boolean(
      (s.rawBrief && s.rawBrief.trim().length > 0) ||
      s.state ||
      (s.routes && s.routes.length > 0) ||
      (s.customCards && s.customCards.length > 0) ||
      (s.platformPlans && s.platformPlans.length > 0) ||
      (s.positions && Object.keys(s.positions).length > 0)
    );
  }

  public applyCanvasSnapshot(snapshot: CanvasSyncSnapshot, _source = "remote") {
    if (!snapshot || typeof snapshot !== "object" || !isBrowser()) return;

    // Do not overwrite valid local state with an empty incoming snapshot
    if (!this.hasMeaningfulCanvasState(snapshot)) {
      if (this.hasMeaningfulCanvasState()) return;
    }

    this.isProcessingRemoteOp = true;
    try {
      useSiftStore.setState((prev) => {
        const mergedPositions = {
          ...prev.positions,
          ...(snapshot.positions || {}),
        };

        return {
          ...(snapshot.sessionId ? { sessionId: snapshot.sessionId } : {}),
          ...(snapshot.rawBrief !== undefined ? { rawBrief: snapshot.rawBrief } : {}),
          ...(snapshot.briefImages !== undefined ? { briefImages: snapshot.briefImages } : {}),
          ...(snapshot.state !== undefined ? { state: snapshot.state } : {}),
          ...(snapshot.next !== undefined ? { next: snapshot.next } : {}),
          ...(snapshot.history !== undefined ? { history: snapshot.history } : {}),
          ...(snapshot.routes !== undefined ? { routes: snapshot.routes } : {}),
          ...(snapshot.recommendedRouteId !== undefined ? { recommendedRouteId: snapshot.recommendedRouteId } : {}),
          ...(snapshot.selectedRouteId !== undefined ? { selectedRouteId: snapshot.selectedRouteId } : {}),
          ...(snapshot.activeStepId !== undefined ? { activeStepId: snapshot.activeStepId } : {}),
          ...(snapshot.exploredRouteIds !== undefined ? { exploredRouteIds: snapshot.exploredRouteIds } : {}),
          ...(snapshot.explorationStage !== undefined ? { explorationStage: snapshot.explorationStage } : {}),
          ...(snapshot.platformPlans !== undefined ? { platformPlans: snapshot.platformPlans } : {}),
          ...(snapshot.customCards !== undefined ? { customCards: snapshot.customCards } : {}),
          ...(snapshot.customEdges !== undefined ? { customEdges: snapshot.customEdges } : {}),
          positions: mergedPositions,
          ...(snapshot.deletedNodeIds !== undefined ? { deletedNodeIds: snapshot.deletedNodeIds } : {}),
          ...(snapshot.collapsedNodeIds !== undefined ? { collapsedNodeIds: snapshot.collapsedNodeIds } : {}),
          ...(snapshot.cardTags !== undefined ? { cardTags: normalizeCardTags(snapshot.cardTags) } : {}),
          ...(snapshot.activeFilterTag !== undefined ? { activeFilterTag: normalizeFilterTag(snapshot.activeFilterTag) } : {}),
          ...(snapshot.stepNotes !== undefined ? { stepNotes: snapshot.stepNotes } : {}),
          ...(snapshot.completedCriteria !== undefined ? { completedCriteria: snapshot.completedCriteria } : {}),
          ...(snapshot.outcomeItems !== undefined ? { outcomeItems: snapshot.outcomeItems } : {}),
          ...(snapshot.outcomeGroups !== undefined ? { outcomeGroups: snapshot.outcomeGroups } : {}),
        };
      });

      this.lastAppliedSnapshotTimestamp = snapshot.updatedAt || Date.now();
    } catch (err) {
      console.warn("[Collab] Failed to apply canvas snapshot:", err);
    } finally {
      setTimeout(() => {
        this.isProcessingRemoteOp = false;
      }, 100);
    }
  }

  public switchRoom(newRoomId: string) {
    if (this.currentRoomId === newRoomId) return;
    this.currentRoomId = newRoomId;
    this.peersMap.clear();
    this.pendingOps = [];
    this.pendingSnapshot = null;
    this.lastPolledTimestamp = 0;
    this.lastAppliedSnapshotTimestamp = 0;
    this.roomRevision = 0;
    this.roomCursor = 0;
    this.seenRemoteOpIds.clear();
    this.setStatus("connecting");

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // ignore
      }
    }
    this.initBroadcastChannel();
    this.broadcastPresence(null, null);
    this.notifyPeerListeners();
  }

  private initBroadcastChannel() {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      this.broadcastChannel = new BroadcastChannel(`sift-collab-${this.currentRoomId}`);
      this.broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === "presence-heartbeat") {
          this.handleRemotePresence(data.peer);
        } else if (data.type === "full:sync:request") {
          if (this.hasMeaningfulCanvasState()) {
            try {
              this.broadcastChannel?.postMessage({
                type: "full:sync:response",
                snapshot: this.getCanvasSnapshot(),
              });
            } catch {
              // ignore
            }
          }
        } else if (data.type === "full:sync:response" || data.type === "canvas:sync") {
          if (data.snapshot) {
            this.applyCanvasSnapshot(data.snapshot, "broadcast");
          }
        } else if (data.op) {
          this.handleRemoteOp(data.op);
        }
      };

      // Request full canvas sync from any already-open tab
      try {
        this.broadcastChannel.postMessage({
          type: "full:sync:request",
          requesterId: this.localPeer.id,
        });
      } catch {
        // ignore
      }
    } catch {
      this.broadcastChannel = null;
    }
  }

  public scheduleFlush(delayMs = 30) {
    if (!isBrowser()) return;
    if (this.flushPendingTimer) clearTimeout(this.flushPendingTimer);
    this.flushPendingTimer = setTimeout(() => {
      void this.flushNow();
    }, delayMs);
  }

  public setActiveNode(nodeId: string | null) {
    if (this.localPeer.activeNodeId === nodeId) return;
    this.localPeer.activeNodeId = nodeId;
    this.broadcastPresence(this.localPeer.cursor || null, nodeId);
    this.scheduleFlush(20);
  }

  public setFollowingPeerId(peerId: string | null) {
    this.followingPeerId = peerId;
    this.notifyFollowListeners();
  }

  public getFollowingPeer(): CollaboratorPeer | null {
    if (!this.followingPeerId) return null;
    return this.peersMap.get(this.followingPeerId) || null;
  }

  public subscribeFollowingPeer(listener: (peer: CollaboratorPeer | null) => void): () => void {
    this.followListeners.add(listener);
    listener(this.getFollowingPeer());
    return () => {
      this.followListeners.delete(listener);
    };
  }

  private notifyFollowListeners() {
    const peer = this.getFollowingPeer();
    this.followListeners.forEach((fn) => {
      try {
        fn(peer);
      } catch {
        // ignore
      }
    });
  }

  public broadcastPresence(
    cursor: { x: number; y: number } | null,
    activeNodeId?: string | null,
  ) {
    this.localPeer = {
      ...this.localPeer,
      cursor,
      activeNodeId: activeNodeId !== undefined ? activeNodeId : this.localPeer.activeNodeId,
      lastActive: Date.now(),
      isSelf: true,
    };

    // Tab-to-Tab via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: "presence-heartbeat",
          peer: this.localPeer,
        });
      } catch {
        // ignore
      }
    }

    this.notifyPeerListeners();
  }

  public broadcastNodeMove(nodeId: string, position: { x: number; y: number }, force = false) {
    const now = Date.now();
    if (!force && now - this.lastMoveThrottleTime < 35) return;
    this.lastMoveThrottleTime = now;

    this.broadcastOp({
      type: "node:move",
      nodeId,
      position,
    });
    this.scheduleFlush(force ? 0 : 60);
  }

  public broadcastOp(opData: CollaborationOpInput) {
    const op: CollaborationOp = {
      ...opData,
      id: safeId("op"),
      roomId: this.currentRoomId,
      userId: this.localPeer.id,
      timestamp: Date.now(),
      baseRevision: this.roomRevision,
    } as CollaborationOp;

    this.pendingOps.push(op);

    // Broadcast immediately to other tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ op });
      } catch {
        // ignore
      }
    }

    // Schedule immediate fast flush to server for cross-machine collaborators
    this.scheduleFlush(20);
  }

  private handleRemotePresence(peer: CollaboratorPeer) {
    if (!peer || peer.id === this.localPeer.id) return;
    this.peersMap.set(peer.id, {
      ...peer,
      isSelf: false,
      lastActive: Date.now(),
    });
    this.notifyPeerListeners();
    if (this.followingPeerId === peer.id) {
      this.notifyFollowListeners();
    }
  }

  private handleRemoteOp(op: CollaborationOp) {
    if (!op || op.userId === this.localPeer.id) return;
    if (op.roomId && op.roomId !== this.currentRoomId) return;
    if (this.seenRemoteOpIds.has(op.id)) return;
    this.seenRemoteOpIds.add(op.id);
    if (this.seenRemoteOpIds.size > 5000) {
      const oldest = this.seenRemoteOpIds.values().next().value;
      if (oldest) this.seenRemoteOpIds.delete(oldest);
    }


    // Notify listeners
    this.opListeners.forEach((fn) => fn(op));

    // Automatically apply remote operation to Zustand store without triggering echo
    this.applyOpToStore(op);
  }

  private applyOpToStore(op: CollaborationOp) {
    this.isProcessingRemoteOp = true;
    try {
      const store = useSiftStore.getState();

      switch (op.type) {
        case "node:move": {
          store.setPosition(op.nodeId, op.position);
          break;
        }
        case "card:add": {
          if (!store.customCards.some((c) => c.id === op.card.id)) {
            store.addCustomCard(op.card);
          }
          break;
        }
        case "card:update": {
          store.updateCustomCard(op.cardId, op.patch);
          break;
        }
        case "card:delete": {
          store.deleteNodeById(op.nodeId);
          break;
        }
        case "edge:add": {
          if (!store.customEdges.some((e) => e.id === op.edge.id)) {
            store.addCustomEdge(op.edge);
          }
          break;
        }
        case "edge:delete": {
          store.deleteCustomEdge(op.edgeId);
          break;
        }
        case "card:synthesize": {
          store.updateCustomCard(op.cardId, op.synthesized);
          break;
        }
        case "outcome:update": {
          useSiftStore.setState({
            outcomeItems: op.outcomeItems,
            outcomeGroups: op.outcomeGroups,
          });
          break;
        }
        case "canvas:sync": {
          if (op.snapshot) {
            this.applyCanvasSnapshot(op.snapshot, "canvas:sync");
          }
          break;
        }
        case "full:sync:request": {
          if (this.hasMeaningfulCanvasState()) {
            this.broadcastOp({
              type: "full:sync",
              snapshot: this.getCanvasSnapshot(),
            });
          }
          break;
        }
        case "full:sync": {
          if (op.snapshot) {
            if (typeof op.snapshot === "string") {
              try {
                const parsed = JSON.parse(op.snapshot);
                this.applyCanvasSnapshot(parsed?.state || parsed, "full:sync");
              } catch {
                // ignore
              }
            } else if (typeof op.snapshot === "object") {
              this.applyCanvasSnapshot(op.snapshot, "full:sync");
            }
          }
          break;
        }
        case "cursor": {
          if (this.peersMap.has(op.userId)) {
            const peer = this.peersMap.get(op.userId)!;
            peer.cursor = op.cursor;
            peer.activeNodeId = op.activeNodeId;
            peer.lastActive = Date.now();
            this.notifyPeerListeners();
          }
          break;
        }
      }
    } finally {
      setTimeout(() => {
        this.isProcessingRemoteOp = false;
      }, 100);
    }
  }

  public isRemoteAction(): boolean {
    return this.isProcessingRemoteOp;
  }

  private notifyPeerListeners() {
    const peers = this.getPeers();
    this.peerListeners.forEach((listener) => {
      try {
        listener(peers);
      } catch {
        // ignore
      }
    });
  }

  private startPeerCleanup() {
    this.peerCleanupTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, peer] of this.peersMap.entries()) {
        if (now - peer.lastActive > 10000) {
          this.peersMap.delete(id);
          changed = true;
        }
      }
      if (changed) {
        this.notifyPeerListeners();
      }
    }, 3000);
  }

  private startHeartbeat() {
    if (!isBrowser()) return;
    void this.flushNow();
  }

  public async flushNow() {
    if (!isBrowser() || this.isFlushing) return;
    this.isFlushing = true;

    if (this.flushPendingTimer) {
      clearTimeout(this.flushPendingTimer);
      this.flushPendingTimer = null;
    }
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    const opsToSend = [...this.pendingOps];
    this.pendingOps = [];

    const snapshotToSend =
      this.pendingSnapshot ||
      (this.hasMeaningfulCanvasState() ? this.getCanvasSnapshot() : undefined);
    this.pendingSnapshot = null;

    try {
      const payload: any = {
        roomId: this.currentRoomId,
        peer: this.localPeer,
        ops: opsToSend,
        since: this.roomCursor,
        baseRevision: this.roomRevision,
      };
      if (snapshotToSend) {
        payload.snapshot = snapshotToSend;
      }

      const res = await fetch("/api/collaboration/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.setStatus("connected");
        const data = await res.json();
        if (typeof data.revision === "number") this.roomRevision = data.revision;
        if (typeof data.cursor === "number") this.roomCursor = data.cursor;
        if (data.peers && Array.isArray(data.peers)) {
          data.peers.forEach((p: CollaboratorPeer) => {
            if (p.id !== this.localPeer.id) {
              this.handleRemotePresence(p);
            }
          });
        }

        if (data.ops && Array.isArray(data.ops)) {
          data.ops.forEach((op: CollaborationOp) => {
            this.handleRemoteOp(op);
          });
        }

        // If room has canvas snapshot on server, apply if local is empty or server is newer
        if (data.snapshot && typeof data.snapshot === "object") {
          const isLocalEmpty = !this.hasMeaningfulCanvasState();
          const serverUpdatedAt = data.snapshot.updatedAt || 0;
          const isServerNewer = serverUpdatedAt > this.lastAppliedSnapshotTimestamp;

          if (isLocalEmpty || (isServerNewer && !snapshotToSend)) {
            this.applyCanvasSnapshot(data.snapshot, "server-heartbeat");
          }
        }

        if (typeof data.serverTime === "number") {
          this.lastPolledTimestamp = data.serverTime;
        }
      } else if (res.status === 409) {
        this.setStatus("conflict");
        this.pendingOps = [...opsToSend, ...this.pendingOps];
        const conflict = await res.json().catch(() => null);
        if (conflict && typeof conflict.revision === "number") {
          this.roomRevision = conflict.revision;
        }
        if (conflict && typeof conflict.cursor === "number") {
          this.roomCursor = conflict.cursor;
        }
        if (conflict?.snapshot) {
          this.applyCanvasSnapshot(conflict.snapshot, "conflict");
        }
        this.scheduleFlush(180);
      } else {
        this.pendingOps = [...opsToSend, ...this.pendingOps];
        if (snapshotToSend) this.pendingSnapshot = snapshotToSend;
      }
    } catch {
      // offline or network hiccup; local BroadcastChannel continues to work
      this.setStatus("offline");
      this.pendingOps = [...opsToSend, ...this.pendingOps];
      if (snapshotToSend) this.pendingSnapshot = snapshotToSend;
    } finally {
      this.isFlushing = false;
      this.scheduleNextHeartbeat();
    }
  }

  private scheduleNextHeartbeat() {
    if (!isBrowser()) return;
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);

    let interval = 2500;
    if (document.hidden) {
      interval = 7000;
    } else if (this.peersMap.size > 0) {
      // High-cadence adaptive poll (450ms) when other collaborators are present in room
      interval = 450;
    }

    this.heartbeatTimer = setTimeout(() => {
      void this.flushNow();
    }, interval);
  }

  public destroy() {
    if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
    if (this.flushPendingTimer) clearTimeout(this.flushPendingTimer);
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    if (this.peerCleanupTimer) clearInterval(this.peerCleanupTimer);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // ignore
      }
    }
  }
}

// Singleton instance
export const collabManager = new CollaborationManager();

/**
 * Hook to observe remote collaborators actively selecting or editing a specific node
 */
export function useRemoteCollaboratorsOnNode(nodeId: string | undefined): CollaboratorPeer[] {
  const [peers, setPeers] = useState<CollaboratorPeer[]>([]);

  useEffect(() => {
    if (!nodeId) return;
    return collabManager.subscribePeers((allPeers) => {
      const active = allPeers.filter(
        (p) => !p.isSelf && p.activeNodeId === nodeId && Date.now() - p.lastActive < 10000,
      );
      setPeers(active);
    });
  }, [nodeId]);

  return peers;
}

/**
 * Hook to observe current Follow Mode state
 */
export function useFollowingPeer(): CollaboratorPeer | null {
  const [peer, setPeer] = useState<CollaboratorPeer | null>(() => collabManager.getFollowingPeer());

  useEffect(() => {
    return collabManager.subscribeFollowingPeer((p) => {
      setPeer(p);
    });
  }, []);

  return peer;
}
