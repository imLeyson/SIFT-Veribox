"use client";

import { useSiftStore, safeId, type SiftStore } from "./convergence-store";
import type { Answer, TurnResult } from "@/types/convergence";
import type { Route } from "@/types/routes";

export interface RunIndependentBriefOptions {
  briefCardId: string;
  rawBrief: string;
  images?: string[];
  fastStart?: boolean;
  store?: typeof useSiftStore;
  fetcher?: typeof fetch;
}

export interface RunIndependentAskOptions {
  askCardId: string;
  parentBriefId?: string;
  rawBrief: string;
  state: any;
  answers: Answer[];
  skipToConverge?: boolean;
  store?: typeof useSiftStore;
  fetcher?: typeof fetch;
}

export interface RunIndependentStateRoutesOptions {
  stateCardId: string;
  rawBrief: string;
  state: any;
  store?: typeof useSiftStore;
  fetcher?: typeof fetch;
}

export async function runIndependentBrief({
  briefCardId,
  rawBrief,
  images = [],
  fastStart = false,
  store = useSiftStore,
  fetcher = fetch,
}: RunIndependentBriefOptions): Promise<{ state: any; next: any }> {
  const currentCard = store.getState().customCards.find((c) => c.id === briefCardId);
  const existingData = currentCard?.data ?? {};

  // 1. Mark as running
  store.getState().updateCustomCard(briefCardId, {
    data: {
      ...existingData,
      rawBrief,
      briefImages: images,
      status: "running",
      error: null,
    },
  });

  const briefPos = store.getState().positions[briefCardId] ??
    currentCard?.position ?? { x: 60, y: 80 };

  try {
    // 2. Call /api/brief
    const res = await fetcher("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: `chain-${briefCardId}-${Date.now().toString(36)}`,
        requestId: `req-${Date.now().toString(36)}`,
        rawBrief,
        images,
        state: null,
        history: [],
        pendingQuestions: null,
        event: { type: fastStart ? "fast_start" : "start" },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `收敛请求失败 (${res.status})`);
    }

    const payload: TurnResult = await res.json();
    const isAskRound = payload.next?.type === "ask";

    // 3. Update Brief Card
    store.getState().updateCustomCard(briefCardId, {
      data: {
        ...existingData,
        rawBrief,
        briefImages: images,
        status: "completed",
        state: payload.state,
        next: payload.next,
        error: null,
      },
    });

    // 4. Case A: Questions generated -> Spawn 01 Ask Node
    if (isAskRound && payload.next?.type === "ask") {
      const askCardId = `card-ask-${safeId()}`;
      const askPos = { x: briefPos.x + 470, y: briefPos.y };

      store.getState().addCustomCard({
        id: askCardId,
        type: "ask",
        title: "关键视觉抉择",
        position: askPos,
        data: {
          parentBriefId: briefCardId,
          rawBrief,
          questions: payload.next.questions,
          state: payload.state,
          history: [],
          status: "active",
        },
      });

      store.getState().setPosition(askCardId, askPos);
      store.getState().addCustomEdge({
        id: `edge-${briefCardId}-${askCardId}`,
        source: briefCardId,
        target: askCardId,
        animated: true,
        style: { stroke: "#0284c7", strokeWidth: 2 },
      });

      return { state: payload.state, next: payload.next };
    }

    // 5. Case B: State confirmed -> Spawn 02 State & 03 Routes directly
    const stateCardId = `card-state-${safeId()}`;
    const statePos = { x: briefPos.x + 470, y: briefPos.y };

    store.getState().addCustomCard({
      id: stateCardId,
      type: "state",
      title: "核心策略基准",
      position: statePos,
      data: {
        parentBriefId: briefCardId,
        rawBrief,
        state: payload.state,
        status: "confirmed",
      },
    });

    store.getState().setPosition(stateCardId, statePos);
    store.getState().addCustomEdge({
      id: `edge-${briefCardId}-${stateCardId}`,
      source: briefCardId,
      target: stateCardId,
      animated: true,
      style: { stroke: "#059669", strokeWidth: 2 },
    });

    // Generate downstream routes for this state
    await runIndependentStateRoutes({
      stateCardId,
      rawBrief,
      state: payload.state,
      store,
      fetcher,
    });

    return { state: payload.state, next: payload.next };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "收敛推演失败，请重试";
    store.getState().updateCustomCard(briefCardId, {
      data: {
        ...existingData,
        status: "error",
        error: msg,
      },
    });
    throw error;
  }
}

export async function runIndependentAskConvergence({
  askCardId,
  parentBriefId,
  rawBrief,
  state,
  answers,
  skipToConverge = false,
  store = useSiftStore,
  fetcher = fetch,
}: RunIndependentAskOptions): Promise<{ state: any }> {
  const askCard = store.getState().customCards.find((c) => c.id === askCardId);
  const askPos = store.getState().positions[askCardId] ??
    askCard?.position ?? { x: 530, y: 80 };

  store.getState().updateCustomCard(askCardId, {
    data: {
      ...(askCard?.data || {}),
      status: "running",
    },
  });

  try {
    let payload: any;
    if (skipToConverge) {
      // Direct converge: state status -> confirmed
      payload = {
        sessionId: `chain-${askCardId}`,
        requestId: `req-${Date.now().toString(36)}`,
        state: { ...state, status: "confirmed" },
        next: { type: "checkpoint", reason: "fast_converged" },
      };
    } else {
      const res = await fetcher("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `chain-${askCardId}`,
          requestId: `req-${Date.now().toString(36)}`,
          rawBrief,
          images: [],
          state,
          history: [],
          pendingQuestions: askCard?.data?.questions ?? null,
          event: { type: "answer", answers },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `澄清请求失败 (${res.status})`);
      }
      payload = await res.json();
    }

    // Mark ask card as completed
    store.getState().updateCustomCard(askCardId, {
      data: {
        ...(askCard?.data || {}),
        status: "completed",
        answered: true,
        answers,
        state: payload.state,
      },
    });

    // Spawn 02 State Node
    const stateCardId = `card-state-${safeId()}`;
    const statePos = { x: askPos.x + 470, y: askPos.y };

    store.getState().addCustomCard({
      id: stateCardId,
      type: "state",
      title: "核心策略基准",
      position: statePos,
      data: {
        parentAskId: askCardId,
        parentBriefId,
        rawBrief,
        state: payload.state,
        status: "confirmed",
      },
    });

    store.getState().setPosition(stateCardId, statePos);
    store.getState().addCustomEdge({
      id: `edge-${askCardId}-${stateCardId}`,
      source: askCardId,
      target: stateCardId,
      animated: true,
      style: { stroke: "#059669", strokeWidth: 2 },
    });

    // Spawn 03 Route Nodes
    await runIndependentStateRoutes({
      stateCardId,
      rawBrief,
      state: payload.state,
      store,
      fetcher,
    });

    return { state: payload.state };
  } catch (error) {
    store.getState().updateCustomCard(askCardId, {
      data: {
        ...(askCard?.data || {}),
        status: "error",
        error: error instanceof Error ? error.message : "澄清推导失败",
      },
    });
    throw error;
  }
}

export async function runIndependentStateRoutes({
  stateCardId,
  rawBrief,
  state,
  store = useSiftStore,
  fetcher = fetch,
}: RunIndependentStateRoutesOptions): Promise<Route[]> {
  const stateCard = store.getState().customCards.find((c) => c.id === stateCardId);
  const statePos = store.getState().positions[stateCardId] ??
    stateCard?.position ?? { x: 1000, y: 80 };

  try {
    const res = await fetcher("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: `chain-${stateCardId}`,
        requestId: `req-routes-${Date.now().toString(36)}`,
        baseRevision: 1,
        rawBrief,
        state,
        history: [],
        refreshIndex: 0,
      }),
    });

    let routes: Route[] = [];
    if (res.ok) {
      const data = await res.json();
      routes = data.routes ?? [];
    }

    if (routes.length === 0) {
      // Fallback route if route generation returns empty
      routes = [
        {
          id: `route-${safeId()}`,
          title: "【极简微触感探索】",
          themeName: "极简微触感探索",
          focusDimension: "表面工艺与微纹理",
          startingPoint: "基于独立策略基准切入",
          coreProblem: "建立纯粹且具备记忆点的前期视觉语言",
          purpose: "明确核心材质与排版骨架",
          pros: "克制专业，视觉噪音低",
          cons: "需把控生产打样精度",
          recommendedReason: "与当前设计目标高度契合",
          alignmentScore: 92,
          steps: [
            {
              id: "s1",
              title: "核心母题与造型骨架试验",
              question: "如何确立第一眼视觉记忆点？",
              purpose: "提炼核心视觉母题",
              acceptanceCriteria: ["具备清晰辨识度", "符合整体调性"],
            },
            {
              id: "s2",
              title: "物料工艺与表面触感试验",
              question: "选用何种材质与表面处理？",
              purpose: "深化细节与高级质感",
              acceptanceCriteria: ["明确主辅材质搭配", "表面微纹理具可实现性"],
            },
            {
              id: "s3",
              title: "场景交互与整体系统试验",
              question: "在真实场景中如何落地共生？",
              purpose: "验证全案完整度",
              acceptanceCriteria: ["延展至全系列包装或器物", "触点体验连贯一致"],
            },
          ],
        },
      ];
    }

    // Spawn 03 Route Cards
    routes.forEach((route, idx) => {
      const routeCardId = `card-route-${stateCardId.replace(/^card-state-/, "")}-${idx}-${safeId()}`;
      const routePos = {
        x: statePos.x + 470,
        y: statePos.y + idx * 560,
      };

      store.getState().addCustomCard({
        id: routeCardId,
        type: "route",
        title: route.title,
        position: routePos,
        data: {
          route,
          index: idx,
          parentStateId: stateCardId,
          rawBrief,
          state,
          isEmpty: false,
        },
      });

      store.getState().setPosition(routeCardId, routePos);
      store.getState().addCustomEdge({
        id: `edge-${stateCardId}-${routeCardId}`,
        source: stateCardId,
        target: routeCardId,
        animated: idx === 0,
        style: {
          stroke: idx === 0 ? "#4f46e5" : "#c4b5a2",
          strokeWidth: idx === 0 ? 2.2 : 1.5,
        },
      });
    });

    return routes;
  } catch (error) {
    console.error("生成风格主题失败:", error);
    return [];
  }
}
