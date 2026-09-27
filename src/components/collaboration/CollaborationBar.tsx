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
  useFollowingPeer,
  type CollaborationStatus,
} from "@/lib/collaboration/collab-manager";
import {
  CollaboratorPeer,
  PRESET_AVATAR_COLORS,
} from "@/lib/collaboration/types";

export function CollaborationBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [peers, setPeers] = useState<CollaboratorPeer[]>([]);
  const [localPeer, setLocalPeer] = useState<CollaboratorPeer>(getLocalPeer);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(localPeer.name);

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<CollaborationStatus>(() => collabManager.getStatus());

  const popoverRef = useRef<HTMLDivElement>(null);
  const { setCenter, getNode } = useReactFlow();
  const followingPeer = useFollowingPeer();

  const roomId = collabManager.getRoomId();

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const target = joinRoomInput.trim();
    if (!target) return;

    collabManager.switchRoom(target);

    // Update URL query param cleanly without reload
    const url = new URL(window.location.href);
    url.searchParams.set("room", target);
    window.history.pushState({}, "", url.toString());

    setShowJoinInput(false);
    setJoinRoomInput("");
  };

  useEffect(() => {
    return collabManager.subscribePeers((updated) => {
      setPeers(updated);
    });
  }, []);

  useEffect(() => collabManager.subscribeStatus(setConnectionStatus), []);

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
  const statusLabel = connectionStatus === "connected"
    ? "已连接"
    : connectionStatus === "conflict"
      ? "需同步"
      : connectionStatus === "offline"
        ? "离线保存"
        : "连接中";
  const statusColor = connectionStatus === "connected"
    ? "bg-emerald-500"
    : connectionStatus === "conflict"
      ? "bg-amber-500"
      : connectionStatus === "offline"
        ? "bg-stone-400"
        : "bg-indigo-400";

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

  const handleFollowPeer = (peer: CollaboratorPeer) => {
    if (followingPeer?.id === peer.id) {
      collabManager.setFollowingPeerId(null);
    } else {
      collabManager.setFollowingPeerId(peer.id);
      if (peer.cursor) {
        void setCenter(peer.cursor.x, peer.cursor.y, { duration: 500, zoom: 0.85 });
      } else if (peer.activeNodeId) {
        const node = getNode(peer.activeNodeId);
        if (node) {
          void setCenter(node.position.x + 150, node.position.y + 100, {
            duration: 500,
            zoom: 0.85,
          });
        }
      }
    }
    setIsOpen(false);
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
                onClick={(e) => {
                  if (!p.isSelf) {
                    e.stopPropagation();
                    handleFollowPeer(p);
                  }
                }}
                className={`h-4 w-4 rounded-full border border-white text-[9px] font-bold text-white flex items-center justify-center shadow-xs cursor-pointer transition-transform hover:scale-125 ${
                  followingPeer?.id === p.id ? "ring-2 ring-indigo-500 ring-offset-1 scale-110" : ""
                }`}
                style={{ backgroundColor: p.color }}
                title={`${p.name} (${p.role})${!p.isSelf ? " · 点击跟随视角" : ""}`}
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

        <span className={`h-1.5 w-1.5 rounded-full ${statusColor} ${connectionStatus === "connecting" ? "animate-pulse" : ""}`} />

        <ChevronDown
          className={`h-3 w-3 text-stone-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-80 rounded-xl bg-white p-2.5 shadow-xl border border-stone-200 text-xs text-stone-800 animate-in fade-in zoom-in-95 duration-100 select-none space-y-2.5">
          {/* Room Header & Actions */}
          <div className="border-b border-stone-100 pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <Radio className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-stone-900 text-xs shrink-0">
                    协同房间
                  </span>
                  <span className="text-[10px] text-stone-500">{statusLabel}</span>
                  <span className="text-[10px] font-mono text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded truncate max-w-[105px]">
                    {roomId}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowJoinInput((prev) => !prev)}
                  className="px-1.5 py-1 rounded text-[10px] text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                  title="输入已有房间号加入"
                >
                  {showJoinInput ? "取消" : "加入房间"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-2xs"
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
            </div>

            {showJoinInput ? (
              <form onSubmit={handleJoinRoom} className="flex gap-1 pt-0.5">
                <input
                  type="text"
                  placeholder="输入房间 ID (如 proj-xxxx)"
                  value={joinRoomInput}
                  onChange={(e) => setJoinRoomInput(e.target.value)}
                  className="flex-1 rounded border border-stone-300 bg-stone-50 px-2 py-1 text-xs outline-none focus:bg-white focus:border-stone-400"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!joinRoomInput.trim()}
                  className="px-2.5 py-1 rounded bg-stone-900 text-white text-[11px] font-medium disabled:opacity-40 cursor-pointer"
                >
                  进入
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-stone-400 block">
                  {connectionStatus === "conflict"
                    ? "检测到较新的协作版本，已优先同步最新画布。"
                    : connectionStatus === "offline"
                      ? "当前离线，改动会先保存在本地，恢复连接后继续同步。"
                      : "复制链接发送给队友，打开链接即可自动联机"}
                </span>
                {(connectionStatus === "offline" || connectionStatus === "conflict") && (
                  <button
                    type="button"
                    onClick={() => void collabManager.flushNow()}
                    className="shrink-0 rounded-md border border-stone-200 bg-white px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                  >
                    重新同步
                  </button>
                )}
              </div>
            )}
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
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                        followingPeer?.id === p.id
                          ? "bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs"
                          : "text-indigo-600 hover:text-indigo-800 border-indigo-200/80 hover:bg-indigo-50"
                      }`}
                      title={followingPeer?.id === p.id ? "点击退出视角跟随" : "实时跟随该成员的设计视角"}
                    >
                      <Compass className={`h-2.5 w-2.5 ${followingPeer?.id === p.id ? "animate-spin" : ""}`} />
                      <span>{followingPeer?.id === p.id ? "跟随中" : "跟随"}</span>
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
