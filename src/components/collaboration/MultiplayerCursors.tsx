"use client";

import { useEffect, useState } from "react";
import { useViewport } from "@xyflow/react";
import { collabManager } from "@/lib/collaboration/collab-manager";
import type { CollaboratorPeer } from "@/lib/collaboration/types";

export function MultiplayerCursors() {
  const [peers, setPeers] = useState<CollaboratorPeer[]>([]);
  const { x: vx, y: vy, zoom } = useViewport();

  useEffect(() => {
    return collabManager.subscribePeers((updated) => {
      setPeers(updated);
    });
  }, []);

  const now = Date.now();

  // Filter peers: not self, has cursor, active in last 8 seconds
  const remotePeers = peers.filter(
    (p) => !p.isSelf && p.cursor && now - p.lastActive < 8000,
  );

  if (remotePeers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
      {remotePeers.map((peer) => {
        if (!peer.cursor) return null;

        // Transform flow coordinates to canvas container pixels
        const screenX = peer.cursor.x * zoom + vx;
        const screenY = peer.cursor.y * zoom + vy;
        const isEditingCard = Boolean(peer.activeNodeId);

        return (
          <div
            key={peer.id}
            className="absolute top-0 left-0 transition-transform duration-75 ease-out select-none will-change-transform"
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
            }}
          >
            {/* Crisp Figma-style Cursor Arrow */}
            <svg
              className="h-4 w-4 drop-shadow-sm filter"
              viewBox="0 0 24 24"
              fill={peer.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
            </svg>

            {/* Pill Name Tag with Role & Live Interaction Status */}
            <div
              className="ml-3.5 -mt-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium text-white shadow-md flex items-center gap-1.5 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
              style={{ backgroundColor: peer.color }}
            >
              {isEditingCard && (
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              )}
              <span>{peer.name}</span>
              {peer.role && (
                <span className="opacity-80 text-[9px] border-l border-white/30 pl-1 font-normal">
                  {peer.role}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

