"use client";

import { createSiftStore, useSiftStore } from "./convergence-store";
import {
  ConvergenceInputSchema,
  parseContract,
  TurnResultSchema,
} from "./agent/convergence-schema";
import type { ConvergenceInput, TurnEvent } from "@/types/convergence";

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
      // Canceled/replaced requests cannot alter the new request's loading or error state.
      store.getState().failRequest(token.id, message);
    } finally {
      clearTimeout(timer);
      if (controller === ac) {
        controller = null;
        correctionInFlight = null;
      }
    }
  }
  return {
    start: () => send({ type: "start" }),
    fastStart: () => send({ type: "fast_start" }),
    answer: () => {
      const drafts = store.getState().drafts;
      return drafts.length
        ? send({ type: "answer", answers: drafts })
        : Promise.resolve();
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
    confirm: () => {
      cancel();
      store.getState().confirm();
    },
    reset: () => {
      cancel();
      store.getState().reset();
    },
  };
}

export const siftActions = createConvergenceActions(useSiftStore);
