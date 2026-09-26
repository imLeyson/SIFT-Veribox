"use client";

import { useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { collabManager } from "@/lib/collaboration/collab-manager";
import type { CollaboratorPeer } from "@/lib/collaboration/types";

export function MultiplayerCursors() {
  const [peers, setPeers] = useState<CollaboratorPeer[]>([]);
  const { getViewport } = useReactFlow();
  const [, setTick] = useState(0);

  useEffect(() => {
    return collabManager.subscribePeers((updated) => {
      setPeers(updated);
    });
  }, []);

  // Force re-render on zoom/pan to keep cursors aligned with canvas
  useEffect(() => {
    let animId: number;
    const loop = () => {
      setTick((t) => (t + 1) % 10000);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const { x: vx, y: vy, zoom } = getViewport();
  const now = Date.now();

  // Filter peers: not self, has cursor, active in last 6 seconds
  const remotePeers = peers.filter(
    (p) => !p.isSelf && p.cursor && now - p.lastActive < 6000,
  );

  if (remotePeers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {remotePeers.map((peer) => {
        if (!peer.cursor) return null;

        // Transform flow coordinates to canvas container pixels
        const screenX = peer.cursor.x * zoom + vx;
        const screenY = peer.cursor.y * zoom + vy;

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
              className="h-4 w-4 drop-shadow-xs"
              viewBox="0 0 24 24"
              fill={peer.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
            </svg>

            {/* Pill Name Tag with Role */}
            <div
              className="ml-3 -mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white shadow-xs flex items-center gap-1 whitespace-nowrap"
              style={{ backgroundColor: peer.color }}
            >
              <span>{peer.name}</span>
              {peer.role && (
                <span className="opacity-80 text-[8.5px] border-l border-white/30 pl-1 font-normal">
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
