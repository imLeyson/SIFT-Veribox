"use client";

import { useVeriboxStore } from "@/lib/store";
import { serializeCanvas } from "@/lib/canvas-graph";
import type { Brief, ExplorationRoute, PlatformPlan } from "@/types";

const CLIENT_TIMEOUT_MS = 45000;
let inflight: AbortController | null = null;
let userCancel = false;

export function cancelInflight() {
  userCancel = true;
  inflight?.abort();
  inflight = null;
  useVeriboxStore.getState().setLoading(false);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  inflight?.abort();
  userCancel = false;
  const ac = new AbortController();
  inflight = ac;
  const timer = window.setTimeout(() => ac.abort(), CLIENT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } catch {
    if (ac.signal.aborted) {
      throw new Error(userCancel ? "已取消" : "思考超时，请再试一次");
    }
    throw new Error("网络中断，请再试一次");
  } finally {
    window.clearTimeout(timer);
    if (inflight === ac) inflight = null;
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
      const msg = e instanceof Error ? e.message : "解析失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
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
      const msg = e instanceof Error ? e.message : "搜索计划生成失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
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
      const msg = e instanceof Error ? e.message : "搜索计划生成失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
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
        canvas: serializeCanvas(store.nodes, store.edges, store.selectedNodeId),
        nodeIds: store.nodes.map((n) => n.id),
        nodes: store.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            kind: n.data.kind,
            title: n.data.title,
            body: n.data.body,
            brief: n.data.brief,
            route: n.data.route,
            recommended: n.data.recommended,
            routeId: n.data.routeId,
            plan: n.data.plan
              ? {
                  goal: n.data.plan.goal,
                  sources: n.data.plan.sources.map((s) => ({
                    rank: s.rank,
                    name: s.name,
                    label: s.label,
                    reason: s.reason,
                    queries: s.queries,
                  })),
                  alternatives: [],
                }
              : undefined,
          },
        })),
        edges: store.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
        })),
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
      const msg = e instanceof Error ? e.message : "对话失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
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
      const msg = e instanceof Error ? e.message : "方案生成失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
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
    cancelInflight,
  };
}
