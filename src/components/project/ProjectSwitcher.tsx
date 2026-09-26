"use client";

import { useState, useEffect, useRef } from "react";
import {
  FolderKanban,
  ChevronDown,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Check,
  Camera,
  RotateCcw,
} from "lucide-react";
import {
  listProjects,
  getActiveProjectId,
  createProject,
  switchProject,
  duplicateProject,
  renameProject,
  deleteProject,
  saveCurrentProjectSnapshot,
  saveMilestoneSnapshot,
  listMilestoneSnapshots,
  restoreMilestoneSnapshot,
  type ProjectMetadata,
  type MilestoneSnapshot,
} from "@/lib/project-manager";
import { useSiftStore } from "@/lib/convergence-store";

export function ProjectSwitcher() {
  const store = useSiftStore();
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [activeId, setActiveId] = useState<string>("proj-default");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [milestones, setMilestones] = useState<MilestoneSnapshot[]>([]);
  const [milestonePrompt, setMilestonePrompt] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");

  const popoverRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    const list = listProjects();
    const current = getActiveProjectId();
    setProjects(list);
    setActiveId(current);
    setMilestones(listMilestoneSnapshots(current));
  };

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    window.addEventListener("sift-project-changed", handleUpdate);
    window.addEventListener("sift-project-list-updated", handleUpdate);
    window.addEventListener("sift-milestones-updated", handleUpdate);

    return () => {
      window.removeEventListener("sift-project-changed", handleUpdate);
      window.removeEventListener("sift-project-list-updated", handleUpdate);
      window.removeEventListener("sift-milestones-updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (store.state?.brief.goal || store.rawBrief) {
      saveCurrentProjectSnapshot();
      refresh();
    }
  }, [store.state?.brief.goal, store.rawBrief]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
        setMilestonePrompt(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const activeProject = projects.find((p) => p.id === activeId) || projects[0];

  const handleCreate = () => {
    createProject();
    refresh();
    setIsOpen(false);
  };

  const handleSwitch = (id: string) => {
    if (id === activeId) return;
    switchProject(id);
    refresh();
    setIsOpen(false);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateProject(id);
    refresh();
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定删除项目《${name}》吗？`)) {
      deleteProject(id);
      refresh();
    }
  };

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(currentName);
  };

  const submitRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editName.trim()) {
      renameProject(id, editName.trim());
      refresh();
    }
    setEditingId(null);
  };

  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (snapshotLabel.trim()) {
      saveMilestoneSnapshot(snapshotLabel.trim());
      setSnapshotLabel("");
      setMilestonePrompt(false);
      refresh();
    }
  };

  const handleRestoreMilestone = (snapId: string, label: string) => {
    if (confirm(`确定还原至快照《${label}》吗？当前未保存的修改将被覆盖。`)) {
      restoreMilestoneSnapshot(snapId);
      refresh();
      setIsOpen(false);
    }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return new Date(ts).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Top Trigger Button */}
      <button
        type="button"
        onClick={() => {
          saveCurrentProjectSnapshot();
          refresh();
          setIsOpen((prev) => !prev);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
          isOpen
            ? "bg-stone-100 text-stone-900 border-stone-300 shadow-2xs"
            : "bg-white/80 hover:bg-stone-100/80 border-stone-200/90 text-stone-700 hover:text-stone-900"
        }`}
        title="切换或管理探索项目"
      >
        <FolderKanban className="h-3.5 w-3.5 text-stone-500" />
        <span className="max-w-[130px] truncate text-left">
          {activeProject?.name || "设计探索项目"}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-76 rounded-xl bg-white p-1.5 shadow-xl border border-stone-200 text-xs text-stone-800 animate-in fade-in zoom-in-95 duration-100 select-none">
          {/* Projects Header */}
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-stone-400 font-medium">
            <span>探索项目 ({projects.length})</span>
            <button
              type="button"
              onClick={handleCreate}
              className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 px-1.5 py-0.5 rounded hover:bg-stone-100 transition-colors cursor-pointer"
              title="新建空白画布工程"
            >
              <Plus className="h-3 w-3" />
              <span>新建</span>
            </button>
          </div>

          {/* Projects List */}
          <div className="space-y-0.5 max-h-56 overflow-y-auto no-scrollbar">
            {projects.map((p) => {
              const isActive = p.id === activeId;
              const isEditing = editingId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => handleSwitch(p.id)}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "bg-stone-100 text-stone-900 font-medium"
                      : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => submitRename(p.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded border border-stone-300 bg-white px-1.5 py-0.5 text-xs outline-none font-medium"
                          autoFocus
                          onBlur={() => submitRename(p.id)}
                        />
                        <button type="submit" className="p-0.5 text-stone-600 hover:text-stone-900">
                          <Check className="h-3 w-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="truncate text-xs leading-snug">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-stone-400 font-normal leading-tight mt-0.5">
                          {formatTime(p.updatedAt)} · {p.cardCount} 张卡片
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Hover actions */}
                    {!isEditing && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => startRename(p.id, p.name, e)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 cursor-pointer"
                          title="重命名"
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(p.id, e)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 cursor-pointer"
                          title="创建副本"
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(p.id, p.name, e)}
                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="删除项目"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Active checkmark */}
                    {isActive && !isEditing && (
                      <Check className="h-3.5 w-3.5 text-stone-600 shrink-0 ml-1 group-hover:hidden" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section Divider */}
          <div className="my-1.5 border-t border-stone-100" />

          {/* Milestone Snapshots Section */}
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] text-stone-400 font-medium">
              <span>阶段快照 {milestones.length > 0 ? `(${milestones.length})` : ""}</span>
              <button
                type="button"
                onClick={() => setMilestonePrompt((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 px-1.5 py-0.5 rounded hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <Camera className="h-3 w-3 text-stone-400" />
                <span>{milestonePrompt ? "取消" : "保存快照"}</span>
              </button>
            </div>

            {milestonePrompt ? (
              <form onSubmit={handleSaveMilestone} className="flex items-center gap-1 px-1 py-1">
                <input
                  type="text"
                  placeholder="快照说明（例如：收敛初版）"
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  className="flex-1 bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs text-stone-800 outline-none focus:border-stone-400 focus:bg-white placeholder:text-stone-400"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!snapshotLabel.trim()}
                  className="px-2 py-1 rounded bg-stone-900 text-white text-[11px] font-medium disabled:opacity-40 cursor-pointer"
                >
                  保存
                </button>
              </form>
            ) : milestones.length > 0 ? (
              <div className="space-y-0.5 max-h-32 overflow-y-auto no-scrollbar">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-stone-50 text-xs transition-colors group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-stone-800 text-[11px] font-medium block truncate">
                        {m.label}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {formatTime(m.createdAt)} · {m.cardCount} 张卡片
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreMilestone(m.id, m.label)}
                      className="text-[10px] font-medium text-stone-500 hover:text-stone-900 px-1.5 py-0.5 rounded border border-stone-200 hover:bg-stone-100 transition-colors cursor-pointer flex items-center gap-1"
                      title="还原至此快照"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>还原</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
