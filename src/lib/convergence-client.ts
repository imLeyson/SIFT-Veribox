"use client";

import { createSiftStore, useSiftStore } from "./convergence-store";
import {
  ConvergenceInputSchema,
  parseContract,
  TurnResultSchema,
} from "./agent/convergence-schema";
import {
  RoutesResultSchema,
  PlatformPlanResultSchema,
} from "./agent/routes-schema";
import type { Answer, ConvergenceInput, TurnEvent } from "@/types/convergence";

export function createConvergenceActions(
  store: ReturnType<typeof createSiftStore>,
  fetcher: typeof fetch = (...args) => fetch(...args),
) {
  let controller: AbortController | null = null;
  let correctionInFlight: string | null = null;

  function cancel() {
    controller?.abort();
    controller = null;
    correctionInFlight = null;
    store.getState().cancelRequest();
  }

  async function send(event: TurnEvent) {
    const s = store.getState();
    const token = s.beginRequest();
    if (!token) return;
    const ac = new AbortController();
    controller = ac;
    correctionInFlight = event.type === "correct" ? event.text : null;
    const timer = setTimeout(() => ac.abort(), 50000);
    try {
      const body: ConvergenceInput = parseContract(ConvergenceInputSchema, {
        sessionId: token.sessionId,
        requestId: token.id,
        rawBrief: s.rawBrief,
        images: s.briefImages,
        state: s.state,
        history: s.history,
        pendingQuestions: s.next?.type === "ask" ? s.next.questions : null,
        event,
      });
      const response = await fetcher(
        event.type === "start" || event.type === "fast_start"
          ? "/api/brief"
          : "/api/clarify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ac.signal,
        },
      );
      const raw = await response.text();
      if (!raw.trim()) throw new Error("服务返回为空，请重试");
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error("服务返回了无法解析的内容，请重试");
      }
      if (!response.ok)
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : `请求失败（${response.status}）`,
        );
      if (ac.signal.aborted) throw new Error("思考超时，请重试");
      if (
        !store.getState().commitTurn(parseContract(TurnResultSchema, payload))
      )
        throw new Error("响应与当前会话不匹配，请重试");
    } catch (error) {
      const message = ac.signal.aborted
        ? "思考超时，请重试"
        : error instanceof Error
          ? error.message
          : "请求失败，请重试";
      store.getState().failRequest(token.id, message);
    } finally {
      clearTimeout(timer);
      if (controller === ac) {
        controller = null;
        correctionInFlight = null;
      }
    }
  }

  async function generateRoutes() {
    const s = store.getState();
    if (!s.state || s.state.status !== "confirmed") return;
    const token = s.beginRequest();
    if (!token) return;
    const ac = new AbortController();
    controller = ac;
    const timer = setTimeout(() => ac.abort(), 50000);
    try {
      const body = {
        sessionId: token.sessionId,
        requestId: token.id,
        baseRevision: token.revision,
        rawBrief: s.rawBrief,
        state: s.state,
      };
      const response = await fetcher("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      const raw = await response.text();
      if (!raw.trim()) throw new Error("服务返回为空，请重试");
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error("服务返回了无法解析的内容，请重试");
      }
      if (!response.ok)
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : `请求失败（${response.status}）`,
        );
      if (ac.signal.aborted) throw new Error("思考超时，请重试");
      const result = parseContract(RoutesResultSchema, payload);
      if (store.getState().activeRequest?.id !== token.id) return;
      store.getState().setRoutes(result.routes, result.recommendedRouteId);
    } catch (error) {
      const message = ac.signal.aborted
        ? "思考超时，请重试"
        : error instanceof Error
          ? error.message
          : "生成路线失败，请重试";
      store.getState().failRequest(token.id, message);
    } finally {
      clearTimeout(timer);
      if (controller === ac) controller = null;
    }
  }

  async function generatePlatformPlan(stepId?: string) {
    const s = store.getState();
    if (!s.state || s.state.status !== "confirmed" || !s.selectedRouteId) return;
    const selectedRoute = s.routes.find((r) => r.id === s.selectedRouteId);
    if (!selectedRoute) return;
    const targetStepId = stepId ?? s.activeStepId ?? selectedRoute.steps[0]?.id;
    const currentStep = selectedRoute.steps.find((st) => st.id === targetStepId);
    if (!currentStep) return;

    const token = s.beginRequest();
    if (!token) return;
    const ac = new AbortController();
    controller = ac;
    const timer = setTimeout(() => ac.abort(), 50000);
    try {
      const body = {
        sessionId: token.sessionId,
        requestId: token.id,
        state: s.state,
        selectedRoute,
        currentStep,
        completedStepIds: s.platformPlans.map((p) => p.stepId),
      };
      const response = await fetcher("/api/platform-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      const raw = await response.text();
      if (!raw.trim()) throw new Error("服务返回为空，请重试");
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error("服务返回了无法解析的内容，请重试");
      }
      if (!response.ok)
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : `请求失败（${response.status}）`,
        );
      if (ac.signal.aborted) throw new Error("思考超时，请重试");
      const result = parseContract(PlatformPlanResultSchema, payload);
      if (store.getState().activeRequest?.id !== token.id) return;
      store.getState().setPlatformPlan(result.plan);
    } catch (error) {
      const message = ac.signal.aborted
        ? "思考超时，请重试"
        : error instanceof Error
          ? error.message
          : "生成搜索计划失败，请重试";
      store.getState().failRequest(token.id, message);
    } finally {
      clearTimeout(timer);
      if (controller === ac) controller = null;
    }
  }

  return {
    start: () => send({ type: "start" }),
    fastStart: () => send({ type: "fast_start" }),
    answer: () => {
      const s = store.getState();
      const questions = s.next?.type === "ask" ? s.next.questions : [];
      if (!questions.length) return Promise.resolve();
      const drafts = s.drafts;
      const answers: Answer[] = questions.map((q) => {
        const draft = drafts.find((d) => d.questionId === q.id);
        if (draft) {
          if (draft.kind === "custom") {
            return draft.text.trim()
              ? draft
              : { questionId: q.id, kind: "uncertain" as const };
          }
          return draft;
        }
        return { questionId: q.id, kind: "uncertain" as const };
      });
      return send({ type: "answer", answers });
    },
    correct: () => {
      const text = store.getState().correctionDraft.trim();
      if (!text) return Promise.resolve();
      if (correctionInFlight === text) return Promise.resolve();
      cancel();
      return send({ type: "correct", text });
    },
    cancel,
    converge: () => {
      cancel();
      store.getState().convergeNow();
    },
    checkpoint: () => {
      cancel();
      store.getState().convergeNow();
    },
    deepen: () => send({ type: "checkpoint", action: "deepen" }),
    confirm: async () => {
      cancel();
      store.getState().confirm();
      await generateRoutes();
    },
    generateRoutes,
    selectRoute: (routeId: string) => {
      store.getState().selectRoute(routeId);
    },
    reselectRoute: () => {
      store.getState().reselectRoute();
    },
    activateStep: (stepId: string) => {
      store.getState().setActiveStep(stepId);
    },
    generatePlatformPlan,
    nextStep: async () => {
      const s = store.getState();
      const route = s.routes.find((r) => r.id === s.selectedRouteId);
      if (!route || !s.activeStepId) return;
      const currentIdx = route.steps.findIndex((st) => st.id === s.activeStepId);
      if (currentIdx !== -1 && currentIdx + 1 < route.steps.length) {
        const nextStepObj = route.steps[currentIdx + 1];
        store.getState().setActiveStep(nextStepObj.id);
        await generatePlatformPlan(nextStepObj.id);
      }
    },
    skipSource: (stepId: string, sourceId: string) => {
      store.getState().skipSource(stepId, sourceId);
    },
    replaceSource: (stepId: string, oldSourceId: string, newSourceId: string) => {
      store.getState().replaceSource(stepId, oldSourceId, newSourceId);
    },
    toggleAcceptanceCriterion: (stepId: string, criterion: string) => {
      store.getState().toggleAcceptanceCriterion(stepId, criterion);
    },
    copyKeyword: async (stepId: string, sourceId: string, keyword: string) => {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(keyword);
        }
      } catch {
        // ignore clipboard error in automated/restricted sandbox
      }
      store.getState().recordSourceAction(stepId, sourceId, "copied", keyword);
    },
    openSearch: (
      url: string,
      stepId: string,
      sourceId: string,
      keyword?: string,
    ) => {
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      store.getState().recordSourceAction(stepId, sourceId, "opened", keyword);
    },
    reset: () => {
      cancel();
      store.getState().reset();
    },
  };
}

export const siftActions = createConvergenceActions(useSiftStore);
