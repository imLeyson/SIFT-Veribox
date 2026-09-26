import { describe, it, expect, beforeEach } from "vitest";
import {
  getLocalPeer,
  updateLocalPeer,
  getCurrentRoomId,
} from "./collab-manager";
import { POST as handleRoomApi } from "@/app/api/collaboration/room/route";

function setupMockLocalStorage() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  (globalThis as any).localStorage = mock;
  (globalThis as any).window = globalThis;
  if (!globalThis.CustomEvent) {
    (globalThis as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, params: any = {}) {
        this.type = type;
        this.detail = params.detail;
      }
    };
  }
  if (!globalThis.dispatchEvent) {
    (globalThis as any).dispatchEvent = () => true;
    (globalThis as any).addEventListener = () => {};
    (globalThis as any).removeEventListener = () => {};
  }
  return mock;
}

describe("Multi-user Real-time Collaboration Engine", () => {
  beforeEach(() => {
    setupMockLocalStorage();
  });

  it("initializes a valid local peer profile and supports updates", () => {
    const peer = getLocalPeer();
    expect(peer.id).toBeDefined();
    expect(peer.name).toMatch(/^设计师/);
    expect(peer.color).toBeDefined();
    expect(peer.role).toBeDefined();
    expect(peer.isSelf).toBe(true);

    // Update name and role
    const updated = updateLocalPeer({
      name: "资深主案 Alex",
      role: "设计策略",
      color: "#ec4899",
    });

    expect(updated.id).toBe(peer.id);
    expect(updated.name).toBe("资深主案 Alex");
    expect(updated.role).toBe("设计策略");
    expect(updated.color).toBe("#ec4899");
  });

  it("handles room synchronization API for multiple collaborators", async () => {
    const roomId = "test-room-coffee-machine";

    // User A joins and posts presence
    const userA = {
      id: "user-a",
      name: "设计师 A",
      color: "#6366f1",
      role: "视觉设计" as const,
      lastActive: Date.now(),
    };

    const reqA1 = new Request("http://localhost/api/collaboration/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        peer: userA,
        ops: [],
        since: 0,
      }),
    });

    const resA1 = await handleRoomApi(reqA1);
    expect(resA1.status).toBe(200);
    const dataA1 = await resA1.json();
    expect(dataA1.roomId).toBe(roomId);
    expect(dataA1.peers.length).toBe(1);
    expect(dataA1.peers[0].id).toBe("user-a");

    // User B joins and moves a card
    const userB = {
      id: "user-b",
      name: "策划 B",
      color: "#10b981",
      role: "设计策略" as const,
      lastActive: Date.now(),
    };

    const opB1 = {
      id: "op-1",
      roomId,
      userId: "user-b",
      type: "node:move",
      nodeId: "card-route-1",
      position: { x: 300, y: 150 },
      timestamp: Date.now(),
    };

    const reqB1 = new Request("http://localhost/api/collaboration/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        peer: userB,
        ops: [opB1],
        since: 0,
      }),
    });

    const resB1 = await handleRoomApi(reqB1);
    const dataB1 = await resB1.json();
    // B should see both A and B in room
    expect(dataB1.peers.length).toBe(2);

    // User A polls with since=0, should receive B's op (node:move)
    const reqA2 = new Request("http://localhost/api/collaboration/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        peer: userA,
        ops: [],
        since: 0,
      }),
    });

    const resA2 = await handleRoomApi(reqA2);
    const dataA2 = await resA2.json();
    expect(dataA2.peers.length).toBe(2);
    expect(dataA2.ops.length).toBe(1);
    expect(dataA2.ops[0].type).toBe("node:move");
    expect(dataA2.ops[0].nodeId).toBe("card-route-1");
    expect(dataA2.ops[0].userId).toBe("user-b");
  });
});
