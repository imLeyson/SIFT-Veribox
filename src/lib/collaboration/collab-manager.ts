"use client";

import {
  CollaboratorPeer,
  CollaborationOp,
  CollaborationOpInput,
  PRESET_AVATAR_COLORS,
  PRESET_ROLES,
} from "./types";
import { getActiveProjectId } from "@/lib/project-manager";
import { useSiftStore, setStoreMutationListener } from "@/lib/convergence-store";

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

class CollaborationManager {
  private localPeer: CollaboratorPeer;
  private currentRoomId: string;
  private broadcastChannel: BroadcastChannel | null = null;
  private peersMap = new Map<string, CollaboratorPeer>();
  private peerListeners = new Set<PeerListener>();
  private opListeners = new Set<OpListener>();
  private pendingOps: CollaborationOp[] = [];
  private heartbeatTimer: any = null;
  private peerCleanupTimer: any = null;
  private lastPolledTimestamp = 0;
  private isProcessingRemoteOp = false;

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

  public switchRoom(newRoomId: string) {
    if (this.currentRoomId === newRoomId) return;
    this.currentRoomId = newRoomId;
    this.peersMap.clear();
    this.pendingOps = [];
    this.lastPolledTimestamp = 0;

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
        } else if (data.op) {
          this.handleRemoteOp(data.op);
        }
      };
    } catch {
      this.broadcastChannel = null;
    }
  }

  public broadcastPresence(
    cursor: { x: number; y: number } | null,
    activeNodeId?: string | null,
  ) {
    this.localPeer = {
      ...this.localPeer,
      cursor,
      activeNodeId,
      lastActive: Date.now(),
      isSelf: true,
    };

    // 1. Tab-to-Tab via BroadcastChannel
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

  public broadcastOp(opData: CollaborationOpInput) {
    const op: CollaborationOp = {
      ...opData,
      id: safeId("op"),
      roomId: this.currentRoomId,
      userId: this.localPeer.id,
      timestamp: Date.now(),
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
  }

  private handleRemotePresence(peer: CollaboratorPeer) {
    if (!peer || peer.id === this.localPeer.id) return;
    this.peersMap.set(peer.id, {
      ...peer,
      isSelf: false,
      lastActive: Date.now(),
    });
    this.notifyPeerListeners();
  }

  private handleRemoteOp(op: CollaborationOp) {
    if (!op || op.userId === this.localPeer.id) return;
    if (op.roomId && op.roomId !== this.currentRoomId) return;

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
          // If remote peer triggered synthesis, update the target card
          store.updateCustomCard(op.cardId, op.synthesized);
          break;
        }
        case "full:sync:request": {
          // Existing peer responds by broadcasting current canvas snapshot
          try {
            const raw = localStorage.getItem("sift-convergence-v3");
            if (raw) {
              this.broadcastOp({
                type: "full:sync",
                snapshot: raw,
              });
            }
          } catch {
            // ignore
          }
          break;
        }
        case "full:sync": {
          // Newly joined peer receives canvas snapshot
          if (op.snapshot && typeof op.snapshot === "string") {
            try {
              localStorage.setItem("sift-convergence-v3", op.snapshot);
              void useSiftStore.persist.rehydrate();
            } catch {
              // ignore
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
      this.isProcessingRemoteOp = false;
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
    const doHeartbeat = async () => {
      if (!isBrowser() || document.hidden) return;

      const opsToSend = [...this.pendingOps];
      this.pendingOps = [];

      try {
        const payload = {
          roomId: this.currentRoomId,
          peer: this.localPeer,
          ops: opsToSend,
          since: this.lastPolledTimestamp,
        };

        const res = await fetch("/api/collaboration/room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
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

          if (typeof data.serverTime === "number") {
            this.lastPolledTimestamp = data.serverTime;
          }
        }
      } catch {
        // offline or network hiccup; local BroadcastChannel continues to work
      }
    };

    // Run first heartbeat immediately
    void doHeartbeat();
    // Poll every 1.5 seconds for cross-machine sync
    this.heartbeatTimer = setInterval(doHeartbeat, 1500);
  }

  public destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
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
