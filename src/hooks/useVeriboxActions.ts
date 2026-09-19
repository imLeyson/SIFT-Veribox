"use client";

import { useVeriboxStore } from "@/lib/store";
import { serializeCanvas } from "@/lib/canvas-graph";
import type {
  AgentAnswer,
  AgentQuestion,
  Brief,
  ExplorationRoute,
  PlatformPlan,
} from "@/types";

const CLIENT_TIMEOUT_MS = 50000;
let inflight: AbortController | null = null;
let userCancel = false;
let requestGen = 0;

export function cancelInflight() {
  userCancel = true;
  requestGen += 1;
  inflight?.abort();
  inflight = null;
  useVeriboxStore.getState().setLoading(false);
}

type Envelope<T> = {
  data?: T | null;
  questions?: AgentQuestion[];
  requestId?: string;
  sessionVersion?: number;
  stall?: boolean;
  error?: string;
};

function agentContext() {
  const s = useVeriboxStore.getState();
  return {
    answers: s.answers,
    askedQuestions: s.askedQuestions,
    recent_messages: s.messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    canvas: serializeCanvas(s.nodes, s.edges, s.selectedNodeId),
    sessionVersion: s.sessionVersion,
  };
}

async function postJson<T>(url: string, body: unknown): Promise<Envelope<T>> {
  const myGen = ++requestGen;
  userCancel = false;
  inflight?.abort();
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
    if (requestGen !== myGen || userCancel) throw new Error("已取消");
    if (ac.signal.aborted) {
      throw new Error("思考超时，请再试一次");
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

  let json: Envelope<T>;
  try {
    json = JSON.parse(raw) as Envelope<T>;
  } catch {
    throw new Error("服务返回了无法解析的内容，请再试一次");
  }

  if (requestGen !== myGen) throw new Error("已取消");
  if (!res.ok) throw new Error(json.error ?? "请求失败");
  return json;
}

function applyEnvelope(requestId?: string) {
  if (requestId) useVeriboxStore.getState().bumpSession(requestId);
}

function endLoading() {
  if (!inflight) useVeriboxStore.getState().setLoading(false);
}

export function useVeriboxActions() {
  async function requestRoutes(force = false) {
    const store = useVeriboxStore.getState();
    const brief = store.brief;
    if (!brief) return;
    const ideas = [
      ...store.userInitialIdea,
      ...brief.preferences,
      ...brief.known,
      ...store.answers
        .filter((a) => a.kind !== "uncertain")
        .map((a) => a.custom)
        .filter((v): v is string => Boolean(v)),
    ].filter(Boolean);
    store.setLoading(true);
    store.setError(null);
    try {
      const env = await postJson<{
        recommendedRouteId: string | null;
        routes: ExplorationRoute[];
      }>("/api/routes", {
        brief,
        user_initial_idea: ideas,
        force,
        ...agentContext(),
      });
      const next = useVeriboxStore.getState();
      applyEnvelope(env.requestId);
      next.setPendingQuestions([
        ...next.pendingQuestions.filter((q) => q.stage !== "routes"),
        ...(env.questions ?? []),
      ]);
      if (env.data?.routes?.length === 3) {
        next.setRoutes(env.data.routes, env.data.recommendedRouteId ?? null);
        next.setPendingQuestions(
          next.pendingQuestions.filter((q) => q.stage !== "routes")
        );
        next.resetAskRound("routes");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "方案生成失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
    } finally {
      endLoading();
    }
  }

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
      const env = await postJson<Brief>("/api/brief", {
        brief: raw,
        sessionVersion: store.sessionVersion,
      });
      const next = useVeriboxStore.getState();
      applyEnvelope(env.requestId);
      if (env.data) next.setBrief(env.data);
      next.resetAskRound("brief");
      next.setPendingQuestions(env.questions ?? []);
      if (!(env.questions ?? []).length && env.data) {
        await requestRoutes();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "解析失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
    } finally {
      endLoading();
    }
  }

  async function chooseRoute(route: ExplorationRoute, force = false) {
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
      const env = await postJson<PlatformPlan>("/api/platform-plan", {
        brief,
        selected_route: route,
        active_step: step,
        force,
        ...agentContext(),
      });
      const next = useVeriboxStore.getState();
      applyEnvelope(env.requestId);
      next.setPendingQuestions([
        ...next.pendingQuestions.filter((q) => q.stage !== "platform"),
        ...(env.questions ?? []),
      ]);
      if (env.data) {
        next.setPlatformPlan(env.data, route.id, step);
        next.resetAskRound("platform");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "搜索计划生成失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
    } finally {
      endLoading();
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
      const env = await postJson<PlatformPlan>("/api/platform-plan", {
        brief,
        selected_route: route,
        active_step: next,
        force: false,
        ...agentContext(),
      });
      const st = useVeriboxStore.getState();
      applyEnvelope(env.requestId);
      st.setPendingQuestions([
        ...st.pendingQuestions.filter((q) => q.stage !== "platform"),
        ...(env.questions ?? []),
      ]);
      if (env.data) {
        st.setPlatformPlan(env.data, route.id, next);
        st.resetAskRound("platform");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "搜索计划生成失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
    } finally {
      endLoading();
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
      const env = await postJson<{
        reply: string;
        cards: { title: string; body: string; parentId: string | null }[];
      }>("/api/canvas-chat", {
        ...agentContext(),
        message,
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
        ...agentContext(),
      });
      const next = useVeriboxStore.getState();
      applyEnvelope(env.requestId);
      next.setPendingQuestions([
        ...next.pendingQuestions.filter((q) => q.stage !== "chat"),
        ...(env.questions ?? []),
      ]);
      if (env.data?.reply) {
        next.addMessage({ role: "assistant", content: env.data.reply });
      }
      if (env.data?.cards?.length) {
        next.addInsightCards(
          env.data.cards.map((c) => ({
            title: c.title,
            body: c.body,
            parentId: c.parentId ?? next.selectedNodeId,
          }))
        );
      }
      if (!(env.questions ?? []).length) next.resetAskRound("chat");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "对话失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
    } finally {
      endLoading();
    }
  }

  async function submitAnswers(
    answers: AgentAnswer[],
    proceed: boolean,
    stage: "brief" | "routes" | "platform" | "chat" = "brief"
  ) {
    const store = useVeriboxStore.getState();
    store.addAnswers(answers);
    store.resolveAskCard(stage, answers);
    store.clearDrafts(answers.map((a) => a.questionId));
    const pending = store.pendingQuestions.filter((q) => q.stage === stage);
    const round = store.bumpAskRound(stage);
    const force = proceed && round >= 2;
    if (store.routes.length > 0 && stage === "brief") {
      store.setStale({ routes: true, platform: true });
    }
    if (!pending.length && proceed) {
      if (stage === "brief") await requestRoutes(force);
      return;
    }
    store.setLoading(true);
    store.setError(null);
    try {
      if (stage === "brief") {
        const env = await postJson<Brief>("/api/clarify", {
          brief: store.brief,
          answers,
          questions: pending,
          round,
          sessionVersion: store.sessionVersion,
        });
        const next = useVeriboxStore.getState();
        applyEnvelope(env.requestId);
        if (env.data) next.setBrief(env.data);
        const qs = env.questions ?? [];
        next.setPendingQuestions([
          ...next.pendingQuestions.filter((q) => q.stage !== "brief"),
          ...qs,
        ]);
        if (proceed && (qs.length === 0 || force || env.stall)) {
          next.setPendingQuestions(
            next.pendingQuestions.filter((q) => q.stage !== "brief")
          );
          next.resetAskRound("brief");
          await requestRoutes(true);
        }
        return;
      }
      if (stage === "routes") {
        if (proceed) await requestRoutes(force);
        return;
      }
      if (stage === "platform" && store.selectedRoute) {
        if (proceed) await chooseRoute(store.selectedRoute, force);
        return;
      }
      if (stage === "chat") {
        const summary = answers
          .map((a) => a.custom ?? a.kind)
          .filter(Boolean)
          .join("；");
        if (proceed) {
          await sendCanvasChat(`对刚才的问题：${summary || "按假设继续"}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "提交失败";
      if (msg !== "已取消") useVeriboxStore.getState().setError(msg);
    } finally {
      endLoading();
    }
  }

  async function confirmBriefAndContinue(answers: AgentAnswer[] = []) {
    const store = useVeriboxStore.getState();
    if (store.pendingQuestions.some((q) => q.stage === "brief")) {
      await submitAnswers(answers, true, "brief");
      return;
    }
    await requestRoutes();
  }

  return {
    analyzeBrief,
    generateSchemes: requestRoutes,
    confirmBriefAndContinue,
    submitAnswers,
    chooseStartingState: async (
      _startingState: "has_idea" | "no_idea",
      ideas: string[] = []
    ) => {
      useVeriboxStore.getState().setUserInitialIdea(ideas);
      await requestRoutes();
    },
    chooseRoute,
    advanceStep,
    sendCanvasChat,
    cancelInflight,
  };
}
