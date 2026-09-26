import { describe, it, expect, beforeEach } from "vitest";
import {
  listProjects,
  getActiveProjectId,
  createProject,
  switchProject,
  duplicateProject,
  renameProject,
  deleteProject,
  saveMilestoneSnapshot,
  listMilestoneSnapshots,
  restoreMilestoneSnapshot,
  getProjectChatHistory,
  saveProjectChatHistory,
  clearProjectChatHistory,
  PROJECT_CHAT_PREFIX,
} from "./project-manager";
import { useSiftStore } from "./convergence-store";

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

describe("Module 5: Multi-Project Canvas Switcher & Milestone Snapshots", () => {
  beforeEach(() => {
    setupMockLocalStorage();
    useSiftStore.getState().reset();
  });

  it("bootstraps a default project on first launch", () => {
    const projects = listProjects();
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe("proj-default");
    expect(getActiveProjectId()).toBe("proj-default");
  });

  it("supports creating new independent canvas projects", () => {
    // 1. Create a new project
    const newProj = createProject("车载座舱视觉策略探索");
    expect(newProj.name).toBe("车载座舱视觉策略探索");
    expect(getActiveProjectId()).toBe(newProj.id);

    const projects = listProjects();
    expect(projects.length).toBe(2);
    expect(projects[0].id).toBe(newProj.id);
  });

  it("supports switching between different projects and persists state", () => {
    // Start with default project
    const p1 = listProjects()[0];

    // Put some content in p1
    useSiftStore.setState({ rawBrief: "手冲咖啡器具探索" });

    // Create p2
    const p2 = createProject("车载座舱项目");
    expect(getActiveProjectId()).toBe(p2.id);

    // Put some content in p2
    useSiftStore.setState({ rawBrief: "智能HUD抬头显示交互" });

    // Switch back to p1
    const switchedToP1 = switchProject(p1.id);
    expect(switchedToP1).toBe(true);
    expect(getActiveProjectId()).toBe(p1.id);

    // Switch to p2
    const switchedToP2 = switchProject(p2.id);
    expect(switchedToP2).toBe(true);
    expect(getActiveProjectId()).toBe(p2.id);
  });

  it("supports duplicating a project as a new branch", () => {
    const p1 = listProjects()[0];
    const duplicated = duplicateProject(p1.id, "手冲咖啡器具 - 方案B探索");

    expect(duplicated).not.toBeNull();
    expect(duplicated?.name).toBe("手冲咖啡器具 - 方案B探索");
    expect(duplicated?.id).not.toBe(p1.id);

    const projects = listProjects();
    expect(projects.length).toBe(2);
  });

  it("supports renaming projects", () => {
    const p1 = listProjects()[0];
    const success = renameProject(p1.id, "全新命名：极简生活器物");
    expect(success).toBe(true);

    const projects = listProjects();
    expect(projects[0].name).toBe("全新命名：极简生活器物");
  });

  it("prevents deleting the last remaining project", () => {
    const p1 = listProjects()[0];
    // Attempting to delete when only 1 project exists
    const deletedSingle = deleteProject(p1.id);
    expect(deletedSingle).toBe(false);
    expect(listProjects().length).toBe(1);

    // When 2 projects exist, deleting is allowed
    const p2 = createProject("临时项目");
    expect(listProjects().length).toBe(2);

    const deletedP2 = deleteProject(p2.id);
    expect(deletedP2).toBe(true);
    expect(listProjects().length).toBe(1);
  });

  it("supports saving, listing, and restoring milestone snapshots", () => {
    const p1 = listProjects()[0];

    // Save a milestone
    const snap1 = saveMilestoneSnapshot("上午版：收敛视觉主张");
    expect(snap1).not.toBeNull();
    expect(snap1?.label).toBe("上午版：收敛视觉主张");

    const snapshots = listMilestoneSnapshots(p1.id);
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].id).toBe(snap1?.id);

    // Restore milestone
    if (snap1) {
      const restored = restoreMilestoneSnapshot(snap1.id);
      expect(restored).toBe(true);
    }
  });

  it("persists Strategy Advisor chat history per project, clears on create/delete, and copies on duplicate", () => {
    const p1 = listProjects()[0];

    // 1. Initial chat is empty
    expect(getProjectChatHistory(p1.id)).toEqual([]);

    // 2. Save conversation for p1
    const mockMessages = [
      { id: "m1", role: "user", content: "请评估当前风格主题", time: "10:00" },
      { id: "m2", role: "assistant", content: "主推《掌心凹谷》方案", time: "10:01" },
    ];
    saveProjectChatHistory(p1.id, mockMessages);
    expect(getProjectChatHistory(p1.id)).toEqual(mockMessages);

    // 3. Create a new project -> New project starts with clean empty chat history
    const p2 = createProject("第二阶段探索");
    expect(getProjectChatHistory(p2.id)).toEqual([]);
    // p1's chat history remains intact
    expect(getProjectChatHistory(p1.id)).toEqual(mockMessages);

    // 4. Duplicate p1 -> Duplicated project inherits chat history
    const p1Copy = duplicateProject(p1.id, "第一阶段副本");
    expect(p1Copy).not.toBeNull();
    if (p1Copy) {
      expect(getProjectChatHistory(p1Copy.id)).toEqual(mockMessages);
    }

    // 5. Delete p2 -> Chat history for p2 is completely removed
    saveProjectChatHistory(p2.id, [{ id: "m3", role: "user", content: "新项目问题", time: "11:00" }]);
    expect(getProjectChatHistory(p2.id)).toHaveLength(1);
    deleteProject(p2.id);
    expect(getProjectChatHistory(p2.id)).toEqual([]);

    // 6. Manual clear for p1
    clearProjectChatHistory(p1.id);
    expect(getProjectChatHistory(p1.id)).toEqual([]);
  });
});

