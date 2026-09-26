"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Copy,
  Check,
  Compass,
  Sparkles,
  ChevronDown,
  User,
  Radio,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import {
  collabManager,
  getLocalPeer,
  updateLocalPeer,
  getCurrentRoomId,
} from "@/lib/collaboration/collab-manager";
import {
  CollaboratorPeer,
  PRESET_AVATAR_COLORS,
  PRESET_ROLES,
} from "@/lib/collaboration/types";

export function CollaborationBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [peers, setPeers] = useState<CollaboratorPeer[]>([]);
  const [localPeer, setLocalPeer] = useState<CollaboratorPeer>(getLocalPeer);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(localPeer.name);

  const popoverRef = useRef<HTMLDivElement>(null);
  const { setCenter, getNode } = useReactFlow();

  const roomId = collabManager.getRoomId();

  useEffect(() => {
    return collabManager.subscribePeers((updated) => {
      setPeers(updated);
    });
  }, []);

  // Click outside to close popover
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const activePeers = peers.filter(
    (p) => p.isSelf || Date.now() - p.lastActive < 10000,
  );
  const remotePeers = activePeers.filter((p) => !p.isSelf);
  const isMultiplayer = remotePeers.length > 0;

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    void navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (nameInput.trim()) {
      const updated = updateLocalPeer({ name: nameInput.trim() });
      setLocalPeer(updated);
    }
    setEditingName(false);
  };

  const handleSelectColor = (color: string) => {
    const updated = updateLocalPeer({ color });
    setLocalPeer(updated);
  };

  const handleSelectRole = (role: any) => {
    const updated = updateLocalPeer({ role });
    setLocalPeer(updated);
  };

  const handleFollowPeer = (peer: CollaboratorPeer) => {
    if (peer.cursor) {
      setCenter(peer.cursor.x, peer.cursor.y, { duration: 600, zoom: 0.85 });
      setIsOpen(false);
      return;
    }

    if (peer.activeNodeId) {
      const node = getNode(peer.activeNodeId);
      if (node) {
        setCenter(node.position.x + 150, node.position.y + 100, {
          duration: 600,
          zoom: 0.85,
        });
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Topbar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
          isMultiplayer
            ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 shadow-2xs"
            : isOpen
              ? "bg-stone-100 text-stone-900 border-stone-300 shadow-2xs font-semibold"
              : "bg-white/80 hover:bg-stone-100/80 border-stone-200/90 text-stone-700 hover:text-stone-900"
        }`}
        title="多人实时协作与成员管理"
      >
        {isMultiplayer ? (
          <div className="flex items-center -space-x-1.5 mr-0.5">
            {activePeers.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="h-4 w-4 rounded-full border border-white text-[9px] font-bold text-white flex items-center justify-center shadow-xs"
                style={{ backgroundColor: p.color }}
                title={`${p.name} (${p.role})`}
              >
                {p.name.slice(0, 1)}
              </div>
            ))}
          </div>
        ) : (
          <Users className="h-3.5 w-3.5 text-stone-500" />
        )}

        <span>
          {isMultiplayer ? `${activePeers.length} 人在线` : "协同"}
        </span>

        {isMultiplayer && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        )}

        <ChevronDown
          className={`h-3 w-3 text-stone-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-76 rounded-xl bg-white p-2.5 shadow-xl border border-stone-200 text-xs text-stone-800 animate-in fade-in zoom-in-95 duration-100 select-none space-y-2.5">
          {/* Room Header & Invite Action */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-emerald-500" />
                <span className="font-semibold text-stone-900 text-xs">
                  协同房间
                </span>
                <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1 py-0.2 rounded">
                  {roomId.slice(0, 12)}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                实时光标、卡片拓扑与视角同步
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-2xs shrink-0"
              title="复制专属协同链接分享给协作者"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>邀请</span>
                </>
              )}
            </button>
          </div>

          {/* My Profile Card */}
          <div className="rounded-lg bg-stone-50/70 p-2 border border-stone-200/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 font-medium">我的协同身份:</span>
              {!editingName && (
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(localPeer.name);
                    setEditingName(true);
                  }}
                  className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                >
                  修改名称
                </button>
              )}
            </div>

            {editingName ? (
              <form onSubmit={handleSaveName} className="flex gap-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-xs outline-none"
                  autoFocus
                  onBlur={() => handleSaveName()}
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 rounded bg-stone-900 text-white text-[10px]"
                >
                  确定
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: localPeer.color }}
                  />
                  <span className="font-semibold text-stone-900 text-xs">
                    {localPeer.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-600 bg-stone-200/60 px-1.5 py-0.2 rounded">
                  {localPeer.role}
                </span>
              </div>
            )}

            {/* Avatar Color Dots */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-stone-400">光标颜色:</span>
              <div className="flex items-center gap-1">
                {PRESET_AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleSelectColor(color)}
                    className={`h-3 w-3 rounded-full transition-transform cursor-pointer ${
                      localPeer.color === color
                        ? "ring-2 ring-stone-900 ring-offset-1 scale-110"
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Role Selection */}
            <div className="flex items-center gap-1 pt-0.5 flex-wrap">
              {PRESET_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  className={`text-[9.5px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    localPeer.role === role
                      ? "bg-stone-900 text-white font-medium"
                      : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Active Collaborators List */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block px-1">
              在线协作者 ({activePeers.length})
            </span>

            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
              {activePeers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-stone-50 text-xs transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <div
                      className="h-4 w-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-stone-800 truncate text-[11px]">
                          {p.name}
                        </span>
                        {p.isSelf && (
                          <span className="text-[9px] text-stone-400">(我)</span>
                        )}
                      </div>
                      <span className="text-[9px] text-stone-400 block">
                        {p.role} · 实时在线
                      </span>
                    </div>
                  </div>

                  {!p.isSelf && (
                    <button
                      type="button"
                      onClick={() => handleFollowPeer(p)}
                      className="shrink-0 text-[10px] text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200/80 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center gap-0.5"
                      title="平移画布镜头跟随该成员"
                    >
                      <Compass className="h-2.5 w-2.5" />
                      <span>跟随</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
