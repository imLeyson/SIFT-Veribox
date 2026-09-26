"use client";

import { useSiftStore, STORAGE_KEY } from "./convergence-store";

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cardCount: number;
  goalSnippet?: string;
  themeSnippet?: string;
  snapshotsCount?: number;
}

export interface MilestoneSnapshot {
  id: string;
  projectId: string;
  label: string;
  createdAt: number;
  cardCount: number;
  data: string; // serialized session
}

export const PROJECT_MANIFEST_KEY = "sift-projects-manifest-v1";
export const ACTIVE_PROJECT_KEY = "sift-active-project-id-v1";
export const PROJECT_DATA_PREFIX = "sift-project-data-";
export const PROJECT_SNAPSHOTS_PREFIX = "sift-milestones-";
export const PROJECT_CHAT_PREFIX = "sift-project-chat-";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeId(prefix = "proj"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Get active project ID from localStorage, or default to initial.
 */
export function getActiveProjectId(): string {
  if (!isBrowser()) return "proj-default";
  let activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
  if (!activeId) {
    const list = listProjects();
    activeId = list.length > 0 ? list[0].id : "proj-default";
    localStorage.setItem(ACTIVE_PROJECT_KEY, activeId);
  }
  return activeId;
}

/**
 * List all saved projects, sorted by updatedAt descending.
 * If none exist, automatically initializes the current workspace session as Project 1.
 */
export function listProjects(): ProjectMetadata[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(PROJECT_MANIFEST_KEY);
    if (!raw) {
      // First time initialization: initialize from existing session
      return [bootstrapDefaultProject()];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [bootstrapDefaultProject()];
    }
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [bootstrapDefaultProject()];
  }
}

function bootstrapDefaultProject(): ProjectMetadata {
  const store = useSiftStore.getState();
  const currentGoal = store.state?.brief.goal || (store.rawBrief ? store.rawBrief.slice(0, 16) : "");
  const selectedRoute = store.routes?.find((r) => r.id === store.selectedRouteId);

  const defaultProj: ProjectMetadata = {
    id: "proj-default",
    name: currentGoal ? `项目：${currentGoal}` : "设计探索项目 01",
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    cardCount: (store.routes?.length || 0) + (store.customCards?.length || 0) + (store.state ? 1 : 0),
    goalSnippet: currentGoal || "未命名探索",
    themeSnippet: selectedRoute?.themeName || selectedRoute?.title,
    snapshotsCount: 0,
  };

  if (isBrowser()) {
    try {
      localStorage.setItem(PROJECT_MANIFEST_KEY, JSON.stringify([defaultProj]));
      localStorage.setItem(ACTIVE_PROJECT_KEY, defaultProj.id);
      // Backup current session into project data slot
      const currentSessionData = localStorage.getItem(STORAGE_KEY);
      if (currentSessionData) {
        localStorage.setItem(PROJECT_DATA_PREFIX + defaultProj.id, currentSessionData);
      }
    } catch {
      // ignore storage errors
    }
  }
  return defaultProj;
}

/**
 * Sync current session state into the active project record.
 */
export function saveCurrentProjectSnapshot(nameOverride?: string): ProjectMetadata | null {
  if (!isBrowser()) return null;
  const activeId = getActiveProjectId();
  const store = useSiftStore.getState();
  const currentGoal = store.state?.brief.goal || (store.rawBrief ? store.rawBrief.slice(0, 16) : "");
  const selectedRoute = store.routes?.find((r) => r.id === store.selectedRouteId);

  const currentSessionData = localStorage.getItem(STORAGE_KEY);
  if (currentSessionData) {
    try {
      localStorage.setItem(PROJECT_DATA_PREFIX + activeId, currentSessionData);
    } catch {
      // ignore quota errors
    }
  }

  const projects = listProjects();
  let found = projects.find((p) => p.id === activeId);
  const now = Date.now();

  const totalCards =
    (store.routes?.length || 0) +
    (store.customCards?.length || 0) +
    (store.state ? 1 : 0) +
    (store.rawBrief ? 1 : 0);

  if (found) {
    found.updatedAt = now;
    found.cardCount = totalCards;
    found.goalSnippet = currentGoal || found.goalSnippet;
    found.themeSnippet = selectedRoute?.themeName || selectedRoute?.title || found.themeSnippet;
    if (nameOverride?.trim()) {
      found.name = nameOverride.trim();
    }
  } else {
    found = {
      id: activeId,
      name: nameOverride?.trim() || (currentGoal ? `项目：${currentGoal}` : `新项目探索`),
      createdAt: now,
      updatedAt: now,
      cardCount: totalCards,
      goalSnippet: currentGoal,
      themeSnippet: selectedRoute?.themeName || selectedRoute?.title,
      snapshotsCount: 0,
    };
    projects.push(found);
  }

  try {
    localStorage.setItem(PROJECT_MANIFEST_KEY, JSON.stringify(projects));
  } catch {
    // ignore
  }
  return found;
}

/**
 * Create a new blank project and switch to it.
 */
export function createProject(name?: string): ProjectMetadata {
  if (!isBrowser()) {
    return {
      id: safeId(),
      name: name || "新建画布项目",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cardCount: 0,
    };
  }

  // 1. Save current project first
  saveCurrentProjectSnapshot();

  // 2. Generate new project metadata
  const newId = safeId();
  const now = Date.now();
  const projects = listProjects();
  const projectNumber = projects.length + 1;
  const projectName = name?.trim() || `设计探索项目 0${projectNumber}`;

  const newProj: ProjectMetadata = {
    id: newId,
    name: projectName,
    createdAt: now,
    updatedAt: now,
    cardCount: 0,
    snapshotsCount: 0,
  };

  projects.unshift(newProj);
  try {
    localStorage.setItem(PROJECT_MANIFEST_KEY, JSON.stringify(projects));
    localStorage.setItem(ACTIVE_PROJECT_KEY, newId);
    // Explicitly ensure new project starts with completely clean chat history
    localStorage.removeItem(PROJECT_CHAT_PREFIX + newId);
  } catch {
    // ignore
  }

  // 3. Reset store to empty session and persist to storage
  useSiftStore.getState().reset();
  // Ensure the new empty session is saved under the new project
  setTimeout(() => {
    saveCurrentProjectSnapshot();
  }, 100);

  window.dispatchEvent(new CustomEvent("sift-project-changed", { detail: { projectId: newId } }));
  return newProj;
}

/**
 * Switch from current project to another existing project.
 */
export function switchProject(targetProjectId: string): boolean {
  if (!isBrowser()) return false;
  const currentActiveId = getActiveProjectId();
  if (currentActiveId === targetProjectId) return true;

  // 1. Save current session to current project storage slot
  saveCurrentProjectSnapshot();

  // 2. Load target project data
  const targetDataRaw = localStorage.getItem(PROJECT_DATA_PREFIX + targetProjectId);

  if (targetDataRaw) {
    try {
      localStorage.setItem(STORAGE_KEY, targetDataRaw);
      localStorage.setItem(ACTIVE_PROJECT_KEY, targetProjectId);
      // Rehydrate store from newly loaded storage
      void useSiftStore.persist.rehydrate();
    } catch {
      return false;
    }
  } else {
    // If no data saved for target, reset to clean session
    localStorage.setItem(ACTIVE_PROJECT_KEY, targetProjectId);
    useSiftStore.getState().reset();
  }

  // Touch updatedAt
  const projects = listProjects();
  const target = projects.find((p) => p.id === targetProjectId);
  if (target) {
    target.updatedAt = Date.now();
    try {
      localStorage.setItem(PROJECT_MANIFEST_KEY, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }

  window.dispatchEvent(new CustomEvent("sift-project-changed", { detail: { projectId: targetProjectId } }));
  return true;
}

/**
 * Duplicate a project (makes an exact copy of its canvas state as a new branch).
 */
export function duplicateProject(sourceProjectId: string, newName?: string): ProjectMetadata | null {
  if (!isBrowser()) return null;
  // Make sure current project is saved if it's the source
  if (getActiveProjectId() === sourceProjectId) {
    saveCurrentProjectSnapshot();
  }

  const projects = listProjects();
  const source = projects.find((p) => p.id === sourceProjectId);
  if (!source) return null;

  const newId = safeId();
  const now = Date.now();
  const duplicatedName = newName?.trim() || `${source.name} (副本)`;

  const newProj: ProjectMetadata = {
    ...source,
    id: newId,
    name: duplicatedName,
    createdAt: now,
    updatedAt: now,
    snapshotsCount: 0,
  };

  // Copy data
  const sourceData = localStorage.getItem(PROJECT_DATA_PREFIX + sourceProjectId);
  if (sourceData) {
    try {
      localStorage.setItem(PROJECT_DATA_PREFIX + newId, sourceData);
    } catch {
      // ignore
    }
  }

  // Copy chat history if present
  const sourceChat = localStorage.getItem(PROJECT_CHAT_PREFIX + sourceProjectId);
  if (sourceChat) {
    try {
      localStorage.setItem(PROJECT_CHAT_PREFIX + newId, sourceChat);
    } catch {
      // ignore
    }
  }

  projects.unshift(newProj);
  try {
    localStorage.setItem(PROJECT_MANIFEST_KEY, JSON.stringify(projects));
  } catch {
    // ignore
  }

  window.dispatchEvent(new CustomEvent("sift-project-list-updated"));
  return newProj;
}

/**
 * Rename a project.
 */
export function renameProject(projectId: string, newName: string): boolean {
  if (!isBrowser() || !newName.trim()) return false;
  const projects = listProjects();
  const found = projects.find((p) => p.id === projectId);
  if (!found) return false;

  found.name = newName.trim();
  found.updatedAt = Date.now();

  try {
    localStorage.setItem(PROJECT_MANIFEST_KEY, JSON.stringify(projects));
  } catch {
    return false;
  }

  window.dispatchEvent(new CustomEvent("sift-project-list-updated"));
  return true;
}

/**
 * Delete a project. Cannot delete if it is the only remaining project.
 */
export function deleteProject(projectId: string): boolean {
  if (!isBrowser()) return false;
  const projects = listProjects();
  if (projects.length <= 1) {
    return false; // prevent deleting last project
  }

  const filtered = projects.filter((p) => p.id !== projectId);
  try {
    localStorage.setItem(PROJECT_MANIFEST_KEY, JSON.stringify(filtered));
    localStorage.removeItem(PROJECT_DATA_PREFIX + projectId);
    localStorage.removeItem(PROJECT_SNAPSHOTS_PREFIX + projectId);
    localStorage.removeItem(PROJECT_CHAT_PREFIX + projectId);
  } catch {
    // ignore
  }

  // If deleted current project, switch to the first available project
  if (getActiveProjectId() === projectId) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, filtered[0].id);
    const targetDataRaw = localStorage.getItem(PROJECT_DATA_PREFIX + filtered[0].id);
    if (targetDataRaw) {
      try {
        localStorage.setItem(STORAGE_KEY, targetDataRaw);
        void useSiftStore.persist.rehydrate();
      } catch {
        // ignore
      }
    } else {
      useSiftStore.getState().reset();
    }
  }

  window.dispatchEvent(new CustomEvent("sift-project-list-updated"));
  return true;
}

/**
 * Save a Milestone Snapshot for the active project.
 */
export function saveMilestoneSnapshot(label: string): MilestoneSnapshot | null {
  if (!isBrowser()) return null;
  const projectId = getActiveProjectId();
  const currentData = localStorage.getItem(STORAGE_KEY) || "";
  const store = useSiftStore.getState();
  const cardCount =
    (store.routes?.length || 0) +
    (store.customCards?.length || 0) +
    (store.state ? 1 : 0);

  const snapshot: MilestoneSnapshot = {
    id: safeId("snap"),
    projectId,
    label: label.trim() || `阶段里程碑 (${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })})`,
    createdAt: Date.now(),
    cardCount,
    data: currentData,
  };

  const key = PROJECT_SNAPSHOTS_PREFIX + projectId;
  try {
    const raw = localStorage.getItem(key);
    const list: MilestoneSnapshot[] = raw ? JSON.parse(raw) : [];
    list.unshift(snapshot);
    localStorage.setItem(key, JSON.stringify(list));

    // Update manifest snapshot count
    const projects = listProjects();
    const p = projects.find((item) => item.id === projectId);
    if (p) {
      p.snapshotsCount = list.length;
      localStorage.setItem(PROJECT_MANIFEST_KEY, JSON.stringify(projects));
    }
  } catch {
    return null;
  }

  window.dispatchEvent(new CustomEvent("sift-milestones-updated"));
  return snapshot;
}

/**
 * List milestone snapshots for a project.
 */
export function listMilestoneSnapshots(projectId: string): MilestoneSnapshot[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(PROJECT_SNAPSHOTS_PREFIX + projectId);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Restore a milestone snapshot into current session.
 */
export function restoreMilestoneSnapshot(snapshotId: string): boolean {
  if (!isBrowser()) return false;
  const projectId = getActiveProjectId();
  const snapshots = listMilestoneSnapshots(projectId);
  const found = snapshots.find((s) => s.id === snapshotId);
  if (!found || !found.data) return false;

  try {
    localStorage.setItem(STORAGE_KEY, found.data);
    void useSiftStore.persist.rehydrate();
    window.dispatchEvent(new CustomEvent("sift-project-changed", { detail: { projectId } }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Strategy Advisor chat history for a specific project.
 */
export function getProjectChatHistory<T = any>(projectId?: string): T[] {
  if (!isBrowser()) return [];
  const id = projectId || getActiveProjectId();
  try {
    const raw = localStorage.getItem(PROJECT_CHAT_PREFIX + id);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save Strategy Advisor chat history for a specific project.
 */
export function saveProjectChatHistory(projectId: string, messages: any[]): void {
  if (!isBrowser() || !projectId) return;
  try {
    localStorage.setItem(PROJECT_CHAT_PREFIX + projectId, JSON.stringify(messages));
  } catch {
    // ignore quota errors
  }
}

/**
 * Clear Strategy Advisor chat history for a specific project.
 */
export function clearProjectChatHistory(projectId?: string): void {
  if (!isBrowser()) return;
  const id = projectId || getActiveProjectId();
  try {
    localStorage.removeItem(PROJECT_CHAT_PREFIX + id);
  } catch {
    // ignore
  }
}

