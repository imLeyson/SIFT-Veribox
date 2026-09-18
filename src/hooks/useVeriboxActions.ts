"use client";

import { useVeriboxStore } from "@/lib/store";
import type { Brief, ExplorationRoute, PlatformPlan } from "@/types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("连不上本地服务，请确认开发服务器还在运行");
  }

  const raw = await res.text();
  if (!raw.trim()) {
    throw new Error(
      res.ok
        ? "服务返回为空，多半是思考超时或服务已中断，请再试一次"
        : `请求失败（${res.status}），服务没有返回内容`
    );
  }

  let json: { error?: string; data?: T };
  try {
    json = JSON.parse(raw) as { error?: string; data?: T };
  } catch {
    throw new Error("服务返回了无法解析的内容，请再试一次");
  }

  if (!res.ok) throw new Error(json.error ?? "请求失败");
  if (json.data === undefined) throw new Error(json.error ?? "模型没有返回结果");
  return json.data;
}

export function useVeriboxActions() {
  async function analyzeBrief() {
    const store = useVeriboxStore.getState();
    const raw = store.rawBrief.trim();
    if (!raw) {
      store.setError("请先粘贴 Brief");
      return;
    }
    store.setLoading(true);
    store.setStep("brief_input");
    store.setError(null);
    try {
      const brief = await postJson<Brief>("/api/brief", { brief: raw });
      useVeriboxStore.getState().setBrief(brief);
    } catch (e) {
      useVeriboxStore.getState().setError(
        e instanceof Error ? e.message : "解析失败"
      );
    } finally {
      useVeriboxStore.getState().setLoading(false);
    }
  }

  async function chooseRoute(route: ExplorationRoute) {
    const store = useVeriboxStore.getState();
    const brief = store.brief;
    if (!brief) return;
    const step = route.steps[0];
    const existing = store.nodes.find(
      (n) => n.id === `card-platform-${route.id}-${step}`
    );
    store.selectRoute(route);
    if (existing) {
      store.selectNode(existing.id);
      return;
    }
    store.setLoading(true);
    store.setStep("platform_plan");
    store.setError(null);
    try {
      const plan = await postJson<PlatformPlan>("/api/platform-plan", {
        brief,
        selected_route: route,
        active_step: step,
      });
      useVeriboxStore.getState().setPlatformPlan(plan, route.id, step);
    } catch (e) {
      useVeriboxStore.getState().setError(
        e instanceof Error ? e.message : "搜索计划生成失败"
      );
    } finally {
      useVeriboxStore.getState().setLoading(false);
    }
  }

  async function advanceStep() {
    const store = useVeriboxStore.getState();
    const brief = store.brief;
    const route = store.selectedRoute;
    if (!brief || !route) return;
    const idx = route.steps.findIndex((s) => s === store.activeStep);
    const next = route.steps[idx + 1];
    if (!next) return;
    store.setActiveStep(next);
    store.setLoading(true);
    store.setStep("platform_plan");
    store.setError(null);
    try {
      const plan = await postJson<PlatformPlan>("/api/platform-plan", {
        brief,
        selected_route: route,
        active_step: next,
      });
      useVeriboxStore.getState().setPlatformPlan(plan, route.id, next);
    } catch (e) {
      useVeriboxStore.getState().setError(
        e instanceof Error ? e.message : "搜索计划生成失败"
      );
    } finally {
      useVeriboxStore.getState().setLoading(false);
    }
  }

  async function sendCanvasChat(message: string) {
    const store = useVeriboxStore.getState();
    store.addMessage({
      role: "user",
      content: message,
      focusId: store.selectedNodeId,
    });
    store.setLoading(true);
    store.setStep("canvas_chat");
    store.setError(null);
    try {
      const data = await postJson<{
        reply: string;
        cards: { title: string; body: string; parentId: string | null }[];
      }>("/api/canvas-chat", {
        message,
        nodes: store.nodes,
        edges: store.edges,
        selectedId: store.selectedNodeId,
      });
      const next = useVeriboxStore.getState();
      next.addMessage({ role: "assistant", content: data.reply });
      if (data.cards.length) {
        next.addInsightCards(
          data.cards.map((c) => ({
            title: c.title,
            body: c.body,
            parentId: c.parentId ?? next.selectedNodeId,
          }))
        );
      }
    } catch (e) {
      useVeriboxStore.getState().setError(
        e instanceof Error ? e.message : "对话失败"
      );
    } finally {
      useVeriboxStore.getState().setLoading(false);
    }
  }

  async function confirmBriefAndContinue() {
    useVeriboxStore.getState().setStartingState(null, []);
  }

  async function chooseStartingState(
    startingState: "has_idea" | "no_idea",
    ideas: string[] = []
  ) {
    const store = useVeriboxStore.getState();
    const brief = store.brief;
    if (!brief) {
      store.setError("缺少 Brief");
      return;
    }
    store.setStartingState(startingState, ideas);
    store.setLoading(true);
    store.setError(null);
    try {
      const data = await postJson<{
        recommendedRouteId: string | null;
        routes: ExplorationRoute[];
      }>("/api/routes", {
        brief,
        starting_state: startingState,
        user_initial_idea: ideas,
      });
      useVeriboxStore.getState().setRoutes(data.routes, data.recommendedRouteId);
    } catch (e) {
      useVeriboxStore.getState().setError(
        e instanceof Error ? e.message : "方案生成失败"
      );
    } finally {
      useVeriboxStore.getState().setLoading(false);
    }
  }

  return {
    analyzeBrief,
    generateSchemes: async () => {
      await chooseStartingState("no_idea", []);
    },
    confirmBriefAndContinue,
    chooseStartingState,
    chooseRoute,
    advanceStep,
    sendCanvasChat,
  };
}
