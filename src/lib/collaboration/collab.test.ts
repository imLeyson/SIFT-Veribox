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

  it("persists room canvas snapshot and delivers it to newly joined collaborator", async () => {
    const roomId = "room-snapshot-test-01";

    const hostPeer = {
      id: "peer-host",
      name: "主设计师",
      color: "#6366f1",
      role: "视觉设计" as const,
      lastActive: Date.now(),
    };

    const hostSnapshot = {
      rawBrief: "智能复古咖啡机外观概念设计",
      routes: [
        {
          id: "route-retro-modern",
          name: "复古未来主义",
          tagline: "精致金属线条与圆润复古倒角的有机结合",
          description: "采用手工打磨铜拉丝与哑光米白喷涂",
          keywords: ["复古", "铜拉丝", "咖啡文化"],
          steps: [],
        },
      ],
      customCards: [
        {
          id: "card-note-1",
          type: "note" as const,
          title: "CMF要点",
          content: "机身侧翼采用深胡桃木实木饰条",
          position: { x: 500, y: 240 },
        },
      ],
      positions: {
        "route-retro-modern": { x: 1200, y: 350 },
        "card-note-1": { x: 500, y: 240 },
      },
      updatedAt: Date.now(),
    };

    // Host sends heartbeat with full canvas snapshot
    const hostReq = new Request("http://localhost/api/collaboration/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        peer: hostPeer,
        ops: [],
        since: 0,
        snapshot: hostSnapshot,
      }),
    });

    const hostRes = await handleRoomApi(hostReq);
    expect(hostRes.status).toBe(200);
    const hostData = await hostRes.json();
    expect(hostData.snapshot).toBeDefined();
    expect(hostData.snapshot.rawBrief).toBe("智能复古咖啡机外观概念设计");
    expect(hostData.snapshot.routes.length).toBe(1);

    // Collaborator joins room with empty state
    const collabPeer = {
      id: "peer-collaborator",
      name: "协同工程师",
      color: "#10b981",
      role: "CMF工程" as const,
      lastActive: Date.now(),
    };

    const collabReq = new Request("http://localhost/api/collaboration/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        peer: collabPeer,
        ops: [],
        since: 0,
        // Collaborator initially has empty/no snapshot
      }),
    });

    const collabRes = await handleRoomApi(collabReq);
    expect(collabRes.status).toBe(200);
    const collabData = await collabRes.json();

    // Collaborator MUST receive host's snapshot to immediately populate their canvas
    expect(collabData.snapshot).toBeDefined();
    expect(collabData.snapshot.rawBrief).toBe("智能复古咖啡机外观概念设计");
    expect(collabData.snapshot.routes[0].id).toBe("route-retro-modern");
    expect(collabData.snapshot.customCards[0].id).toBe("card-note-1");
    expect(collabData.snapshot.positions["card-note-1"].x).toBe(500);

    // Collaborator sending an empty snapshot must NOT wipe out the room's snapshot
    const emptySyncReq = new Request("http://localhost/api/collaboration/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        peer: collabPeer,
        ops: [],
        since: 0,
        snapshot: { rawBrief: "", routes: [], customCards: [] },
      }),
    });

    const emptyRes = await handleRoomApi(emptySyncReq);
    const emptyData = await emptyRes.json();
    expect(emptyData.snapshot.rawBrief).toBe("智能复古咖啡机外观概念设计");
    expect(emptyData.snapshot.routes.length).toBe(1);
  });

  it("rejects a stale canvas write and keeps the newer room version", async () => {
    const roomId = `room-conflict-${crypto.randomUUID()}`;
    const peer = { id: "editor-a", name: "A", color: "#6366f1", role: "视觉设计", lastActive: Date.now() };
    const post = (snapshot: object, baseRevision: number) => handleRoomApi(new Request("http://localhost/api/collaboration/room", {
      method: "POST",
      body: JSON.stringify({ roomId, peer, snapshot, baseRevision, since: 0 }),
    }));

    const first = await post({ rawBrief: "版本一" }, 0);
    expect(first.status).toBe(200);
    expect((await first.json()).revision).toBe(1);

    const second = await post({ rawBrief: "版本二" }, 1);
    expect(second.status).toBe(200);
    expect((await second.json()).revision).toBe(2);

    const stale = await post({ rawBrief: "过时版本" }, 1);
    expect(stale.status).toBe(409);
    const conflict = await stale.json();
    expect(conflict.revision).toBe(2);
    expect(conflict.snapshot.rawBrief).toBe("版本二");
  });

  it("uses a server cursor so equal client timestamps cannot hide operations", async () => {
    const roomId = `room-cursor-${crypto.randomUUID()}`;
    const peerA = { id: "editor-a", name: "A", color: "#6366f1", role: "视觉设计", lastActive: Date.now() };
    const peerB = { ...peerA, id: "editor-b", name: "B" };
    const op = (id: string) => ({ id, roomId, userId: peerB.id, type: "node:move", nodeId: id, position: { x: 1, y: 2 }, timestamp: 100 });
    const post = async (peer: typeof peerA, ops: object[], since: number) => (await handleRoomApi(new Request("http://localhost/api/collaboration/room", {
      method: "POST", body: JSON.stringify({ roomId, peer, ops, since }),
    }))).json();

    await post(peerB, [op("first")], 0);
    const firstPoll = await post(peerA, [], 0);
    expect(firstPoll.ops.map((item: { nodeId: string }) => item.nodeId)).toEqual(["first"]);
    await post(peerB, [op("second")], 0);
    const secondPoll = await post(peerA, [], firstPoll.cursor);
    expect(secondPoll.ops.map((item: { nodeId: string }) => item.nodeId)).toEqual(["second"]);
  });

  it("does not append a replayed operation twice", async () => {
    const roomId = `room-idempotent-${crypto.randomUUID()}`;
    const peerA = { id: "editor-a", name: "A", color: "#6366f1", role: "视觉设计", lastActive: Date.now() };
    const peerB = { id: "editor-b", name: "B", color: "#10b981", role: "设计策略", lastActive: Date.now() };
    const op = { id: "stable-op", roomId, userId: peerB.id, type: "node:move", nodeId: "card-1", position: { x: 3, y: 4 }, timestamp: 1 };
    const post = (peer: typeof peerA, ops: object[]) => handleRoomApi(new Request("http://localhost/api/collaboration/room", {
      method: "POST", body: JSON.stringify({ roomId, peer, ops, since: 0 }),
    }));

    await post(peerB, [op]);
    await post(peerB, [op]);
    const poll = await post(peerA, []);
    const data = await poll.json();
    expect(data.ops.filter((item: { id: string }) => item.id === "stable-op")).toHaveLength(1);
  });
});
