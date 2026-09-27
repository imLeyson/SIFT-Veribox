import { NextResponse } from "next/server";
import type { CollaboratorPeer, CollaborationOp, CanvasSyncSnapshot } from "@/lib/collaboration/types";

interface RoomState {
  roomId: string;
  peers: Map<string, CollaboratorPeer>;
  ops: Array<CollaborationOp & { seq: number }>;
  snapshot?: CanvasSyncSnapshot;
  revision: number;
  cursor: number;
  updatedAt: number;
}

// In-memory room store for serverless instances
const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      peers: new Map(),
      ops: [],
      revision: 0,
      cursor: 0,
      updatedAt: Date.now(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

function hasContent(snap?: CanvasSyncSnapshot): boolean {
  if (!snap) return false;
  return Boolean(
    (snap.rawBrief && snap.rawBrief.trim().length > 0) ||
    snap.state ||
    (snap.routes && snap.routes.length > 0) ||
    (snap.customCards && snap.customCards.length > 0) ||
    (snap.platformPlans && snap.platformPlans.length > 0) ||
    (snap.positions && Object.keys(snap.positions).length > 0)
  );
}

// Clean up stale rooms and peers (>20 seconds of inactivity)
function cleanupStaleRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    for (const [peerId, peer] of room.peers.entries()) {
      if (now - peer.lastActive > 20000) {
        room.peers.delete(peerId);
      }
    }
    if (room.peers.size === 0 && now - room.updatedAt > 600000) {
      rooms.delete(roomId);
    }
  }
}

export async function POST(request: Request) {
  cleanupStaleRooms();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomId, peer, ops, since, snapshot, baseRevision } = body;
  if (typeof roomId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(roomId)) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const room = getOrCreateRoom(roomId);
  const now = Date.now();
  room.updatedAt = now;

  // 1. Update peer presence
  if (peer && peer.id) {
    room.peers.set(peer.id, {
      ...peer,
      lastActive: now,
    });
  }

  // 1.5. Update room canvas snapshot if provided and has content
  if (snapshot && typeof snapshot === "object" && hasContent(snapshot)) {
    if (room.snapshot && baseRevision !== room.revision) {
      return NextResponse.json({
        error: "房间已有更新，请先处理同步冲突",
        roomId,
        revision: room.revision,
        cursor: room.cursor,
        snapshot: room.snapshot,
      }, { status: 409 });
    }
    if (!room.snapshot || baseRevision === room.revision) {
      room.snapshot = {
        ...room.snapshot,
        ...snapshot,
        updatedAt: now,
      };
      room.revision += 1;
    }
  }

  // 2. Append new ops from client
  if (Array.isArray(ops) && ops.length > 0) {
    for (const op of ops) {
      if (op && op.id && !room.ops.some((existing) => existing.id === op.id)) {
        room.cursor += 1;
        room.revision += 1;
        room.ops.push({ ...op, seq: room.cursor });
      }
    }
    // Limit ops log to last 100 operations per room
    if (room.ops.length > 100) {
      room.ops = room.ops.slice(-100);
    }
  }

  // 3. Collect active peers in room (exclude expired)
  const activePeers = Array.from(room.peers.values()).filter(
    (p) => now - p.lastActive <= 15000,
  );

  // 4. Collect delta ops since client's last poll timestamp
  const sinceCursor = typeof since === "number" ? since : 0;
  const callerPeerId = peer?.id;
  const deltaOps = room.ops.filter(
    (op) => op.seq > sinceCursor && op.userId !== callerPeerId,
  );

  return NextResponse.json({
    roomId,
    peers: activePeers,
    ops: deltaOps,
    snapshot: room.snapshot || null,
    revision: room.revision,
    cursor: room.cursor,
    serverTime: now,
  });
}
